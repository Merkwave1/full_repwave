namespace RepWave.Domain.Entities;

public class Governorate
{
    public int GovernoratesId { get; set; }
    public string GovernoratesNameAr { get; set; } = string.Empty;
    public string? GovernoratesNameEn { get; set; }
    public int? GovernoratesCountryId { get; set; }
    public int GovernoratesSortOrder { get; set; } = 0;

    public Country? Country { get; set; }
    public ICollection<Client> Clients { get; set; } = [];
}
