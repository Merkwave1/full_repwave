// lib/data/models/sales_return_item.dart

class SalesReturnItem {
  static const String unknownProductPlaceholder = 'Unknown Product';

  final int returnItemsId;
  final int returnId; // links to sales_returns
  final int salesOrderItemId; // links to sales_order_items
  final double quantity;
  final double unitPrice;
  final double totalPrice;
  final String? notes; // Nullable

  // Tax fields
  final double taxAmount;
  final double? taxRate;
  final bool hasTax;

  // Joined fields (optional, if API provides them)
  final int? salesOrderItemVariantId; // From sales_order_items
  final String? variantName; // From sales_order_items -> product_variants
  final String? packagingTypeName; // From sales_order_items -> packaging_types

  SalesReturnItem({
    required this.returnItemsId,
    required this.returnId,
    required this.salesOrderItemId,
    required this.quantity,
    required this.unitPrice,
    required this.totalPrice,
    this.notes,
    required this.taxAmount,
    this.taxRate,
    required this.hasTax,
    this.salesOrderItemVariantId,
    this.variantName,
    this.packagingTypeName,
  });

  // New getter to provide a displayable description
  bool get _hasVariantName => variantName != null && variantName!.trim().isNotEmpty;

  bool get _hasPackagingName => packagingTypeName != null && packagingTypeName!.trim().isNotEmpty;

  bool get isUnknownProduct => !_hasVariantName && !_hasPackagingName;

  String get displayDescription {
    if (_hasVariantName && _hasPackagingName) {
      return '${variantName!.trim()} (${packagingTypeName!.trim()})';
    }
    if (_hasVariantName) {
      return variantName!.trim();
    }
    if (_hasPackagingName) {
      return packagingTypeName!.trim();
    }
    return unknownProductPlaceholder;
  }

  // Getter for total amount including tax
  double get totalPriceWithTax {
    return totalPrice + taxAmount;
  }

  // Getter for subtotal (price without tax)
  double get subtotal {
    return totalPrice;
  }

  factory SalesReturnItem.fromJson(Map<String, dynamic> json) {
    double _parseDouble(dynamic value, String key) {
      if (value == null) {
        throw FormatException('Required field "$key" is null in SalesReturnItem JSON.');
      }
      if (value is num) {
        return value.toDouble();
      } else if (value is String) {
        return double.tryParse(value) ?? (throw FormatException('Invalid double format for "$key": "$value".'));
      }
      throw FormatException('Unexpected type for "$key": ${value.runtimeType}. Expected num or String.');
    }

    return SalesReturnItem(
      returnItemsId: json['return_items_id'] as int,
      returnId: json['return_items_return_id'] as int,
      salesOrderItemId: json['return_items_sales_order_item_id'] as int,
      quantity: _parseDouble(json['return_items_quantity'], 'return_items_quantity'),
      unitPrice: _parseDouble(json['return_items_unit_price'], 'return_items_unit_price'),
      totalPrice: _parseDouble(json['return_items_total_price'], 'return_items_total_price'),
      notes: json['return_items_notes'] as String?,
      // Tax fields with fallback to 0/false if not provided
      taxAmount: _parseDouble(json['return_items_tax_amount'] ?? 0.0, 'return_items_tax_amount'),
      taxRate: json['return_items_tax_rate'] != null ? _parseDouble(json['return_items_tax_rate'], 'return_items_tax_rate') : null,
      hasTax: json['return_items_has_tax'] == 1 ? true : (json['return_items_has_tax'] == 0 ? false : false),
      salesOrderItemVariantId: json['sales_order_items_variant_id'] as int?,
      // API returns 'product_name' not 'variant_name'
      variantName: json['product_name'] as String? ?? json['variant_name'] as String?,
      packagingTypeName: json['packaging_types_name'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'return_items_id': returnItemsId,
      'return_items_return_id': returnId,
      'return_items_sales_order_item_id': salesOrderItemId,
      'return_items_quantity': quantity,
      'return_items_unit_price': unitPrice,
      'return_items_total_price': totalPrice,
      'return_items_notes': notes,
      'return_items_tax_amount': taxAmount,
      'return_items_tax_rate': taxRate,
      'return_items_has_tax': hasTax ? 1 : 0,
    };
  }
}
