namespace InternSystem.Core.Entities;

public enum UserRole
{
    Admin = 0,
    Mentor = 1,
    Intern = 2
}

public class User
{
    public int Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public UserRole Role { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? RefreshToken { get; set; }
    public DateTime? RefreshTokenExpiry { get; set; }

    public Mentor? Mentor { get; set; }
    public Intern? Intern { get; set; }
}
