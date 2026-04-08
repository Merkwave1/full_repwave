// lib/data/models/product_lookup.dart
// This is a conceptual update. You'll need to ensure all your existing models
// (Product, ProductCategory, ProductAttribute, PackagingType, BaseUnit, PreferredPackaging)
// are also correctly defined in this file.

import 'package:get/get.dart'; // Assuming GetX models might use Rx or similar

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
      productsId: json['products_id'] as int,
      productsName: json['products_name'] as String,
      productsUnitPrice: json['products_unit_price']?.toString(),
      productsUnitOfMeasureId: json['products_unit_of_measure_id'] as int?,
      baseUnitName: json['base_unit_name'] as String?, // Added mapping for baseUnitName
      productsCategoryId: json['products_category_id'] as int?,
      productsDescription: json['products_description'] as String?,
      productsBrand: json['products_brand'] as String?,
      productsImageUrl: json['products_image_url'] as String?,
      productsCostPrice: json['products_cost_price']?.toString(),
      productsIsActive: json['products_is_active'] as int?,
      productsWeight: json['products_weight']?.toString(),
      productsVolume: json['products_volume']?.toString(),
      productsSupplierId: json['products_supplier_id'] as int?,
      productsExpiryPeriodInDays: json['products_expiry_period_in_days'] as int?,
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
      categoriesId: json['categories_id'] as int,
      categoriesName: json['categories_name'] as String,
      categoriesDescription: json['categories_description'] as String?,
    );
  }

  @override
  String toString() {
    return 'ProductCategory(id: $categoriesId, name: $categoriesName)';
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
      attributeId: json['attribute_id'] as int,
      attributeName: json['attribute_name'] as String,
      attributeDescription: json['attribute_description'] as String?,
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
      attributeValueId: json['attribute_value_id'] as int,
      attributeValueValue: json['attribute_value_value'] as String,
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
      packagingTypesId: json['packaging_types_id'] as int,
      packagingTypesName: json['packaging_types_name'] as String,
      packagingTypesDescription: json['packaging_types_description'] as String?,
      packagingTypesDefaultConversionFactor: json['packaging_types_default_conversion_factor']?.toString(),
      packagingTypesCompatibleBaseUnitId: json['packaging_types_compatible_base_unit_id'] as int?,
      compatibleBaseUnitName: json['compatible_base_unit_name'] as String?,
    );
  }

  @override
  String toString() {
    return 'PackagingType(id: $packagingTypesId, name: $packagingTypesName)';
  }
}

class BaseUnit {
  final int baseUnitsId;
  final String baseUnitsName;
  final String? baseUnitsDescription;

  BaseUnit({required this.baseUnitsId, required this.baseUnitsName, this.baseUnitsDescription});

  factory BaseUnit.fromJson(Map<String, dynamic> json) {
    return BaseUnit(
      baseUnitsId: json['base_units_id'] as int,
      baseUnitsName: json['base_units_name'] as String,
      baseUnitsDescription: json['base_units_description'] as String?,
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
      packagingTypesId: json['packaging_types_id'] as int,
      packagingTypesName: json['packaging_types_name'] as String,
    );
  }

  @override
  String toString() {
    return 'PreferredPackaging(id: $packagingTypesId, name: $packagingTypesName)';
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
    this.attributes = const [],
    this.preferredPackaging = const [],
  });

  factory ProductVariant.fromJson(Map<String, dynamic> json) {
    var attributesList = json['attributes'] as List<dynamic>?;
    List<ProductAttributeDetail> parsedAttributes = attributesList != null ? attributesList.map((v) => ProductAttributeDetail.fromJson(v as Map<String, dynamic>)).toList() : [];

    var preferredPackagingList = json['preferred_packaging'] as List<dynamic>?;
    List<PreferredPackaging> parsedPreferredPackaging = preferredPackagingList != null ? preferredPackagingList.map((v) => PreferredPackaging.fromJson(v as Map<String, dynamic>)).toList() : [];

    return ProductVariant(
      productsId: json['products_id'] as int?, // Added mapping
      productsName: json['products_name'] as String?, // Added mapping
      productsImageUrl: json['products_image_url'] as String?, // Added mapping
      productsCategoryId: json['products_category_id'] as int?,
      productsDescription: json['products_description'] as String?,
      productsBrand: json['products_brand'] as String?,
      productsSupplierId: json['products_supplier_id'] as int?,
      productsExpiryPeriodInDays: json['products_expiry_period_in_days'] as int?,
      productsUnitOfMeasureId: json['products_unit_of_measure_id'] as int?,
      baseUnitName: json['base_unit_name'] as String?, // <--- ADDED MAPPING
      variantId: json['variant_id'] as int,
      variantName: json['variant_name'] as String,
      variantSku: json['variant_sku'] as String?,
      variantBarcode: json['variant_barcode'] as String?,
      variantImageUrl: json['variant_image_url'] as String?,
      variantUnitPrice: json['variant_unit_price']?.toString(),
      variantCostPrice: json['variant_cost_price']?.toString(),
      variantWeight: json['variant_weight']?.toString(),
      variantVolume: json['variant_volume']?.toString(),
      variantStatus: json['variant_status'] as int?,
      variantNotes: json['variant_notes'] as String?,
      attributes: parsedAttributes,
      preferredPackaging: parsedPreferredPackaging,
    );
  }

  @override
  String toString() {
    return 'ProductVariant(id: $variantId, name: $variantName, productBrand: $productsBrand)';
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
      attributeId: json['attribute_id'] as int,
      attributeName: json['attribute_name'] as String, // Ensure this key exists in the API response
      attributeValueId: json['attribute_value_id'] as int,
      attributeValueValue: json['attribute_value_value'] as String, // Ensure this key exists in the API response
    );
  }

  @override
  String toString() {
    return 'ProductAttributeDetail(attrId: $attributeId, attrName: $attributeName, valueId: $attributeValueId, value: $attributeValueValue)';
  }
}
