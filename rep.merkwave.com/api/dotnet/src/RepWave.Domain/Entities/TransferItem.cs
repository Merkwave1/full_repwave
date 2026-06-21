namespace RepWave.Domain.Entities;

public class TransferItem
{
    public int TransferItemsId { get; set; }
    public int TransferItemsTransferId { get; set; }
    public int? TransferItemsVariantId { get; set; }
    public int? TransferItemsPackagingTypeId { get; set; }
    public int TransferItemsQuantity { get; set; } = 0;

    public Transfer? Transfer { get; set; }
    public ProductVariant? Variant { get; set; }
}
