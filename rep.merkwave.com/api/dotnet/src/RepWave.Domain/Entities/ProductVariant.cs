namespace RepWave.Domain.Entities;

public class ProductVariant
{
    public int VariantId { get; set; }
    public int VariantProductsId { get; set; }
    public string? VariantName { get; set; }
    public string? VariantSku { get; set; }
    public string? VariantBarcode { get; set; }
    public string? VariantImageUrl { get; set; }
    public decimal VariantUnitPrice { get; set; } = 0;
    public decimal VariantCostPrice { get; set; } = 0;
    public decimal? VariantWeight { get; set; }
    public decimal? VariantVolume { get; set; }
    public string VariantStatus { get; set; } = "active";
    public string? VariantNotes { get; set; }
    public bool VariantHasTax { get; set; } = false;
    public decimal VariantTaxRate { get; set; } = 0;
    public int? VariantOdooProductId { get; set; }

    // Navigation
    public Product? Product { get; set; }
    public ICollection<ProductVariantAttributeMap> AttributeMappings { get; set; } = [];
    public ICollection<Inventory> Inventories { get; set; } = [];
}
