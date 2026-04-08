// lib/data/repositories/client_repository.dart
import 'package:get/get.dart';
import '/data/models/client.dart';
import '/data/models/client_area_tag.dart';
import '/data/models/client_industry.dart';
import '/data/models/client_type.dart';
import '/data/models/client_document.dart';
import '/data/models/client_document_type.dart';
import '/data/models/client_interested_product.dart';
import '/data/datasources/client_remote_datasource.dart';
import '/data/datasources/client_document_remote_datasource.dart';
import '/services/data_cache_service.dart';

class ClientRepository {
  final ClientRemoteDataSource remoteDataSource;
  final ClientDocumentRemoteDataSource documentRemoteDataSource;

  ClientRepository({required this.remoteDataSource, required this.documentRemoteDataSource});

  Future<Client> getClientDetails(String userUuid, int clientId) async {
    try {
      final Map<String, dynamic> clientData = await remoteDataSource.fetchClientDetails(userUuid, clientId);
      return Client.fromJson(clientData);
    } catch (e) {
      rethrow;
    }
  }

  Future<List<Client>> getAllClients(String userUuid) async {
    try {
      final List<Map<String, dynamic>> clientsData = await remoteDataSource.fetchAllClients(userUuid);
      // print("########################## clientsData $clientsData ############################ ");
      return clientsData.map((data) => Client.fromJson(data)).toList();
    } catch (e) {
      rethrow;
    }
  }

  Future<List<ClientAreaTag>> getClientAreaTags({bool forceRefresh = false}) async {
    try {
      if (!forceRefresh && Get.isRegistered<DataCacheService>()) {
        final cached = DataCacheService.instance.getCachedClientAreaTags();
        final parsed = cached.map(_normalizeMetadataMap).whereType<Map<String, dynamic>>().map(ClientAreaTag.fromJson).toList();
        if (parsed.isNotEmpty) {
          return parsed;
        }
      }

      final List<Map<String, dynamic>> tagsData = await remoteDataSource.fetchClientAreaTags();
      final tags = tagsData.map((data) => ClientAreaTag.fromJson(data)).toList();

      if (Get.isRegistered<DataCacheService>()) {
        await DataCacheService.instance.cacheClientAreaTags(tags.map((e) => e.toJson()).toList());
      }

      return tags;
    } catch (e) {
      rethrow;
    }
  }

  Future<List<ClientIndustry>> getClientIndustries({bool forceRefresh = false}) async {
    try {
      if (!forceRefresh && Get.isRegistered<DataCacheService>()) {
        final cached = DataCacheService.instance.getCachedClientIndustries();
        final parsed = cached.map(_normalizeMetadataMap).whereType<Map<String, dynamic>>().map(ClientIndustry.fromJson).toList();
        if (parsed.isNotEmpty) {
          return parsed;
        }
      }

      final List<Map<String, dynamic>> industriesData = await remoteDataSource.fetchClientIndustries();
      final industries = industriesData.map((data) => ClientIndustry.fromJson(data)).toList();

      if (Get.isRegistered<DataCacheService>()) {
        await DataCacheService.instance.cacheClientIndustries(industries.map((e) => e.toJson()).toList());
      }

      return industries;
    } catch (e) {
      rethrow;
    }
  }

  Future<List<ClientType>> getClientTypes({bool forceRefresh = false}) async {
    try {
      if (!forceRefresh && Get.isRegistered<DataCacheService>()) {
        final cached = DataCacheService.instance.getCachedClientTypes();
        final parsed = cached.map(_normalizeMetadataMap).whereType<Map<String, dynamic>>().map(ClientType.fromJson).toList();
        if (parsed.isNotEmpty) {
          return parsed;
        }
      }

      final List<Map<String, dynamic>> typesData = await remoteDataSource.fetchClientTypes();
      final types = typesData.map((data) => ClientType.fromJson(data)).toList();

      if (Get.isRegistered<DataCacheService>()) {
        await DataCacheService.instance.cacheClientTypes(types.map((e) => e.toJson()).toList());
      }

      return types;
    } catch (e) {
      rethrow;
    }
  }

  Future<List<ClientInterestedProduct>> getClientInterestedProducts(int clientId) async {
    try {
      final List<Map<String, dynamic>> data = await remoteDataSource.fetchClientInterestedProducts(clientId);
      return data.map(ClientInterestedProduct.fromJson).toList();
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> addClientInterestedProduct(int clientId, int productId) async {
    try {
      return await remoteDataSource.addClientInterestedProduct(clientId, productId);
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> deleteClientInterestedProduct(int clientId, int productId) async {
    try {
      return await remoteDataSource.deleteClientInterestedProduct(clientId, productId);
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> addClient(String userUuid, Map<String, String> clientData, {String? filePath, String? fileField}) async {
    try {
      final Map<String, String> dataToSend = {
        ...clientData,
        'users_uuid': userUuid,
      };
      final response = await remoteDataSource.addClient(dataToSend, filePath: filePath, fileField: fileField);
      return response;
    } catch (e) {
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
    try {
      final response = await remoteDataSource.updateClient(
        userUuid,
        clientId,
        fields,
        filePath: filePath,
        fileField: fileField,
      );
      return response;
    } catch (e) {
      print('ClientRepository: Failed to update client: $e');
      rethrow;
    }
  }

  // Update client image only
  Future<Map<String, dynamic>> updateClientImage(
    int clientId,
    String imagePath,
  ) async {
    try {
      final response = await remoteDataSource.updateClientImage(clientId, imagePath);
      return response;
    } catch (e) {
      print('ClientRepository: Failed to update client image: $e');
      rethrow;
    }
  }

  // --- Client Document Methods ---

  Future<List<ClientDocumentType>> getClientDocumentTypes() async {
    try {
      final List<Map<String, dynamic>> typesData = await documentRemoteDataSource.fetchDocumentTypes();
      return typesData.map((data) => ClientDocumentType.fromJson(data)).toList();
    } catch (e) {
      rethrow;
    }
  }

  Future<List<ClientDocument>> getClientDocuments(int clientId, String userUuid) async {
    try {
      final List<Map<String, dynamic>> documentsData = await documentRemoteDataSource.fetchClientDocuments(clientId, userUuid);
      return documentsData.map((data) => ClientDocument.fromJson(data)).toList();
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> addClientDocument(String userUuid, Map<String, String> documentData, {String? filePath, String? fileField}) async {
    try {
      final Map<String, String> dataToSend = {
        ...documentData,
        'users_uuid': userUuid,
      };
      final response = await documentRemoteDataSource.addClientDocument(dataToSend, filePath: filePath, fileField: fileField);
      return response;
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> getClientDocumentDetail(int documentId, String userUuid) async {
    try {
      final documentData = await documentRemoteDataSource.getClientDocumentDetail(documentId, userUuid);
      return documentData;
    } catch (e) {
      rethrow;
    }
  }

  Map<String, dynamic>? _normalizeMetadataMap(dynamic source) {
    if (source is Map<String, dynamic>) {
      return source;
    }

    if (source is Map) {
      return source.map((key, value) => MapEntry(key.toString(), value));
    }

    return null;
  }
}
