namespace RepWave.Domain.Entities;

public class TransferRequestItem
{
    public int RequestItemId { get; set; }
    public int RequestId { get; set; }
    public int? VariantId { get; set; }
    public int? PackagingTypeId { get; set; }
    public decimal RequestedQuantity { get; set; }
    public string? RequestItemNote { get; set; }

    public TransferRequest? Request { get; set; }
    public ProductVariant? Variant { get; set; }
    public PackagingType? PackagingType { get; set; }
}
