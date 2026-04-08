// lib/modules/clients/bindings/clients_binding.dart
import 'package:get/get.dart';
import '/modules/clients/controllers/clients_controller.dart';
import '/data/repositories/client_repository.dart';
// No need to import data sources or api service directly here, as ClientRepository is found globally

class ClientsBinding implements Bindings {
  @override
  void dependencies() {
    // ClientsController relies on ClientRepository.
    // ClientRepository is registered as permanent: true in InitialBinding.
    // Therefore, we just need to find that existing instance.
    Get.lazyPut<ClientsController>(() => ClientsController(clientRepository: Get.find<ClientRepository>()));
  }
}
