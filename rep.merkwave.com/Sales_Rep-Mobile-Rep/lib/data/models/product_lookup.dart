// lib/data/models/product_lookup.dart
// This is a conceptual update. You'll need to ensure all your existing models
// (Product, ProductCategory, ProductAttribute, PackagingType, BaseUnit, PreferredPackaging)
// are also correctly defined in this file.

int _parseInt(dynamic value, {int defaultValue = 0}) {
  if (value == null) return defaultValue;
  if (value is int) return value;
  if (value is double) return value.toInt();
  return int.tryParse(value.toString()) ?? defaultValue;
}

int? _parseNullableInt(dynamic value) {
  if (value == null) return null;
  if (value is int) return value;
  if (value is double) return value.toInt();
  final parsed = int.tryParse(value.toString());
  return parsed;
}

double? _parseNullableDouble(dynamic value) {
  if (value == null) return null;
  if (value is double) return value;
  if (value is int) return value.toDouble();
  return double.tryParse(value.toString());
}

String _parseString(dynamic value, {String defaultValue = ''}) {
  if (value == null) return defaultValue;
  return value.toString();
}

String? _parseNullableString(dynamic value) {
  if (value == null) return null;
  final stringValue = value.toString();
  if (stringValue.trim().isEmpty) return null;
  return stringValue;
}

bool? _parseNullableBool(dynamic value) {
  if (value == null) return null;
  if (value is bool) return value;
  final normalized = value.toString().toLowerCase().trim();
  if (normalized == '1' || normalized == 'true') return true;
  if (normalized == '0' || normalized == 'false') return false;
  return null;
}

// Existing models (ensure these are correctly defined based on your API responses)
class Product {
  final int productsId;
  final String productsName;
  final String? productsUnitPrice; // Use String for prices if API sends them as such
  final int? productsUnitOfMeasureId;
  final String? baseUnitName; // Added baseUnitName to Product
  final int? productsCategoryId;
  final String? productsDescription;
  final String? productsBrand;
  final String? productsImageUrl;
  final String? productsCostPrice;
  final int? productsIsActive;
  final String? productsWeight;
  final String? productsVolume;
  final int? productsSupplierId;
  final int? productsExpiryPeriodInDays;
  final List<ProductVariant> variants; // Assuming Product can still have variants if used elsewhere
  final List<PreferredPackaging> preferredPackaging; // Assuming Product can still have preferredPackaging

  Product({
    required this.productsId,
    required this.productsName,
    this.productsUnitPrice,
    this.productsUnitOfMeasureId,
    this.baseUnitName, // Added to constructor
    this.productsCategoryId,
    this.productsDescription,
    this.productsBrand,
    this.productsImageUrl,
    this.productsCostPrice,
    this.productsIsActive,
    this.productsWeight,
    this.productsVolume,
    this.productsSupplierId,
    this.productsExpiryPeriodInDays,
    this.variants = const [],
    this.preferredPackaging = const [],
  });

  factory Product.fromJson(Map<String, dynamic> json) {
    var variantsList = json['variants'] as List<dynamic>?;
    List<ProductVariant> parsedVariants = variantsList != null ? variantsList.map((v) => ProductVariant.fromJson(v as Map<String, dynamic>)).toList() : [];

    var preferredPackagingList = json['preferred_packaging'] as List<dynamic>?;
    List<PreferredPackaging> parsedPreferredPackaging = preferredPackagingList != null ? preferredPackagingList.map((v) => PreferredPackaging.fromJson(v as Map<String, dynamic>)).toList() : [];

    return Product(
      productsId: _parseInt(json['products_id']),
      productsName: _parseString(json['products_name'], defaultValue: 'Unnamed Product'),
      productsUnitPrice: _parseNullableString(json['products_unit_price']),
      productsUnitOfMeasureId: _parseNullableInt(json['products_unit_of_measure_id']),
      baseUnitName: _parseNullableString(json['base_unit_name']), // Added mapping for baseUnitName
      productsCategoryId: _parseNullableInt(json['products_category_id']),
      productsDescription: _parseNullableString(json['products_description']),
      productsBrand: _parseNullableString(json['products_brand']),
      productsImageUrl: _parseNullableString(json['products_image_url']),
      productsCostPrice: _parseNullableString(json['products_cost_price']),
      productsIsActive: _parseNullableInt(json['products_is_active']),
      productsWeight: _parseNullableString(json['products_weight']),
      productsVolume: _parseNullableString(json['products_volume']),
      productsSupplierId: _parseNullableInt(json['products_supplier_id']),
      productsExpiryPeriodInDays: _parseNullableInt(json['products_expiry_period_in_days']),
      variants: parsedVariants,
      preferredPackaging: parsedPreferredPackaging,
    );
  }

  @override
  String toString() {
    return 'Product(id: $productsId, name: $productsName)';
  }
}

class ProductCategory {
  final int categoriesId;
  final String categoriesName;
  final String? categoriesDescription;

  ProductCategory({required this.categoriesId, required this.categoriesName, this.categoriesDescription});

  factory ProductCategory.fromJson(Map<String, dynamic> json) {
    return ProductCategory(
      categoriesId: _parseInt(json['categories_id']),
      categoriesName: _parseString(json['categories_name'], defaultValue: 'Unknown Category'),
      categoriesDescription: _parseNullableString(json['categories_description']),
    );
  }

  @override
  String toString() {
    return 'ProductCategory(id: $categoriesId, name: $categoriesName)';
  }

  Map<String, dynamic> toJson() {
    return {
      'categories_id': categoriesId,
      'categories_name': categoriesName,
      'categories_description': categoriesDescription,
    };
  }
}

class ProductAttribute {
  final int attributeId;
  final String attributeName;
  final String? attributeDescription;
  final List<ProductAttributeValue> values; // List of attribute values

  ProductAttribute({
    required this.attributeId,
    required this.attributeName,
    this.attributeDescription,
    this.values = const [],
  });

  factory ProductAttribute.fromJson(Map<String, dynamic> json) {
    var valuesList = json['values'] as List<dynamic>?;
    List<ProductAttributeValue> attributeValues = valuesList != null ? valuesList.map((v) => ProductAttributeValue.fromJson(v as Map<String, dynamic>)).toList() : [];

    return ProductAttribute(
      attributeId: _parseInt(json['attribute_id']),
      attributeName: _parseString(json['attribute_name'], defaultValue: 'Unknown Attribute'),
      attributeDescription: _parseNullableString(json['attribute_description']),
      values: attributeValues,
    );
  }

  @override
  String toString() {
    return 'ProductAttribute(id: $attributeId, name: $attributeName, values: $values)';
  }
}

class ProductAttributeValue {
  final int attributeValueId;
  final String attributeValueValue;

  ProductAttributeValue({required this.attributeValueId, required this.attributeValueValue});

  factory ProductAttributeValue.fromJson(Map<String, dynamic> json) {
    return ProductAttributeValue(
      attributeValueId: _parseInt(json['attribute_value_id']),
      attributeValueValue: _parseString(json['attribute_value_value'], defaultValue: ''),
    );
  }

  @override
  String toString() {
    return 'ProductAttributeValue(id: $attributeValueId, value: $attributeValueValue)';
  }
}

class PackagingType {
  final int packagingTypesId;
  final String packagingTypesName;
  final String? packagingTypesDescription;
  final String? packagingTypesDefaultConversionFactor;
  final int? packagingTypesCompatibleBaseUnitId;
  final String? compatibleBaseUnitName;

  PackagingType({
    required this.packagingTypesId,
    required this.packagingTypesName,
    this.packagingTypesDescription,
    this.packagingTypesDefaultConversionFactor,
    this.packagingTypesCompatibleBaseUnitId,
    this.compatibleBaseUnitName,
  });

  factory PackagingType.fromJson(Map<String, dynamic> json) {
    return PackagingType(
      packagingTypesId: _parseInt(json['packaging_types_id']),
      packagingTypesName: _parseString(json['packaging_types_name'], defaultValue: 'Unknown Packaging'),
      packagingTypesDescription: _parseNullableString(json['packaging_types_description']),
      packagingTypesDefaultConversionFactor: _parseNullableString(json['packaging_types_default_conversion_factor']),
      packagingTypesCompatibleBaseUnitId: _parseNullableInt(json['packaging_types_compatible_base_unit_id']),
      compatibleBaseUnitName: _parseNullableString(json['compatible_base_unit_name']),
    );
  }

  @override
  String toString() {
    return 'PackagingType(id: $packagingTypesId, name: $packagingTypesName)';
  }

  Map<String, dynamic> toJson() {
    return {
      'packaging_types_id': packagingTypesId,
      'packaging_types_name': packagingTypesName,
      'packaging_types_description': packagingTypesDescription,
      'packaging_types_default_conversion_factor': packagingTypesDefaultConversionFactor,
      'packaging_types_compatible_base_unit_id': packagingTypesCompatibleBaseUnitId,
      'compatible_base_unit_name': compatibleBaseUnitName,
    };
  }

  // ADDED: Override == and hashCode for proper comparison in DropdownButton
  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is PackagingType && other.packagingTypesId == packagingTypesId;
  }

  @override
  int get hashCode => packagingTypesId.hashCode;
}

class BaseUnit {
  final int baseUnitsId;
  final String baseUnitsName;
  final String? baseUnitsDescription;

  BaseUnit({required this.baseUnitsId, required this.baseUnitsName, this.baseUnitsDescription});

  factory BaseUnit.fromJson(Map<String, dynamic> json) {
    return BaseUnit(
      baseUnitsId: _parseInt(json['base_units_id']),
      baseUnitsName: _parseString(json['base_units_name'], defaultValue: 'Unknown Unit'),
      baseUnitsDescription: _parseNullableString(json['base_units_description']),
    );
  }

  @override
  String toString() {
    return 'BaseUnit(id: $baseUnitsId, name: $baseUnitsName)';
  }
}

class PreferredPackaging {
  final int packagingTypesId;
  final String packagingTypesName;

  PreferredPackaging({required this.packagingTypesId, required this.packagingTypesName});

  factory PreferredPackaging.fromJson(Map<String, dynamic> json) {
    return PreferredPackaging(
      packagingTypesId: _parseInt(json['packaging_types_id']),
      packagingTypesName: _parseString(json['packaging_types_name'], defaultValue: 'Unknown Packaging'),
    );
  }

  @override
  String toString() {
    return 'PreferredPackaging(id: $packagingTypesId, name: $packagingTypesName)';
  }

  Map<String, dynamic> toJson() {
    return {
      'packaging_types_id': packagingTypesId,
      'packaging_types_name': packagingTypesName,
    };
  }
}

// NEW MODEL: ProductVariant to match the new 'get_all.php' response structure
class ProductVariant {
  // Product-level fields (these are repeated for each variant in the response)
  final int? productsId; // Added productsId for SalesOrderItem mapping
  final String? productsName; // Added productsName
  final String? productsImageUrl; // Added productsImageUrl
  final int? productsCategoryId;
  final String? productsDescription;
  final String? productsBrand;
  final int? productsSupplierId;
  final int? productsExpiryPeriodInDays;
  final int? productsUnitOfMeasureId;
  final String? baseUnitName; // <--- ADDED THIS FIELD

  // Variant-level fields
  final int variantId;
  final String variantName;
  final String? variantSku;
  final String? variantBarcode;
  final String? variantImageUrl;
  final String? variantUnitPrice;
  final String? variantCostPrice;
  final String? variantWeight;
  final String? variantVolume;
  final int? variantStatus;
  final String? variantNotes;
  final bool? variantHasTax;
  final double? variantTaxRate;

  // Nested lists within the variant
  final List<ProductAttributeDetail> attributes; // Using a new model for attribute details
  final List<PreferredPackaging> preferredPackaging;

  ProductVariant({
    this.productsId, // Added to constructor
    this.productsName, // Added to constructor
    this.productsImageUrl, // Added to constructor
    this.productsCategoryId,
    this.productsDescription,
    this.productsBrand,
    this.productsSupplierId,
    this.productsExpiryPeriodInDays,
    this.productsUnitOfMeasureId,
    this.baseUnitName, // <--- ADDED TO CONSTRUCTOR
    required this.variantId,
    required this.variantName,
    this.variantSku,
    this.variantBarcode,
    this.variantImageUrl,
    this.variantUnitPrice,
    this.variantCostPrice,
    this.variantWeight,
    this.variantVolume,
    this.variantStatus,
    this.variantNotes,
    this.variantHasTax,
    this.variantTaxRate,
    this.attributes = const [],
    this.preferredPackaging = const [],
  });

  factory ProductVariant.fromJson(Map<String, dynamic> json) {
    var attributesList = json['attributes'] as List<dynamic>?;
    List<ProductAttributeDetail> parsedAttributes = attributesList != null ? attributesList.map((v) => ProductAttributeDetail.fromJson(v as Map<String, dynamic>)).toList() : [];

    var preferredPackagingList = json['preferred_packaging'] as List<dynamic>?;
    List<PreferredPackaging> parsedPreferredPackaging = preferredPackagingList != null ? preferredPackagingList.map((v) => PreferredPackaging.fromJson(v as Map<String, dynamic>)).toList() : [];

    final dynamic variantIdSource = json['variant_id'] ?? json['variantId'] ?? json['variantID'] ?? json['id'] ?? json['product_variant_id'] ?? json['productVariantId'];
    final String? resolvedProductsName = _parseNullableString(json['products_name']) ?? _parseNullableString(json['product_name']) ?? _parseNullableString(json['name']);
    final String resolvedVariantName =
        (_parseNullableString(json['variant_name']) ?? _parseNullableString(json['variantName']) ?? _parseNullableString(json['variant_title']) ?? _parseNullableString(json['variant']) ?? resolvedProductsName) ?? 'Unnamed Variant';

    return ProductVariant(
      productsId: _parseNullableInt(json['products_id'] ?? json['productsId'] ?? json['product_id']), // Added mapping
      productsName: resolvedProductsName, // Added mapping
      productsImageUrl: _parseNullableString(json['products_image_url']), // Added mapping
      productsCategoryId: _parseNullableInt(json['products_category_id']),
      productsDescription: _parseNullableString(json['products_description']),
      productsBrand: _parseNullableString(json['products_brand']),
      productsSupplierId: _parseNullableInt(json['products_supplier_id']),
      productsExpiryPeriodInDays: _parseNullableInt(json['products_expiry_period_in_days']),
      productsUnitOfMeasureId: _parseNullableInt(json['products_unit_of_measure_id']),
      baseUnitName: _parseNullableString(json['base_unit_name']), // <--- ADDED MAPPING
      variantId: _parseInt(variantIdSource),
      variantName: resolvedVariantName,
      variantSku: _parseNullableString(json['variant_sku']),
      variantBarcode: _parseNullableString(json['variant_barcode']),
      variantImageUrl: _parseNullableString(json['variant_image_url']),
      variantUnitPrice: _parseNullableString(json['variant_unit_price']),
      variantCostPrice: _parseNullableString(json['variant_cost_price']),
      variantWeight: _parseNullableString(json['variant_weight']),
      variantVolume: _parseNullableString(json['variant_volume']),
      variantStatus: _parseNullableInt(json['variant_status']),
      variantNotes: _parseNullableString(json['variant_notes']),
      variantHasTax: _parseNullableBool(json['variant_has_tax']),
      variantTaxRate: _parseNullableDouble(json['variant_tax_rate']),
      attributes: parsedAttributes,
      preferredPackaging: parsedPreferredPackaging,
    );
  }

  @override
  String toString() {
    return 'ProductVariant(id: $variantId, name: $variantName, productBrand: $productsBrand)';
  }

  Map<String, dynamic> toJson() {
    return {
      'products_id': productsId,
      'products_name': productsName,
      'products_image_url': productsImageUrl,
      'products_category_id': productsCategoryId,
      'products_description': productsDescription,
      'products_brand': productsBrand,
      'products_supplier_id': productsSupplierId,
      'products_expiry_period_in_days': productsExpiryPeriodInDays,
      'products_unit_of_measure_id': productsUnitOfMeasureId,
      'base_unit_name': baseUnitName,
      'variant_id': variantId,
      'variant_name': variantName,
      'variant_sku': variantSku,
      'variant_barcode': variantBarcode,
      'variant_image_url': variantImageUrl,
      'variant_unit_price': variantUnitPrice,
      'variant_cost_price': variantCostPrice,
      'variant_weight': variantWeight,
      'variant_volume': variantVolume,
      'variant_status': variantStatus,
      'variant_notes': variantNotes,
      'variant_has_tax': variantHasTax,
      'variant_tax_rate': variantTaxRate,
      'attributes': attributes.map((attr) => attr.toJson()).toList(),
      'preferred_packaging': preferredPackaging.map((pkg) => pkg.toJson()).toList(),
    };
  }
}

// NEW MODEL: ProductAttributeDetail (for attributes nested within variants)
// This is different from ProductAttribute which has 'values'
class ProductAttributeDetail {
  final int attributeId;
  final String attributeName; // Assuming attribute_name is also provided here
  final int attributeValueId;
  final String attributeValueValue; // Assuming attribute_value_value is also provided here

  ProductAttributeDetail({
    required this.attributeId,
    required this.attributeName,
    required this.attributeValueId,
    required this.attributeValueValue,
  });

  factory ProductAttributeDetail.fromJson(Map<String, dynamic> json) {
    return ProductAttributeDetail(
      attributeId: _parseInt(json['attribute_id']),
      attributeName: _parseString(json['attribute_name'], defaultValue: 'Unknown Attribute'), // Ensure this key exists in the API response
      attributeValueId: _parseInt(json['attribute_value_id']),
      attributeValueValue: _parseString(json['attribute_value_value'], defaultValue: ''), // Ensure this key exists in the API response
    );
  }

  @override
  String toString() {
    return 'ProductAttributeDetail(attrId: $attributeId, attrName: $attributeName, valueId: $attributeValueId, value: $attributeValueValue)';
  }

  Map<String, dynamic> toJson() {
    return {
      'attribute_id': attributeId,
      'attribute_name': attributeName,
      'attribute_value_id': attributeValueId,
      'attribute_value_value': attributeValueValue,
    };
  }
}

// Simple Product model (without variants) for interested products feature
class SimpleProduct {
  final int productsId;
  final String productsName;
  final int? productsCategoryId;
  final String? productsDescription;
  final String? productsBrand;
  final String? productsImageUrl;
  final int? productsIsActive;
  final String? productsWeight;
  final String? productsVolume;

  SimpleProduct({
    required this.productsId,
    required this.productsName,
    this.productsCategoryId,
    this.productsDescription,
    this.productsBrand,
    this.productsImageUrl,
    this.productsIsActive,
    this.productsWeight,
    this.productsVolume,
  });

  factory SimpleProduct.fromJson(Map<String, dynamic> json) {
    return SimpleProduct(
      productsId: _parseInt(json['products_id']),
      productsName: _parseString(json['products_name'], defaultValue: 'Unnamed Product'),
      productsCategoryId: _parseNullableInt(json['products_category_id']),
      productsDescription: _parseNullableString(json['products_description']),
      productsBrand: _parseNullableString(json['products_brand']),
      productsImageUrl: _parseNullableString(json['products_image_url']),
      productsIsActive: _parseNullableInt(json['products_is_active']),
      productsWeight: _parseNullableString(json['products_weight']),
      productsVolume: _parseNullableString(json['products_volume']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'products_id': productsId,
      'products_name': productsName,
      'products_category_id': productsCategoryId,
      'products_description': productsDescription,
      'products_brand': productsBrand,
      'products_image_url': productsImageUrl,
      'products_is_active': productsIsActive,
      'products_weight': productsWeight,
      'products_volume': productsVolume,
    };
  }
}
