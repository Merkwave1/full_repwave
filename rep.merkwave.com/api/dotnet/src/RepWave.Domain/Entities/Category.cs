namespace RepWave.Domain.Entities;

public class Category
{
    public int CategoriesId { get; set; }
    public string CategoriesName { get; set; } = string.Empty;
    public string? CategoriesDescription { get; set; }

    public ICollection<Product> Products { get; set; } = [];
}
