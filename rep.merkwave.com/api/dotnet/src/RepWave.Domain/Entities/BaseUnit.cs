namespace RepWave.Domain.Entities;

public class BaseUnit
{
    public int BaseUnitsId { get; set; }
    public string BaseUnitsName { get; set; } = string.Empty;
    public string? BaseUnitsDescription { get; set; }

    public ICollection<Product> Products { get; set; } = [];
    public ICollection<PackagingType> PackagingTypes { get; set; } = [];
}
