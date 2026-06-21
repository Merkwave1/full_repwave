namespace RepWave.Domain.Entities;

public class SalesOrderItem
{
    public int SalesOrderItemsId { get; set; }
    public int SalesOrderItemsSalesOrderId { get; set; }
    public int? SalesOrderItemsVariantId { get; set; }
    public int? SalesOrderItemsPackagingTypeId { get; set; }
    public int SalesOrderItemsQuantity { get; set; } = 0;
    public decimal SalesOrderItemsUnitPrice { get; set; } = 0;
    public decimal SalesOrderItemsSubtotal { get; set; } = 0;
    public decimal SalesOrderItemsDiscountAmount { get; set; } = 0;
    public decimal SalesOrderItemsTaxAmount { get; set; } = 0;
    public decimal SalesOrderItemsTaxRate { get; set; } = 0;
    public bool SalesOrderItemsHasTax { get; set; } = false;
    public decimal SalesOrderItemsTotalPrice { get; set; } = 0;
    public string? SalesOrderItemsNotes { get; set; }

    public SalesOrder? SalesOrder { get; set; }
    public ProductVariant? Variant { get; set; }
    public PackagingType? PackagingType { get; set; }
}
