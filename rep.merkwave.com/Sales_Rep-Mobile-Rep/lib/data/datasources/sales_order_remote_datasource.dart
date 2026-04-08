// lib/data/datasources/sales_order_remote_datasource.dart
import '/core/app_constants.dart'; // For API endpoints
import '/data/models/sales_order.dart'; // Import SalesOrder model
import '/services/api_service.dart'; // Import ApiService
import '/data/exceptions/api_exceptions.dart'; // Import API exceptions
import '/modules/auth/controllers/auth_controller.dart'; // Import AuthController
import 'package:get/get.dart'; // Import Get for Get.find
import 'dart:convert'; // For jsonEncode

class SalesOrderRemoteDataSource {
  final ApiService apiService;
  final AuthController _authController = Get.find<AuthController>(); // Get AuthController

  SalesOrderRemoteDataSource({required this.apiService});

  // Helper to get the current user's UUID
  String? get _userUuid => _authController.currentUser.value?.uuid;

  /// Fetches all sales orders from the API with optional filters and pagination.
  ///
  /// Parameters:
  /// - [status]: Filter by sales order status (e.g., 'Draft', 'Approved').
  /// - [dateFrom]: Start date for filtering orders (YYYY-MM-DD).
  /// - [dateTo]: End date for filtering orders (YYYY-MM-DD).
  /// - [search]: Search query for company name or other relevant fields.
  /// - - [page]: Current page number for pagination.
  /// - [limit]: Number of items per page.
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
      // Get user UUID for authentication
      if (_userUuid == null) {
        throw Exception('User UUID not available. Cannot fetch sales orders.');
      }

      // Build query parameters based on provided arguments
      final Map<String, String> queryParameters = {
        'users_uuid': _userUuid!, // Add user UUID for authentication
      };
      if (status != null && status.isNotEmpty) queryParameters['status'] = status;
      if (clientId != null) queryParameters['client_id'] = clientId.toString();
      if (deliveryStatus != null && deliveryStatus.isNotEmpty) queryParameters['delivery_status'] = deliveryStatus;
      if (dateFrom != null && dateFrom.isNotEmpty) queryParameters['date_from'] = dateFrom;
      if (dateTo != null && dateTo.isNotEmpty) queryParameters['date_to'] = dateTo;
      if (search != null && search.isNotEmpty) queryParameters['search'] = search;
      if (page != null) queryParameters['page'] = page.toString();
      if (limit != null) queryParameters['limit'] = limit.toString();

      // Use the new endpoint for fetching sales orders with parameters
      // Ensure queryParameters are passed correctly to apiService.get

      final response = await apiService.get(
        AppConstants.apiSalesOrdersAllEndpoint,
        queryParameters: queryParameters, // Pass the map of query parameters
      );

      // Assuming successful responses have 'status': 'success' and 'data' key
      if (response['status'] == 'success' && response['data'] is Map<String, dynamic>) {
        final Map<String, dynamic> responseData = response['data'] as Map<String, dynamic>;
        // Access the nested 'data' key which contains the list of sales orders
        final List<dynamic> jsonList = responseData['data'] as List<dynamic>;
        return jsonList.map((json) => SalesOrder.fromJson(json as Map<String, dynamic>)).toList();
      } else {
        // Handle API error responses or unexpected structure
        throw Exception('Failed to load sales orders: ${response['message'] ?? 'Unknown error'}');
      }
    } catch (e) {
      // Catch any network or parsing errors
      throw Exception('Error fetching sales orders: $e');
    }
  }

  /// Fetches a single sales order by its ID from the API.
  Future<SalesOrder> getSalesOrderById(int orderId) async {
    try {
      // Get user UUID for authentication
      if (_userUuid == null) {
        throw Exception('User UUID not available. Cannot fetch sales order details.');
      }

      final response = await apiService.get(
        AppConstants.apiSalesOrdersDetailEndpoint,
        queryParameters: {
          'id': orderId.toString(),
          'users_uuid': _userUuid!, // Add user UUID for authentication
        },
      );

      // The detail API response has 'data' directly as the SalesOrder object
      if (response['status'] == 'success' && response['data'] is Map<String, dynamic>) {
        final Map<String, dynamic> jsonData = response['data'] as Map<String, dynamic>;
        return SalesOrder.fromJson(jsonData); // Parse the single SalesOrder object
      } else {
        throw Exception('Failed to load sales order $orderId: ${response['message'] ?? 'Unknown error'}');
      }
    } catch (e) {
      throw Exception('Error fetching sales order $orderId: $e');
    }
  }

  /// Creates a new sales order via the API.
  Future<SalesOrder> createSalesOrder(SalesOrder salesOrder) async {
    try {
      final data = salesOrder.toJson();
      data['items'] = jsonEncode(data['items']);
      // Ensure delivery status is a valid value
      if (data['sales_orders_delivery_status'] == null || (data['sales_orders_delivery_status'] is String && (data['sales_orders_delivery_status'] as String).isEmpty)) {
        data['sales_orders_delivery_status'] = 'Not_Delivered';
      }
      // Ensure visit_id is null if not set or invalid
      if (data['sales_orders_visit_id'] == null || data['sales_orders_visit_id'] == 0 || data['sales_orders_visit_id'] == '0') {
        data['sales_orders_visit_id'] = null;
      }
      final response = await apiService.post(
        AppConstants.apiAddSalesOrderEndpoint,
        data, // Send with items as JSON string
      );

      // Assuming successful responses have 'status': 'success' and 'data' key
      if (response['status'] == 'success' && response['data'] is Map<String, dynamic>) {
        final Map<String, dynamic> jsonData = response['data'] as Map<String, dynamic>;
        return SalesOrder.fromJson(jsonData); // Return the created sales order from response
      } else {
        final message = response['message']?.toString() ?? 'Unknown error';
        final creditMatch = RegExp(r'Available credit:\s*(-?\d+(?:\.\d+)?),\s*required:\s*(-?\d+(?:\.\d+)?)').firstMatch(message);
        if (message.toLowerCase().contains('credit limit exceeded')) {
          final available = double.tryParse(creditMatch?.group(1) ?? '') ?? 0.0;
          final requiredAmount = double.tryParse(creditMatch?.group(2) ?? '') ?? 0.0;
          throw CreditLimitExceededException(
            message: message,
            available: available,
            requiredAmount: requiredAmount,
          );
        }
        throw ApiException(message);
      }
    } catch (e) {
      if (e is CreditLimitExceededException || e is ApiException) {
        rethrow;
      }
      throw Exception('Error creating sales order: $e');
    }
  }

  /// Updates an existing sales order via the API.
  Future<SalesOrder> updateSalesOrder(SalesOrder salesOrder) async {
    try {
      final data = salesOrder.toJson();
      data['items'] = jsonEncode(data['items']);
      // Ensure delivery status is a valid value
      if (data['sales_orders_delivery_status'] == null || (data['sales_orders_delivery_status'] is String && (data['sales_orders_delivery_status'] as String).isEmpty)) {
        data['sales_orders_delivery_status'] = 'Not_Delivered';
      }
      // Ensure visit_id is null if not set or invalid
      if (data['sales_orders_visit_id'] == null || data['sales_orders_visit_id'] == 0 || data['sales_orders_visit_id'] == '0') {
        data['sales_orders_visit_id'] = null;
      }
      final response = await apiService.post(
        // Or PUT, depending on your API
        AppConstants.apiUpdateSalesOrderEndpoint,
        data,
      );

      // Assuming successful responses have 'status': 'success' and 'data' key
      if (response['status'] == 'success' && response['data'] is Map<String, dynamic>) {
        final Map<String, dynamic> jsonData = response['data'] as Map<String, dynamic>;
        return SalesOrder.fromJson(jsonData); // Return the updated sales order from response
      } else {
        final message = response['message']?.toString() ?? 'Unknown error';
        final creditMatch = RegExp(r'Available credit:\s*(-?\d+(?:\.\d+)?),\s*required:\s*(-?\d+(?:\.\d+)?)').firstMatch(message);
        if (message.toLowerCase().contains('credit limit exceeded')) {
          final available = double.tryParse(creditMatch?.group(1) ?? '') ?? 0.0;
          final requiredAmount = double.tryParse(creditMatch?.group(2) ?? '') ?? 0.0;
          throw CreditLimitExceededException(
            message: message,
            available: available,
            requiredAmount: requiredAmount,
          );
        }
        throw ApiException(message);
      }
    } catch (e) {
      if (e is CreditLimitExceededException || e is ApiException) {
        rethrow;
      }
      throw Exception('Error updating sales order: $e');
    }
  }

  /// Lightweight update: only delivery status for a given order.
  Future<SalesOrder> updateDeliveryStatus(int orderId, String deliveryStatus) async {
    try {
      final response = await apiService.post(
        AppConstants.apiUpdateSalesOrderEndpoint,
        {
          'sales_orders_id': orderId.toString(),
          'sales_orders_delivery_status': deliveryStatus,
        },
      );
      if (response['status'] == 'success' && response['data'] is Map<String, dynamic>) {
        return SalesOrder.fromJson(response['data'] as Map<String, dynamic>);
      }
      throw Exception(response['message'] ?? 'Failed to update delivery status');
    } catch (e) {
      throw Exception('Error updating delivery status: $e');
    }
  }

  /// Deletes a sales order by its ID via the API.
  Future<void> deleteSalesOrder(int orderId) async {
    try {
      final response = await apiService.post(
        // Or DELETE, depending on your API
        AppConstants.apiDeleteSalesOrderEndpoint, // Assuming a delete endpoint
        {'sales_orders_id': orderId}, // Send ID in body for POST, or as part of URL for DELETE
      );

      // Assuming successful responses have 'status': 'success'
      if (response['status'] != 'success') {
        throw Exception('Failed to delete sales order $orderId: ${response['message'] ?? 'Unknown error'}');
      }
    } catch (e) {
      throw Exception('Error deleting sales order $orderId: $e');
    }
  }
}
