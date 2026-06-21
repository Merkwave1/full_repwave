namespace RepWave.Domain.Entities;

public class Country
{
    public int CountriesId { get; set; }
    public string CountriesNameAr { get; set; } = string.Empty;
    public string? CountriesNameEn { get; set; }
    public int CountriesSortOrder { get; set; } = 0;

    public ICollection<Governorate> Governorates { get; set; } = [];
    public ICollection<Client> Clients { get; set; } = [];
}
