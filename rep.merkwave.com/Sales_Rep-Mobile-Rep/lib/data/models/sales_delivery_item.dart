// lib/data/models/sales_delivery_item.dart
class SalesDeliveryItem {
  final int deliveryItemId;
  final int deliveryId;
  final int salesOrderItemId;
  final double quantityDelivered;
  final String? notes;
  final DateTime? batchDate;

  SalesDeliveryItem({
    required this.deliveryItemId,
    required this.deliveryId,
    required this.salesOrderItemId,
    required this.quantityDelivered,
    this.notes,
    this.batchDate,
  });

  factory SalesDeliveryItem.fromJson(Map<String, dynamic> json) {
    DateTime? parseDate(dynamic v) {
      if (v is String && v.isNotEmpty) {
        return DateTime.tryParse(v.replaceAll(' ', 'T'));
      }
      return null;
    }
    double parseDouble(dynamic v) {
      if (v is num) return v.toDouble();
      if (v is String) return double.tryParse(v) ?? 0.0;
      return 0.0;
    }
    int parseInt(dynamic v) {
      if (v is int) return v;
      if (v is String) return int.tryParse(v) ?? 0;
      return 0;
    }

    return SalesDeliveryItem(
      deliveryItemId: parseInt(json['sales_delivery_items_id']),
      deliveryId: parseInt(json['sales_delivery_items_delivery_id']),
      salesOrderItemId: parseInt(json['sales_delivery_items_sales_order_item_id']),
      quantityDelivered: parseDouble(json['sales_delivery_items_quantity_delivered']),
      notes: json['sales_delivery_items_notes'] as String?,
      batchDate: parseDate(json['sales_delivery_items_batch_date']),
    );
  }
}
