// lib/modules/safes/bindings/safes_binding.dart
import 'package:get/get.dart';
import '../../../data/data_sources/safe_remote_data_source.dart';
import '../../../data/repositories/safe_repository.dart';
import '../../../services/api_service.dart';
import '../controllers/safes_controller.dart';

class SafesBinding extends Bindings {
  @override
  void dependencies() {
    // Register API Service (if not already registered)
    if (!Get.isRegistered<ApiService>()) {
      Get.lazyPut(() => ApiService());
    }

    // Register Remote Data Source
    Get.lazyPut<SafeRemoteDataSource>(
      () => SafeRemoteDataSourceImpl(
        apiService: Get.find<ApiService>(),
      ),
    );

    // Register Repository
    Get.lazyPut<SafeRepository>(
      () => SafeRepositoryImpl(
        remoteDataSource: Get.find<SafeRemoteDataSource>(),
      ),
    );

    // Register Controller
    Get.lazyPut(
      () => SafesController(
        safeRepository: Get.find<SafeRepository>(),
      ),
    );
  }
}
