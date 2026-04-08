// lib/data/datasources/warehouse_remote_datasource.dart
import 'package:get/get.dart';
import '/services/api_service.dart';
import '/core/app_constants.dart';
import 'dart:convert';

class WarehouseRemoteDataSource {
  final ApiService _apiService;

  WarehouseRemoteDataSource({required ApiService apiService}) : _apiService = apiService;

  Future<Map<String, dynamic>> fetchWarehouses(String userUuid) async {
    try {
      final response = await _apiService.post(
        AppConstants.apiWarehousesByRepEndpoint,
        {'users_uuid': userUuid},
      );

      // print('Warehouses API Response: ${jsonEncode(response)}');

      if (response['status'] == 'success' && response['data'] != null) {
        return response['data'];
      } else {
        throw Exception(response['message'] ?? 'Failed to fetch warehouses.');
      }
    } catch (e) {
      Get.snackbar('API Error', 'Error fetching warehouses: $e', snackPosition: SnackPosition.BOTTOM);
      rethrow;
    }
  }
}
