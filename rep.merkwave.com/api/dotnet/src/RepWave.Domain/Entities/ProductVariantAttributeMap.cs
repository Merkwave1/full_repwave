namespace RepWave.Domain.Entities;

public class ProductVariantAttributeMap
{
    public int VariantAttributeMapVariantId { get; set; }
    public int VariantAttributeMapAttributeValueId { get; set; }

    public ProductVariant? Variant { get; set; }
    public ProductAttributeValue? AttributeValue { get; set; }
}
