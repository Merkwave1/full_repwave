namespace RepWave.Domain.Entities;

public class User
{
    public int UsersId { get; set; }
    public string UsersName { get; set; } = string.Empty;
    public string UsersEmail { get; set; } = string.Empty;
    public string UsersPassword { get; set; } = string.Empty;
    public string UsersRole { get; set; } = "rep";
    public string? UsersPhone { get; set; }
    public string? UsersNationalId { get; set; }
    public bool UsersStatus { get; set; } = true;
    public string? UsersUuid { get; set; }
    public string? UsersImage { get; set; }
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    // Navigation
    public ICollection<Client> Clients { get; set; } = [];
    public ICollection<SalesOrder> SalesOrders { get; set; } = [];
    public ICollection<Visit> Visits { get; set; } = [];
    public ICollection<Safe> Safes { get; set; } = [];
    public ICollection<Warehouse> Warehouses { get; set; } = [];
}
