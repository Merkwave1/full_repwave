// lib/data/models/sales_order_item.dart
import '/data/models/product_lookup.dart'; // Assuming ProductVariant and PackagingType are here

class SalesOrderItem {
  final int salesOrderItemId;
  final int salesOrderId;
  final int variantId;
  final int packagingTypeId;
  final double quantity;
  final double? deliveredQuantity; // New: delivered so far
  final double? pendingQuantity; // New: remaining to deliver
  final double unitPrice;
  final double subtotal;
  final double discountAmount;
  final double totalAmount;
  final double? taxAmount;
  final double? taxRate;
  final bool? hasTax;
  final String? notes;

  // Baseline (original) commercial values captured at time of adding the item
  // These allow comparison even if full ProductVariant data isn't attached (e.g., warehouse inventory path)
  final double? originalUnitPrice; // Captured original unit price
  final double? originalTaxRate; // Captured original tax rate

  // Optional: Add related models for display purposes if they come with the API response
  // These would need to be populated in the fromJson method if the API provides them.
  final ProductVariant? productVariant; // Details of the sold product variant
  final PackagingType? packagingType; // Details of the packaging type used

  // New fields from Sales Order Detail API response
  final String? variantName; // New field
  final String? packagingTypeName; // New field

  // NEW: Track if item was selected from rep inventory (available stock)
  final bool? isFromRepInventory; // Indicates item was selected from rep warehouse inventory

  SalesOrderItem({
    required this.salesOrderItemId,
    required this.salesOrderId,
    required this.variantId,
    required this.packagingTypeId,
    required this.quantity,
    this.deliveredQuantity,
    this.pendingQuantity,
    required this.unitPrice,
    required this.subtotal,
    required this.discountAmount,
    required this.totalAmount,
    this.taxAmount,
    this.taxRate,
    this.hasTax,
    this.notes,
    this.productVariant,
    this.packagingType,
    this.variantName, // Added to constructor
    this.packagingTypeName, // Added to constructor
    this.isFromRepInventory, // Added to constructor
    this.originalUnitPrice,
    this.originalTaxRate,
  });

  factory SalesOrderItem.fromJson(Map<String, dynamic> json) {
    // Helper function to safely parse double from String or num
    double parseDouble(dynamic value) {
      if (value is num) {
        return value.toDouble();
      } else if (value is String && value.isNotEmpty) {
        return double.tryParse(value) ?? 0.0;
      }
      return 0.0;
    }

    // Helper function to safely parse int for REQUIRED fields, providing better error messages
    int _parseIntRequired(Map<String, dynamic> json, String key) {
      final value = json[key];
      if (value == null) {
        throw FormatException('Required field "$key" is null in SalesOrderItem JSON.');
      }
      if (value is int) {
        return value;
      } else if (value is String) {
        return int.tryParse(value) ?? (throw FormatException('Invalid int format for "$key": "$value".'));
      } else {
        throw FormatException('Unexpected type for "$key": ${value.runtimeType}. Expected int or String.');
      }
    }

    return SalesOrderItem(
      salesOrderItemId: _parseIntRequired(json, 'sales_order_items_id'),
      salesOrderId: _parseIntRequired(json, 'sales_order_items_sales_order_id'),
      variantId: _parseIntRequired(json, 'sales_order_items_variant_id'),
      packagingTypeId: _parseIntRequired(json, 'sales_order_items_packaging_type_id'),
      quantity: parseDouble(json['sales_order_items_quantity']),
      deliveredQuantity: parseDouble(json['sales_order_items_quantity_delivered']),
      pendingQuantity: parseDouble(json['quantity_pending']),
      unitPrice: parseDouble(json['sales_order_items_unit_price']),
      subtotal: parseDouble(json['sales_order_items_subtotal']),
      discountAmount: parseDouble(json['sales_order_items_discount_amount']),
      totalAmount: parseDouble(json['sales_order_items_total_price']),
      taxAmount: parseDouble(json['sales_order_items_tax_amount']),
      taxRate: parseDouble(json['sales_order_items_tax_rate']),
      hasTax: json['sales_order_items_has_tax'] == 1 ? true : (json['sales_order_items_has_tax'] == 0 ? false : null),
      notes: json['sales_order_items_notes'] as String?,
      // Assuming product_variant and packaging_type might be nested or joined in the API response
      productVariant: json['product_variant'] != null ? ProductVariant.fromJson(json['product_variant'] as Map<String, dynamic>) : null,
      packagingType: json['packaging_type'] != null ? PackagingType.fromJson(json['packaging_type'] as Map<String, dynamic>) : null,
      variantName: json['variant_name'] as String?, // New field parsing
      packagingTypeName: json['packaging_types_name'] as String?, // New field parsing
      isFromRepInventory: json['is_from_rep_inventory'] as bool?, // New field parsing
      originalUnitPrice: json['original_unit_price'] != null ? parseDouble(json['original_unit_price']) : null,
      originalTaxRate: json['original_tax_rate'] != null ? parseDouble(json['original_tax_rate']) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'sales_order_items_id': salesOrderItemId,
      'sales_order_items_sales_order_id': salesOrderId,
      'sales_order_items_variant_id': variantId,
      'sales_order_items_packaging_type_id': packagingTypeId,
      'sales_order_items_quantity': quantity,
      'sales_order_items_quantity_delivered': deliveredQuantity,
      'quantity_pending': pendingQuantity,
      'sales_order_items_unit_price': unitPrice,
      'sales_order_items_subtotal': subtotal,
      'sales_order_items_discount_amount': discountAmount,
      'sales_order_items_total_price': totalAmount,
      'sales_order_items_tax_amount': taxAmount,
      'sales_order_items_tax_rate': taxRate,
      'sales_order_items_has_tax': hasTax == true ? 1 : (hasTax == false ? 0 : null),
      'sales_order_items_notes': notes,
      // Do not include nested models in toJson unless they are part of the writable payload
      // 'product_variant': productVariant?.toJson(),
      // 'packaging_type': packagingType?.toJson(),
      'variant_name': variantName, // Include in toJson if needed for API
      'packaging_types_name': packagingTypeName, // Include in toJson if needed for API
      'is_from_rep_inventory': isFromRepInventory, // Include in toJson if needed for API
      'original_unit_price': originalUnitPrice,
      'original_tax_rate': originalTaxRate,
    };
  }
}
