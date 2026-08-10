namespace InternSystem.Core.Entities;

public class Department
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty; // e.g., "ERP", "CYBER"
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public double? RadiusMeters { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsActive { get; set; } = true;

    public ICollection<Intern> Interns { get; set; } = new List<Intern>();
    public ICollection<Mentor> Mentors { get; set; } = new List<Mentor>();
}
