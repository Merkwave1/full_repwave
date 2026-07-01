namespace RepWave.Domain.Entities;

public class TransferRequest
{
    public int RequestId { get; set; }
    public string RequestStatus { get; set; } = "Pending";
    public DateTime? RequestDate { get; set; }
    public string? RequestNotes { get; set; }
    public int? RequestSourceWarehouseId { get; set; }
    public int? RequestDestinationWarehouseId { get; set; }
    public int? RequestCreatedByUserId { get; set; }

    public Warehouse? SourceWarehouse { get; set; }
    public Warehouse? DestinationWarehouse { get; set; }
    public User? CreatedByUser { get; set; }
    public ICollection<TransferRequestItem> Items { get; set; } = [];
}
