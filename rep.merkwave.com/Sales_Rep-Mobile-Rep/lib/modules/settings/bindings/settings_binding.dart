// lib/modules/settings/bindings/settings_binding.dart
import 'package:get/get.dart';
import '/modules/settings/controllers/settings_controller.dart';

class SettingsBinding implements Bindings {
  @override
  void dependencies() {
    Get.lazyPut<SettingsController>(() => SettingsController());
  }
}
