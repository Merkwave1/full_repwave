// lib/data/models/inventory_item.dart
import '/data/models/product_lookup.dart';

// Represents a single row from the inventory API response
class InventoryItem {
  final int inventoryId;
  final int productsId;
  final int? productsUnitOfMeasureId;
  final int variantId;
  final int? packagingTypeId;
  final int warehouseId;
  final DateTime? inventoryProductionDate;
  final String inventoryQuantity;
  final String inventoryStatus;

  InventoryItem({
    required this.inventoryId,
    required this.productsId,
    this.productsUnitOfMeasureId,
    required this.variantId,
    this.packagingTypeId,
    required this.warehouseId,
    this.inventoryProductionDate,
    required this.inventoryQuantity,
    required this.inventoryStatus,
  });

  factory InventoryItem.fromJson(Map<String, dynamic> json) => InventoryItem(
        inventoryId: _parseInt(json['inventory_id']),
        productsId: _parseInt(json['products_id']),
        productsUnitOfMeasureId: _parseNullableInt(json['products_unit_of_measure_id']),
        variantId: _parseInt(json['variant_id']),
        packagingTypeId: _parseNullableInt(json['packaging_type_id']),
        warehouseId: _parseInt(json['warehouse_id']),
        inventoryProductionDate: _parseNullableDate(json['inventory_production_date']),
        inventoryQuantity: (json['inventory_quantity'] ?? '0').toString(),
        inventoryStatus: (json['inventory_status'] ?? 'Unknown').toString(),
      );

  static int _parseInt(dynamic value) {
    if (value == null) {
      return 0;
    }
    if (value is int) {
      return value;
    }
    if (value is double) {
      return value.toInt();
    }
    final parsed = int.tryParse(value.toString());
    return parsed ?? 0;
  }

  static int? _parseNullableInt(dynamic value) {
    if (value == null || (value is String && value.trim().isEmpty)) {
      return null;
    }
    if (value is int) {
      return value;
    }
    if (value is double) {
      return value.toInt();
    }
    return int.tryParse(value.toString());
  }

  static DateTime? _parseNullableDate(dynamic value) {
    if (value == null) {
      return null;
    }
    final stringValue = value.toString();
    if (stringValue.isEmpty) {
      return null;
    }
    try {
      return DateTime.parse(stringValue);
    } catch (_) {
      return null;
    }
  }

  Map<String, dynamic> toJson() {
    return {
      'inventory_id': inventoryId,
      'products_id': productsId,
      'products_unit_of_measure_id': productsUnitOfMeasureId,
      'variant_id': variantId,
      'packaging_type_id': packagingTypeId,
      'warehouse_id': warehouseId,
      'inventory_production_date': inventoryProductionDate?.toIso8601String(),
      'inventory_quantity': inventoryQuantity,
      'inventory_status': inventoryStatus,
    };
  }
}

// --- UI Helper Models for Grouping Data ---

// Represents a specific batch of a variant (unique by packaging and production date)
class InventoryBatch {
  final int inventoryId; // Added to identify the specific inventory record
  final String packagingTypeName;
  final DateTime? productionDate;
  final String quantity;

  InventoryBatch({
    required this.inventoryId,
    required this.packagingTypeName,
    this.productionDate,
    required this.quantity,
  });
}

// Represents a product variant and all its batches in the inventory
class GroupedVariant {
  final ProductVariant variant;
  final List<InventoryBatch> batches;

  GroupedVariant({required this.variant, required this.batches});
}

// Represents a top-level product and all its variants in the inventory
class GroupedProduct {
  final Product product;
  final List<GroupedVariant> variants;

  GroupedProduct({required this.product, required this.variants});
}
