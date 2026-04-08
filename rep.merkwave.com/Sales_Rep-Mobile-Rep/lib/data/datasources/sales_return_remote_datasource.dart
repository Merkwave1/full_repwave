// lib/data/datasources/sales_return_remote_datasource.dart
import 'dart:convert';
import '/data/models/sales_return.dart';
import '/services/api_service.dart'; // Import ApiService
import '/core/app_constants.dart';

class SalesReturnRemoteDataSource {
  final ApiService apiService; // Declare ApiService

  SalesReturnRemoteDataSource({required this.apiService}); // Require ApiService in constructor

  Future<List<SalesReturn>> getAllSalesReturns({
    String? status,
    String? dateFrom,
    String? dateTo,
    String? search,
    int? page,
    int? limit,
    int? salesOrderId, // Add salesOrderId parameter for list filtering
    String? usersUuid, // Add usersUuid parameter for user-specific filtering
  }) async {
    final String path = '/sales_returns/get.php';
    final Map<String, String> queryParams = {};
    if (status != null && status.isNotEmpty) queryParams['status'] = status;
    if (dateFrom != null && dateFrom.isNotEmpty) queryParams['date_from'] = dateFrom;
    if (dateTo != null && dateTo.isNotEmpty) queryParams['date_to'] = dateTo;
    if (search != null && search.isNotEmpty) queryParams['search'] = search;
    if (page != null) queryParams['page'] = page.toString();
    if (limit != null) queryParams['limit'] = limit.toString();
    if (salesOrderId != null) queryParams['sales_order_id'] = salesOrderId.toString();
    if (usersUuid != null && usersUuid.isNotEmpty) queryParams['users_uuid'] = usersUuid;

    final Uri uri = Uri.parse(AppConstants.apiBaseUrl() + path).replace(queryParameters: queryParams);
    print('API GET Request URL: $uri');

    final response = await apiService.get(path, queryParameters: queryParams);

    if (response['status'] == 'success') {
      final List<dynamic> data = response['data']['data'];
      return data.map((json) => SalesReturn.fromJson(json as Map<String, dynamic>)).toList();
    } else {
      throw Exception('Error fetching sales returns: ${response['message']}');
    }
  }

  // New method to fetch summed returned quantities per sales_order_item_id
  Future<Map<int, double>> getSummedReturnedQuantities({required int salesOrderId, String? usersUuid}) async {
    final String path = '/sales_returns/get.php';
    final Map<String, String> queryParams = {
      'sum_by_so_items': 'true',
      'sales_order_id': salesOrderId.toString(),
    };

    // Add users_uuid parameter if provided
    if (usersUuid != null && usersUuid.isNotEmpty) {
      queryParams['users_uuid'] = usersUuid;
    }

    final Uri uri = Uri.parse(AppConstants.apiBaseUrl() + path).replace(queryParameters: queryParams);
    print('API GET Request URL for Summed Quantities: $uri');

    final response = await apiService.get(path, queryParameters: queryParams);

    print('DEBUG - Summed Quantities API Response: ${response.toString()}');

    if (response['status'] == 'success') {
      final dynamic data = response['data'];
      print('DEBUG - Summed Quantities Data: $data');
      print('DEBUG - Data Type: ${data.runtimeType}');

      // Handle both Map and List responses from the API
      if (data is Map<String, dynamic>) {
        print('DEBUG - Processing as Map');
        // Convert string keys to int keys and string values to double values
        final result = data.map((key, value) => MapEntry(int.parse(key), double.parse(value.toString())));
        print('DEBUG - Map Result: $result');
        return result;
      } else if (data is List<dynamic>) {
        print('DEBUG - Processing as List');
        // If API returns a list, convert it to a map
        final Map<int, double> result = {};
        for (final item in data) {
          if (item is Map<String, dynamic>) {
            print('DEBUG - Processing item: $item');
            final int salesOrderItemId = int.parse(item['sales_order_item_id'].toString());
            final double quantity = double.parse(item['total_returned_quantity'].toString());
            result[salesOrderItemId] = quantity;
            print('DEBUG - Added to result: $salesOrderItemId -> $quantity');
          }
        }
        print('DEBUG - Final List Result: $result');
        return result;
      } else {
        print('DEBUG - Data is empty or unexpected type, returning empty map');
        // If data is empty or null, return empty map
        return {};
      }
    } else {
      print('DEBUG - API Error: ${response['message']}');
      throw Exception('Error fetching summed returned quantities: ${response['message']}');
    }
  }

  Future<SalesReturn> getSalesReturnById(int id) async {
    final String path = '/sales_returns/get.php';
    final Map<String, String> queryParams = {'id': id.toString()};
    final Uri uri = Uri.parse(AppConstants.apiBaseUrl() + path).replace(queryParameters: queryParams);

    print('API GET Request URL: $uri');

    final response = await apiService.get(path, queryParameters: queryParams); // Pass only path and query params

    if (response['status'] == 'success') {
      return SalesReturn.fromJson(response['data'] as Map<String, dynamic>);
    } else {
      throw Exception('Error fetching sales return details: ${response['message']}');
    }
  }

  Future<SalesReturn> createSalesReturn(SalesReturn salesReturn) async {
    final String path = '/sales_returns/add.php';
    final Uri uri = Uri.parse(AppConstants.apiBaseUrl() + path); // Reconstruct full URI for logging

    print('API POST Request URL: $uri');
    print('SalesReturn data to send: ${salesReturn.toJson()}');

    final Map<String, String> body = {
      'returns_client_id': salesReturn.clientId.toString(),
      'returns_date': salesReturn.returnsDate.toIso8601String().split('T')[0],
      'returns_reason': salesReturn.reason ?? '',
      'returns_total_amount': salesReturn.totalAmount.toString(),
      'returns_status': salesReturn.status,
      'returns_notes': salesReturn.notes ?? '',
      'returns_created_by_user_id': salesReturn.createdByUserId.toString(),
      'items': json.encode(salesReturn.items.map((item) => item.toJson()).toList()),
    };

    if (salesReturn.salesOrderId != null) {
      body['returns_sales_order_id'] = salesReturn.salesOrderId.toString();
    }

    if (salesReturn.visitId != null) {
      body['sales_returns_visit_id'] = salesReturn.visitId.toString();
    }

    final response = await apiService.post(
      path, // Pass only the relative path
      body,
    );

    print('response.body ${response['body']}');

    if (response['status'] == 'success') {
      return SalesReturn.fromJson(response['data'] as Map<String, dynamic>);
    } else {
      throw Exception('Error creating sales return: ${response['message']}');
    }
  }

  Future<SalesReturn> updateSalesReturn(SalesReturn salesReturn) async {
    final String path = '/sales_returns/update.php';
    final Uri uri = Uri.parse(AppConstants.apiBaseUrl() + path); // Reconstruct full URI for logging

    print('API POST Request URL: $uri');
    print('SalesReturn data to send: ${salesReturn.toJson()}');

    final Map<String, String> body = {
      'returns_id': salesReturn.returnsId.toString(),
      'returns_client_id': salesReturn.clientId.toString(),
      'returns_date': salesReturn.returnsDate.toIso8601String().split('T')[0],
      'returns_reason': salesReturn.reason ?? '',
      'returns_total_amount': salesReturn.totalAmount.toString(),
      'returns_status': salesReturn.status,
      'returns_notes': salesReturn.notes ?? '',
      'returns_created_by_user_id': salesReturn.createdByUserId.toString(),
      'items': json.encode(salesReturn.items.map((item) => item.toJson()).toList()),
    };

    if (salesReturn.salesOrderId != null) {
      body['returns_sales_order_id'] = salesReturn.salesOrderId.toString();
    }

    if (salesReturn.visitId != null) {
      body['sales_returns_visit_id'] = salesReturn.visitId.toString();
    }

    final response = await apiService.post(
      path, // Pass only the relative path
      body,
    );

    print('response.body ${response['body']}');

    if (response['status'] == 'success') {
      return SalesReturn.fromJson(response['data'] as Map<String, dynamic>);
    } else {
      throw Exception('Error updating sales return: ${response['message']}');
    }
  }
}
