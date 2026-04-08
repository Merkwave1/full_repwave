// lib/modules/attendance/bindings/attendance_binding.dart

import 'package:get/get.dart';
import '/modules/attendance/controllers/attendance_controller.dart';

class AttendanceBinding extends Bindings {
  @override
  void dependencies() {
    if (!Get.isRegistered<AttendanceController>()) {
      Get.put<AttendanceController>(AttendanceController(), permanent: true);
    } else {
      // Ensure any existing controller refreshes its state when the screen opens
      Get.find<AttendanceController>().loadCurrentStatus();
    }
  }
}
