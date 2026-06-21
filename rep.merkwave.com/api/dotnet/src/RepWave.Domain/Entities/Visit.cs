namespace RepWave.Domain.Entities;

public class Visit
{
    public int VisitsId { get; set; }
    public int VisitsClientId { get; set; }
    public int VisitsRepUserId { get; set; }
    public DateTime VisitsStartTime { get; set; }
    public DateTime? VisitsEndTime { get; set; }
    public decimal? VisitsStartLatitude { get; set; }
    public decimal? VisitsStartLongitude { get; set; }
    public decimal? VisitsEndLatitude { get; set; }
    public decimal? VisitsEndLongitude { get; set; }
    public string? VisitsPurpose { get; set; }
    public string? VisitsOutcome { get; set; }
    public string? VisitsNotes { get; set; }
    public string VisitsStatus { get; set; } = "Started";
    public DateTime? VisitsCreatedAt { get; set; }
    public DateTime? VisitsUpdatedAt { get; set; }

    public Client? Client { get; set; }
    public User? RepUser { get; set; }
    public ICollection<VisitActivity> Activities { get; set; } = [];
}
