// lib/data/repositories/sales_delivery_repository.dart
import '/data/datasources/sales_delivery_remote_datasource.dart';
import '/data/models/sales_delivery.dart';

class SalesDeliveryRepository {
  final SalesDeliveryRemoteDataSource remote;
  SalesDeliveryRepository({required this.remote});

  Future<List<Map<String, dynamic>>> getPendingOrders({
    String? search,
    String? status,
    String? warehouse,
    String? client,
    int? page,
    int? limit,
  }) =>
      remote.getPendingOrders(
        search: search,
        status: status,
        warehouse: warehouse,
        client: client,
        page: page,
        limit: limit,
      );

  Future<Map<String, dynamic>?> getPendingOrderById(int salesOrderId) async {
    final list = await remote.getPendingOrders();
    try {
      return list.firstWhere((o) {
        final id = o['sales_orders_id'];
        if (id is int) return id == salesOrderId;
        return int.tryParse(id?.toString() ?? '') == salesOrderId;
      });
    } catch (e) {
      return null; // Not found in pending list
    }
  }

  Future<SalesDelivery> getDeliveryDetail(int id) => remote.getDeliveryDetail(id);
  Future<List<SalesDelivery>> getDeliveriesForOrder(int salesOrderId) => remote.getDeliveriesForOrder(salesOrderId);
  Future<SalesDelivery> createDelivery({
    required int salesOrderId,
    required int warehouseId,
    required List<Map<String, dynamic>> items,
    String status = 'Preparing',
    String? notes,
    String? address,
  }) =>
      remote.createDelivery(
        salesOrderId: salesOrderId,
        warehouseId: warehouseId,
        items: items,
        status: status,
        notes: notes,
        address: address,
      );
}
