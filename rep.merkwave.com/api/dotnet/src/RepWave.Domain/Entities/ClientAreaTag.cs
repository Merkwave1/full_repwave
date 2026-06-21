namespace RepWave.Domain.Entities;

public class ClientAreaTag
{
    public int ClientAreaTagId { get; set; }
    public string ClientAreaTagName { get; set; } = string.Empty;
    public int ClientAreaTagSortOrder { get; set; } = 0;

    public ICollection<Client> Clients { get; set; } = [];
}
