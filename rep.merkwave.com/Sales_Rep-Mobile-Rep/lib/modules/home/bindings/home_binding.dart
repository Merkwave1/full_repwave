// lib/modules/home/bindings/home_binding.dart
import 'package:get/get.dart';
import '/modules/home/controllers/home_controller.dart';
import '/modules/attendance/controllers/attendance_controller.dart';

class HomeBinding implements Bindings {
  @override
  void dependencies() {
    Get.lazyPut<HomeController>(() => HomeController());

    // Initialize AttendanceController for floating button with permanent flag
    // This ensures the controller stays alive and timer continues running
    if (!Get.isRegistered<AttendanceController>()) {
      Get.put<AttendanceController>(AttendanceController(), permanent: true);
    }
  }
}
