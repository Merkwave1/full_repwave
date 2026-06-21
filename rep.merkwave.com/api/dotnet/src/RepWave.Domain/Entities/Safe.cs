namespace RepWave.Domain.Entities;

public class Safe
{
    public int SafesId { get; set; }
    public string SafesName { get; set; } = string.Empty;
    public string? SafesDescription { get; set; }
    public decimal SafesBalance { get; set; } = 0;
    public string? SafesType { get; set; }
    public int? SafesRepUserId { get; set; }
    public int? SafesPaymentMethodId { get; set; }
    public bool SafesIsActive { get; set; } = true;
    public string? SafesColor { get; set; }
    public int? SafesOdooJournalId { get; set; }
    public DateTime? SafesCreatedAt { get; set; }
    public DateTime? SafesUpdatedAt { get; set; }

    public User? RepUser { get; set; }
    public PaymentMethod? PaymentMethod { get; set; }
    public ICollection<SafeTransaction> Transactions { get; set; } = [];
    public ICollection<Payment> Payments { get; set; } = [];
    public ICollection<Refund> Refunds { get; set; } = [];
}
