namespace RepWave.Domain.Entities;

public class SalesReturn
{
    public int ReturnsId { get; set; }
    public int? ReturnsClientId { get; set; }
    public int? ReturnsCreatedByUserId { get; set; }
    public int? ReturnsSalesOrderId { get; set; }
    public DateTime? ReturnsDate { get; set; }
    public string? ReturnsReason { get; set; }
    public decimal ReturnsTotalAmount { get; set; } = 0;
    public string ReturnsStatus { get; set; } = "Pending";
    public string? ReturnsNotes { get; set; }
    public int? ReturnsOdooPickingId { get; set; }
    public decimal ManualDiscount { get; set; } = 0;
    public int? SalesReturnsVisitId { get; set; }
    public DateTime? ReturnsCreatedAt { get; set; }
    public DateTime? ReturnsUpdatedAt { get; set; }

    public Client? Client { get; set; }
    public User? CreatedByUser { get; set; }
    public SalesOrder? SalesOrder { get; set; }
    public ICollection<SalesReturnItem> Items { get; set; } = [];
}
