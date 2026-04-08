// lib/data/repositories/inventory_repository.dart
import 'package:get/get.dart';
import '/data/models/inventory_item.dart';
import '/data/datasources/inventory_remote_datasource.dart';
import '/services/data_cache_service.dart';

class InventoryRepository {
  final InventoryRemoteDataSource _remoteDataSource;

  InventoryRepository({required InventoryRemoteDataSource remoteDataSource}) : _remoteDataSource = remoteDataSource;

  Future<List<InventoryItem>> getInventoryByWarehouse(int warehouseId, {bool forceRefresh = false}) async {
    try {
      if (!forceRefresh && Get.isRegistered<DataCacheService>()) {
        final cached = DataCacheService.instance.getCachedInventoryByWarehouse(warehouseId);
        if (cached.isNotEmpty) {
          return cached.map((json) => InventoryItem.fromJson(Map<String, dynamic>.from(json as Map))).toList();
        }
      }

      final data = await _remoteDataSource.fetchInventoryByWarehouse(warehouseId);

      if (Get.isRegistered<DataCacheService>()) {
        await DataCacheService.instance.cacheInventoryByWarehouse(
          warehouseId,
          data.map((json) => Map<String, dynamic>.from(json as Map)).toList(),
        );
      }

      return data.map((json) => InventoryItem.fromJson(Map<String, dynamic>.from(json as Map))).toList();
    } catch (e) {
      print('InventoryRepository: Failed to get inventory: $e');
      rethrow;
    }
  }

  // ADDED: Method to handle the repack API call.
  Future<void> repackInventoryItem({
    required int inventoryId,
    required int toPackagingTypeId,
    required double quantityToConvert,
    required String userUuid,
  }) async {
    try {
      // This will call your repack API endpoint.
      // You will need to add a 'repackInventory' method to your InventoryRemoteDataSource.
      await _remoteDataSource.repackInventory(
        inventoryId: inventoryId,
        toPackagingTypeId: toPackagingTypeId,
        quantityToConvert: quantityToConvert,
        userUuid: userUuid,
      );
    } catch (e) {
      print('InventoryRepository: Failed to repack item: $e');
      rethrow;
    }
  }
}
