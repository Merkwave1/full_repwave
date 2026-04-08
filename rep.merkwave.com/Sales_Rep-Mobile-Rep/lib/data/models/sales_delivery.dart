// lib/data/models/sales_delivery.dart
import 'sales_delivery_item.dart';

class SalesDelivery {
  final int deliveryId;
  final int salesOrderId;
  final int warehouseId;
  final String status; // Preparing, Shipped, Delivered, Failed
  final DateTime deliveryDate;
  final String? notes;
  final String? address;
  final List<SalesDeliveryItem> items;
  final String? clientCompanyName;
  final String? warehouseName;
  final String? deliveredByName;
  final int? totalItems;
  final double? totalQuantityDelivered;

  SalesDelivery({
    required this.deliveryId,
    required this.salesOrderId,
    required this.warehouseId,
    required this.status,
    required this.deliveryDate,
    this.notes,
    this.address,
    this.items = const [],
  this.clientCompanyName,
  this.warehouseName,
  this.deliveredByName,
  this.totalItems,
  this.totalQuantityDelivered,
  });

  factory SalesDelivery.fromJson(Map<String, dynamic> json) {
    DateTime parseDate(dynamic v) {
      if (v is String && v.isNotEmpty) {
        return DateTime.tryParse(v.replaceAll(' ', 'T')) ?? DateTime.now();
      }
      return DateTime.now();
    }
    final itemsJson = json['items'] as List<dynamic>? ?? [];
    return SalesDelivery(
      deliveryId: int.tryParse(json['sales_deliveries_id']?.toString() ?? '0') ?? 0,
      salesOrderId: int.tryParse(json['sales_deliveries_sales_order_id']?.toString() ?? '0') ?? 0,
      warehouseId: int.tryParse(json['sales_deliveries_warehouse_id']?.toString() ?? '0') ?? 0,
      status: json['sales_deliveries_delivery_status']?.toString() ?? 'Preparing',
      deliveryDate: parseDate(json['sales_deliveries_delivery_date']),
      notes: json['sales_deliveries_delivery_notes'] as String?,
      address: json['sales_deliveries_delivery_address'] as String?,
      items: itemsJson.map((e) => SalesDeliveryItem.fromJson(e as Map<String, dynamic>)).toList(),
  clientCompanyName: json['clients_company_name'] as String?,
  warehouseName: json['warehouse_name'] as String?,
  deliveredByName: json['delivered_by_name'] as String?,
  totalItems: int.tryParse(json['total_items']?.toString() ?? ''),
  totalQuantityDelivered: double.tryParse(json['total_quantity_delivered']?.toString() ?? ''),
    );
  }
}
