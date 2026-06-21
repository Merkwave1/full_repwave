namespace RepWave.Domain.Entities;

public class Payment
{
    public int PaymentsId { get; set; }
    public int? PaymentsClientId { get; set; }
    public int? PaymentsMethodId { get; set; }
    public decimal PaymentsAmount { get; set; } = 0;
    public DateOnly? PaymentsDate { get; set; }
    public string? PaymentsTransactionId { get; set; }
    public int? PaymentsSafeId { get; set; }
    public string? PaymentsNotes { get; set; }
    public int? PaymentsRepUserId { get; set; }
    public int? PaymentsVisitId { get; set; }
    public int? PaymentsSafeTransactionId { get; set; }
    public int? PaymentsOdooPaymentId { get; set; }
    public DateTime? PaymentsCreatedAt { get; set; }
    public DateTime? PaymentsUpdatedAt { get; set; }

    public Client? Client { get; set; }
    public PaymentMethod? Method { get; set; }
    public Safe? Safe { get; set; }
    public User? RepUser { get; set; }
}
