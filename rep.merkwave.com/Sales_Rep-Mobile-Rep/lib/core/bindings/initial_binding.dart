import 'package:get/get.dart';
import '/services/api_service.dart';
import '/services/location_service.dart';
import '/services/location_tracking_service.dart';
import '/services/media_service.dart';
import '/services/thermal_printer_service.dart';
import '/services/data_cache_service.dart';
import '/services/updater_service.dart';
import '/modules/auth/controllers/auth_controller.dart';
import '/modules/profile/controllers/profile_controller.dart';
import '/modules/settings/controllers/settings_controller.dart';
import '/modules/shared/controllers/global_data_controller.dart';
import '/data/repositories/client_repository.dart';
import '/data/repositories/payment_repository.dart';
import '/data/datasources/client_remote_datasource.dart';
import '/data/datasources/client_document_remote_datasource.dart';
import '/data/datasources/inventory_remote_datasource.dart';
import '/data/repositories/inventory_repository.dart';
import '/data/datasources/product_remote_datasource.dart';
import '/data/repositories/product_repository.dart';
import '/data/datasources/transfers_remote_datasource.dart';
import '/data/repositories/transfers_repository.dart';
import '/data/datasources/visit_remote_datasource.dart';
import '/data/repositories/visit_repository.dart';
import '/data/datasources/company_settings_remote_datasource.dart';
import '/data/repositories/company_settings_repository.dart';
import '/data/datasources/warehouse_remote_datasource.dart';
import '/data/repositories/warehouse_repository.dart';
import '/data/datasources/location_remote_datasource.dart';
import '/data/repositories/location_repository.dart';

import '../../modules/notifications/controllers/notification_controller.dart';

// New Imports for Sales Orders
import '/data/datasources/sales_order_remote_datasource.dart';
import '/data/repositories/sales_order_repository.dart';

class InitialBinding implements Bindings {
  @override
  void dependencies() {
    // 1. Services (truly global and needed early/often) - permanent makes sense
    Get.put(ApiService(), permanent: true);
    Get.put(LocationService(), permanent: true);
    Get.put(LocationTrackingService(), permanent: true); // Location tracking service
    Get.put(MediaService(), permanent: true);
    Get.put(ThermalPrinterService(), permanent: true);
    Get.put(DataCacheService(), permanent: true);
    Get.put(UpdaterService(), permanent: true);

    // 2. Core Controllers (needed globally, e.g., for auth state, notifications) - permanent makes sense
    Get.put<AuthController>(AuthController(), permanent: true);
    Get.put<NotificationController>(NotificationController(), permanent: true);
    Get.put<ProfileController>(ProfileController(), permanent: true); // Profile often accessed, could be permanent
    Get.put<SettingsController>(SettingsController(), permanent: true); // Settings needed globally for app preferences

    // 3. Data Sources and Repositories (made permanent to ensure availability across navigations)
    Get.put<ClientRemoteDataSource>(ClientRemoteDataSource(apiService: Get.find()), permanent: true);
    Get.put<ClientDocumentRemoteDataSource>(ClientDocumentRemoteDataSource(apiService: Get.find()), permanent: true);
    Get.put<ClientRepository>(
      ClientRepository(
        remoteDataSource: Get.find(),
        documentRemoteDataSource: Get.find(),
      ),
      permanent: true,
    );
    Get.put<PaymentRepository>(PaymentRepository(), permanent: true);
    Get.put<LocationRemoteDataSource>(LocationRemoteDataSource(apiService: Get.find()), permanent: true);
    Get.put<LocationRepository>(LocationRepository(remoteDataSource: Get.find()), permanent: true);

    // Global Data Controller - manages cached data for the entire app (must be after repositories)
    Get.put<GlobalDataController>(GlobalDataController(), permanent: true);

    // Changed to permanent: true for stability across multiple navigations
    Get.put<ProductRemoteDataSource>(ProductRemoteDataSource(apiService: Get.find()), permanent: true);
    Get.put<ProductRepository>(ProductRepository(remoteDataSource: Get.find()), permanent: true);
    Get.put<InventoryRemoteDataSource>(InventoryRemoteDataSource(apiService: Get.find()), permanent: true);
    Get.put<InventoryRepository>(InventoryRepository(remoteDataSource: Get.find()), permanent: true);

    Get.put<TransfersRemoteDataSource>(TransfersRemoteDataSource(apiService: Get.find()), permanent: true);
    Get.put<TransfersRepository>(TransfersRepository(remoteDataSource: Get.find()), permanent: true);

    // Warehouse Data Source and Repository
    Get.put<WarehouseRemoteDataSource>(WarehouseRemoteDataSource(apiService: Get.find()), permanent: true);
    Get.put<WarehouseRepository>(WarehouseRepository(remoteDataSource: Get.find()), permanent: true);

    // Corrected: Removed () => for Get.put calls as they expect an instance directly
    Get.put<VisitRemoteDatasource>(VisitRemoteDatasource(Get.find<ApiService>()), permanent: true);
    Get.put<VisitRepository>(VisitRepository(remoteDatasource: Get.find<VisitRemoteDatasource>()), permanent: true);

    // New: Sales Order Data Source and Repository
    Get.put<SalesOrderRemoteDataSource>(SalesOrderRemoteDataSource(apiService: Get.find()), permanent: true);
    Get.put<SalesOrderRepository>(SalesOrderRepository(remoteDataSource: Get.find()), permanent: true);

    // Company Settings Data Source and Repository
    Get.put<CompanySettingsRemoteDataSource>(CompanySettingsRemoteDataSource(apiService: Get.find()), permanent: true);
    Get.put<CompanySettingsRepository>(CompanySettingsRepository(remoteDataSource: Get.find()), permanent: true);

    // 4. Feature-Specific Controllers:
    // These should generally NOT be permanent in the InitialBinding unless truly global.
    // They should be put with Get.lazyPut() or, ideally, bound directly
    // within the `GetPage` definition for the route that uses them.

    // ProductsDataController is now initialized after login to prevent
    // fetching data before authentication
    // Removed: ItemsController (assuming it's used within a specific screen with its own binding or lazy-loaded where needed)
  }
}
