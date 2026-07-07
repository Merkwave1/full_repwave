namespace RepWave.Domain.Entities;

/// <summary>Super-admin account for the RepWave admin dashboard (master DB only).</summary>
public class AdminUser
{
    public int AdminUserId { get; set; }
    public string Email { get; set; } = null!;
    public string PasswordHash { get; set; } = null!;
    public string Name { get; set; } = null!;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
