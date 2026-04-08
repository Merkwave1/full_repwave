// lib/data/datasources/sales_delivery_remote_datasource.dart
import 'dart:convert';
import 'package:get/get.dart';
import '/core/app_constants.dart';
import '/data/models/sales_delivery.dart';
import '/modules/auth/controllers/auth_controller.dart';
import '/services/api_service.dart';

class SalesDeliveryRemoteDataSource {
  final ApiService apiService;
  final AuthController _authController = Get.find<AuthController>();

  SalesDeliveryRemoteDataSource({required this.apiService});

  String? get _userUuid => _authController.currentUser.value?.uuid;

  Future<List<Map<String, dynamic>>> getPendingOrders({
    String? search,
    String? status,
    String? warehouse,
    String? client,
    int? page,
    int? limit,
  }) async {
    if (_userUuid == null) throw Exception('User UUID not available');

    final queryParameters = <String, String>{
      'users_uuid': _userUuid!,
    };

    // Add optional filters
    if (search != null && search.isNotEmpty) {
      queryParameters['search'] = search;
    }
    if (status != null && status.isNotEmpty) {
      queryParameters['status'] = status;
    }
    if (warehouse != null && warehouse.isNotEmpty) {
      queryParameters['warehouse'] = warehouse;
    }
    if (client != null && client.isNotEmpty) {
      queryParameters['client'] = client;
    }
    if (page != null) {
      queryParameters['page'] = page.toString();
    }
    if (limit != null) {
      queryParameters['limit'] = limit.toString();
    }

    final response = await apiService.get(
      AppConstants.apiSalesDeliveriesPendingOrdersEndpoint,
      queryParameters: queryParameters,
    );
    if (response['status'] == 'success') {
      // New API structure: data.data contains the array
      final dataObject = response['data'];
      if (dataObject is Map<String, dynamic>) {
        final list = dataObject['data'] as List<dynamic>? ?? [];
        return list.cast<Map<String, dynamic>>();
      }
      // Fallback to old structure for backward compatibility
      final list = response['pending_sales_orders'] as List<dynamic>? ?? [];
      return list.cast<Map<String, dynamic>>();
    }
    throw Exception(response['message'] ?? 'Failed to load pending orders');
  }

  Future<SalesDelivery> getDeliveryDetail(int id) async {
    if (_userUuid == null) throw Exception('User UUID not available');
    final response = await apiService.get(
      AppConstants.apiSalesDeliveriesDetailEndpoint,
      queryParameters: {'id': id.toString(), 'users_uuid': _userUuid!},
    );
    if (response['status'] == 'success') {
      final detailMap = (response['data'] ?? response['delivery']);
      if (detailMap is Map<String, dynamic>) {
        return SalesDelivery.fromJson(detailMap);
      }
      if (detailMap == null) {
        throw Exception('Delivery not found or unauthorized');
      }
    }
    throw Exception(response['message'] ?? 'Failed to load delivery detail');
  }

  /// Fetch all deliveries for a specific sales order (fulfillment history)
  Future<List<SalesDelivery>> getDeliveriesForOrder(int salesOrderId) async {
    if (_userUuid == null) throw Exception('User UUID not available');
    final response = await apiService.get(
      AppConstants.apiSalesDeliveriesAllEndpoint,
      queryParameters: {
        'users_uuid': _userUuid!,
        'sales_order_id': salesOrderId.toString(), // Assumed filter key
      },
    );
    if (response['status'] == 'success') {
      // Accept either 'data' or fallback to 'sales_deliveries'
      final dynamic raw = response['data'] ?? response['sales_deliveries'];
      final list = (raw as List<dynamic>? ?? []);
      return list.map((e) => SalesDelivery.fromJson(e as Map<String, dynamic>)).toList();
    }
    throw Exception(response['message'] ?? 'Failed to load deliveries history');
  }

  Future<SalesDelivery> createDelivery({
    required int salesOrderId,
    required int warehouseId,
    required List<Map<String, dynamic>> items,
    String status = 'Preparing',
    String? notes,
    String? address,
  }) async {
    if (_userUuid == null) throw Exception('User UUID not available');
    final payload = {
      'users_uuid': _userUuid!,
      'sales_order_id': salesOrderId.toString(),
      'warehouse_id': warehouseId.toString(),
      'delivery_status': status,
      if (notes != null) 'delivery_notes': notes,
      if (address != null) 'delivery_address': address,
      'items': jsonEncode(items),
    };
    final response = await apiService.post(AppConstants.apiAddSalesDeliveryEndpoint, payload);
    if (response['status'] == 'success' && response['data'] is Map<String, dynamic>) {
      final deliveryId = (response['data'] as Map<String, dynamic>)['sales_delivery_id'];
      // Fetch detail to get full structure (optional optimization: build directly)
      return getDeliveryDetail(int.tryParse(deliveryId.toString()) ?? 0);
    }
    throw Exception(response['message'] ?? 'Failed to create delivery');
  }
}
