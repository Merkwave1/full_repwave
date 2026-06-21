namespace RepWave.Domain.Entities;

public class Inventory
{
    public int InventoryId { get; set; }
    public int VariantId { get; set; }
    public int? PackagingTypeId { get; set; }
    public int? WarehouseId { get; set; }
    public DateOnly? InventoryProductionDate { get; set; }
    public int InventoryQuantity { get; set; } = 0;
    public string InventoryStatus { get; set; } = "available";

    public ProductVariant? Variant { get; set; }
    public PackagingType? PackagingType { get; set; }
    public Warehouse? Warehouse { get; set; }
}
