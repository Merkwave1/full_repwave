namespace RepWave.Domain.Entities;

public class GoodsReceiptItem
{
    public int GoodsReceiptItemsId { get; set; }
    public int? GoodsReceiptItemsGoodsReceiptId { get; set; }
    public int? GoodsReceiptItemsVariantId { get; set; }
    public int? GoodsReceiptItemsPackagingTypeId { get; set; }
    public int QuantityReceived { get; set; } = 0;
    public DateOnly? GoodsReceiptItemsProductionDate { get; set; }

    public GoodsReceipt? GoodsReceipt { get; set; }
}
