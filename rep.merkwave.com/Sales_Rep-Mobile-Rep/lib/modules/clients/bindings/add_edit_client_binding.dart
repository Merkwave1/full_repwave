// lib/modules/clients/bindings/add_edit_client_binding.dart
import 'package:get/get.dart';
import '/modules/clients/controllers/add_edit_client_controller.dart';
import '/data/repositories/client_repository.dart';

class AddEditClientBinding implements Bindings {
  // Make clientId nullable, as it might not be present when adding a new client
  final int? clientId;

  // Update constructor to accept nullable clientId
  AddEditClientBinding({this.clientId});

  @override
  void dependencies() {
    // ClientRepository is permanent, so just find it.
    // Ensure ApiService, ClientRemoteDataSource, ClientDocumentRemoteDataSource are also permanent.

    // Register AddEditClientController and inject ClientRepository
    // Pass the nullable clientId to the controller
    Get.lazyPut<AddEditClientController>(() => AddEditClientController(
          clientId: clientId, // Pass the nullable clientId
          clientRepository: Get.find<ClientRepository>(), // Find the permanent instance
        ));
  }
}
