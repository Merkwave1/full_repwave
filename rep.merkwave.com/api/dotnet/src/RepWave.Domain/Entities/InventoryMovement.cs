namespace RepWave.Domain.Entities;

public class InventoryMovement
{
    public int MovementId { get; set; }
    public int? ProductVariantId { get; set; }
    public int? WarehouseId { get; set; }
    public decimal Quantity { get; set; } = 0;
    public string? MovementType { get; set; }
    public int? ReferenceId { get; set; }
    public DateTime? MovementDate { get; set; }
    public string? Notes { get; set; }
    public int? CreatedBy { get; set; }
    public DateTime? CreatedAt { get; set; }

    public ProductVariant? Variant { get; set; }
    public Warehouse? Warehouse { get; set; }
}
