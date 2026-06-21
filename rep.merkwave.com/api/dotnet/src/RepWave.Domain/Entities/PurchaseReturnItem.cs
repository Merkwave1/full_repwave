namespace RepWave.Domain.Entities;

public class PurchaseReturnItem
{
    public int PurchaseReturnItemsId { get; set; }
    public int PurchaseReturnItemsReturnId { get; set; }
    public int? PurchaseReturnItemsPurchaseOrderItemId { get; set; }
    public int PurchaseReturnItemsQuantity { get; set; } = 0;
    public decimal PurchaseReturnItemsUnitCost { get; set; } = 0;
    public decimal PurchaseReturnItemsTotalCost { get; set; } = 0;
    public string? PurchaseReturnItemsNotes { get; set; }

    public PurchaseReturn? PurchaseReturn { get; set; }
    public PurchaseOrderItem? PurchaseOrderItem { get; set; }
}
