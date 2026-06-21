namespace RepWave.Domain.Entities;

/// <summary>Junction: User assigned to a specific Warehouse.</summary>
public class UserWarehouse
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public int WarehouseId { get; set; }
    public DateTime? AssignedAt { get; set; } = DateTime.UtcNow;

    public User? User { get; set; }
    public Warehouse? Warehouse { get; set; }
}
