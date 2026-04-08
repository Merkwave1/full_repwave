// lib/modules/warehouse_inventory/bindings/warehouse_inventory_binding.dart
import 'package:get/get.dart';
import '/modules/warehouse_inventory/controllers/warehouse_inventory_controller.dart';

class WarehouseInventoryBinding implements Bindings {
  @override
  void dependencies() {
    // Repositories should already be registered by InitialBinding or DashboardBinding
    Get.lazyPut<WarehouseInventoryController>(() => WarehouseInventoryController(
          inventoryRepository: Get.find(),
          productRepository: Get.find(),
        ));
  }
}
