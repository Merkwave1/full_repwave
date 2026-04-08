// lib/data/models/sales_order.dart
import '/data/models/sales_order_item.dart'; // Import SalesOrderItem model

class SalesOrder {
  final int salesOrderId;
  final int? clientId; // Made nullable
  final int? representativeId; // Re-added as it's in the detail response
  final int? warehouseId; // Made nullable
  final int? visitId; // Made nullable
  final DateTime? orderDate; // Made nullable
  final DateTime? actualDeliveryDate;
  final String status;
  final String? deliveryStatus; // New: delivery status (Not_Delivered, Partially_Delivered, Delivered)
  final double subtotal;
  final double discountAmount;
  final double orderDiscountAmount;
  final double taxAmount;
  final double totalAmount;
  final String? notes;
  final DateTime? createdAt; // Made nullable
  final DateTime? updatedAt; // Made nullable

  // Optional: Add related models for display purposes if they come with the API response
  // For example, Client details, Representative name, Warehouse name.
  // These would need to be populated in the fromJson method if the API provides them.
  final String? clientCompanyName;
  final String? clientAddress; // New field from detail API
  final String? clientCity; // New field from detail API
  final String? clientContactPhone1; // New field from detail API
  final String? representativeName;
  final String? warehouseName;

  // List of sales order items
  final List<SalesOrderItem> items; // New field for order items

  SalesOrder({
    required this.salesOrderId,
    this.clientId,
    this.representativeId, // Re-added to constructor
    this.warehouseId,
    this.visitId,
    this.orderDate,
    this.actualDeliveryDate,
    required this.status,
    this.deliveryStatus,
    required this.subtotal,
    required this.discountAmount,
    this.orderDiscountAmount = 0.0,
    required this.taxAmount,
    required this.totalAmount,
    this.notes,
    this.createdAt,
    this.updatedAt,
    this.clientCompanyName,
    this.clientAddress, // Added to constructor
    this.clientCity, // Added to constructor
    this.clientContactPhone1, // Added to constructor
    this.representativeName,
    this.warehouseName,
    this.items = const [], // Initialize with empty list
  });

  // New copyWith method to create a new instance with updated values
  SalesOrder copyWith({
    int? salesOrderId,
    int? clientId,
    int? representativeId,
    int? warehouseId,
    int? visitId,
    DateTime? orderDate,
    DateTime? actualDeliveryDate,
    String? status,
    String? deliveryStatus,
    double? subtotal,
    double? discountAmount,
    double? orderDiscountAmount,
    double? taxAmount,
    double? totalAmount,
    String? notes,
    DateTime? createdAt,
    DateTime? updatedAt,
    String? clientCompanyName,
    String? clientAddress,
    String? clientCity,
    String? clientContactPhone1,
    String? representativeName,
    String? warehouseName,
    List<SalesOrderItem>? items,
  }) {
    return SalesOrder(
      salesOrderId: salesOrderId ?? this.salesOrderId,
      clientId: clientId ?? this.clientId,
      representativeId: representativeId ?? this.representativeId,
      warehouseId: warehouseId ?? this.warehouseId,
      visitId: visitId ?? this.visitId,
      orderDate: orderDate ?? this.orderDate,
      actualDeliveryDate: actualDeliveryDate ?? this.actualDeliveryDate,
      status: status ?? this.status,
      deliveryStatus: deliveryStatus ?? this.deliveryStatus,
      subtotal: subtotal ?? this.subtotal,
      discountAmount: discountAmount ?? this.discountAmount,
      orderDiscountAmount: orderDiscountAmount ?? this.orderDiscountAmount,
      taxAmount: taxAmount ?? this.taxAmount,
      totalAmount: totalAmount ?? this.totalAmount,
      notes: notes ?? this.notes,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      clientCompanyName: clientCompanyName ?? this.clientCompanyName,
      clientAddress: clientAddress ?? this.clientAddress,
      clientCity: clientCity ?? this.clientCity,
      clientContactPhone1: clientContactPhone1 ?? this.clientContactPhone1,
      representativeName: representativeName ?? this.representativeName,
      warehouseName: warehouseName ?? this.warehouseName,
      items: items ?? this.items,
    );
  }

  factory SalesOrder.fromJson(Map<String, dynamic> json) {
    // Helper function to safely parse DateTime from String
    DateTime? parseDateTime(dynamic value) {
      if (value is String && value.isNotEmpty) {
        // Handle potential 'YYYY-MM-DD HH:MM:SS' format from SQL DATETIME
        final cleanedValue = value.replaceAll(' ', 'T'); // Replace space with T for ISO 8601
        return DateTime.tryParse(cleanedValue);
      }
      return null;
    }

    // Helper function to safely parse double from String or num
    double parseDouble(dynamic value) {
      if (value is num) {
        return value.toDouble();
      } else if (value is String && value.isNotEmpty) {
        return double.tryParse(value) ?? 0.0;
      }
      return 0.0;
    }

    // Helper function to safely parse int from String or num, for nullable fields
    int? parseInt(dynamic value) {
      if (value is int) {
        return value;
      } else if (value is String && value.isNotEmpty) {
        return int.tryParse(value);
      }
      return null;
    }

    // Helper function to safely parse int for REQUIRED fields, providing better error messages
    int _parseIntRequired(Map<String, dynamic> json, String key) {
      final value = json[key];
      if (value == null) {
        throw FormatException('Required field "$key" is null in SalesOrder JSON.');
      }
      if (value is int) {
        return value;
      } else if (value is String) {
        return int.tryParse(value) ?? (throw FormatException('Invalid int format for "$key": "$value".'));
      } else {
        throw FormatException('Unexpected type for "$key": ${value.runtimeType}. Expected int or String.');
      }
    }

    try {
      // Parse items list if available
      final List<dynamic>? itemsJson = json['items'] as List<dynamic>?;
      final List<SalesOrderItem> parsedItems = itemsJson != null ? itemsJson.map((itemJson) => SalesOrderItem.fromJson(itemJson as Map<String, dynamic>)).toList() : [];
      final double orderDiscountAmount = parseDouble(json['sales_orders_discount_amount']);
      final double itemsDiscountTotal = parsedItems.fold(0.0, (sum, item) => sum + item.discountAmount);

      return SalesOrder(
        salesOrderId: _parseIntRequired(json, 'sales_orders_id'),
        clientId: parseInt(json['clients_id'] ?? json['sales_orders_client_id']), // Try both keys
        representativeId: parseInt(json['sales_orders_representative_id']), // Re-added parsing
        warehouseId: parseInt(json['sales_orders_warehouse_id']),
        visitId: parseInt(json['sales_orders_visit_id']),
        orderDate: parseDateTime(json['sales_orders_order_date']),
        actualDeliveryDate: parseDateTime(json['sales_orders_actual_delivery_date']),
        status: json['sales_orders_status'] as String,
        deliveryStatus: json['sales_orders_delivery_status'] as String?,
        subtotal: parseDouble(json['sales_orders_subtotal']),
        discountAmount: orderDiscountAmount + itemsDiscountTotal,
        orderDiscountAmount: orderDiscountAmount,
        taxAmount: parseDouble(json['sales_orders_tax_amount']),
        totalAmount: parseDouble(json['sales_orders_total_amount']),
        notes: json['sales_orders_notes'] as String?,
        createdAt: parseDateTime(json['sales_orders_created_at']),
        updatedAt: parseDateTime(json['sales_orders_updated_at']),
        // Populate these if your API response includes them joined
        clientCompanyName: json['clients_company_name'] as String?,
        clientAddress: json['clients_address'] as String?, // New field
        clientCity: json['clients_city'] as String?, // New field
        clientContactPhone1: json['clients_contact_phone_1'] as String?, // New field
        representativeName: json['representative_name'] as String?,
        warehouseName: json['warehouse_name'] as String?,
        items: parsedItems, // Assign parsed items
      );
    } catch (e, stack) {
      print('Error parsing SalesOrder from JSON:');
      print('JSON data received: $json');
      print('Error: $e');
      print('Stack trace: $stack');
      rethrow;
    }
  }

  Map<String, dynamic> toJson() {
    return {
      'sales_orders_id': salesOrderId,
      'sales_orders_client_id': clientId,
      'sales_orders_representative_id': representativeId, // Re-added to toJson
      'sales_orders_warehouse_id': warehouseId,
      'sales_orders_visit_id': visitId,
      'sales_orders_order_date': orderDate?.toIso8601String(),
      'sales_orders_status': status,
      'sales_orders_delivery_status': deliveryStatus,
      'sales_orders_subtotal': subtotal,
      'sales_orders_discount_amount': orderDiscountAmount,
      'sales_orders_tax_amount': taxAmount,
      'sales_orders_total_amount': totalAmount,
      'sales_orders_notes': notes,
      'sales_orders_created_at': createdAt?.toIso8601String(),
      'sales_orders_updated_at': updatedAt?.toIso8601String(),
      // Do not include joined fields in toJson unless they are part of the writable payload
      // 'clients_company_name': clientCompanyName,
      // 'clients_address': clientAddress,
      // 'clients_city': clientCity,
      // 'clients_contact_phone_1': clientContactPhone1,
      // 'representative_name': representativeName,
      // 'warehouse_name': warehouseName,
      'items': items.map((e) => e.toJson()).toList(), // Include items in toJson
    };
  }
}
