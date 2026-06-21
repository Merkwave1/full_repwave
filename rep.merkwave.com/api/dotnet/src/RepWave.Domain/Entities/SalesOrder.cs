namespace RepWave.Domain.Entities;

public class SalesOrder
{
    public int SalesOrdersId { get; set; }
    public int? SalesOrdersClientId { get; set; }
    public int? SalesOrdersRepresentativeId { get; set; }
    public int? SalesOrdersWarehouseId { get; set; }
    public int? SalesOrdersVisitId { get; set; }
    public string SalesOrdersStatus { get; set; } = "Pending";
    public string SalesOrdersDeliveryStatus { get; set; } = "Not Delivered";
    public DateTime? SalesOrdersOrderDate { get; set; }
    public DateOnly? SalesOrdersExpectedDeliveryDate { get; set; }
    public DateOnly? SalesOrdersActualDeliveryDate { get; set; }
    public decimal SalesOrdersSubtotal { get; set; } = 0;
    public decimal SalesOrdersDiscountAmount { get; set; } = 0;
    public decimal SalesOrdersTaxAmount { get; set; } = 0;
    public decimal SalesOrdersTotalAmount { get; set; } = 0;
    public string? SalesOrdersNotes { get; set; }
    public int? SalesOrdersOdooInvoiceId { get; set; }
    public DateTime? SalesOrdersCreatedAt { get; set; }
    public DateTime? SalesOrdersUpdatedAt { get; set; }

    public Client? Client { get; set; }
    public User? Representative { get; set; }
    public Warehouse? Warehouse { get; set; }
    public ICollection<SalesOrderItem> Items { get; set; } = [];
    public ICollection<SalesDelivery> Deliveries { get; set; } = [];
    public ICollection<SalesReturn> Returns { get; set; } = [];
}
