// lib/data/repositories/sales_order_repository.dart
import '/data/datasources/sales_order_remote_datasource.dart';
import '/data/exceptions/api_exceptions.dart';
import '/data/models/sales_order.dart';

class SalesOrderRepository {
  final SalesOrderRemoteDataSource remoteDataSource;

  SalesOrderRepository({required this.remoteDataSource});

  Future<List<SalesOrder>> getAllSalesOrders({
    String? status,
    String? dateFrom,
    String? dateTo,
    String? search,
    int? page,
    int? limit,
    int? clientId,
    String? deliveryStatus,
  }) async {
    try {
      return await remoteDataSource.getAllSalesOrders(
        status: status,
        dateFrom: dateFrom,
        dateTo: dateTo,
        search: search,
        page: page,
        limit: limit,
        clientId: clientId,
        deliveryStatus: deliveryStatus,
      );
    } catch (e) {
      print('SalesOrderRepository Error in getAllSalesOrders: ${e.toString()}');
      throw Exception('Error fetching sales orders: ${e.toString()}');
    }
  }

  Future<SalesOrder> getSalesOrderById(int id) async {
    try {
      return await remoteDataSource.getSalesOrderById(id);
    } catch (e) {
      print('SalesOrderRepository Error in getSalesOrderById: ${e.toString()}');
      throw Exception('Error fetching sales order details: ${e.toString()}');
    }
  }

  Future<SalesOrder> createSalesOrder(SalesOrder salesOrder) async {
    try {
      return await remoteDataSource.createSalesOrder(salesOrder);
    } on CreditLimitExceededException catch (e) {
      print('SalesOrderRepository Credit Limit in createSalesOrder: ${e.toString()}');
      rethrow;
    } on ApiException catch (e) {
      print('SalesOrderRepository API error in createSalesOrder: ${e.toString()}');
      rethrow;
    } catch (e) {
      print('SalesOrderRepository Error in createSalesOrder: ${e.toString()}');
      throw Exception('Error creating sales order: ${e.toString()}');
    }
  }

  Future<SalesOrder> updateSalesOrder(SalesOrder salesOrder) async {
    try {
      return await remoteDataSource.updateSalesOrder(salesOrder);
    } on CreditLimitExceededException catch (e) {
      print('SalesOrderRepository Credit Limit in updateSalesOrder: ${e.toString()}');
      rethrow;
    } on ApiException catch (e) {
      print('SalesOrderRepository API error in updateSalesOrder: ${e.toString()}');
      rethrow;
    } catch (e) {
      print('SalesOrderRepository Error in updateSalesOrder: ${e.toString()}');
      throw Exception('Error updating sales order: ${e.toString()}');
    }
  }

  Future<SalesOrder> updateDeliveryStatus(int orderId, String deliveryStatus) async {
    try {
      return await remoteDataSource.updateDeliveryStatus(orderId, deliveryStatus);
    } catch (e) {
      print('SalesOrderRepository Error in updateDeliveryStatus: ${e.toString()}');
      throw Exception('Error updating delivery status: ${e.toString()}');
    }
  }
}
