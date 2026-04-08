// lib/data/models/sales_invoice_item.dart

class SalesInvoiceItem {
  final int salesInvoiceItemId;
  final int invoiceId; // links to sales_invoices
  final int soItemId; // links to sales_order_items
  final String description;
  final double quantity;
  final double unitPrice;
  final double totalPrice;

  // Joined fields (optional, if API provides them)
  final String? variantName; // From sales_order_items -> product_variants
  final String? packagingTypeName; // From sales_order_items -> packaging_types

  SalesInvoiceItem({
    required this.salesInvoiceItemId,
    required this.invoiceId,
    required this.soItemId,
    required this.description,
    required this.quantity,
    required this.unitPrice,
    required this.totalPrice,
    this.variantName,
    this.packagingTypeName,
  });

  factory SalesInvoiceItem.fromJson(Map<String, dynamic> json) {
    // Helper function to safely parse int
    int? safeParseInt(dynamic value) {
      if (value == null) return null;
      if (value is int) return value;
      return int.tryParse(value.toString());
    }

    // Helper function to safely parse double
    double? safeParseDouble(dynamic value) {
      if (value == null) return null;
      if (value is double) return value;
      if (value is int)
        return value.toDouble(); // Convert int to double if it's an int
      return double.tryParse(value.toString());
    }

    return SalesInvoiceItem(
      salesInvoiceItemId: safeParseInt(json['sales_invoice_item_id']) ?? 0,
      invoiceId: safeParseInt(json['sales_invoice_item_invoice_id']) ?? 0,
      soItemId: safeParseInt(json['sales_invoice_item_so_item_id']) ?? 0,
      description: json['sales_invoice_item_description'] as String,
      quantity: safeParseDouble(json['sales_invoice_item_quantity']) ?? 0.0,
      unitPrice: safeParseDouble(json['sales_invoice_item_unit_price']) ?? 0.0,
      totalPrice:
          safeParseDouble(json['sales_invoice_item_total_price']) ?? 0.0,
      variantName: json['variant_name'] as String?,
      packagingTypeName: json['packaging_types_name'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'sales_invoice_item_id': salesInvoiceItemId,
      'sales_invoice_item_invoice_id': invoiceId,
      'sales_invoice_item_so_item_id': soItemId,
      'sales_invoice_item_description': description,
      'sales_invoice_item_quantity': quantity.toStringAsFixed(2),
      'sales_invoice_item_unit_price': unitPrice.toStringAsFixed(2),
      'sales_invoice_item_total_price': totalPrice.toStringAsFixed(2),
      'variant_name': variantName,
      'packaging_types_name': packagingTypeName,
    };
  }
}
