// lib/data/datasources/inventory_remote_datasource.dart
import 'package:get/get.dart';
import '/services/api_service.dart';
import '/core/app_constants.dart';
import 'dart:convert';

class InventoryRemoteDataSource {
  final ApiService _apiService;

  InventoryRemoteDataSource({required ApiService apiService}) : _apiService = apiService;

  Future<List<dynamic>> fetchInventoryByWarehouse(int warehouseId) async {
    try {
      final response = await _apiService.get(
        AppConstants.apiInventoryAllEndpoint,
        queryParameters: {'warehouse_id': warehouseId.toString()},
      );

      print('Inventory API Response for warehouse $warehouseId: ${jsonEncode(response)}');

      if (response['status'] == 'success' && response['data'] != null && response['data']['inventory_items'] is List) {
        return response['data']['inventory_items'];
      } else {
        throw Exception(response['message'] ?? 'Failed to fetch inventory.');
      }
    } catch (e) {
      Get.snackbar('API Error', 'Error fetching inventory: $e', snackPosition: SnackPosition.BOTTOM);
      rethrow;
    }
  }

  // ADDED: Method to call the repack API endpoint.
  Future<Map<String, dynamic>> repackInventory({
    required int inventoryId,
    required int toPackagingTypeId,
    required double quantityToConvert,
    required String userUuid,
  }) async {
    try {
      final body = {
        'inventory_id': inventoryId.toString(),
        'to_packaging_type_id': toPackagingTypeId.toString(),
        'quantity_to_convert': quantityToConvert.toString(),
        'uuid': userUuid, // The PHP script likely expects 'uuid'
      };

      // You will need to add `apiRepackInventoryEndpoint` to your AppConstants.
      // e.g., static const String apiRepackInventoryEndpoint = '/inventory/repack.php';
      final response = await _apiService.post(AppConstants.apiRepackInventoryEndpoint, body);

      if (response['status'] == 'success') {
        return response;
      } else {
        throw Exception(response['message'] ?? 'Failed to repack item.');
      }
    } catch (e) {
      Get.snackbar('API Error', 'Error repacking item: $e', snackPosition: SnackPosition.BOTTOM);
      rethrow;
    }
  }
}
