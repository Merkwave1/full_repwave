// lib/modules/client_documents/screens/add_document_screen.dart
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '/modules/client_documents/controllers/add_document_controller.dart';
import '/shared_widgets/custom_app_bar.dart';
import '/shared_widgets/loading_indicator.dart';
import '/services/media_service.dart'; // To access MediaService for image picking

class AddDocumentScreen extends GetView<AddDocumentController> {
  const AddDocumentScreen({super.key});

  // Helper method to build a section title
  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 16.0),
      child: Text(
        title,
        style: Get.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold, color: Get.theme.primaryColor),
      ),
    );
  }

  // Helper method to build a text field with validation
  Widget _buildTextField(
    TextEditingController controller,
    String label, {
    TextInputType keyboardType = TextInputType.text,
    int maxLines = 1,
    bool isRequired = false,
    String? Function(String?)? validator,
  }) {
    final OutlineInputBorder defaultBorder = OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide: BorderSide(color: Colors.grey.shade300, width: 1.0),
    );
    final OutlineInputBorder focusedBorder = OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide: BorderSide(color: Get.theme.primaryColor, width: 2.0),
    );
    final OutlineInputBorder errorBorder = OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide: const BorderSide(color: Colors.red, width: 2.0),
    );

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: TextFormField(
        controller: controller,
        keyboardType: keyboardType,
        maxLines: maxLines,
        decoration: InputDecoration(
          labelText: isRequired ? '$label *' : label,
          border: defaultBorder,
          enabledBorder: defaultBorder,
          focusedBorder: focusedBorder,
          errorBorder: errorBorder,
          focusedErrorBorder: errorBorder,
          filled: true,
          fillColor: Colors.grey.shade50,
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          labelStyle: TextStyle(color: Colors.grey.shade700),
          hintStyle: TextStyle(color: Colors.grey.shade500),
        ),
        validator: (value) {
          if (isRequired && (value == null || value.isEmpty)) {
            return 'field_required'.trParams({'field': label});
          }
          return validator?.call(value) ?? null;
        },
      ),
    );
  }

  // Helper method to build a dropdown field with validation
  Widget _buildDropdownField<T>(String label, Rx<T?> selectedValue, List<DropdownMenuItem<T>> items, String hintText, {bool isRequired = false}) {
    final OutlineInputBorder defaultBorder = OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide: BorderSide(color: Colors.grey.shade300, width: 1.0),
    );
    final OutlineInputBorder focusedBorder = OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide: BorderSide(color: Get.theme.primaryColor, width: 2.0),
    );
    final OutlineInputBorder errorBorder = OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide: const BorderSide(color: Colors.red, width: 2.0),
    );

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: DropdownButtonFormField<T>(
        decoration: InputDecoration(
          labelText: isRequired ? '$label *' : label,
          border: defaultBorder,
          enabledBorder: defaultBorder,
          focusedBorder: focusedBorder,
          errorBorder: errorBorder,
          focusedErrorBorder: errorBorder,
          filled: true,
          fillColor: Colors.grey.shade50,
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          labelStyle: TextStyle(color: Colors.grey.shade700),
          hintStyle: TextStyle(color: Colors.grey.shade500),
        ),
        value: selectedValue.value,
        hint: Text(hintText),
        items: [
          DropdownMenuItem<T>(
            value: null,
            child: Text('select_none'.tr),
          ),
          ...items,
        ],
        onChanged: (T? newValue) {
          selectedValue.value = newValue;
        },
        validator: (value) {
          if (isRequired && value == null) {
            return 'field_required'.trParams({'field': label});
          }
          return null;
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final MediaService mediaService = Get.find<MediaService>();

    return Scaffold(
      appBar: CustomAppBar(
        title: 'add_document'.tr, // Localized
      ),
      body: Obx(() {
        if (controller.isLoading.value && controller.documentTypes.isEmpty) {
          return LoadingIndicator(message: 'loading_form_data'.tr);
        }
        return Form(
          key: controller.formKey,
          autovalidateMode: AutovalidateMode.onUserInteraction,
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'add_new_document_for_client'.trParams({'clientId': controller.clientId.toString()}), // Localized
                  style: Get.textTheme.headlineSmall,
                ),
                const SizedBox(height: 20),

                // Document Type Dropdown
                Obx(() => _buildDropdownField<int?>(
                      'document_type'.tr, // Localized
                      controller.selectedDocumentTypeId,
                      controller.documentTypes
                          .map((type) => DropdownMenuItem<int>(
                                value: type.id,
                                child: Text(type.name),
                              ))
                          .toList(),
                      'select_document_type'.tr, // Localized
                      isRequired: true,
                    )),

                // Document Title
                _buildTextField(controller.titleController, 'document_title'.tr, isRequired: true), // Localized

                // Document Notes
                _buildTextField(controller.notesController, 'document_notes'.tr, maxLines: 3), // Localized

                // File Picker
                _buildSectionTitle('document_file'.tr), // Localized
                Center(
                  child: GestureDetector(
                    onTap: () => mediaService.pickImageFromSource(), // Use MediaService for picking
                    child: Obx(() {
                      return Container(
                        width: 200,
                        height: 150,
                        decoration: BoxDecoration(
                          color: Colors.grey.shade200,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.grey.shade300),
                        ),
                        child: mediaService.selectedImage.value != null // Observe MediaService's image
                            ? ClipRRect(
                                borderRadius: BorderRadius.circular(12),
                                child: Image.file(
                                  mediaService.selectedImage.value!,
                                  fit: BoxFit.cover,
                                  width: 200,
                                  height: 150,
                                ),
                              )
                            : Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.upload_file, size: 50, color: Colors.grey.shade600),
                                  Text('tap_to_upload_file'.tr, style: TextStyle(color: Colors.grey.shade600)), // Localized
                                ],
                              ),
                      );
                    }),
                  ),
                ),
                Obx(() => mediaService.selectedImage.value != null
                    ? Padding(
                        padding: const EdgeInsets.only(top: 8.0),
                        child: Center(
                          child: Text(
                            '${'selected_file'.tr}: ${mediaService.selectedImage.value!.path.split('/').last}', // Localized
                            style: TextStyle(color: Colors.grey.shade700),
                            textAlign: TextAlign.center,
                          ),
                        ),
                      )
                    : const SizedBox.shrink()),
                const SizedBox(height: 30),

                // Save Button
                Obx(
                  () => controller.isLoading.value
                      ? const Center(child: LoadingIndicator())
                      : SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            onPressed: controller.saveDocument,
                            child: Text('add_document'.tr), // Localized
                          ),
                        ),
                ),
                const SizedBox(height: 20),
              ],
            ),
          ),
        );
      }),
    );
  }
}
