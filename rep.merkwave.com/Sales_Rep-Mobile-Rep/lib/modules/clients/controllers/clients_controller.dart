// lib/modules/clients/controllers/clients_controller.dart
import 'package:flutter/material.dart'; // For TextEditingController
import 'package:get/get.dart';
import '/data/models/client.dart';
import '/data/models/client_area_tag.dart';
import '/data/models/client_industry.dart';
import '/data/repositories/client_repository.dart';
import '/modules/auth/controllers/auth_controller.dart';
import '/services/data_cache_service.dart';
import '/modules/shared/controllers/global_data_controller.dart';

class ClientsController extends GetxController {
  final clients = <Client>[].obs; // All clients fetched from API
  final areaTags = <ClientAreaTag>[].obs;
  final industries = <ClientIndustry>[].obs;
  final isLoading = true.obs;
  final errorMessage = ''.obs;

  // Search and Filter Observables
  final TextEditingController searchController = TextEditingController();
  final searchText = ''.obs;
  final selectedStatusFilter = Rx<String?>(null); // Null means 'all'
  final selectedAreaFilter = Rx<int?>(null); // Null means 'all'
  final selectedIndustryFilter = Rx<int?>(null); // Null means 'all'

  final ClientRepository _clientRepository;
  final AuthController _authController = Get.find<AuthController>();
  // Ensure VisitsController is initialized before it's accessed in ClientCard
  // It's best practice to Get.put or Get.lazyPut it in InitialBinding
  // and then Get.find() it here.

  ClientsController({required ClientRepository clientRepository}) : _clientRepository = clientRepository;

  @override
  void onInit() {
    super.onInit();
    _loadAllClientData();

    // Debounce search input to avoid excessive updates
    debounce(searchText, (_) => _applyFilters(), time: const Duration(milliseconds: 500));
    // React to filter changes
    ever(selectedStatusFilter, (_) => _applyFilters());
    // Legacy type filter removed
    ever(selectedAreaFilter, (_) => _applyFilters()); // React to area filter changes
    ever(selectedIndustryFilter, (_) => _applyFilters()); // React to industry filter changes
  }

  @override
  void onClose() {
    searchController.dispose();
    super.onClose();
  }

  Future<void> _loadAllClientData() async {
    isLoading.value = true;
    errorMessage.value = '';

    // print("=== ClientsController: Loading client data ===");
    try {
      final String? userUuid = _authController.currentUser.value?.uuid;
      if (userUuid == null) {
        throw Exception('User not logged in or UUID not available.');
      }

      // print("User UUID: $userUuid");

      // First, try to load from cache
      bool useCache = await _loadFromCache();

      // If cache is empty or we want fresh data, fetch from API
      if (!useCache || clients.isEmpty) {
        // print("Cache empty or outdated, fetching from API...");
        await _loadFromAPI(userUuid);
      } else {
        // print("Successfully using cached client data");
      }

      // print("=== Total clients loaded: ${clients.length} ===");
      _applyFilters(); // Apply filters initially after data is loaded
    } catch (e) {
      errorMessage.value = 'Failed to load client data: ${e.toString()}';
      print('ERROR loading client data: $e');
    } finally {
      isLoading.value = false;
    }
  }

  // Load data from cache
  Future<bool> _loadFromCache() async {
    try {
      // print("--- Checking cache for clients ---");

      // First priority: Check GlobalDataController (most up-to-date during login)
      // print("--- Trying GlobalDataController first ---");
      if (Get.isRegistered<GlobalDataController>()) {
        final globalController = Get.find<GlobalDataController>();
        if (globalController.clients.isNotEmpty) {
          clients.assignAll(globalController.clients);
          // print("Successfully loaded ${globalController.clients.length} clients from GlobalDataController");

          // Load supporting data from API
          await _loadSupportingDataFromAPI();
          return true;
        } else {
          print("GlobalDataController has no clients");
        }
      } else {
        print("GlobalDataController not available");
      }

      // Second priority: Try DataCacheService
      print("--- Trying DataCacheService as fallback ---");
      if (Get.isRegistered<DataCacheService>()) {
        final cacheService = DataCacheService.instance;
        print("DataCacheService found, getting cached clients...");

        // Get cached clients
        final cachedClientsData = cacheService.getCachedClients();
        print("Found ${cachedClientsData.length} clients in DataCacheService");

        if (cachedClientsData.isNotEmpty) {
          // Convert JSON data to Client objects
          final cachedClients = cachedClientsData
              .map((clientData) {
                try {
                  return Client.fromJson(clientData);
                } catch (e) {
                  print("Error parsing client data: $e");
                  return null;
                }
              })
              .where((client) => client != null)
              .cast<Client>()
              .toList();

          clients.assignAll(cachedClients);
          // print("Successfully loaded ${cachedClients.length} clients from DataCacheService");

          // Load supporting data from API
          await _loadSupportingDataFromAPI();
          return true;
        }
      } else {
        print("DataCacheService not available");
      }

      print("No clients found in any cache");
      return false;
    } catch (e) {
      print('ERROR loading from cache: $e');
      return false;
    }
  }

  // Load data from API
  Future<void> _loadFromAPI(String userUuid) async {
    print("--- Fetching clients from API ---");
    print("User UUID: $userUuid");

    // Fetch clients from API
    final fetchedClients = await _clientRepository.getAllClients(userUuid);
    print("Fetched ${fetchedClients.length} clients from API");

    clients.assignAll(fetchedClients);

    // Load supporting data from cache (GlobalDataController) or API as fallback
    await _loadSupportingDataFromAPI();
  }

  // Load supporting data (area tags and industries) from cache or API
  Future<void> _loadSupportingDataFromAPI() async {
    try {
      print("--- Loading supporting data (area tags, industries, client types) ---");

      // Try to get from GlobalDataController first (cached during login)
      if (Get.isRegistered<GlobalDataController>()) {
        final globalController = Get.find<GlobalDataController>();

        if (globalController.clientAreaTags.isNotEmpty) {
          print("Using client metadata from GlobalDataController cache");
          areaTags.assignAll(globalController.clientAreaTags);
          industries.assignAll(globalController.clientIndustries);
          print("Loaded ${areaTags.length} area tags and ${industries.length} industries from cache");
          return;
        }
      }

      // Fallback: Fetch from API if not in GlobalDataController
      print("GlobalDataController cache empty, fetching from API...");
      final results = await Future.wait([
        _clientRepository.getClientAreaTags(),
        _clientRepository.getClientIndustries(),
      ]);

      areaTags.assignAll(results[0] as List<ClientAreaTag>);
      industries.assignAll(results[1] as List<ClientIndustry>);
      print("Fetched ${areaTags.length} area tags and ${industries.length} industries from API");
    } catch (e) {
      print('Error loading supporting data: $e');
      // Don't throw error here as main client data is already loaded
    }
  }

  // New public method to refresh clients (force from API)
  Future<void> refreshClients() async {
    isLoading.value = true;
    errorMessage.value = '';

    try {
      final String? userUuid = _authController.currentUser.value?.uuid;
      if (userUuid == null) {
        throw Exception('User not logged in or UUID not available.');
      }

      print("Force refreshing client data from API...");
      await _loadFromAPI(userUuid);
      _applyFilters();

      // Update cache with fresh data
      if (Get.isRegistered<DataCacheService>()) {
        final cacheService = DataCacheService.instance;
        final clientsJson = clients.map((client) => client.toJson()).toList();
        await cacheService.cacheClients(clientsJson);
        print("Updated cache with fresh client data");
      }
    } catch (e) {
      errorMessage.value = 'Failed to refresh client data: ${e.toString()}';
      print('Error refreshing client data: $e');
    } finally {
      isLoading.value = false;
    }
  }

  // Getter for filtered clients
  List<Client> get filteredClients {
    List<Client> filteredList = clients;

    // Apply search filter
    if (searchText.value.isNotEmpty) {
      filteredList = filteredList.where((client) {
        return client.companyName.toLowerCase().contains(searchText.value.toLowerCase()) ||
            (client.contactName?.toLowerCase().contains(searchText.value.toLowerCase()) ?? false) ||
            (client.email?.toLowerCase().contains(searchText.value.toLowerCase()) ?? false);
      }).toList();
    }

    // Apply status filter
    if (selectedStatusFilter.value != null) {
      filteredList = filteredList.where((client) => client.status == selectedStatusFilter.value).toList();
    }

    // Apply type filter
    // Legacy type filter removed

    // Apply area filter
    if (selectedAreaFilter.value != null) {
      filteredList = filteredList.where((client) => client.areaTagId == selectedAreaFilter.value).toList();
    }

    // Apply industry filter
    if (selectedIndustryFilter.value != null) {
      filteredList = filteredList.where((client) => client.industryId == selectedIndustryFilter.value).toList();
    }

    return filteredList;
  }

  // Call this method to trigger filtering
  void _applyFilters() {
    // This empty update() call forces Obx to rebuild using the filteredClients getter
    update();
  }

  void onSearchChanged(String query) {
    searchText.value = query;
  }

  void onStatusFilterChanged(String? status) {
    selectedStatusFilter.value = status;
  }

  void onTypeFilterChanged(String? type) {
    // Legacy type filter removed
  }

  void onAreaFilterChanged(int? areaId) {
    selectedAreaFilter.value = areaId;
  }

  void onIndustryFilterChanged(int? industryId) {
    selectedIndustryFilter.value = industryId;
  }

  // New method to clear all filters
  void clearAllFilters() {
    searchText.value = '';
    searchController.clear();
    selectedStatusFilter.value = null;
    // Legacy type filter removed
    selectedAreaFilter.value = null;
    selectedIndustryFilter.value = null;
    // _applyFilters() will be called by the `ever` listeners
  }

  // Helper to check if any filters are active
  bool get hasActiveFilters {
    return searchText.value.isNotEmpty || selectedStatusFilter.value != null || selectedAreaFilter.value != null || selectedIndustryFilter.value != null;
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

  // Method to add a new client (will be implemented with a form)
  void addClient(Client newClient) {
    clients.add(newClient); // Add to the main clients list
    _applyFilters(); // Re-apply filters to update the displayed list
    // Get.snackbar(
    //   'Client Added',
    //   '${newClient.companyName} has been added successfully!',
    //   snackPosition: SnackPosition.BOTTOM,
    //   backgroundColor: Get.theme.primaryColor,
    //   colorText: Get.theme.colorScheme.onPrimary,
    // );
  }

  // Method to update an existing client
  void updateClient(Client updatedClient) {
    final index = clients.indexWhere((client) => client.id == updatedClient.id);
    if (index != -1) {
      clients[index] = updatedClient;
      _applyFilters(); // Re-apply filters
      Get.snackbar(
        'Client Updated',
        '${updatedClient.companyName} has been updated successfully!',
        snackPosition: SnackPosition.BOTTOM,
        backgroundColor: Get.theme.primaryColor,
        colorText: Get.theme.colorScheme.onPrimary,
      );
    }
  }

  // Method to delete a client
  void deleteClient(int clientId) {
    clients.removeWhere((client) => client.id == clientId);
    _applyFilters(); // Re-apply filters
    Get.snackbar(
      'Client Deleted',
      'Client removed successfully!',
      snackPosition: SnackPosition.BOTTOM,
      backgroundColor: Colors.redAccent,
      colorText: Colors.white,
    );
  }
}
