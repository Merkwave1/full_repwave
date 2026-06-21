namespace RepWave.Domain.Entities;

public class InvoiceItem
{
    public int InvoiceItemId { get; set; }
    public int InvoiceItemInvoiceId { get; set; }
    public int? InvoiceItemProductId { get; set; }
    public int InvoiceItemQuantity { get; set; } = 0;
    public decimal InvoiceItemUnitPrice { get; set; } = 0;
    public decimal InvoiceItemTotalPrice { get; set; } = 0;
    public DateTime? InvoiceItemCreatedAt { get; set; }
    public DateTime? InvoiceItemUpdatedAt { get; set; }

    public Invoice? Invoice { get; set; }
    public Product? Product { get; set; }
}
