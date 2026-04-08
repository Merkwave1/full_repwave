// lib/modules/warehouse/controllers/warehouse_controller.dart
import 'package:get/get.dart';
import '/shared_widgets/app_notifier.dart';
import '/data/models/warehouse.dart';
import '/data/repositories/warehouse_repository.dart';
import '/data/repositories/inventory_repository.dart';
import '/modules/auth/controllers/auth_controller.dart';
import '/modules/shared/controllers/global_data_controller.dart';
import '/core/routes/app_routes.dart';

class WarehouseController extends GetxController {
  final WarehouseRepository _warehouseRepository;
  final InventoryRepository _inventoryRepository;
  final AuthController _authController = Get.find<AuthController>();

  final RxList<Warehouse> myWarehouses = <Warehouse>[].obs;
  final RxList<Warehouse> mainWarehouses = <Warehouse>[].obs;
  final isLoading = true.obs;
  final isRequestingStock = false.obs;
  final isUnloadingStock = false.obs;
  final errorMessage = ''.obs;

  WarehouseController({
    required WarehouseRepository warehouseRepository,
    required InventoryRepository inventoryRepository,
  })  : _warehouseRepository = warehouseRepository,
        _inventoryRepository = inventoryRepository;

  @override
  void onInit() {
    super.onInit();
    fetchWarehouses();
  }

  Future<void> fetchWarehouses() async {
    isLoading.value = true;
    errorMessage.value = '';
    try {
      final String? userUuid = _authController.currentUser.value?.uuid;
      if (userUuid == null) {
        throw Exception('User not logged in or UUID not available.');
      }

      // Fetch warehouses
      final warehouseData = await _warehouseRepository.getWarehouses(userUuid);
      myWarehouses.assignAll(warehouseData['my_warehouses']!);
      mainWarehouses.assignAll(warehouseData['other_main_warehouses']!);

      // Force refresh inventory for all warehouses
      final allWarehouses = [...myWarehouses, ...mainWarehouses];
      if (allWarehouses.isNotEmpty) {
        await Future.wait(
          allWarehouses.map((warehouse) => _inventoryRepository.getInventoryByWarehouse(
                warehouse.warehouseId,
                forceRefresh: true,
              )),
        );

        // Also refresh global data controller cache
        if (Get.isRegistered<GlobalDataController>()) {
          final globalData = GlobalDataController.instance;
          await Future.wait([
            globalData.loadRepInventory(forceRefresh: true),
            globalData.loadProducts(forceRefresh: true),
          ]);
          print('✅ Global cache refreshed');
        }

        print('✅ Warehouses and inventory refreshed successfully');
      }
    } catch (e) {
      errorMessage.value = 'Failed to load warehouse data: ${e.toString()}';
      print('Error fetching warehouses: $e');
    } finally {
      isLoading.value = false;
    }
  }

  Future<void> requestStock(Warehouse fromWarehouse) async {
    if (myWarehouses.isEmpty) {
      AppNotifier.error('no_vehicle_warehouse_receive'.tr, title: 'error'.tr);
      return;
    }

    isRequestingStock.value = true;
    try {
      // Simulate a brief loading delay for better UX
      await Future.delayed(const Duration(milliseconds: 800));

      Get.toNamed(
        AppRoutes.createTransfer,
        arguments: {
          'from': fromWarehouse,
          'to': myWarehouses.first,
          'isRequesting': true,
        },
      );
    } catch (e) {
      AppNotifier.error('error_requesting_goods'.trParams({'error': e.toString()}), title: 'error'.tr);
    } finally {
      isRequestingStock.value = false;
    }
  }

  Future<void> emptyStock(Warehouse toWarehouse) async {
    if (myWarehouses.isEmpty) {
      AppNotifier.error('no_vehicle_warehouse_unload'.tr, title: 'error'.tr);
      return;
    }

    isUnloadingStock.value = true;
    try {
      // Simulate a brief loading delay for better UX
      await Future.delayed(const Duration(milliseconds: 800));

      Get.toNamed(
        AppRoutes.createTransfer,
        arguments: {
          'from': myWarehouses.first,
          'to': toWarehouse,
          'isRequesting': false,
        },
      );
    } catch (e) {
      AppNotifier.error('error_unloading_goods'.trParams({'error': e.toString()}), title: 'error'.tr);
    } finally {
      isUnloadingStock.value = false;
    }
  }

  // ** UPDATED METHOD **
  Future<void> viewMyInventory(Warehouse warehouse) async {
    try {
      // Force refresh inventory before navigating
      await _inventoryRepository.getInventoryByWarehouse(
        warehouse.warehouseId,
        forceRefresh: true,
      );

      // Also refresh global data controller cache
      if (Get.isRegistered<GlobalDataController>()) {
        final globalData = GlobalDataController.instance;
        await globalData.loadRepInventory(forceRefresh: true);
        await globalData.loadProducts(forceRefresh: true);
        print('✅ Global inventory cache refreshed');
      }

      print('✅ Inventory force refreshed for warehouse: ${warehouse.warehouseName}');
    } catch (e) {
      print('⚠️ Error refreshing inventory before navigation: $e');
      // Continue navigation even if refresh fails
    }

    Get.toNamed(
      AppRoutes.warehouseInventory,
      arguments: {'warehouse': warehouse},
    );
  }
}
