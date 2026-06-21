namespace RepWave.Domain.Entities;

public class FinancialTransaction
{
    public int FinancialTransactionsId { get; set; }
    public string? FinancialTransactionsType { get; set; }
    public decimal FinancialTransactionsAmount { get; set; } = 0;
    public DateTime? FinancialTransactionsDate { get; set; }
    public string? FinancialTransactionsNotes { get; set; }
    public int? FinancialTransactionsSafeId { get; set; }
    public int? FinancialTransactionsUserId { get; set; }
    public string? FinancialTransactionsReference { get; set; }
    public DateTime? FinancialTransactionsCreatedAt { get; set; }
}
