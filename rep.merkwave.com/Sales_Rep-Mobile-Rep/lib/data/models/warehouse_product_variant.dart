// lib/data/models/warehouse_product_variant.dart
import 'product_lookup.dart';

class InventoryBatch {
  final int inventoryId;
  final double quantity;
  final String? productionDate;
  final String status;

  InventoryBatch({
    required this.inventoryId,
    required this.quantity,
    this.productionDate,
    required this.status,
  });

  factory InventoryBatch.fromJson(Map<String, dynamic> json) {
    return InventoryBatch(
      inventoryId: json['inventory_id'] as int,
      quantity: WarehouseProductVariant._parseDouble(json['quantity']) ?? 0.0,
      productionDate: json['production_date'] as String?,
      status: json['status'].toString(),
    );
  }

  Map<String, dynamic> toJson() => {
        'inventory_id': inventoryId,
        'quantity': quantity,
        'production_date': productionDate,
        'status': status,
      };
}

class AvailablePackaging {
  final int? packagingTypeId;
  final String? packagingTypeName;
  final double? packagingFactor;
  final int? compatibleBaseUnitId;
  final double totalQuantity;
  final List<InventoryBatch> inventoryBatches;

  AvailablePackaging({
    this.packagingTypeId,
    this.packagingTypeName,
    this.packagingFactor,
    this.compatibleBaseUnitId,
    required this.totalQuantity,
    required this.inventoryBatches,
  });

  factory AvailablePackaging.fromJson(Map<String, dynamic> json) {
    final batchesRaw = json['inventory_batches'];
    final List<dynamic> batchList = batchesRaw is List ? batchesRaw : [];
    return AvailablePackaging(
      packagingTypeId: (json['packaging_type_id'] is int) ? json['packaging_type_id'] as int : int.tryParse(json['packaging_type_id']?.toString() ?? ''),
      packagingTypeName: json['packaging_types_name'] as String?,
      packagingFactor: WarehouseProductVariant._parseDouble(json['packaging_types_factor']),
      compatibleBaseUnitId: (json['packaging_types_compatible_base_unit_id'] is int) ? json['packaging_types_compatible_base_unit_id'] as int : int.tryParse(json['packaging_types_compatible_base_unit_id']?.toString() ?? ''),
      totalQuantity: WarehouseProductVariant._parseDouble(json['total_quantity']) ?? 0.0,
      inventoryBatches: batchList.map((batch) => InventoryBatch.fromJson(batch as Map<String, dynamic>)).toList(),
    );
  }

  Map<String, dynamic> toJson() => {
        'packaging_type_id': packagingTypeId,
        'packaging_types_name': packagingTypeName,
        'packaging_types_factor': packagingFactor,
        'packaging_types_compatible_base_unit_id': compatibleBaseUnitId,
        'total_quantity': totalQuantity,
        'inventory_batches': inventoryBatches.map((batch) => batch.toJson()).toList(),
      };
}

class WarehouseProductVariant {
  // Product fields
  final int productsId;
  final String productsName;
  final int? productsUnitOfMeasureId;
  final int? productsCategoryId;
  final String? productsDescription;
  final String? productsBrand;
  final String? productsImageUrl;
  final int productsIsActive;
  final double? productsWeight;
  final double? productsVolume;
  final int? productsSupplierId;
  final int? productsExpiryPeriodInDays;
  final int productsHasTax;
  final double? productsTaxRate;

  // Variant fields
  final int variantId;
  final String? variantName;
  final String? variantSku;
  final String? variantBarcode;
  final String? variantImageUrl;
  final double? variantUnitPrice;
  final double? variantCostPrice;
  final double? variantWeight;
  final double? variantVolume;
  final String variantStatus;
  final String? variantNotes;
  final int variantHasTax;
  final double? variantTaxRate;

  // Availability fields
  final List<Map<String, dynamic>> attributes;
  final List<AvailablePackaging> availablePackaging;
  final double totalAvailableInBaseUnits;

  WarehouseProductVariant({
    required this.productsId,
    required this.productsName,
    this.productsUnitOfMeasureId,
    this.productsCategoryId,
    this.productsDescription,
    this.productsBrand,
    this.productsImageUrl,
    required this.productsIsActive,
    this.productsWeight,
    this.productsVolume,
    this.productsSupplierId,
    this.productsExpiryPeriodInDays,
    required this.productsHasTax,
    this.productsTaxRate,
    required this.variantId,
    this.variantName,
    this.variantSku,
    this.variantBarcode,
    this.variantImageUrl,
    this.variantUnitPrice,
    this.variantCostPrice,
    this.variantWeight,
    this.variantVolume,
    required this.variantStatus,
    this.variantNotes,
    required this.variantHasTax,
    this.variantTaxRate,
    required this.attributes,
    required this.availablePackaging,
    required this.totalAvailableInBaseUnits,
  });

  factory WarehouseProductVariant.fromJson(Map<String, dynamic> json) {
    int _asInt(dynamic v) {
      if (v is int) return v;
      if (v is String && v.isNotEmpty) return int.tryParse(v) ?? 0;
      return 0;
    }

    int? _asIntNullable(dynamic v) {
      if (v == null) return null;
      if (v is int) return v;
      if (v is String && v.isNotEmpty) return int.tryParse(v);
      return null;
    }

    final attributesRaw = json['attributes'];
    final List<dynamic> attributesList = attributesRaw is List ? attributesRaw : [];
    final packagingRaw = json['available_packaging'];
    final List<dynamic> packagingList = packagingRaw is List ? packagingRaw : [];
    return WarehouseProductVariant(
      productsId: _asInt(json['products_id']),
      productsName: (json['products_name'] ?? '').toString(),
      productsUnitOfMeasureId: _asIntNullable(json['products_unit_of_measure_id']),
      productsCategoryId: _asIntNullable(json['products_category_id']),
      productsDescription: json['products_description']?.toString(),
      productsBrand: json['products_brand']?.toString(),
      productsImageUrl: json['products_image_url']?.toString(),
      productsIsActive: _asInt(json['products_is_active']),
      productsWeight: _parseDouble(json['products_weight']),
      productsVolume: _parseDouble(json['products_volume']),
      productsSupplierId: _asIntNullable(json['products_supplier_id']),
      productsExpiryPeriodInDays: _asIntNullable(json['products_expiry_period_in_days']),
      productsHasTax: _asInt(json['products_has_tax']),
      productsTaxRate: _parseDouble(json['products_tax_rate']),
      variantId: _asInt(json['variant_id']),
      variantName: json['variant_name']?.toString(),
      variantSku: json['variant_sku']?.toString(),
      variantBarcode: json['variant_barcode']?.toString(),
      variantImageUrl: json['variant_image_url']?.toString(),
      variantUnitPrice: _parseDouble(json['variant_unit_price']),
      variantCostPrice: _parseDouble(json['variant_cost_price']),
      variantWeight: _parseDouble(json['variant_weight']),
      variantVolume: _parseDouble(json['variant_volume']),
      variantStatus: json['variant_status'].toString(),
      variantNotes: json['variant_notes']?.toString(),
      variantHasTax: _asInt(json['variant_has_tax']),
      variantTaxRate: _parseDouble(json['variant_tax_rate']),
      attributes: attributesList.map((attr) => (attr as Map).cast<String, dynamic>()).toList(),
      availablePackaging: packagingList.map((pkg) => AvailablePackaging.fromJson(pkg as Map<String, dynamic>)).toList(),
      totalAvailableInBaseUnits: _parseDouble(json['total_available_in_base_units']) ?? 0.0,
    );
  }

  // Helper method to safely parse double values from JSON (handles both string and number types)
  static double? _parseDouble(dynamic value) {
    if (value == null) return null;
    if (value is double) return value;
    if (value is int) return value.toDouble();
    if (value is String) {
      if (value.isEmpty) return null;
      return double.tryParse(value);
    }
    return null;
  }

  // Helper methods
  String get displayName => variantName != null && variantName!.isNotEmpty ? '$productsName - $variantName' : productsName;

  double? get unitPrice => variantUnitPrice;

  bool get hasTax => (variantHasTax == 1) || (productsHasTax == 1);

  double? get taxRate => variantTaxRate ?? productsTaxRate;

  // Get available quantity for a specific packaging type
  double getAvailableQuantity(int? packagingTypeId) {
    final packaging = availablePackaging.firstWhere(
      (pkg) => pkg.packagingTypeId == packagingTypeId,
      orElse: () => AvailablePackaging(
        totalQuantity: 0.0,
        inventoryBatches: [],
      ),
    );
    return packaging.totalQuantity;
  }

  // Check if any quantity is available
  bool get hasAvailableStock => totalAvailableInBaseUnits > 0;

  // Get the first available packaging type (useful for default selection)
  AvailablePackaging? get firstAvailablePackaging => availablePackaging.isNotEmpty ? availablePackaging.first : null;

  // Get availability info for UI display
  String get availabilityInfo {
    if (totalAvailableInBaseUnits <= 0) {
      return 'Out of Stock';
    }

    if (availablePackaging.isNotEmpty) {
      final firstPackaging = availablePackaging.first;
      final packagingName = firstPackaging.packagingTypeName ?? 'Units';
      return '${firstPackaging.totalQuantity.toStringAsFixed(0)} $packagingName Available';
    }

    return '${totalAvailableInBaseUnits.toStringAsFixed(0)} Units Available';
  }

  Map<String, dynamic> toJson() => {
        'products_id': productsId,
        'products_name': productsName,
        'products_unit_of_measure_id': productsUnitOfMeasureId,
        'products_category_id': productsCategoryId,
        'products_description': productsDescription,
        'products_brand': productsBrand,
        'products_image_url': productsImageUrl,
        'products_is_active': productsIsActive,
        'products_weight': productsWeight,
        'products_volume': productsVolume,
        'products_supplier_id': productsSupplierId,
        'products_expiry_period_in_days': productsExpiryPeriodInDays,
        'products_has_tax': productsHasTax,
        'products_tax_rate': productsTaxRate,
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
        'attributes': attributes,
        'available_packaging': availablePackaging.map((pkg) => pkg.toJson()).toList(),
        'total_available_in_base_units': totalAvailableInBaseUnits,
      };

  ProductVariant toProductVariant({String? baseUnitName}) {
    bool? resolvedHasTax;
    if (variantHasTax == 1 || productsHasTax == 1) {
      resolvedHasTax = true;
    } else if (variantHasTax == 0 && productsHasTax == 0) {
      resolvedHasTax = false;
    }

    String? formattedDouble(double? value) {
      if (value == null) return null;
      final isInteger = value == value.truncateToDouble();
      return isInteger ? value.toStringAsFixed(0) : value.toStringAsFixed(2);
    }

    int parseInt(dynamic value) {
      if (value == null) return 0;
      if (value is int) return value;
      if (value is double) return value.toInt();
      return int.tryParse(value.toString()) ?? 0;
    }

    return ProductVariant(
      productsId: productsId,
      productsName: productsName,
      productsImageUrl: productsImageUrl,
      productsCategoryId: productsCategoryId,
      productsDescription: productsDescription,
      productsBrand: productsBrand,
      productsSupplierId: productsSupplierId,
      productsExpiryPeriodInDays: productsExpiryPeriodInDays,
      productsUnitOfMeasureId: productsUnitOfMeasureId,
      baseUnitName: baseUnitName,
      variantId: variantId,
      variantName: variantName ?? productsName,
      variantSku: variantSku,
      variantBarcode: variantBarcode,
      variantImageUrl: variantImageUrl ?? productsImageUrl,
      variantUnitPrice: formattedDouble(variantUnitPrice),
      variantCostPrice: formattedDouble(variantCostPrice),
      variantWeight: formattedDouble(variantWeight),
      variantVolume: formattedDouble(variantVolume),
      variantStatus: int.tryParse(variantStatus),
      variantNotes: variantNotes,
      variantHasTax: resolvedHasTax,
      variantTaxRate: variantTaxRate ?? productsTaxRate,
      attributes: attributes
          .map(
            (attr) => ProductAttributeDetail(
              attributeId: parseInt(attr['attribute_id'] ?? attr['attributeId']),
              attributeName: (attr['attribute_name'] ?? attr['name'] ?? '').toString(),
              attributeValueId: parseInt(attr['attribute_value_id'] ?? attr['value_id']),
              attributeValueValue: (attr['attribute_value_value'] ?? attr['value'] ?? '').toString(),
            ),
          )
          .toList(),
      preferredPackaging: availablePackaging
          .where((pkg) => pkg.packagingTypeId != null && pkg.packagingTypeName != null)
          .map((pkg) => PreferredPackaging(
                packagingTypesId: pkg.packagingTypeId!,
                packagingTypesName: pkg.packagingTypeName!,
              ))
          .toList(),
    );
  }
}
