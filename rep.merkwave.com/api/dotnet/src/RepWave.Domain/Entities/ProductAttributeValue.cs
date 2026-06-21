namespace RepWave.Domain.Entities;

public class ProductAttributeValue
{
    public int AttributeValueId { get; set; }
    public int AttributeValueAttributeId { get; set; }
    public string AttributeValueValue { get; set; } = string.Empty;

    public ProductAttribute? Attribute { get; set; }
    public ICollection<ProductVariantAttributeMap> VariantMappings { get; set; } = [];
}
