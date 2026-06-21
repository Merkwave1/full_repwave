namespace RepWave.Domain.Entities;

/// <summary>Junction: User assigned to a specific Safe (for cash reps).</summary>
public class UserSafe
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public int SafeId { get; set; }
    public DateTime? AssignedAt { get; set; } = DateTime.UtcNow;

    public User? User { get; set; }
    public Safe? Safe { get; set; }
}
