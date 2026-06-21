namespace RepWave.Domain.Entities;

public class Supplier
{
    public int SupplierId { get; set; }
    public string SupplierName { get; set; } = string.Empty;
    public string? SupplierContactPerson { get; set; }
    public string? SupplierPhone { get; set; }
    public string? SupplierEmail { get; set; }
    public string? SupplierAddress { get; set; }
    public string? SupplierNotes { get; set; }
    public decimal SupplierBalance { get; set; } = 0;
    public DateTime? SupplierCreatedAt { get; set; }
    public int? SupplierOdooPartnerId { get; set; }

    public ICollection<PurchaseOrder> PurchaseOrders { get; set; } = [];
    public ICollection<PurchaseReturn> PurchaseReturns { get; set; } = [];
}
