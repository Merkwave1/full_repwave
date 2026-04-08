// lib/modules/dashboard/bindings/dashboard_binding.dart
import 'package:get/get.dart';
import '/modules/dashboard/controllers/dashboard_controller.dart';
import '/modules/home/controllers/home_controller.dart';
import '/modules/clients/controllers/clients_controller.dart';
import '/modules/warehouse/controllers/warehouse_controller.dart';
import '/modules/deliveries/controllers/pending_deliveries_controller.dart';
import '/modules/safes/controllers/safes_controller.dart';
import '/data/repositories/safe_repository.dart';
import '/data/data_sources/safe_remote_data_source.dart';
import '/data/datasources/sales_delivery_remote_datasource.dart';
import '/data/repositories/sales_delivery_repository.dart';
import '/modules/visits/bindings/visits_binding.dart';
import '/modules/profile/controllers/profile_controller.dart';
import '/data/repositories/client_repository.dart';
import '/data/repositories/warehouse_repository.dart';
import '/data/repositories/inventory_repository.dart';
import '/data/datasources/warehouse_remote_datasource.dart';
import '/data/datasources/inventory_remote_datasource.dart';
import '/modules/attendance/controllers/attendance_controller.dart';
import '/modules/payments/controllers/payments_controller.dart';

class DashboardBinding implements Bindings {
  @override
  void dependencies() {
    // This makes the DashboardController itself persistent
    Get.lazyPut<DashboardController>(() => DashboardController(), fenix: true);

    // --- Persistent Controllers for Main Tabs ---
    Get.lazyPut<HomeController>(() => HomeController(), fenix: true);

    if (!Get.isRegistered<AttendanceController>()) {
      Get.put<AttendanceController>(AttendanceController(), permanent: true);
    }

    Get.lazyPut<ClientsController>(
      () => ClientsController(clientRepository: Get.find<ClientRepository>()),
      fenix: true,
    );

    // Warehouse Dependencies
    Get.lazyPut<WarehouseRemoteDataSource>(() => WarehouseRemoteDataSource(apiService: Get.find()), fenix: true);
    Get.lazyPut<WarehouseRepository>(() => WarehouseRepository(remoteDataSource: Get.find()), fenix: true);

    // Inventory Dependencies
    if (!Get.isRegistered<InventoryRemoteDataSource>()) {
      Get.lazyPut<InventoryRemoteDataSource>(() => InventoryRemoteDataSource(apiService: Get.find()), fenix: true);
    }
    if (!Get.isRegistered<InventoryRepository>()) {
      Get.lazyPut<InventoryRepository>(() => InventoryRepository(remoteDataSource: Get.find()), fenix: true);
    }

    Get.lazyPut<WarehouseController>(
        () => WarehouseController(
              warehouseRepository: Get.find(),
              inventoryRepository: Get.find(),
            ),
        fenix: true);

    // Visits Dependencies - Initialize the entire visits binding
    VisitsBinding().dependencies();

    Get.lazyPut<ProfileController>(() => ProfileController(), fenix: true);

    if (!Get.isRegistered<SalesDeliveryRemoteDataSource>()) {
      Get.lazyPut<SalesDeliveryRemoteDataSource>(() => SalesDeliveryRemoteDataSource(apiService: Get.find()), fenix: true);
    }
    if (!Get.isRegistered<SalesDeliveryRepository>()) {
      Get.lazyPut<SalesDeliveryRepository>(() => SalesDeliveryRepository(remote: Get.find<SalesDeliveryRemoteDataSource>()), fenix: true);
    }
    Get.lazyPut<PendingDeliveriesController>(() => PendingDeliveriesController(repository: Get.find<SalesDeliveryRepository>()), fenix: true);

    if (!Get.isRegistered<SafeRemoteDataSource>()) {
      Get.lazyPut<SafeRemoteDataSource>(() => SafeRemoteDataSourceImpl(apiService: Get.find()), fenix: true);
    }
    if (!Get.isRegistered<SafeRepository>()) {
      Get.lazyPut<SafeRepository>(() => SafeRepositoryImpl(remoteDataSource: Get.find<SafeRemoteDataSource>()), fenix: true);
    }
    Get.lazyPut<SafesController>(() => SafesController(safeRepository: Get.find<SafeRepository>()), fenix: true);

    Get.lazyPut<PaymentsController>(() => PaymentsController(), fenix: true);
  }
}
