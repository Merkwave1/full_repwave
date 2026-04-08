// lib/modules/sales_orders/bindings/add_order_item_binding.dart
import 'package:get/get.dart';
import '/modules/sales_orders/controllers/add_order_item_controller.dart';

class AddOrderItemBinding implements Bindings {
  @override
  void dependencies() {
    Get.lazyPut<AddOrderItemController>(
      () => AddOrderItemController(),
    );
  }
}
