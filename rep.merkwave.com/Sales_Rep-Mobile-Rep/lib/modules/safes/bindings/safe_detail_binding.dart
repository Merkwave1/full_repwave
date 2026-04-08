// lib/modules/safes/bindings/safe_detail_binding.dart
import 'package:get/get.dart';
import '../../../data/data_sources/safe_remote_data_source.dart';
import '../../../data/repositories/safe_repository.dart';
import '../../../services/api_service.dart';
import '../controllers/safe_detail_controller.dart';

class SafeDetailBinding extends Bindings {
  @override
  void dependencies() {
    // Register API Service (if not already registered)
    if (!Get.isRegistered<ApiService>()) {
      Get.lazyPut(() => ApiService());
    }

    // Register Remote Data Source (if not already registered)
    if (!Get.isRegistered<SafeRemoteDataSource>()) {
      Get.lazyPut<SafeRemoteDataSource>(
        () => SafeRemoteDataSourceImpl(
          apiService: Get.find<ApiService>(),
        ),
      );
    }

    // Register Repository (if not already registered)
    if (!Get.isRegistered<SafeRepository>()) {
      Get.lazyPut<SafeRepository>(
        () => SafeRepositoryImpl(
          remoteDataSource: Get.find<SafeRemoteDataSource>(),
        ),
      );
    }

    // Register Controller
    Get.lazyPut(
      () => SafeDetailController(
        safeRepository: Get.find<SafeRepository>(),
      ),
    );
  }
}
