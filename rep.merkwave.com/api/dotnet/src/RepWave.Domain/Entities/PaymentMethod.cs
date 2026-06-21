namespace RepWave.Domain.Entities;

public class PaymentMethod
{
    public int PaymentMethodsId { get; set; }
    public string PaymentMethodsName { get; set; } = string.Empty;
    public string? PaymentMethodsDescription { get; set; }
    public string? PaymentMethodsType { get; set; }
    public DateTime? PaymentMethodsCreatedAt { get; set; }
    public DateTime? PaymentMethodsUpdatedAt { get; set; }

    public ICollection<Safe> Safes { get; set; } = [];
    public ICollection<Payment> Payments { get; set; } = [];
    public ICollection<Refund> Refunds { get; set; } = [];
}
