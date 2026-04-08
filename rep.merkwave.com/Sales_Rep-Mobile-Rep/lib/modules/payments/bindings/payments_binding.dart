// lib/modules/payments/bindings/payments_binding.dart
import 'package:get/get.dart';
import '/modules/payments/controllers/payments_controller.dart';

class PaymentsBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut<PaymentsController>(() => PaymentsController());
  }
}
