namespace RepWave.Domain.Entities;

public class ClientIndustry
{
    public int ClientIndustriesId { get; set; }
    public string ClientIndustriesName { get; set; } = string.Empty;
    public int ClientIndustriesSortOrder { get; set; } = 0;

    public ICollection<Client> Clients { get; set; } = [];
}
