namespace RepWave.Domain.Entities;

public class VisitActivity
{
    public int ActivityId { get; set; }
    public int ActivityVisitId { get; set; }
    public int ActivityUserId { get; set; }
    public string ActivityType { get; set; } = string.Empty;
    public int? ActivityReferenceId { get; set; }
    public string? ActivityDescription { get; set; }
    public DateTime? ActivityTimestamp { get; set; }

    public Visit? Visit { get; set; }
    public User? User { get; set; }
}
