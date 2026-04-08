// lib/modules/inventory/bindings/inventory_binding.dart
import 'package:get/get.dart';
import '/modules/inventory/controllers/inventory_controller.dart';
import '/data/repositories/inventory_repository.dart';
import '/data/repositories/product_repository.dart';
import '/data/repositories/warehouse_repository.dart';

class InventoryBinding implements Bindings {
  @override
  void dependencies() {
    // Repositories are assumed to be registered persistently in a higher-level binding
    Get.lazyPut<InventoryController>(() => InventoryController(
          inventoryRepository: Get.find(),
          productRepository: Get.find(),
          warehouseRepository: Get.find(),
        ));
  }
}
