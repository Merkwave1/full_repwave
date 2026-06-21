namespace RepWave.Domain.Entities;

/// <summary>Payment made to a supplier against a purchase order.</summary>
public class SupplierPayment
{
    public int SupplierPaymentId { get; set; }
    public int? SupplierId { get; set; }
    public int? PurchaseOrderId { get; set; }
    public int? SafeId { get; set; }
    public int? PaymentMethodId { get; set; }
    public decimal Amount { get; set; } = 0;
    public DateOnly? PaymentDate { get; set; }
    public string? Notes { get; set; }
    public int? CreatedBy { get; set; }
    public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;

    public Supplier? Supplier { get; set; }
    public PurchaseOrder? PurchaseOrder { get; set; }
    public Safe? Safe { get; set; }
    public PaymentMethod? PaymentMethod { get; set; }
}
