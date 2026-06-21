namespace RepWave.Domain.Entities;

public class Invoice
{
    public int InvoicesId { get; set; }
    public int? InvoicesClientId { get; set; }
    public DateTime? InvoicesDate { get; set; }
    public DateTime? InvoicesDueDate { get; set; }
    public DateTime? InvoicesExpirationDate { get; set; }
    public decimal InvoicesTotalAmount { get; set; } = 0;
    public string InvoicesStatus { get; set; } = "draft";
    public string? InvoicesNotes { get; set; }
    public DateTime? InvoicesCreatedAt { get; set; }
    public DateTime? InvoicesUpdatedAt { get; set; }

    public Client? Client { get; set; }
    public ICollection<InvoiceItem> Items { get; set; } = [];
}
