namespace RepWave.Domain.Entities;

public class PurchaseReturn
{
    public int PurchaseReturnsId { get; set; }
    public int? PurchaseReturnsPurchaseOrderId { get; set; }
    public int? PurchaseReturnsSupplierId { get; set; }
    public int? PurchaseReturnsWarehouseId { get; set; }
    public DateTime? PurchaseReturnsDate { get; set; }
    public decimal PurchaseReturnsTotalAmount { get; set; } = 0;
    public string PurchaseReturnsStatus { get; set; } = "Pending";
    public string? PurchaseReturnsNotes { get; set; }
    public string? PurchaseReturnsReason { get; set; }
    public DateTime? PurchaseReturnsCreatedAt { get; set; }

    public PurchaseOrder? PurchaseOrder { get; set; }
    public Supplier? Supplier { get; set; }
    public Warehouse? Warehouse { get; set; }
    public ICollection<PurchaseReturnItem> Items { get; set; } = [];
}
