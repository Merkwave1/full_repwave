// lib/data/datasources/client_remote_datasource.dart
import 'package:get/get.dart';
import '/services/api_service.dart';
import '/core/app_constants.dart';

import 'dart:convert'; // Import for jsonDecode

class ClientRemoteDataSource {
  final ApiService apiService;

  ClientRemoteDataSource({required this.apiService});

  Future<Map<String, dynamic>> fetchClientDetails(String userUuid, int clientId) async {
    try {
      final response = await apiService.get(
        AppConstants.apiClientDetailEndpoint,
        queryParameters: {
          'users_uuid': userUuid,
          'client_id': clientId.toString(),
        },
      );
      // print('Client Detail API Response: ${jsonEncode(response)}'); // Print response for debugging

      if (response['status'] == 'success' && response['data'] != null) {
        return response['data'];
      } else {
        throw Exception(response['message'] ?? 'Failed to fetch client details.');
      }
    } catch (e) {
      Get.snackbar('API Error', 'Error fetching client details: $e', snackPosition: SnackPosition.BOTTOM);
      rethrow;
    }
  }

  Future<List<Map<String, dynamic>>> fetchAllClients(String userUuid) async {
    try {
      final response = await apiService.get(
        AppConstants.apiClientsAllEndpoint,
        queryParameters: {
          'users_uuid': userUuid,
        },
      );
      // print('All Clients API Response: ${jsonEncode(response)}'); // Print response for debugging

      if (response['status'] == 'success' && response['data'] != null && response['data']['clients'] is List) {
        return List<Map<String, dynamic>>.from(response['data']['clients']);
      } else {
        throw Exception(response['message'] ?? 'Failed to fetch all clients.');
      }
    } catch (e) {
      Get.snackbar('API Error', 'Error fetching all clients: $e', snackPosition: SnackPosition.BOTTOM);
      rethrow;
    }
  }

  Future<List<Map<String, dynamic>>> fetchClientAreaTags() async {
    try {
      final response = await apiService.get(AppConstants.apiClientAreaTagsEndpoint);
      // print('Client Area Tags API Response: ${jsonEncode(response)}'); // Print response for debugging

      if (response['status'] == 'success' && response['data'] is List) {
        return List<Map<String, dynamic>>.from(response['data']);
      } else {
        throw Exception(response['message'] ?? 'Failed to fetch client area tags.');
      }
    } catch (e) {
      // Get.snackbar('API Error', 'Error fetching client area tags: $e', snackPosition: SnackPosition.BOTTOM);
      rethrow;
    }
  }

  Future<List<Map<String, dynamic>>> fetchClientIndustries() async {
    try {
      final response = await apiService.get(AppConstants.apiClientIndustriesEndpoint);
      // print('Client Industries API Response: ${jsonEncode(response)}'); // Print response for debugging

      if (response['status'] == 'success' && response['data'] is List) {
        return List<Map<String, dynamic>>.from(response['data']);
      } else {
        throw Exception(response['message'] ?? 'Failed to fetch client industries.');
      }
    } catch (e) {
      Get.snackbar('API Error', 'Error fetching client industries: $e', snackPosition: SnackPosition.BOTTOM);
      rethrow;
    }
  }

  Future<List<Map<String, dynamic>>> fetchClientTypes() async {
    try {
      final response = await apiService.get(AppConstants.apiClientTypesEndpoint);
      // print('Client Types API Response: ${jsonEncode(response)}'); // Print response for debugging

      if (response['status'] == 'success' && response['data'] is List) {
        return List<Map<String, dynamic>>.from(response['data']);
      } else {
        throw Exception(response['message'] ?? 'Failed to fetch client types.');
      }
    } catch (e) {
      Get.snackbar('API Error', 'Error fetching client types: $e', snackPosition: SnackPosition.BOTTOM);
      rethrow;
    }
  }

  Future<List<Map<String, dynamic>>> fetchClientInterestedProducts(int clientId) async {
    try {
      final response = await apiService.get(
        AppConstants.apiClientInterestedProductsEndpoint,
        queryParameters: {
          'client_id': clientId.toString(),
        },
      );

      final data = response['data'];
      final interested = data is Map<String, dynamic> ? data['interested_products'] : null;

      if (response['status'] == 'success' && interested is List) {
        return interested.whereType<Map>().map((item) => item.map((key, value) => MapEntry(key.toString(), value))).map((item) => Map<String, dynamic>.from(item)).toList();
      } else {
        throw Exception(response['message'] ?? 'Failed to fetch client interested products.');
      }
    } catch (e) {
      Get.snackbar('API Error', 'Error fetching client interested products: $e', snackPosition: SnackPosition.BOTTOM);
      rethrow;
    }
  }

  Future<Map<String, dynamic>> addClientInterestedProduct(int clientId, int productId) async {
    try {
      final response = await apiService.post(
        AppConstants.apiClientInterestedProductsAddEndpoint,
        {
          'client_id': clientId,
          'products_id': productId,
        },
      );

      if (response['status'] == 'success') {
        return Map<String, dynamic>.from(response);
      } else {
        throw Exception(response['message'] ?? 'Failed to add client interested product.');
      }
    } catch (e) {
      Get.snackbar('API Error', 'Error adding client interested product: $e', snackPosition: SnackPosition.BOTTOM);
      rethrow;
    }
  }

  Future<Map<String, dynamic>> deleteClientInterestedProduct(int clientId, int productId) async {
    try {
      final response = await apiService.post(
        AppConstants.apiClientInterestedProductsDeleteEndpoint,
        {
          'client_id': clientId,
          'products_id': productId,
        },
      );

      if (response['status'] == 'success') {
        return Map<String, dynamic>.from(response);
      } else {
        throw Exception(response['message'] ?? 'Failed to delete client interested product.');
      }
    } catch (e) {
      Get.snackbar('API Error', 'Error deleting client interested product: $e', snackPosition: SnackPosition.BOTTOM);
      rethrow;
    }
  }

  Future<Map<String, dynamic>> addClient(Map<String, String> clientData, {String? filePath, String? fileField}) async {
    try {
      final response = await apiService.postMultipart(
        // Use postMultipart
        AppConstants.apiAddClientEndpoint,
        clientData,
        filePath: filePath,
        fileField: fileField,
      );
      print('Add Client API Response: ${jsonEncode(response)}'); // Print response for debugging

      if (response['status'] == 'success') {
        return response;
      } else {
        throw Exception(response['message'] ?? 'Failed to add client.');
      }
    } catch (e) {
      Get.snackbar('API Error', 'Error adding client: $e', snackPosition: SnackPosition.BOTTOM);
      rethrow;
    }
  }

  // ** NEW METHOD ADDED **
  Future<Map<String, dynamic>> updateClient(
    String userUuid,
    int clientId,
    Map<String, String> fields, {
    String? filePath,
    String? fileField,
  }) async {
    // The API endpoint for updating a client. Adjust if your API uses a different path.
    const String path = AppConstants.apiUpdateClientEndpoint;

    // Add the user's UUID to the fields to be sent.
    fields['users_uuid'] = userUuid;

    // Add the client's ID to the fields.
    fields['clients_id'] = clientId.toString();

    print('Updating client with fields: $fields');

    // Use the existing postMultipart method from your ApiService.
    final response = await apiService.postMultipart(
      path,
      fields,
      filePath: filePath,
      fileField: fileField,
    );

    print('Update Client API Response: $response');
    return response;
  }

  // Update client image only
  Future<Map<String, dynamic>> updateClientImage(
    int clientId,
    String imagePath,
  ) async {
    try {
      final response = await apiService.postMultipart(
        AppConstants.apiUpdateClientImageEndpoint,
        {'clients_id': clientId.toString()},
        filePath: imagePath,
        fileField: 'clients_image',
      );

      print('Update Client Image API Response: ${jsonEncode(response)}');

      if (response['status'] == 'success') {
        return response;
      } else {
        throw Exception(response['message'] ?? 'Failed to update client image.');
      }
    } catch (e) {
      Get.snackbar('API Error', 'Error updating client image: $e', snackPosition: SnackPosition.BOTTOM);
      rethrow;
    }
  }
}
