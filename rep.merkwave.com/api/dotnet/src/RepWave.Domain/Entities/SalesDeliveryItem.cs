namespace RepWave.Domain.Entities;

public class SalesDeliveryItem
{
    public int SalesDeliveryItemsId { get; set; }
    public int? SalesDeliveryItemsSalesDeliveryId { get; set; }
    public int? SalesDeliveryItemsSalesOrderItemId { get; set; }
    public int SalesDeliveryItemsQuantityDelivered { get; set; } = 0;

    public SalesDelivery? SalesDelivery { get; set; }
    public SalesOrderItem? SalesOrderItem { get; set; }
}
