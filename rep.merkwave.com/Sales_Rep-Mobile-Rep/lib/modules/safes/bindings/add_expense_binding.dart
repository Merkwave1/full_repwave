// lib/modules/safes/bindings/add_expense_binding.dart
import 'package:get/get.dart';
import '../controllers/add_expense_controller.dart';
import '../../../data/repositories/safe_repository.dart';
import '../../../services/api_service.dart';

class AddExpenseBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut<AddExpenseController>(
      () => AddExpenseController(
        safeRepository: Get.find<SafeRepository>(),
        apiService: Get.find<ApiService>(),
      ),
    );
  }
}
