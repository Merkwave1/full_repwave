namespace RepWave.Domain.Entities;

public class ClientType
{
    public int ClientTypeId { get; set; }
    public string ClientTypeName { get; set; } = string.Empty;
    public int ClientTypeSortOrder { get; set; } = 0;

    public ICollection<Client> Clients { get; set; } = [];
}
