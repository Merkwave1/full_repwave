// lib/modules/visits/bindings/visits_binding.dart
import 'package:get/get.dart';
import '/modules/visits/controllers/visits_controller.dart';
import '/data/repositories/visit_repository.dart';
import '/data/repositories/client_repository.dart';
import '/data/datasources/visit_remote_datasource.dart';
import '/data/datasources/client_remote_datasource.dart';
import '/data/datasources/client_document_remote_datasource.dart';
import '/services/api_service.dart';

class VisitsBinding extends Bindings {
  @override
  void dependencies() {
    // Register dependencies if not already registered
    if (!Get.isRegistered<VisitRemoteDatasource>()) {
      Get.lazyPut<VisitRemoteDatasource>(() => VisitRemoteDatasource(Get.find<ApiService>()));
    }

    if (!Get.isRegistered<VisitRepository>()) {
      Get.lazyPut<VisitRepository>(() => VisitRepository(remoteDatasource: Get.find<VisitRemoteDatasource>()));
    }

    if (!Get.isRegistered<ClientRemoteDataSource>()) {
      Get.lazyPut<ClientRemoteDataSource>(() => ClientRemoteDataSource(apiService: Get.find<ApiService>()));
    }

    if (!Get.isRegistered<ClientDocumentRemoteDataSource>()) {
      Get.lazyPut<ClientDocumentRemoteDataSource>(() => ClientDocumentRemoteDataSource(apiService: Get.find<ApiService>()));
    }

    if (!Get.isRegistered<ClientRepository>()) {
      Get.lazyPut<ClientRepository>(() => ClientRepository(
            remoteDataSource: Get.find<ClientRemoteDataSource>(),
            documentRemoteDataSource: Get.find<ClientDocumentRemoteDataSource>(),
          ));
    }

    Get.lazyPut<VisitsController>(() => VisitsController(
          visitRepository: Get.find<VisitRepository>(),
          clientRepository: Get.find<ClientRepository>(),
        ));
  }
}
