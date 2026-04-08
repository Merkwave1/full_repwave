// lib/modules/clients/bindings/client_detail_binding.dart
import 'package:get/get.dart';
import '/modules/clients/controllers/client_detail_controller.dart';
import '/data/repositories/client_repository.dart';
import '/data/datasources/client_remote_datasource.dart';
import '/data/datasources/client_document_remote_datasource.dart'; // New import
import '/services/api_service.dart';

class ClientDetailBinding implements Bindings {
  @override
  void dependencies() {
    // Ensure ApiService is available (it's permanent in InitialBinding)
    // Ensure ClientRemoteDataSource is available (it's permanent in InitialBinding)
    // Ensure ClientDocumentRemoteDataSource is available (it's permanent in InitialBinding)

    // ClientRepository is permanent in InitialBinding, so we just find it.
    // If it were not permanent, we'd need to lazyPut it here with all its dependencies:
    // Get.lazyPut<ClientRepository>(() => ClientRepository(
    //   remoteDataSource: Get.find<ClientRemoteDataSource>(),
    //   documentRemoteDataSource: Get.find<ClientDocumentRemoteDataSource>(),
    // ));

    // Register ClientDetailController and inject ClientRepository
    Get.lazyPut<ClientDetailController>(() => ClientDetailController(clientRepository: Get.find<ClientRepository>()));
  }
}
