// lib/modules/client_documents/controllers/add_document_controller.dart
import '/shared_widgets/ultra_safe_navigation.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '/data/models/client_document_type.dart';
import '/data/repositories/client_repository.dart';
import '/modules/auth/controllers/auth_controller.dart';
import '/modules/client_documents/controllers/client_documents_controller.dart'; // To refresh document list
import '/services/media_service.dart'; // For image picking and compression

class AddDocumentController extends GetxController {
  final ClientRepository _clientRepository;
  final AuthController _authController = Get.find<AuthController>();
  final MediaService _mediaService = Get.find<MediaService>();
  ClientDocumentsController? _clientDocumentsController;

  final GlobalKey<FormState> formKey = GlobalKey<FormState>();

  final TextEditingController titleController = TextEditingController();
  final TextEditingController notesController = TextEditingController();

  final Rx<int?> selectedDocumentTypeId = Rx<int?>(null);
  final RxList<ClientDocumentType> documentTypes = <ClientDocumentType>[].obs;

  final isLoading = false.obs;
  // clientId is now a non-final, nullable field that will be set in onInit.
  int? clientId;

  // The constructor no longer receives the clientId.
  AddDocumentController({required ClientRepository clientRepository}) : _clientRepository = clientRepository;

  @override
  void onInit() {
    super.onInit();

    final dynamic argument = Get.arguments;
    if (argument is int && argument > 0) {
      clientId = argument;
      print('AddDocumentController initialized for clientId: $clientId');
    } else {
      clientId = null;
      print('AddDocumentController Error: A valid integer clientId was not provided. Argument was: $argument');
      Get.snackbar('Error', 'Client ID is missing. Cannot add document.');
      WidgetsBinding.instance.addPostFrameCallback((_) {
        // Use safer checks to avoid GetX controller initialization issues
        try {
          bool hasOpenDialog = Get.isRegistered<GetMaterialController>() && Get.isDialogOpen == true;
          bool hasOpenSnackbar = Get.isRegistered<GetMaterialController>() && Get.isSnackbarOpen == true;

          if (!hasOpenDialog && !hasOpenSnackbar) {
            UltraSafeNavigation.back(Get.context);
          }
        } catch (e) {
          // If GetX checks fail, just try to navigate back safely
          UltraSafeNavigation.back(Get.context);
        }
      });
    }

    // Try to find the controller from the previous screen so we can refresh it.
    try {
      _clientDocumentsController = Get.find<ClientDocumentsController>();
    } catch (e) {
      print('AddDocumentController: ClientDocumentsController not found. This is expected if navigated directly.');
    }

    if (clientId != null) {
      _fetchDocumentTypes();
    }
  }

  @override
  void onClose() {
    titleController.dispose();
    notesController.dispose();
    super.onClose();
  }

  Future<void> _fetchDocumentTypes() async {
    isLoading.value = true;
    try {
      final types = await _clientRepository.getClientDocumentTypes();
      documentTypes.assignAll(types);
    } catch (e) {
      Get.snackbar('Error', 'Failed to load document types: $e');
    } finally {
      isLoading.value = false;
    }
  }

  Future<void> saveDocument() async {
    if (clientId == null) {
      Get.snackbar('Error', 'Cannot upload document without a valid Client ID.');
      return;
    }

    if (!formKey.currentState!.validate()) {
      Get.snackbar('Validation Error', 'Please fill in all required fields correctly.');
      return;
    }

    if (_mediaService.selectedImage.value == null) {
      Get.snackbar('Validation Error', 'Document file is required.');
      return;
    }

    isLoading.value = true;

    try {
      final String? userUuid = _authController.currentUser.value?.uuid;
      if (userUuid == null) throw Exception('User not logged in or UUID not available.');

      final int? currentUserId = _authController.currentUser.value?.id;
      if (currentUserId == null) throw Exception('Uploader User ID not available.');

      final Map<String, String> fields = {
        'client_document_client_id': clientId.toString(),
        'client_document_type_id': selectedDocumentTypeId.value.toString(),
        'client_document_title': titleController.text,
        'client_document_notes': notesController.text,
        'client_document_uploaded_by_user_id': currentUserId.toString(),
      };

      final apiResponse = await _clientRepository.addClientDocument(
        userUuid,
        fields,
        filePath: _mediaService.selectedImage.value!.path,
        fileField: 'document_file',
      );

      if (apiResponse['status'] == 'success') {
        // The document was added successfully on the server.
        // We await the data refresh to ensure the list is updated
        // before we navigate back to the previous screen.
        await _clientDocumentsController?.fetchClientDocuments();
        UltraSafeNavigation.back(Get.context); // Go back safely to the document list screen.

        Get.snackbar('Success', apiResponse['message'] ?? 'Document added successfully!');
      } else {
        Get.snackbar('Error', apiResponse['message'] ?? 'Failed to add document.');
      }
    } catch (e) {
      Get.snackbar('Error', 'Failed to save document: ${e.toString()}');
      print('Save document error: $e');
    } finally {
      isLoading.value = false;
    }
  }
}
