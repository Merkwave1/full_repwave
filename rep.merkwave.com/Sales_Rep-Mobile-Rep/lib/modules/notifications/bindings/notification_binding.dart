// lib/modules/notifications/bindings/notification_binding.dart
import 'package:get/get.dart';
import '/modules/notifications/controllers/notification_controller.dart';

class NotificationBinding implements Bindings {
  @override
  void dependencies() {
    // Register NotificationController (lazy put means it's created when first used)
    Get.lazyPut<NotificationController>(() => NotificationController());
  }
}
