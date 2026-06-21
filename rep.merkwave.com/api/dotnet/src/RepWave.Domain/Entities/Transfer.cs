namespace RepWave.Domain.Entities;

public class Transfer
{
    public int TransferId { get; set; }
    public int? TransferFromWarehouseId { get; set; }
    public int? TransferToWarehouseId { get; set; }
    public int? TransferUserId { get; set; }
    public string TransferStatus { get; set; } = "Pending";
    public DateTime? TransferDate { get; set; }
    public string? TransferNotes { get; set; }

    public Warehouse? FromWarehouse { get; set; }
    public Warehouse? ToWarehouse { get; set; }
    public User? User { get; set; }
    public ICollection<TransferItem> Items { get; set; } = [];
}
