// lib/data/models/sales_return.dart
import 'dart:convert';
import '/data/models/sales_return_item.dart';

class SalesReturn {
  final int returnsId;
  final int clientId;
  final int? salesOrderId; // Nullable
  final DateTime returnsDate;
  final String? reason; // Nullable
  final double totalAmount;
  final String status;
  final String? notes; // Nullable
  final int? createdByUserId; // Nullable
  final int? visitId; // For visit tracking
  final DateTime? createdAt;
  final DateTime? updatedAt;

  // Joined fields for display
  final String? clientCompanyName;
  final String? salesOrderTotalAmount; // From joined sales_orders table
  final String? createdByUserName;

  // Tax fields from API aggregation
  final double? apiTotalTaxAmount; // From total_tax_amount API field
  final double? apiSubtotalAmount; // From subtotal_amount API field

  // List of sales return items
  final List<SalesReturnItem> items;

  SalesReturn({
    required this.returnsId,
    required this.clientId,
    this.salesOrderId,
    required this.returnsDate,
    this.reason,
    required this.totalAmount,
    required this.status,
    this.notes,
    this.createdByUserId,
    this.visitId,
    this.createdAt,
    this.updatedAt,
    this.clientCompanyName,
    this.salesOrderTotalAmount,
    this.createdByUserName,
    this.apiTotalTaxAmount,
    this.apiSubtotalAmount,
    this.items = const [],
  });

  factory SalesReturn.fromJson(Map<String, dynamic> json) {
    int _parseIntRequired(Map<String, dynamic> json, String key) {
      final value = json[key];
      if (value == null) {
        throw FormatException('Required field "$key" is null in SalesReturn JSON.');
      }
      if (value is int) {
        return value;
      } else if (value is String) {
        return int.tryParse(value) ?? (throw FormatException('Invalid int format for "$key": "$value".'));
      }
      throw FormatException('Unexpected type for "$key": ${value.runtimeType}. Expected int or String.');
    }

    double _parseDoubleRequired(Map<String, dynamic> json, String key) {
      final value = json[key];
      if (value == null) {
        throw FormatException('Required field "$key" is null in SalesReturn JSON.');
      }
      final parsed = double.tryParse(value.toString());
      if (parsed == null) {
        throw FormatException('Invalid double format for "$key": "$value".');
      }
      return parsed;
    }

    String _parseStringRequired(Map<String, dynamic> json, String key) {
      final value = json[key];
      if (value == null) {
        throw FormatException('Required field "$key" is null in SalesReturn JSON.');
      }
      return value.toString();
    }

    DateTime _parseDateTimeRequired(Map<String, dynamic> json, String key) {
      final value = json[key];
      if (value == null) {
        throw FormatException('Required field "$key" is null in SalesReturn JSON.');
      }
      if (value is String && value.isNotEmpty) {
        try {
          final cleanedValue = value.replaceAll(' ', 'T');
          return DateTime.parse(cleanedValue);
        } catch (e) {
          throw FormatException('Invalid DateTime format for "$key": "$value". Error: $e');
        }
      }
      throw FormatException('Unexpected type for "$key": ${value.runtimeType}. Expected String.');
    }

    DateTime? _parseDateTimeNullable(dynamic value) {
      if (value is String && value.isNotEmpty) {
        try {
          final cleanedValue = value.replaceAll(' ', 'T');
          return DateTime.parse(cleanedValue);
        } catch (e) {
          print('Warning: Could not parse nullable DateTime "$value": $e');
          return null;
        }
      }
      return null;
    }

    List<SalesReturnItem> parsedItems = [];
    if (json['items'] != null && json['items'] is List) {
      parsedItems = (json['items'] as List).map((itemJson) => SalesReturnItem.fromJson(itemJson as Map<String, dynamic>)).toList();
    }

    return SalesReturn(
      returnsId: _parseIntRequired(json, 'returns_id'),
      clientId: _parseIntRequired(json, 'returns_client_id'),
      salesOrderId: json['returns_sales_order_id'] as int?,
      returnsDate: _parseDateTimeRequired(json, 'returns_date'),
      reason: json['returns_reason'] as String?,
      totalAmount: _parseDoubleRequired(json, 'returns_total_amount'),
      status: _parseStringRequired(json, 'returns_status'),
      notes: json['returns_notes'] as String?,
      createdByUserId: json['returns_created_by_user_id'] as int?,
      visitId: json['sales_returns_visit_id'] as int?,
      createdAt: _parseDateTimeNullable(json['returns_created_at']),
      updatedAt: _parseDateTimeNullable(json['returns_updated_at']),
      clientCompanyName: json['clients_company_name'] as String?,
      salesOrderTotalAmount: json['sales_order_total_amount'] as String?, // Keep as String as per DB
      createdByUserName: json['created_by_user_name'] as String?,
      apiTotalTaxAmount: json['total_tax_amount'] != null ? double.tryParse(json['total_tax_amount'].toString()) : null,
      apiSubtotalAmount: json['subtotal_amount'] != null ? double.tryParse(json['subtotal_amount'].toString()) : null,
      items: parsedItems,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'returns_id': returnsId,
      'returns_client_id': clientId,
      'returns_sales_order_id': salesOrderId,
      'returns_date': returnsDate.toIso8601String(),
      'returns_reason': reason,
      'returns_total_amount': totalAmount,
      'returns_status': status,
      'returns_notes': notes,
      'returns_created_by_user_id': createdByUserId,
      'sales_returns_visit_id': visitId,
      'returns_created_at': createdAt?.toIso8601String(),
      'returns_updated_at': updatedAt?.toIso8601String(),
      'items': items.map((item) => item.toJson()).toList(),
    };
  }

  SalesReturn copyWith({
    int? returnsId,
    int? clientId,
    int? salesOrderId,
    DateTime? returnsDate,
    String? reason,
    double? totalAmount,
    String? status,
    String? notes,
    int? createdByUserId,
    int? visitId,
    DateTime? createdAt,
    DateTime? updatedAt,
    String? clientCompanyName,
    String? salesOrderTotalAmount,
    String? createdByUserName,
    double? apiTotalTaxAmount,
    double? apiSubtotalAmount,
    List<SalesReturnItem>? items,
  }) {
    return SalesReturn(
      returnsId: returnsId ?? this.returnsId,
      clientId: clientId ?? this.clientId,
      salesOrderId: salesOrderId ?? this.salesOrderId,
      returnsDate: returnsDate ?? this.returnsDate,
      reason: reason ?? this.reason,
      totalAmount: totalAmount ?? this.totalAmount,
      status: status ?? this.status,
      notes: notes ?? this.notes,
      createdByUserId: createdByUserId ?? this.createdByUserId,
      visitId: visitId ?? this.visitId,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      clientCompanyName: clientCompanyName ?? this.clientCompanyName,
      salesOrderTotalAmount: salesOrderTotalAmount ?? this.salesOrderTotalAmount,
      createdByUserName: createdByUserName ?? this.createdByUserName,
      apiTotalTaxAmount: apiTotalTaxAmount ?? this.apiTotalTaxAmount,
      apiSubtotalAmount: apiSubtotalAmount ?? this.apiSubtotalAmount,
      items: items ?? this.items,
    );
  }

  // Getters for tax calculations
  double get totalTaxAmount {
    // Use API field if available, otherwise calculate from items
    return apiTotalTaxAmount ?? items.fold(0.0, (sum, item) => sum + item.taxAmount);
  }

  double get subtotalAmount {
    // Use API field if available, otherwise calculate from items
    return apiSubtotalAmount ?? items.fold(0.0, (sum, item) => sum + item.subtotal);
  }

  double get totalAmountWithTax {
    // If we have API fields, use them for accurate calculation
    if (apiTotalTaxAmount != null && apiSubtotalAmount != null) {
      return apiSubtotalAmount! + apiTotalTaxAmount!;
    }
    // Otherwise fall back to calculated values
    return subtotalAmount + totalTaxAmount;
  }

  bool get hasTaxItems {
    // If we have API tax amount, check if it's greater than 0
    if (apiTotalTaxAmount != null) {
      return apiTotalTaxAmount! > 0;
    }
    // Otherwise check items
    return items.any((item) => item.hasTax);
  }
}
