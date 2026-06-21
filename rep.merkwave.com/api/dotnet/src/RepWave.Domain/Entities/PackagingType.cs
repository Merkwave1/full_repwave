namespace RepWave.Domain.Entities;

public class PackagingType
{
    public int PackagingTypesId { get; set; }
    public string PackagingTypesName { get; set; } = string.Empty;
    public string? PackagingTypesDescription { get; set; }
    public decimal PackagingTypesDefaultConversionFactor { get; set; } = 1;
    public int? PackagingTypesCompatibleBaseUnitId { get; set; }

    public BaseUnit? CompatibleBaseUnit { get; set; }
    public ICollection<ProductPreferredPackaging> PreferredPackagings { get; set; } = [];
}
