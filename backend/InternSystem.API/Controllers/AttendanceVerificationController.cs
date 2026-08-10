using System.Security.Claims;
using System.Text.Json;
using InternSystem.Core.Entities;
using InternSystem.Infrastructure.Data;
using InternSystem.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace InternSystem.API.Controllers;

[ApiController]
[Route("api/attendance")]
[Authorize(Roles = "Intern")]
public class AttendanceVerificationController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly GeoFenceService _geo;
    private readonly IConfiguration _config;

    public AttendanceVerificationController(AppDbContext db, GeoFenceService geo, IConfiguration config)
    {
        _db = db;
        _geo = geo;
        _config = config;
    }

    private int CurrentUserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private async Task<Intern?> GetCurrentIntern() =>
        await _db.Interns
            .Include(i => i.Department)
            .Include(i => i.User)
            .FirstOrDefaultAsync(i => i.UserId == CurrentUserId);

    // Strict Cosine Similarity calculation between 128-dim face feature embeddings
    private static double CosineSimilarity(float[] vecA, float[] vecB)
    {
        if (vecA == null || vecB == null || vecA.Length == 0 || vecB.Length == 0) return 0.0;
        if (vecA.Length != vecB.Length) return 0.0; // Strict dimension lock

        double dot = 0.0, magA = 0.0, magB = 0.0;
        for (int i = 0; i < vecA.Length; i++)
        {
            dot += vecA[i] * vecB[i];
            magA += vecA[i] * vecA[i];
            magB += vecB[i] * vecB[i];
        }
        if (magA <= 0 || magB <= 0) return 0.0;
        double similarity = dot / (Math.Sqrt(magA) * Math.Sqrt(magB));
        return Math.Clamp(similarity, -1.0, 1.0);
    }

    // ─── 1. START SESSION ───────────────────────────────────────────────────
    [HttpPost("start")]
    public async Task<IActionResult> StartSession()
    {
        var intern = await GetCurrentIntern();
        if (intern == null || !intern.User.IsActive)
            return BadRequest(new { code = "EMPLOYEE_INACTIVE", message = "Employee account is inactive or not found" });

        if (intern.Department == null || !intern.Department.IsActive)
            return BadRequest(new { code = "DEPARTMENT_INACTIVE", message = "Assigned department is inactive" });

        // 1:00 PM PKT (UTC+5) cut-off check
        var nowPkt = DateTime.UtcNow.AddHours(5);
        int cutoffHour = _config.GetValue<int>("AttendanceCutoffHour", 13);

        // Check if attendance already marked today
        var existing = await _db.Attendances
            .FirstOrDefaultAsync(a => a.InternId == intern.Id && a.Timestamp.Date == DateTime.UtcNow.Date);

        if (existing != null)
        {
            return BadRequest(new
            {
                code = "ATTENDANCE_ALREADY_MARKED",
                message = $"Attendance already marked for today as {existing.Status}",
                status = existing.Status.ToString()
            });
        }

        if (nowPkt.Hour >= cutoffHour)
        {
            // Auto mark absent after 1:00 PM
            var absentRecord = new Attendance
            {
                InternId = intern.Id,
                Timestamp = DateTime.UtcNow,
                Latitude = 0,
                Longitude = 0,
                IsInRange = false,
                DistanceMeters = 0,
                FaceVerified = false,
                LocationVerified = false,
                Status = AttendanceStatus.Absent,
                Notes = $"Automatically marked ABSENT (Attempted after 1:00 PM cut-off time at {nowPkt:hh:mm tt})"
            };
            _db.Attendances.Add(absentRecord);
            await _db.SaveChangesAsync();

            return BadRequest(new
            {
                code = "ATTENDANCE_WINDOW_CLOSED",
                message = "Attendance window closed (Cut-off time was 1:00 PM). Marked ABSENT for today.",
                status = "Absent"
            });
        }

        // Require Face Enrollment
        if (!intern.FaceEnrolled || string.IsNullOrEmpty(intern.FaceEmbeddingJson))
        {
            return BadRequest(new
            {
                code = "FACE_NOT_REGISTERED",
                message = "Please complete Face Registration first before marking attendance."
            });
        }

        // Expire any existing pending sessions for this user
        var pendingSessions = await _db.AttendanceVerificationSessions
            .Where(s => s.UserId == CurrentUserId && s.Status != VerificationSessionStatus.Completed && s.Status != VerificationSessionStatus.Expired)
            .ToListAsync();
        foreach (var s in pendingSessions) s.Status = VerificationSessionStatus.Expired;

        var session = new AttendanceVerificationSession
        {
            UserId = CurrentUserId,
            InternId = intern.Id,
            DepartmentId = intern.DepartmentId,
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddMinutes(5),
            Status = VerificationSessionStatus.Created
        };

        _db.AttendanceVerificationSessions.Add(session);
        await _db.SaveChangesAsync();

        return Ok(new
        {
            sessionId = session.Id,
            sessionGuid = session.SessionGuid,
            expiresAt = session.ExpiresAt,
            departmentName = intern.Department.Name,
            maxRadiusMeters = intern.Department.RadiusMeters ?? 30.0
        });
    }

    // ─── 2. FACE VERIFICATION (Step 1) ──────────────────────────────────────
    [HttpPost("{sessionId:int}/face/verify")]
    public async Task<IActionResult> VerifyFace(int sessionId, [FromBody] FaceVerificationRequest req)
    {
        var session = await _db.AttendanceVerificationSessions
            .FirstOrDefaultAsync(s => s.Id == sessionId && s.UserId == CurrentUserId);

        if (session == null || session.ExpiresAt < DateTime.UtcNow || session.Status == VerificationSessionStatus.Expired)
            return BadRequest(new { code = "SESSION_EXPIRED", message = "Verification session expired or invalid" });

        var intern = await GetCurrentIntern();
        if (intern == null || string.IsNullOrEmpty(intern.FaceEmbeddingJson))
            return BadRequest(new { code = "FACE_NOT_REGISTERED", message = "Registered face profile not found" });

        if (!req.LivenessVerified)
        {
            session.Status = VerificationSessionStatus.Failed;
            session.FailureReason = "Liveness verification failed (Anti-spoofing challenge failed)";
            await _db.SaveChangesAsync();
            return BadRequest(new { code = "LIVENESS_FAILED", message = "Liveness check failed. Please blink and turn head when prompted." });
        }

        double threshold = _config.GetValue<double>("FaceMatchThreshold", 0.68);
        bool faceMatched = false;
        double similarityScore = 0.0;

        if (req.FaceEmbedding == null || req.FaceEmbedding.Length == 0)
        {
            session.Status = VerificationSessionStatus.Failed;
            session.FailureReason = "No live face embedding provided for ArcFace 1:1 verification";
            await _db.SaveChangesAsync();
            return BadRequest(new { code = "FACE_EMBEDDING_MISSING", message = "Live face embedding required for verification" });
        }

        var storedEmbedding = JsonSerializer.Deserialize<float[]>(intern.FaceEmbeddingJson);
        if (storedEmbedding == null || storedEmbedding.Length == 0)
        {
            return BadRequest(new { code = "FACE_NOT_REGISTERED", message = "Registered face profile not found" });
        }

        similarityScore = CosineSimilarity(storedEmbedding, req.FaceEmbedding);
        faceMatched = similarityScore >= threshold;

        if (!faceMatched)
        {
            session.Status = VerificationSessionStatus.Failed;
            session.FailureReason = $"ArcFace 1:1 match failed. Live face similarity to account owner profile is {similarityScore:P0} (Threshold: {threshold:P0})";
            await _db.SaveChangesAsync();
            return BadRequest(new { 
                code = "FACE_NOT_MATCHED", 
                message = $"Security Violation: Live face does not match account owner's registered face profile ({similarityScore:P0} match confidence)." 
            });
        }

        session.FaceVerified = true;
        session.LivenessVerified = true;
        session.Status = VerificationSessionStatus.FaceVerified;
        await _db.SaveChangesAsync();

        return Ok(new
        {
            faceVerified = true,
            livenessVerified = true,
            similarityScore,
            status = "FACE_VERIFIED"
        });
    }

    // ─── 3. LOCATION VERIFICATION (Step 2) ──────────────────────────────────
    [HttpPost("{sessionId:int}/location")]
    public async Task<IActionResult> VerifyLocation(int sessionId, [FromBody] LocationVerificationRequest req)
    {
        var session = await _db.AttendanceVerificationSessions
            .Include(s => s.Department)
            .FirstOrDefaultAsync(s => s.Id == sessionId && s.UserId == CurrentUserId);

        if (session == null || session.ExpiresAt < DateTime.UtcNow || session.Status == VerificationSessionStatus.Expired)
            return BadRequest(new { code = "SESSION_EXPIRED", message = "Verification session expired" });

        if (!session.FaceVerified)
            return BadRequest(new { code = "FACE_CHECK_REQUIRED", message = "Must complete Face Recognition first" });

        double maxAccuracy = _config.GetValue<double>("MaxAllowedGpsAccuracyMeters", 50.0);
        if (req.GpsAccuracy > maxAccuracy)
        {
            return BadRequest(new
            {
                code = "GPS_ACCURACY_TOO_LOW",
                message = $"GPS accuracy is too low ({req.GpsAccuracy:F0}m). Maximum allowed is {maxAccuracy:F0}m."
            });
        }

        // Get Department Coordinates (ERP: 24.894995, 67.152182 | Cyber: 24.894427, 67.151782)
        double deptLat = (session.Department?.Latitude != null && session.Department.Latitude.Value != 0)
            ? session.Department.Latitude.Value : 24.894995;
        double deptLon = (session.Department?.Longitude != null && session.Department.Longitude.Value != 0)
            ? session.Department.Longitude.Value : 67.152182;
        double allowedRadius = (session.Department?.RadiusMeters != null && session.Department.RadiusMeters.Value > 0)
            ? session.Department.RadiusMeters.Value : 30.0;

        double distance = _geo.HaversineDistance(req.Latitude, req.Longitude, deptLat, deptLon);
        bool isInRange = distance <= allowedRadius;

        session.Latitude = req.Latitude;
        session.Longitude = req.Longitude;
        session.GpsAccuracy = req.GpsAccuracy;
        session.DistanceFromDepartment = distance;

        if (!isInRange)
        {
            session.Status = VerificationSessionStatus.Failed;
            session.FailureReason = $"Outside allowed geofence ({distance:F1}m from {session.Department?.Name}, max allowed {allowedRadius:F0}m)";
            await _db.SaveChangesAsync();

            return BadRequest(new
            {
                code = "OUTSIDE_ALLOWED_AREA",
                message = $"You are {distance:F0}m away from {session.Department?.Name} (Must be within {allowedRadius:F0}m)",
                distanceMeters = Math.Round(distance),
                allowedRadiusMeters = allowedRadius
            });
        }

        session.LocationVerified = true;
        session.Status = VerificationSessionStatus.LocationVerified;
        await _db.SaveChangesAsync();

        return Ok(new
        {
            locationVerified = true,
            distanceMeters = Math.Round(distance),
            allowedRadiusMeters = allowedRadius,
            status = "LOCATION_VERIFIED"
        });
    }

    // ─── 4. COMPLETE ATTENDANCE ─────────────────────────────────────────────
    [HttpPost("{sessionId:int}/complete")]
    public async Task<IActionResult> CompleteAttendance(int sessionId)
    {
        var session = await _db.AttendanceVerificationSessions
            .Include(s => s.Department)
            .FirstOrDefaultAsync(s => s.Id == sessionId && s.UserId == CurrentUserId);

        if (session == null || session.ExpiresAt < DateTime.UtcNow || session.Status == VerificationSessionStatus.Expired)
            return BadRequest(new { code = "SESSION_EXPIRED", message = "Session expired or invalid" });

        if (!session.FaceVerified || !session.LocationVerified || !session.LivenessVerified)
            return BadRequest(new { code = "VERIFICATION_INCOMPLETE", message = "All verification steps (Face + Liveness + GPS Location) must pass before completing." });

        // Double check duplicate attendance
        var existing = await _db.Attendances
            .AnyAsync(a => a.InternId == session.InternId && a.Timestamp.Date == DateTime.UtcNow.Date);
        if (existing)
            return BadRequest(new { code = "ATTENDANCE_ALREADY_MARKED", message = "Attendance already marked for today" });

        var attendance = new Attendance
        {
            InternId = session.InternId,
            Timestamp = DateTime.UtcNow,
            Latitude = session.Latitude ?? 0,
            Longitude = session.Longitude ?? 0,
            GpsAccuracy = session.GpsAccuracy,
            IsInRange = true,
            DistanceMeters = session.DistanceFromDepartment ?? 0,
            FaceVerified = true,
            FaceConfidence = 0.95,
            LivenessVerified = true,
            LocationVerified = true,
            VerificationSessionId = session.Id,
            Status = AttendanceStatus.Present,
            Notes = $"Verified PRESENT at {session.Department?.Name} ({session.DistanceFromDepartment:F1}m away)"
        };

        _db.Attendances.Add(attendance);
        session.Status = VerificationSessionStatus.Completed;
        session.CompletedAt = DateTime.UtcNow;

        _db.ActivityLogs.Add(new ActivityLog
        {
            LogType = ActivityLogType.AttendanceMarked,
            Description = $"Intern marked PRESENT at {session.Department?.Name}",
            PerformedByUserId = CurrentUserId,
            TargetInternId = session.InternId,
            DepartmentId = session.DepartmentId,
            CreatedAt = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            status = "PRESENT",
            checkInTime = attendance.Timestamp,
            departmentName = session.Department?.Name,
            distanceMeters = Math.Round(session.DistanceFromDepartment ?? 0)
        });
    }
}

public class FaceVerificationRequest
{
    public float[]? FaceEmbedding { get; set; }
    public bool LivenessVerified { get; set; }
}

public class LocationVerificationRequest
{
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public double GpsAccuracy { get; set; }
}
