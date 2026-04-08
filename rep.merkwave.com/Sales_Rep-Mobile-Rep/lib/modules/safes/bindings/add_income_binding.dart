// lib/modules/safes/bindings/add_income_binding.dart
import 'package:get/get.dart';
import '../controllers/add_income_controller.dart';
import '../../../data/repositories/safe_repository.dart';
import '../../../services/api_service.dart';

class AddIncomeBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut<AddIncomeController>(() => AddIncomeController(
          safeRepository: Get.find<SafeRepository>(),
          apiService: Get.find<ApiService>(),
        ));
  }
}
