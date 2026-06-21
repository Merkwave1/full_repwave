namespace RepWave.Domain.Entities;

public class GoodsReceipt
{
    public int GoodsReceiptId { get; set; }
    public int? GoodsReceiptWarehouseId { get; set; }
    public DateTime? GoodsReceiptDate { get; set; }
    public string? GoodsReceiptNotes { get; set; }
    public int? GoodsReceiptReceivedByUserId { get; set; }
    public string? GoodsReceiptOdooPickingId { get; set; }
    public int? GoodsReceiptPurchaseOrderId { get; set; }

    public Warehouse? Warehouse { get; set; }
    public User? ReceivedByUser { get; set; }
    public PurchaseOrder? PurchaseOrder { get; set; }
    public ICollection<GoodsReceiptItem> Items { get; set; } = [];
}
