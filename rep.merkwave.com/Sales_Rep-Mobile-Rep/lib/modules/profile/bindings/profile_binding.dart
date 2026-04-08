// lib/modules/profile/bindings/profile_binding.dart
import 'package:get/get.dart';
import '/modules/profile/controllers/profile_controller.dart';

class ProfileBinding implements Bindings {
  @override
  void dependencies() {
    Get.lazyPut<ProfileController>(() => ProfileController());
  }
}
