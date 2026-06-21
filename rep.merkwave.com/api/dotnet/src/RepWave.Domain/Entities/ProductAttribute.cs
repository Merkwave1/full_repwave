namespace RepWave.Domain.Entities;

public class ProductAttribute
{
    public int AttributeId { get; set; }
    public string AttributeName { get; set; } = string.Empty;
    public string? AttributeDescription { get; set; }

    public ICollection<ProductAttributeValue> Values { get; set; } = [];
}
