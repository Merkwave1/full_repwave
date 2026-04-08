// lib/modules/warehouse/bindings/warehouse_binding.dart
import 'package:get/get.dart';
import '/data/datasources/warehouse_remote_datasource.dart';
import '/data/datasources/inventory_remote_datasource.dart';
import '/data/repositories/warehouse_repository.dart';
import '/data/repositories/inventory_repository.dart';
import '/modules/warehouse/controllers/warehouse_controller.dart';

class WarehouseBinding implements Bindings {
  @override
  void dependencies() {
    Get.lazyPut<WarehouseRemoteDataSource>(() => WarehouseRemoteDataSource(apiService: Get.find()));
    Get.lazyPut<WarehouseRepository>(() => WarehouseRepository(remoteDataSource: Get.find()));

    // Ensure InventoryRepository is available
    if (!Get.isRegistered<InventoryRemoteDataSource>()) {
      Get.lazyPut<InventoryRemoteDataSource>(() => InventoryRemoteDataSource(apiService: Get.find()));
    }
    if (!Get.isRegistered<InventoryRepository>()) {
      Get.lazyPut<InventoryRepository>(() => InventoryRepository(remoteDataSource: Get.find()));
    }

    Get.lazyPut<WarehouseController>(() => WarehouseController(
          warehouseRepository: Get.find(),
          inventoryRepository: Get.find(),
        ));
  }
}
