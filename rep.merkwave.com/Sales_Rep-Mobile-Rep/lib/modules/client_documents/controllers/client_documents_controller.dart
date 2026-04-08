// lib/modules/client_documents/controllers/client_documents_controller.dart
import 'package:get/get.dart';
import '/data/models/client_document.dart';
import '/data/repositories/client_repository.dart';
import '/modules/auth/controllers/auth_controller.dart';

class ClientDocumentsController extends GetxController {
  final ClientRepository _clientRepository;
  final AuthController _authController = Get.find<AuthController>();

  final RxList<ClientDocument> documents = <ClientDocument>[].obs;
  final isLoading = true.obs;
  final errorMessage = ''.obs;

  // clientId is now initialized in onInit, so it must be a non-final, nullable field.
  int? clientId;

  // The constructor no longer receives the clientId.
  ClientDocumentsController({required ClientRepository clientRepository}) : _clientRepository = clientRepository;

  @override
  void onInit() {
    super.onInit();

    // The controller now gets the argument directly from GetX.
    // This is a more robust pattern.
    final dynamic argument = Get.arguments;
    if (argument is int) {
      clientId = argument;
    } else {
      clientId = null;
    }

    // We validate the clientId here. If it's invalid, we set an error state.
    if (clientId == null || clientId! <= 0) {
      errorMessage.value = 'Error: A valid Client ID was not provided.';
      isLoading.value = false;
      print('ClientDocumentsController initialized with invalid clientId: $clientId');
    } else {
      fetchClientDocuments();
    }
  }

  Future<void> fetchClientDocuments() async {
    // This method is now only called if the clientId is valid.
    print("Fetching documents for clientId: ${clientId}");
    isLoading.value = true;
    errorMessage.value = ''; // Clear previous errors
    try {
      final String? userUuid = _authController.currentUser.value?.uuid;
      if (userUuid == null) {
        throw Exception('User not logged in or UUID not available.');
      }

      // The primary check is now in onInit, but this serves as a final safeguard.
      if (clientId == null || clientId! <= 0) {
        throw Exception('Invalid Client ID: $clientId.');
      }

      final fetchedDocuments = await _clientRepository.getClientDocuments(clientId!, userUuid);
      documents.assignAll(fetchedDocuments);
    } catch (e) {
      errorMessage.value = 'Failed to load documents: ${e.toString()}';
      print('Error fetching client documents: $e');
    } finally {
      isLoading.value = false;
    }
  }

  void addDocument(ClientDocument newDocument) {
    documents.add(newDocument);
    Get.snackbar(
      'Document Added',
      '${newDocument.title} added successfully!',
      snackPosition: SnackPosition.BOTTOM,
      backgroundColor: Get.theme.primaryColor,
      colorText: Get.theme.colorScheme.onPrimary,
    );
  }
}
