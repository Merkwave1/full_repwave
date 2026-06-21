namespace RepWave.Domain.Entities;

public class Product
{
    public int ProductsId { get; set; }
    public string ProductsName { get; set; } = string.Empty;
    public int? ProductsCategoryId { get; set; }
    public int? ProductsUnitOfMeasureId { get; set; }
    public string? ProductsBrand { get; set; }
    public string? ProductsDescription { get; set; }
    public string? ProductsImageUrl { get; set; }
    public bool ProductsIsActive { get; set; } = true;
    public decimal? ProductsWeight { get; set; }
    public decimal? ProductsVolume { get; set; }
    public int? ProductsSupplierId { get; set; }
    public int? ProductsExpiryPeriodInDays { get; set; }
    public bool ProductsHasTax { get; set; } = false;
    public decimal ProductsTaxRate { get; set; } = 0;
    public DateTime? ProductsCreatedAt { get; set; }
    public DateTime? ProductsUpdatedAt { get; set; }

    // Navigation
    public Category? Category { get; set; }
    public BaseUnit? UnitOfMeasure { get; set; }
    public ICollection<ProductVariant> Variants { get; set; } = [];
    public ICollection<ProductPreferredPackaging> PreferredPackagings { get; set; } = [];
    public ICollection<ClientInterestedProduct> InterestedByClients { get; set; } = [];
}
