// lib/modules/auth/bindings/auth_binding.dart
import 'package:get/get.dart';
import '/modules/auth/controllers/auth_controller.dart';

class AuthBinding implements Bindings {
  @override
  void dependencies() {
    // Register AuthController (lazy put means it's created when first used)
    Get.lazyPut<AuthController>(() => AuthController());
    // If you had an AuthRepository, you would register it here too:
    // Get.lazyPut<AuthRepository>(() => AuthRepository(Get.find<ApiService>()));
  }
}
