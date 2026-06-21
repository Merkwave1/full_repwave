namespace RepWave.Domain.Entities;

public class SalesDelivery
{
    public int SalesDeliveriesId { get; set; }
    public int? SalesDeliveriesSalesOrderId { get; set; }
    public string SalesDeliveriesDeliveryStatus { get; set; } = "Preparing";
    public int? SalesDeliveriesDeliveredBy { get; set; }
    public DateTime? SalesDeliveriesDate { get; set; }
    public string? SalesDeliveriesNotes { get; set; }

    public SalesOrder? SalesOrder { get; set; }
    public User? DeliveredByUser { get; set; }
    public ICollection<SalesDeliveryItem> Items { get; set; } = [];
}
