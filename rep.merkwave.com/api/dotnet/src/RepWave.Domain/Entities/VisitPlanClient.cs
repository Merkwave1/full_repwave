namespace RepWave.Domain.Entities;

public class VisitPlanClient
{
    public int Id { get; set; }
    public int VisitPlanId { get; set; }
    public int ClientId { get; set; }
    public int VisitOrder { get; set; } = 0;
    public string? Notes { get; set; }

    public VisitPlan? VisitPlan { get; set; }
    public Client? Client { get; set; }
}
