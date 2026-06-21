namespace RepWave.Domain.Entities;

public class SafeTransaction
{
    public int SafeTransactionsId { get; set; }
    public int? SafeTransactionsSafeId { get; set; }
    public string? SafeTransactionsType { get; set; }
    public decimal SafeTransactionsAmount { get; set; } = 0;
    public decimal SafeTransactionsBalanceBefore { get; set; } = 0;
    public decimal SafeTransactionsBalanceAfter { get; set; } = 0;
    public string? SafeTransactionsDescription { get; set; }
    public string? SafeTransactionsReference { get; set; }
    public DateTime? SafeTransactionsDate { get; set; }
    public int? SafeTransactionsCreatedBy { get; set; }
    public string SafeTransactionsStatus { get; set; } = "pending";
    public string? SafeTransactionsRelatedTable { get; set; }
    public DateTime? SafeTransactionsCreatedAt { get; set; }

    public Safe? Safe { get; set; }
    public User? CreatedByUser { get; set; }
}
