// lib/modules/sales_orders/bindings/quick_add_order_items_binding.dart
import 'package:get/get.dart';
import '/modules/sales_orders/controllers/add_edit_sales_order_controller.dart';
import '/modules/sales_orders/controllers/quick_add_order_items_controller.dart';

class QuickAddOrderItemsBinding implements Bindings {
  @override
  void dependencies() {
    Get.lazyPut<QuickAddOrderItemsController>(
      () => QuickAddOrderItemsController(
        salesOrderController: Get.find<AddEditSalesOrderController>(),
      ),
    );
  }
}
