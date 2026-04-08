// lib/modules/sales_orders/bindings/sales_order_detail_binding.dart
import 'package:get/get.dart';
import '/modules/sales_orders/controllers/sales_order_detail_controller.dart';
import '/data/repositories/sales_order_repository.dart';

class SalesOrderDetailBinding implements Bindings {
  @override
  void dependencies() {
    // Ensure SalesOrderRepository is available. If it's permanent in InitialBinding, Get.find() will work.
    // Otherwise, you might need to lazyPut it here if it's only needed for this module.
    // Assuming SalesOrderRepository is already put permanently or available via SalesOrdersBinding.
    Get.lazyPut<SalesOrderDetailController>(
      () => SalesOrderDetailController(
        salesOrderRepository: Get.find<SalesOrderRepository>(),
      ),
    );
  }
}
