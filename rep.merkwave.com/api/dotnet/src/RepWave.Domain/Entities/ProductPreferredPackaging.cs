namespace RepWave.Domain.Entities;

public class ProductPreferredPackaging
{
    public int Id { get; set; }
    public int ProductsId { get; set; }
    public int PackagingTypeId { get; set; }

    public Product? Product { get; set; }
    public PackagingType? PackagingType { get; set; }
}
