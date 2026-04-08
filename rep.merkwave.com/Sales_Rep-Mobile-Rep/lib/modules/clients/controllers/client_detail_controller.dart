// lib/modules/clients/controllers/client_detail_controller.dart
import 'dart:io';
import 'package:get/get.dart';
import '/data/models/client.dart';
import '/data/models/client_area_tag.dart';
import '/data/models/client_industry.dart';
import '/data/models/client_interested_product.dart';
import '/data/repositories/client_repository.dart';
import '/modules/auth/controllers/auth_controller.dart';
import '/modules/shared/controllers/global_data_controller.dart';
import '/services/data_cache_service.dart';
import '/services/media_service.dart';
import '/shared_widgets/app_notifier.dart';

class ClientDetailController extends GetxController {
  final ClientRepository _clientRepository;
  final AuthController _authController = Get.find<AuthController>();

  final Rx<Client?> client = Rx<Client?>(null);
  final isLoading = true.obs;
  final errorMessage = ''.obs;

  final areaTags = <ClientAreaTag>[].obs;
  final industries = <ClientIndustry>[].obs;
  final interestedProducts = <ClientInterestedProduct>[].obs;
  final isInterestedProductsLoading = false.obs;
  final interestedProductsError = ''.obs;

  ClientDetailController({required ClientRepository clientRepository}) : _clientRepository = clientRepository;

  @override
  void onInit() {
    super.onInit();
    final int? clientId = Get.arguments as int?;
    // Print the received client ID for debugging
    print('ClientDetailController received client ID: $clientId');

    if (clientId != null) {
      _loadClientAndLookupData(clientId);
    } else {
      errorMessage.value = 'Client ID not provided.';
      isLoading.value = false;
    }
  }

  Future<void> _loadClientAndLookupData(int clientId) async {
    isLoading.value = true;
    errorMessage.value = '';
    try {
      final String? userUuid = _authController.currentUser.value?.uuid;
      if (userUuid == null) {
        throw Exception('User not logged in or UUID not available.');
      }

      // Fetch client details while loading lookup data from cache
      final fetchedClient = await _clientRepository.getClientDetails(userUuid, clientId);
      client.value = fetchedClient.copyWith(id: clientId);

      final tags = await _getAreaTagsFromCache();
      if (tags.isNotEmpty) {
        areaTags.assignAll(tags);
      }

      final inds = await _getIndustriesFromCache();
      if (inds.isNotEmpty) {
        industries.assignAll(inds);
      }

      await _loadClientInterestedProducts(clientId);

      if (tags.isEmpty || inds.isEmpty) {
        // As a final fallback, refresh metadata once (will use cache-aware repository and update cache)
        final refreshed = await Future.wait([
          _clientRepository.getClientAreaTags(),
          _clientRepository.getClientIndustries(),
        ]);

        if (tags.isEmpty) {
          areaTags.assignAll(refreshed[0] as List<ClientAreaTag>);
        }
        if (inds.isEmpty) {
          industries.assignAll(refreshed[1] as List<ClientIndustry>);
        }
      }
    } catch (e) {
      errorMessage.value = 'Failed to load client details: ${e.toString()}';
      print('Error fetching client details: $e');
    } finally {
      isLoading.value = false;
    }
  }

  Future<void> _loadClientInterestedProducts(int clientId) async {
    isInterestedProductsLoading.value = true;
    interestedProductsError.value = '';
    try {
      final products = await _clientRepository.getClientInterestedProducts(clientId);
      interestedProducts.assignAll(products);
    } catch (e) {
      interestedProductsError.value = 'failed_to_load_interested_products'.trParams({'error': e.toString()});
    } finally {
      isInterestedProductsLoading.value = false;
    }
  }

  Future<void> refreshInterestedProducts() async {
    final currentClientId = client.value?.id;
    if (currentClientId == null) {
      return;
    }
    await _loadClientInterestedProducts(currentClientId);
  }

  // Helper to get area tag name by ID
  String getAreaTagName(int? id) {
    if (id == null) return 'N/A';
    final tag = areaTags.firstWhereOrNull((tag) => tag.id == id);
    return tag?.name ?? 'N/A';
  }

  // Helper to get industry name by ID
  String getIndustryName(int? id) {
    if (id == null) return 'N/A';
    final industry = industries.firstWhereOrNull((ind) => ind.id == id);
    return industry?.name ?? 'N/A';
  }

  // Upload client image
  Future<void> uploadClientImage() async {
    try {
      final MediaService mediaService = Get.find<MediaService>();

      print('ClientDetailController: Starting image selection...');

      // FIXED: Use new method that returns image directly
      final File? selectedImageFile = await mediaService.pickImageAndReturn();

      print('ClientDetailController: Image selection completed. File: ${selectedImageFile?.path ?? "null"}');

      if (selectedImageFile == null) {
        print('ClientDetailController: No image selected by user');
        return;
      }

      final Client? currentClient = client.value;
      final int? clientId = currentClient?.id;

      if (clientId == null) {
        AppNotifier.error('معرف العميل غير موجود', title: 'خطأ');
        return;
      }

      print('ClientDetailController: Uploading image for client ID: $clientId');
      isLoading.value = true;
      AppNotifier.info('جارٍ رفع الصورة...', title: 'انتظر');

      // Call the repository to upload the image using the dedicated endpoint
      final response = await _clientRepository.updateClientImage(
        clientId,
        selectedImageFile.path,
      );

      print('ClientDetailController: Upload response: ${response['status']}');

      if (response['status'] == 'success') {
        AppNotifier.success('تم رفع الصورة بنجاح', title: 'نجح');
        // Refresh client data to show new image
        await refreshClientData();
      } else {
        AppNotifier.error(response['message'] ?? 'فشل رفع الصورة', title: 'خطأ');
      }
    } catch (e) {
      print('ClientDetailController: Error uploading client image: $e');
      AppNotifier.error('فشل رفع الصورة: ${e.toString()}', title: 'خطأ');
    } finally {
      isLoading.value = false;
    }
  }

  // Refresh client data after image upload
  Future<void> refreshClientData() async {
    final currentClient = client.value;
    final currentId = currentClient?.id;
    if (currentId == null) return;

    try {
      final String? userUuid = _authController.currentUser.value?.uuid;
      if (userUuid == null) return;

      final fetchedClient = await _clientRepository.getClientDetails(userUuid, currentId);
      client.value = fetchedClient.copyWith(id: currentId);
      print('Client data refreshed successfully');
    } catch (e) {
      print('Error refreshing client data: $e');
    }
  }

  Future<List<ClientAreaTag>> _getAreaTagsFromCache() async {
    // Prefer in-memory global cache populated during login
    if (Get.isRegistered<GlobalDataController>()) {
      final globalController = GlobalDataController.instance;
      if (globalController.clientAreaTags.isNotEmpty) {
        return _parseAreaTags(globalController.clientAreaTags);
      }
    }

    // Fallback to persistent cache
    if (Get.isRegistered<DataCacheService>()) {
      final cached = DataCacheService.instance.getCachedClientAreaTags();
      if (cached.isNotEmpty) {
        return _parseAreaTags(cached);
      }
    }

    return [];
  }

  Future<List<ClientIndustry>> _getIndustriesFromCache() async {
    if (Get.isRegistered<GlobalDataController>()) {
      final globalController = GlobalDataController.instance;
      if (globalController.clientIndustries.isNotEmpty) {
        return _parseIndustries(globalController.clientIndustries);
      }
    }

    if (Get.isRegistered<DataCacheService>()) {
      final cached = DataCacheService.instance.getCachedClientIndustries();
      if (cached.isNotEmpty) {
        return _parseIndustries(cached);
      }
    }

    return [];
  }

  List<ClientAreaTag> _parseAreaTags(List<dynamic> source) {
    return source
        .map((item) {
          if (item is ClientAreaTag) {
            return item;
          }
          if (item is Map<String, dynamic>) {
            return ClientAreaTag.fromJson(item);
          }
          if (item is Map) {
            return ClientAreaTag.fromJson(Map<String, dynamic>.from(item));
          }
          return null;
        })
        .whereType<ClientAreaTag>()
        .toList();
  }

  List<ClientIndustry> _parseIndustries(List<dynamic> source) {
    return source
        .map((item) {
          if (item is ClientIndustry) {
            return item;
          }
          if (item is Map<String, dynamic>) {
            return ClientIndustry.fromJson(item);
          }
          if (item is Map) {
            return ClientIndustry.fromJson(Map<String, dynamic>.from(item));
          }
          return null;
        })
        .whereType<ClientIndustry>()
        .toList();
  }
}
