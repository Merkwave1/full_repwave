namespace RepWave.Domain.Entities;

public class Refund
{
    public int RefundsId { get; set; }
    public int? RefundsClientId { get; set; }
    public int? RefundsMethodId { get; set; }
    public decimal RefundsAmount { get; set; } = 0;
    public DateOnly? RefundsDate { get; set; }
    public string? RefundsTransactionId { get; set; }
    public int? RefundsSafeId { get; set; }
    public string? RefundsNotes { get; set; }
    public int? RefundsRepUserId { get; set; }
    public int? RefundsVisitId { get; set; }
    public int? RefundsSafeTransactionId { get; set; }
    public int? RefundsOdooPaymentId { get; set; }
    public DateTime? RefundsCreatedAt { get; set; }
    public DateTime? RefundsUpdatedAt { get; set; }

    public Client? Client { get; set; }
    public PaymentMethod? Method { get; set; }
    public Safe? Safe { get; set; }
    public User? RepUser { get; set; }
}
