// lib/modules/sales_orders/bindings/add_edit_sales_order_binding.dart
import 'package:get/get.dart';
import '/modules/sales_orders/controllers/add_edit_sales_order_controller.dart';
import '/data/repositories/sales_order_repository.dart';
import '/data/repositories/visit_repository.dart';
import '/modules/auth/controllers/auth_controller.dart';
import '/data/datasources/sales_delivery_remote_datasource.dart';
import '/data/repositories/sales_delivery_repository.dart';

class AddEditSalesOrderBinding implements Bindings {
  @override
  void dependencies() {
    // Ensure SalesDelivery data source & repository are available for auto-delivery
    if (!Get.isRegistered<SalesDeliveryRemoteDataSource>()) {
      Get.lazyPut<SalesDeliveryRemoteDataSource>(() => SalesDeliveryRemoteDataSource(apiService: Get.find()));
    }
    if (!Get.isRegistered<SalesDeliveryRepository>()) {
      Get.lazyPut<SalesDeliveryRepository>(() => SalesDeliveryRepository(remote: Get.find()));
    }
    Get.lazyPut<AddEditSalesOrderController>(
      () => AddEditSalesOrderController(
        salesOrderRepository: Get.find<SalesOrderRepository>(),
        visitRepository: Get.find<VisitRepository>(),
        authController: Get.find<AuthController>(),
      ),
    );
  }
}
