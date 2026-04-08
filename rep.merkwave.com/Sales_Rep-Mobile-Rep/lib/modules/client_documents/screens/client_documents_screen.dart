// lib/modules/client_documents/screens/client_documents_screen.dart
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '/modules/client_documents/controllers/client_documents_controller.dart';
import '/shared_widgets/custom_app_bar.dart';
import '/shared_widgets/loading_indicator.dart';
import 'package:url_launcher/url_launcher.dart';
import '/core/routes/app_routes.dart';

class ClientDocumentsScreen extends GetView<ClientDocumentsController> {
  const ClientDocumentsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: CustomAppBar(
        title: 'client_documents'.tr,
      ),
      body: Obx(() {
        // 1. Check for a critical error message from the controller first.
        if (controller.errorMessage.value.isNotEmpty && controller.documents.isEmpty) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Text(
                controller.errorMessage.value,
                style: const TextStyle(fontSize: 16, color: Colors.red),
                textAlign: TextAlign.center,
              ),
            ),
          );
        }

        // 2. Show loading indicator
        if (controller.isLoading.value) {
          return LoadingIndicator(message: 'loading_documents'.tr);
        }

        // 3. Show "no documents" message
        if (controller.documents.isEmpty) {
          return Center(
            child: Text(
              'no_documents_found'.tr,
              style: const TextStyle(fontSize: 16, color: Colors.grey),
            ),
          );
        }

        // 4. Display the list of documents
        return ListView.builder(
          padding: const EdgeInsets.all(16.0),
          itemCount: controller.documents.length,
          itemBuilder: (context, index) {
            final document = controller.documents[index];
            return Card(
              elevation: 4,
              margin: const EdgeInsets.symmetric(vertical: 8.0),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              child: ListTile(
                leading: _buildDocumentIcon(document.fileMimeType),
                title: Text(document.title, style: const TextStyle(fontWeight: FontWeight.bold)),
                subtitle: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('${'type'.tr}: ${document.documentTypeName}'),
                    Text('${'size'.tr}: ${document.fileSizeKb?.toStringAsFixed(2) ?? 'N/A'} KB'),
                    if (document.uploadedByUserName != null) Text('${'uploaded_by'.tr}: ${document.uploadedByUserName}'),
                    Text('${'uploaded_on'.tr}: ${document.createdAt.toLocal().toString().split('.')[0]}'),
                    if (document.notes != null && document.notes!.isNotEmpty) Text('${'notes'.tr}: ${document.notes}', style: const TextStyle(fontStyle: FontStyle.italic)),
                  ],
                ),
                trailing: IconButton(
                  icon: const Icon(Icons.download),
                  onPressed: () => _openUrl(document.filePath),
                ),
                onTap: () => _openUrl(document.filePath),
              ),
            );
          },
        );
      }),
      // ** THE FIX IS HERE **
      // The logic inside the Obx is restructured to prevent the GetX error.
      floatingActionButton: Obx(() {
        // First, read the observable value. This ensures GetX is always satisfied.
        final hasError = controller.errorMessage.value.isNotEmpty;

        // Then, check the non-observable value.
        final isValidClientId = controller.clientId != null && controller.clientId! > 0;

        // Finally, use both local variables to determine the widget to show.
        // This logic is the same as before, but the structure prevents the error.
        if (isValidClientId && !hasError) {
          return FloatingActionButton(
            heroTag: 'client_documents_add_fab',
            onPressed: () {
              Get.toNamed(AppRoutes.addDocument, arguments: controller.clientId);
            },
            tooltip: 'add_document'.tr,
            child: const Icon(Icons.add),
          );
        } else {
          return const SizedBox.shrink(); // Hide FAB if clientId is invalid or there's an error
        }
      }),
    );
  }

  Future<void> _openUrl(String path) async {
    final Uri url = Uri.parse(path);
    if (!await launchUrl(url, mode: LaunchMode.externalApplication)) {
      Get.snackbar('Error', 'Could not open document.', snackPosition: SnackPosition.BOTTOM);
    }
  }

  Widget _buildDocumentIcon(String? mimeType) {
    if (mimeType == null) return const Icon(Icons.insert_drive_file, size: 40, color: Colors.grey);
    if (mimeType.startsWith('image/')) return const Icon(Icons.image, size: 40, color: Colors.blue);
    if (mimeType == 'application/pdf') return const Icon(Icons.picture_as_pdf, size: 40, color: Colors.red);
    if (mimeType.contains('word')) return const Icon(Icons.description, size: 40, color: Colors.blueGrey);
    if (mimeType.contains('excel')) return const Icon(Icons.table_chart, size: 40, color: Colors.green);
    return const Icon(Icons.insert_drive_file, size: 40, color: Colors.grey);
  }
}
