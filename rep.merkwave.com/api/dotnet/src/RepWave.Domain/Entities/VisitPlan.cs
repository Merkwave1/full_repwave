namespace RepWave.Domain.Entities;

public class VisitPlan
{
    public int VisitPlanId { get; set; }
    public string? VisitPlanName { get; set; }
    public string? VisitPlanDescription { get; set; }
    public int? UserId { get; set; }
    public string VisitPlanStatus { get; set; } = "active";
    public DateOnly? VisitPlanStartDate { get; set; }
    public DateOnly? VisitPlanEndDate { get; set; }
    public string? VisitPlanRecurrenceType { get; set; }
    public string? VisitPlanSelectedDays { get; set; }
    public int VisitPlanRepeatEvery { get; set; } = 1;
    public DateTime? VisitPlanCreatedAt { get; set; }
    public DateTime? VisitPlanUpdatedAt { get; set; }

    public User? User { get; set; }
    public ICollection<VisitPlanClient> Clients { get; set; } = [];
}
