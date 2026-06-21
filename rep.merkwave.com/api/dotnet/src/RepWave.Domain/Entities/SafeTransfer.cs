namespace RepWave.Domain.Entities;

/// <summary>Transfer of cash between two safes.</summary>
public class SafeTransfer
{
    public int SafeTransferId { get; set; }
    public int? FromSafeId { get; set; }
    public int? ToSafeId { get; set; }
    public decimal Amount { get; set; } = 0;
    public string? Notes { get; set; }
    public string Status { get; set; } = "Completed";
    public int? CreatedBy { get; set; }
    public DateTime? TransferDate { get; set; }
    public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;

    public Safe? FromSafe { get; set; }
    public Safe? ToSafe { get; set; }
}
