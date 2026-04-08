// lib/data/datasources/client_document_remote_datasource.dart
import 'package:get/get.dart';
import '/services/api_service.dart';
import '/core/app_constants.dart';
import 'dart:convert'; // For jsonEncode

class ClientDocumentRemoteDataSource {
  final ApiService apiService;

  ClientDocumentRemoteDataSource({required this.apiService});

  Future<List<Map<String, dynamic>>> fetchDocumentTypes() async {
    try {
      // Corrected: Use the new dedicated endpoint for document types
      final response = await apiService.get(AppConstants.apiClientDocumentTypesEndpoint);

      if (response['status'] == 'success' && response['data'] is List) {
        return List<Map<String, dynamic>>.from(response['data']);
      } else {
        throw Exception(response['message'] ?? 'Failed to fetch document types.');
      }
    } catch (e) {
      Get.snackbar('API Error', 'Error fetching document types: $e', snackPosition: SnackPosition.BOTTOM);
      rethrow;
    }
  }

  Future<List<Map<String, dynamic>>> fetchClientDocuments(int clientId, String userUuid) async {
    try {
      final response = await apiService.get(
        AppConstants.apiClientDocumentsAllEndpoint,
        queryParameters: {
          'client_id': clientId.toString(),
          'users_uuid': userUuid,
        },
      );
      print('Client Documents API Response: ${jsonEncode(response)}');

      if (response['status'] == 'success' && response['data'] != null && response['data']['documents'] is List) {
        return List<Map<String, dynamic>>.from(response['data']['documents']);
      } else {
        throw Exception(response['message'] ?? 'Failed to fetch client documents.');
      }
    } catch (e) {
      Get.snackbar('API Error', 'Error fetching client documents: $e', snackPosition: SnackPosition.BOTTOM);
      rethrow;
    }
  }

  Future<Map<String, dynamic>> addClientDocument(Map<String, String> fields, {String? filePath, String? fileField}) async {
    try {
      print('fields  $fields');

      final response = await apiService.postMultipart(
        AppConstants.apiClientDocumentsAddEndpoint,
        fields,
        filePath: filePath,
        fileField: fileField,
      );
      print('Add Client Document API Response: ${jsonEncode(response)}');

      if (response['status'] == 'success') {
        return response;
      } else {
        throw Exception(response['message'] ?? 'Failed to add client document.');
      }
    } catch (e) {
      Get.snackbar('API Error', 'Error adding client document: $e', snackPosition: SnackPosition.BOTTOM);
      rethrow;
    }
  }

  Future<Map<String, dynamic>> getClientDocumentDetail(int documentId, String userUuid) async {
    try {
      final response = await apiService.get(
        AppConstants.apiClientDocumentDetailEndpoint,
        queryParameters: {
          'document_id': documentId.toString(),
          'users_uuid': userUuid,
        },
      );
      print('Client Document Detail API Response: ${jsonEncode(response)}');

      if (response['status'] == 'success' && response['data'] != null && response['data']['document'] is Map) {
        return Map<String, dynamic>.from(response['data']['document']);
      } else {
        throw Exception(response['message'] ?? 'Failed to fetch document details.');
      }
    } catch (e) {
      Get.snackbar('API Error', 'Error fetching document details: $e', snackPosition: SnackPosition.BOTTOM);
      rethrow;
    }
  }
}
