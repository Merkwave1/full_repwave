namespace RepWave.Domain.Entities;

public class PurchaseOrderItem
{
    public int PurchaseOrderItemsId { get; set; }
    public int PurchaseOrderItemsPurchaseOrderId { get; set; }
    public int? PurchaseOrderItemsVariantId { get; set; }
    public int? PurchaseOrderItemsPackagingTypeId { get; set; }
    public int PurchaseOrderItemsQuantityOrdered { get; set; } = 0;
    public int PurchaseOrderItemsQuantityReceived { get; set; } = 0;
    public int PurchaseOrderItemsQuantityReturned { get; set; } = 0;
    public decimal PurchaseOrderItemsUnitCost { get; set; } = 0;
    public decimal PurchaseOrderItemsTotalCost { get; set; } = 0;
    public string? PurchaseOrderItemsNotes { get; set; }

    public PurchaseOrder? PurchaseOrder { get; set; }
    public ProductVariant? Variant { get; set; }
    public PackagingType? PackagingType { get; set; }
}
