namespace RepWave.Domain.Entities;

public class Warehouse
{
    public int WarehouseId { get; set; }
    public string WarehouseName { get; set; } = string.Empty;
    public string? WarehouseType { get; set; }
    public string? WarehouseCode { get; set; }
    public string? WarehouseAddress { get; set; }
    public string? WarehouseContactPerson { get; set; }
    public string? WarehousePhone { get; set; }
    public string WarehouseStatus { get; set; } = "active";
    public int? WarehouseRepresentativeUserId { get; set; }

    public User? RepresentativeUser { get; set; }
    public ICollection<Inventory> Inventories { get; set; } = [];
    public ICollection<SalesOrder> SalesOrders { get; set; } = [];
    public ICollection<PurchaseOrder> PurchaseOrders { get; set; } = [];
    public ICollection<GoodsReceipt> GoodsReceipts { get; set; } = [];
}
