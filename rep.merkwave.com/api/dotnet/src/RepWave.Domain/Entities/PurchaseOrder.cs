namespace RepWave.Domain.Entities;

public class PurchaseOrder
{
    public int PurchaseOrdersId { get; set; }
    public int? PurchaseOrdersSupplierId { get; set; }
    public int? PurchaseOrdersWarehouseId { get; set; }
    public DateTime? PurchaseOrdersOrderDate { get; set; }
    public DateOnly? PurchaseOrdersExpectedDeliveryDate { get; set; }
    public DateOnly? PurchaseOrdersActualDeliveryDate { get; set; }
    public decimal PurchaseOrdersTotalAmount { get; set; } = 0;
    public string PurchaseOrdersStatus { get; set; } = "Ordered";
    public string? PurchaseOrdersNotes { get; set; }
    public int? PurchaseOrdersOdooId { get; set; }
    public DateTime? PurchaseOrdersCreatedAt { get; set; }
    public DateTime? PurchaseOrdersUpdatedAt { get; set; }

    public Supplier? Supplier { get; set; }
    public Warehouse? Warehouse { get; set; }
    public ICollection<PurchaseOrderItem> Items { get; set; } = [];
    public ICollection<PurchaseReturn> Returns { get; set; } = [];
    public ICollection<GoodsReceipt> GoodsReceipts { get; set; } = [];
}
