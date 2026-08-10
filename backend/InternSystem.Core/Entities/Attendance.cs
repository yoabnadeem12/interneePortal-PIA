namespace InternSystem.Core.Entities;

public enum AttendanceStatus
{
    Present,
    Absent,
    PendingReview  // Face check failed 3 times
}

public class Attendance
{
    public int Id { get; set; }
    public int InternId { get; set; }
    public Intern Intern { get; set; } = null!;

    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public bool IsInRange { get; set; }
    public double DistanceMeters { get; set; }

    public bool FaceVerified { get; set; }
    public double FaceConfidence { get; set; }
    public bool LivenessVerified { get; set; }
    public bool LocationVerified { get; set; }
    public double? GpsAccuracy { get; set; }
    public int? VerificationSessionId { get; set; }

    public AttendanceStatus Status { get; set; }
    public string? Notes { get; set; }
}
