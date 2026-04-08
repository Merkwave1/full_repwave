// lib/data/models/sales_invoice.dart
import '/data/models/sales_invoice_item.dart'; // Ensure this path is correct

class SalesInvoice {
  final int salesInvoiceId;
  final int? salesOrderId;
  final int clientId;
  final String invoiceNumber;
  final DateTime issueDate;
  final DateTime dueDate;
  final double subtotal;
  final double discountAmount;
  final double taxAmount;
  final double totalAmount;
  final double amountPaid;
  final String status;
  final String? notes;
  final DateTime? createdAt; // Made nullable
  final DateTime? updatedAt; // Made nullable
  final String? clientCompanyName;
  final int? salesOrderLinkId;
  final double? salesOrderTotalAmount;
  final List<SalesInvoiceItem> items;

  SalesInvoice({
    required this.salesInvoiceId,
    this.salesOrderId,
    required this.clientId,
    required this.invoiceNumber,
    required this.issueDate,
    required this.dueDate,
    required this.subtotal,
    required this.discountAmount,
    required this.taxAmount,
    required this.totalAmount,
    required this.amountPaid,
    required this.status,
    this.notes,
    this.createdAt, // Made nullable
    this.updatedAt, // Made nullable
    this.clientCompanyName,
    this.salesOrderLinkId,
    this.salesOrderTotalAmount,
    required this.items,
  });

  factory SalesInvoice.fromJson(Map<String, dynamic> json) {
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
      if (value is int) return value.toDouble(); // Convert int to double if it's an int
      return double.tryParse(value.toString());
    }

    return SalesInvoice(
      salesInvoiceId: safeParseInt(json['sales_invoice_id']) ?? 0, // Default to 0 if parsing fails
      salesOrderId: safeParseInt(json['sales_invoice_sales_order_id']),
      clientId: safeParseInt(json['sales_invoice_client_id']) ?? 0, // Default to 0 if parsing fails
      invoiceNumber: json['sales_invoice_number'] as String,
      issueDate: DateTime.parse(json['sales_invoice_issue_date'] as String),
      dueDate: DateTime.parse(json['sales_invoice_due_date'] as String),
      subtotal: safeParseDouble(json['sales_invoice_subtotal']) ?? 0.0,
      discountAmount: safeParseDouble(json['sales_invoice_discount_amount']) ?? 0.0,
      taxAmount: safeParseDouble(json['sales_invoice_tax_amount']) ?? 0.0,
      totalAmount: safeParseDouble(json['sales_invoice_total_amount']) ?? 0.0,
      amountPaid: safeParseDouble(json['sales_invoice_amount_paid']) ?? 0.0,
      status: json['sales_invoice_status'] as String,
      notes: json['sales_invoice_notes'] == 'null' ? null : json['sales_invoice_notes'] as String?,
      createdAt: json['sales_invoice_created_at'] != null ? DateTime.tryParse(json['sales_invoice_created_at'] as String) : null,
      updatedAt: json['sales_invoice_updated_at'] != null ? DateTime.tryParse(json['sales_invoice_updated_at'] as String) : null,
      clientCompanyName: json['clients_company_name'] as String?,
      salesOrderLinkId: safeParseInt(json['sales_order_link_id']),
      salesOrderTotalAmount: safeParseDouble(json['sales_order_total_amount']),
      items: (json['items'] as List<dynamic>?)?.map((itemJson) => SalesInvoiceItem.fromJson(itemJson as Map<String, dynamic>)).toList() ?? [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'sales_invoice_id': salesInvoiceId,
      'sales_invoice_sales_order_id': salesOrderId,
      'sales_invoice_client_id': clientId,
      'sales_invoice_number': invoiceNumber,
      'sales_invoice_issue_date': issueDate.toIso8601String().split('T')[0],
      'sales_invoice_due_date': dueDate.toIso8601String().split('T')[0],
      'sales_invoice_subtotal': subtotal.toStringAsFixed(2),
      'sales_invoice_discount_amount': discountAmount.toStringAsFixed(2),
      'sales_invoice_tax_amount': taxAmount.toStringAsFixed(2),
      'sales_invoice_total_amount': totalAmount.toStringAsFixed(2),
      'sales_invoice_amount_paid': amountPaid.toStringAsFixed(2),
      'sales_invoice_status': status,
      'sales_invoice_notes': notes,
      'sales_invoice_created_at': createdAt?.toIso8601String(), // Handle nullable
      'sales_invoice_updated_at': updatedAt?.toIso8601String(), // Handle nullable
      'clients_company_name': clientCompanyName,
      'sales_order_link_id': salesOrderLinkId,
      'sales_order_total_amount': salesOrderTotalAmount?.toStringAsFixed(2),
      'items': items.map((item) => item.toJson()).toList(),
    };
  }
}
