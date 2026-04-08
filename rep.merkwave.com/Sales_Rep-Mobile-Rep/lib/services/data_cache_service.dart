// lib/services/data_cache_service.dart
import 'package:get/get.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'dart:convert';

class DataCacheService extends GetxController {
  static DataCacheService get instance => Get.find<DataCacheService>();

  // Hive boxes for different data types
  late Box<String> _clientsBox;
  late Box<String> _productsBox;
  late Box<String> _warehousesBox;
  late Box<String> _inventoryBox;
  late Box<String> _visitsBox;
  late Box<String> _visitPlansBox;
  late Box<String> _paymentMethodsBox;
  late Box<String> _safesBox;
  late Box<String> _warehouseProductsBox;
  late Box<String> _metadataBox;
  late Box<String> _clientMetadataBox; // NEW: For area tags, industries, client types

  // Cache metadata
  static const String _cacheVersionKey = 'cache_version';
  static const String _currentCacheVersion = '1.0.0';

  // Loading states
  final RxBool isInitializing = false.obs;
  final RxBool isLoadingClients = false.obs;
  final RxBool isLoadingProducts = false.obs;
  final RxBool isLoadingWarehouses = false.obs;
  final RxBool isLoadingInventory = false.obs;
  final RxBool isLoadingVisits = false.obs;
  final RxBool isLoadingVisitPlans = false.obs;
  final RxBool isLoadingPaymentMethods = false.obs;
  final RxBool isLoadingSafes = false.obs;
  final RxBool isLoadingWarehouseProducts = false.obs;

  // Progress tracking
  final RxDouble overallProgress = 0.0.obs;
  final RxString currentLoadingItem = ''.obs;
  final RxInt totalItems = 9.obs;
  final RxInt completedItems = 0.obs;

  @override
  void onInit() {
    super.onInit();
    // Initialize the service automatically when it's created
    initialize();
  }

  // Initialize Hive and open boxes
  Future<void> initialize() async {
    try {
      isInitializing.value = true;
      // print('DataCacheService: Initializing Hive boxes...');

      await Hive.initFlutter();

      // Open all required boxes
      _clientsBox = await Hive.openBox<String>('clients_cache');
      _productsBox = await Hive.openBox<String>('products_cache');
      _warehousesBox = await Hive.openBox<String>('warehouses_cache');
      _inventoryBox = await Hive.openBox<String>('inventory_cache');
      _visitsBox = await Hive.openBox<String>('visits_cache');
      _visitPlansBox = await Hive.openBox<String>('visit_plans_cache');
      _paymentMethodsBox = await Hive.openBox<String>('payment_methods_cache');
      _safesBox = await Hive.openBox<String>('safes_cache');
      _warehouseProductsBox = await Hive.openBox<String>('warehouse_products_cache');
      _metadataBox = await Hive.openBox<String>('cache_metadata');
      _clientMetadataBox = await Hive.openBox<String>('client_metadata_cache'); // NEW

      // Check if cache needs to be cleared (version mismatch)
      final currentVersion = _metadataBox.get(_cacheVersionKey);
      if (currentVersion != _currentCacheVersion) {
        print('DataCacheService: Cache version mismatch, clearing all data...');
        await clearAllCache();
        await _metadataBox.put(_cacheVersionKey, _currentCacheVersion);
      }

      // print('DataCacheService: Initialization complete');
    } catch (e) {
      print('DataCacheService: Error during initialization: $e');
    } finally {
      isInitializing.value = false;
    }
  }

  // Clear all cached data
  Future<void> clearAllCache() async {
    try {
      await Future.wait([
        _clientsBox.clear(),
        _productsBox.clear(),
        _warehousesBox.clear(),
        _inventoryBox.clear(),
        _visitsBox.clear(),
        _visitPlansBox.clear(),
        _paymentMethodsBox.clear(),
        _safesBox.clear(),
        _warehouseProductsBox.clear(),
        _clientMetadataBox.clear(), // NEW
      ]);
      await Future.wait([
        _metadataBox.delete('packaging_types'),
        _metadataBox.delete('packaging_types_last_update'),
        _metadataBox.delete('product_categories'),
        _metadataBox.delete('product_categories_last_update'),
      ]);
      // print('DataCacheService: All cache cleared');
    } catch (e) {
      print('DataCacheService: Error clearing cache: $e');
    }
  }

  // Update progress tracking
  void _updateProgress() {
    final total = totalItems.value <= 0 ? 1 : totalItems.value;
    final progress = completedItems.value / total;
    overallProgress.value = progress.clamp(0.0, 1.0);
  }

  void _resetProgress() {
    completedItems.value = 0;
    overallProgress.value = 0.0;
    currentLoadingItem.value = '';
  }

  // Cache clients data
  Future<void> cacheClients(List<dynamic> clients) async {
    try {
      isLoadingClients.value = true;
      currentLoadingItem.value = 'Loading clients...';

      await _clientsBox.clear();

      for (int i = 0; i < clients.length; i++) {
        final clientData = clients[i];
        await _clientsBox.put('client_${clientData['id']}', jsonEncode(clientData));
      }

      // Store metadata
      await _clientsBox.put('_count', clients.length.toString());
      await _clientsBox.put('_last_update', DateTime.now().toIso8601String());

      // print('DataCacheService: Cached ${clients.length} clients');
    } catch (e) {
      print('DataCacheService: Error caching clients: $e');
    } finally {
      isLoadingClients.value = false;
      completedItems.value++;
      _updateProgress();
    }
  }

  // Get cached clients
  List<dynamic> getCachedClients() {
    try {
      final List<dynamic> clients = [];
      for (String key in _clientsBox.keys) {
        if (!key.startsWith('_')) {
          // Skip metadata keys
          final clientJson = _clientsBox.get(key);
          if (clientJson != null) {
            clients.add(jsonDecode(clientJson));
          }
        }
      }
      return clients;
    } catch (e) {
      print('DataCacheService: Error getting cached clients: $e');
      return [];
    }
  }

  // Cache products data
  Future<void> cacheProducts(List<dynamic> products) async {
    try {
      isLoadingProducts.value = true;
      currentLoadingItem.value = 'Loading products...';

      await _productsBox.clear();

      for (int i = 0; i < products.length; i++) {
        final productData = products[i];
        await _productsBox.put('product_${productData['variantId'] ?? productData['id']}', jsonEncode(productData));
      }

      // Store metadata
      await _productsBox.put('_count', products.length.toString());
      await _productsBox.put('_last_update', DateTime.now().toIso8601String());

      // print('DataCacheService: Cached ${products.length} products');
    } catch (e) {
      print('DataCacheService: Error caching products: $e');
    } finally {
      isLoadingProducts.value = false;
      completedItems.value++;
      _updateProgress();
    }
  }

  // Get cached products
  List<dynamic> getCachedProducts() {
    try {
      final List<dynamic> products = [];
      for (String key in _productsBox.keys) {
        if (!key.startsWith('_')) {
          // Skip metadata keys
          final productJson = _productsBox.get(key);
          if (productJson != null) {
            products.add(jsonDecode(productJson));
          }
        }
      }
      return products;
    } catch (e) {
      print('DataCacheService: Error getting cached products: $e');
      return [];
    }
  }

  // Cache warehouses data
  Future<void> cacheWarehouses(List<dynamic> myWarehouses, List<dynamic> otherWarehouses) async {
    try {
      isLoadingWarehouses.value = true;
      currentLoadingItem.value = 'Loading warehouses...';

      await _warehousesBox.clear();

      // Cache my warehouses
      for (int i = 0; i < myWarehouses.length; i++) {
        final warehouseData = myWarehouses[i];
        await _warehousesBox.put('my_warehouse_${warehouseData['id']}', jsonEncode(warehouseData));
      }

      // Cache other warehouses
      for (int i = 0; i < otherWarehouses.length; i++) {
        final warehouseData = otherWarehouses[i];
        await _warehousesBox.put('other_warehouse_${warehouseData['id']}', jsonEncode(warehouseData));
      }

      // Store metadata
      await _warehousesBox.put('_my_count', myWarehouses.length.toString());
      await _warehousesBox.put('_other_count', otherWarehouses.length.toString());
      await _warehousesBox.put('_last_update', DateTime.now().toIso8601String());

      // print('DataCacheService: Cached ${myWarehouses.length} my warehouses and ${otherWarehouses.length} other warehouses');
    } catch (e) {
      print('DataCacheService: Error caching warehouses: $e');
    } finally {
      isLoadingWarehouses.value = false;
      completedItems.value++;
      _updateProgress();
    }
  }

  // Get cached warehouses
  Map<String, List<dynamic>> getCachedWarehouses() {
    try {
      final List<dynamic> myWarehouses = [];
      final List<dynamic> otherWarehouses = [];

      for (String key in _warehousesBox.keys) {
        if (!key.startsWith('_')) {
          // Skip metadata keys
          final warehouseJson = _warehousesBox.get(key);
          if (warehouseJson != null) {
            if (key.startsWith('my_warehouse_')) {
              myWarehouses.add(jsonDecode(warehouseJson));
            } else if (key.startsWith('other_warehouse_')) {
              otherWarehouses.add(jsonDecode(warehouseJson));
            }
          }
        }
      }

      return {
        'my_warehouses': myWarehouses,
        'other_main_warehouses': otherWarehouses,
      };
    } catch (e) {
      print('DataCacheService: Error getting cached warehouses: $e');
      return {
        'my_warehouses': <dynamic>[],
        'other_main_warehouses': <dynamic>[],
      };
    }
  }

  // Cache inventory by warehouse
  Future<void> cacheInventoryByWarehouse(int warehouseId, List<dynamic> inventoryItems) async {
    try {
      isLoadingInventory.value = true;
      currentLoadingItem.value = 'Loading inventory for warehouse $warehouseId...';

      // Clear existing inventory for this warehouse
      final keysToRemove = _inventoryBox.keys.where((key) => key.startsWith('inventory_${warehouseId}_')).toList();
      for (String key in keysToRemove) {
        await _inventoryBox.delete(key);
      }

      // Cache new inventory items
      for (int i = 0; i < inventoryItems.length; i++) {
        final inventoryData = inventoryItems[i];
        final dynamic rawId = inventoryData['inventory_id'] ?? inventoryData['inventoryId'] ?? inventoryData['id'] ?? i;
        await _inventoryBox.put('inventory_${warehouseId}_$rawId', jsonEncode(inventoryData));
      }

      // Store metadata for this warehouse
      await _inventoryBox.put('_warehouse_${warehouseId}_count', inventoryItems.length.toString());
      await _inventoryBox.put('_warehouse_${warehouseId}_last_update', DateTime.now().toIso8601String());

      // print('DataCacheService: Cached ${inventoryItems.length} inventory items for warehouse $warehouseId');
    } catch (e) {
      print('DataCacheService: Error caching inventory for warehouse $warehouseId: $e');
    } finally {
      isLoadingInventory.value = false;
      completedItems.value++;
      _updateProgress();
    }
  }

  // Get cached inventory by warehouse
  List<dynamic> getCachedInventoryByWarehouse(int warehouseId) {
    try {
      final List<dynamic> inventoryItems = [];
      for (String key in _inventoryBox.keys) {
        if (key.startsWith('inventory_${warehouseId}_') && !key.contains('_count') && !key.contains('_last_update')) {
          final inventoryJson = _inventoryBox.get(key);
          if (inventoryJson != null) {
            inventoryItems.add(jsonDecode(inventoryJson));
          }
        }
      }
      return inventoryItems;
    } catch (e) {
      print('DataCacheService: Error getting cached inventory for warehouse $warehouseId: $e');
      return [];
    }
  }

  // Cache visits data
  Future<void> cacheVisits(List<dynamic> visits) async {
    try {
      isLoadingVisits.value = true;
      currentLoadingItem.value = 'Loading visits...';

      await _visitsBox.clear();

      for (int i = 0; i < visits.length; i++) {
        final visitData = visits[i];
        await _visitsBox.put('visit_${visitData['id']}', jsonEncode(visitData));
      }

      // Store metadata
      await _visitsBox.put('_count', visits.length.toString());
      await _visitsBox.put('_last_update', DateTime.now().toIso8601String());

      // print('DataCacheService: Cached ${visits.length} visits');
    } catch (e) {
      print('DataCacheService: Error caching visits: $e');
    } finally {
      isLoadingVisits.value = false;
      completedItems.value++;
      _updateProgress();
    }
  }

  // Get cached visits
  List<dynamic> getCachedVisits() {
    try {
      final List<dynamic> visits = [];
      for (String key in _visitsBox.keys) {
        if (!key.startsWith('_')) {
          // Skip metadata keys
          final visitJson = _visitsBox.get(key);
          if (visitJson != null) {
            visits.add(jsonDecode(visitJson));
          }
        }
      }
      return visits;
    } catch (e) {
      print('DataCacheService: Error getting cached visits: $e');
      return [];
    }
  }

  // Cache visit plans data
  Future<void> cacheVisitPlans(List<dynamic> visitPlans) async {
    try {
      isLoadingVisitPlans.value = true;
      currentLoadingItem.value = 'Loading visit plans...';

      await _visitPlansBox.clear();

      for (int i = 0; i < visitPlans.length; i++) {
        final visitPlanData = visitPlans[i];
        await _visitPlansBox.put('visit_plan_${visitPlanData['id']}', jsonEncode(visitPlanData));
      }

      // Store metadata
      await _visitPlansBox.put('_count', visitPlans.length.toString());
      await _visitPlansBox.put('_last_update', DateTime.now().toIso8601String());

      // print('DataCacheService: Cached ${visitPlans.length} visit plans');
    } catch (e) {
      print('DataCacheService: Error caching visit plans: $e');
    } finally {
      isLoadingVisitPlans.value = false;
      completedItems.value++;
      _updateProgress();
    }
  }

  // Get cached visit plans
  List<dynamic> getCachedVisitPlans() {
    try {
      final List<dynamic> visitPlans = [];
      for (String key in _visitPlansBox.keys) {
        if (!key.startsWith('_')) {
          // Skip metadata keys
          final visitPlanJson = _visitPlansBox.get(key);
          if (visitPlanJson != null) {
            visitPlans.add(jsonDecode(visitPlanJson));
          }
        }
      }
      return visitPlans;
    } catch (e) {
      print('DataCacheService: Error getting cached visit plans: $e');
      return [];
    }
  }

  // Cache payment methods data
  Future<void> cachePaymentMethods(List<dynamic> paymentMethods) async {
    try {
      isLoadingPaymentMethods.value = true;
      currentLoadingItem.value = 'Loading payment methods...';

      await _paymentMethodsBox.clear();

      for (int i = 0; i < paymentMethods.length; i++) {
        final paymentMethodData = paymentMethods[i];
        await _paymentMethodsBox.put('payment_method_${paymentMethodData['id']}', jsonEncode(paymentMethodData));
      }

      // Store metadata
      await _paymentMethodsBox.put('_count', paymentMethods.length.toString());
      await _paymentMethodsBox.put('_last_update', DateTime.now().toIso8601String());

      // print('DataCacheService: Cached ${paymentMethods.length} payment methods');
    } catch (e) {
      print('DataCacheService: Error caching payment methods: $e');
    } finally {
      isLoadingPaymentMethods.value = false;
      completedItems.value++;
      _updateProgress();
    }
  }

  // Get cached payment methods
  List<dynamic> getCachedPaymentMethods() {
    try {
      final List<dynamic> paymentMethods = [];
      for (String key in _paymentMethodsBox.keys) {
        if (!key.startsWith('_')) {
          // Skip metadata keys
          final paymentMethodJson = _paymentMethodsBox.get(key);
          if (paymentMethodJson != null) {
            paymentMethods.add(jsonDecode(paymentMethodJson));
          }
        }
      }
      return paymentMethods;
    } catch (e) {
      print('DataCacheService: Error getting cached payment methods: $e');
      return [];
    }
  }

  // Cache safes data
  Future<void> cacheSafes(List<dynamic> safes) async {
    try {
      isLoadingSafes.value = true;
      currentLoadingItem.value = 'Loading safes...';

      await _safesBox.clear();

      for (int i = 0; i < safes.length; i++) {
        final safeData = safes[i];
        await _safesBox.put('safe_${safeData['id']}', jsonEncode(safeData));
      }

      // Store metadata
      await _safesBox.put('_count', safes.length.toString());
      await _safesBox.put('_last_update', DateTime.now().toIso8601String());

      // print('DataCacheService: Cached ${safes.length} safes');
    } catch (e) {
      print('DataCacheService: Error caching safes: $e');
    } finally {
      isLoadingSafes.value = false;
      completedItems.value++;
      _updateProgress();
    }
  }

  // Get cached safes
  List<dynamic> getCachedSafes() {
    try {
      final List<dynamic> safes = [];
      for (String key in _safesBox.keys) {
        if (!key.startsWith('_')) {
          // Skip metadata keys
          final safeJson = _safesBox.get(key);
          if (safeJson != null) {
            safes.add(jsonDecode(safeJson));
          }
        }
      }
      return safes;
    } catch (e) {
      print('DataCacheService: Error getting cached safes: $e');
      return [];
    }
  }

  // Cache warehouse products data
  Future<void> cacheWarehouseProducts(int warehouseId, List<dynamic> products) async {
    try {
      isLoadingWarehouseProducts.value = true;
      currentLoadingItem.value = 'Loading warehouse products...';

      // Clear existing products for this warehouse
      final keysToRemove = _warehouseProductsBox.keys.where((key) => key.startsWith('warehouse_${warehouseId}_')).toList();
      for (String key in keysToRemove) {
        await _warehouseProductsBox.delete(key);
      }

      // Cache new products
      for (int i = 0; i < products.length; i++) {
        final productData = products[i];
        await _warehouseProductsBox.put('warehouse_${warehouseId}_${productData['variantId'] ?? productData['id']}', jsonEncode(productData));
      }

      // Store metadata for this warehouse
      await _warehouseProductsBox.put('_warehouse_${warehouseId}_count', products.length.toString());
      await _warehouseProductsBox.put('_warehouse_${warehouseId}_last_update', DateTime.now().toIso8601String());

      // print('DataCacheService: Cached ${products.length} products for warehouse $warehouseId');
    } catch (e) {
      print('DataCacheService: Error caching warehouse products for warehouse $warehouseId: $e');
    } finally {
      isLoadingWarehouseProducts.value = false;
      completedItems.value++;
      _updateProgress();
    }
  }

  // Get cached warehouse products
  List<dynamic> getCachedWarehouseProducts(int warehouseId) {
    try {
      final List<dynamic> products = [];
      for (String key in _warehouseProductsBox.keys) {
        if (key.startsWith('warehouse_${warehouseId}_') && !key.contains('_count') && !key.contains('_last_update')) {
          final productJson = _warehouseProductsBox.get(key);
          if (productJson != null) {
            products.add(jsonDecode(productJson));
          }
        }
      }
      return products;
    } catch (e) {
      print('DataCacheService: Error getting cached warehouse products for warehouse $warehouseId: $e');
      return [];
    }
  }

  // Get cache statistics
  Map<String, int> getCacheStats() {
    return {
      'clients': _clientsBox.length,
      'products': _productsBox.length,
      'warehouses': _warehousesBox.length,
      'inventory': _inventoryBox.length,
      'visits': _visitsBox.length,
      'visit_plans': _visitPlansBox.length,
      'payment_methods': _paymentMethodsBox.length,
      'safes': _safesBox.length,
      'warehouse_products': _warehouseProductsBox.length,
    };
  }

  // Check if data is cached and fresh
  bool isDataCached(String dataType) {
    final Box<String> box = _getBoxForDataType(dataType);
    return box.isNotEmpty;
  }

  // Get last update time for data type
  DateTime? getLastUpdateTime(String dataType) {
    try {
      final Box<String> box = _getBoxForDataType(dataType);
      final lastUpdateStr = box.get('_last_update');
      if (lastUpdateStr != null) {
        return DateTime.parse(lastUpdateStr);
      }
    } catch (e) {
      print('DataCacheService: Error getting last update time for $dataType: $e');
    }
    return null;
  }

  // Helper method to get box for data type
  Box<String> _getBoxForDataType(String dataType) {
    switch (dataType) {
      case 'clients':
        return _clientsBox;
      case 'products':
        return _productsBox;
      case 'warehouses':
        return _warehousesBox;
      case 'inventory':
        return _inventoryBox;
      case 'visits':
        return _visitsBox;
      case 'visit_plans':
        return _visitPlansBox;
      case 'payment_methods':
        return _paymentMethodsBox;
      case 'safes':
        return _safesBox;
      case 'warehouse_products':
        return _warehouseProductsBox;
      default:
        throw ArgumentError('Unknown data type: $dataType');
    }
  }

  // Comprehensive cache loading with progress tracking
  Future<void> loadAllData() async {
    try {
      _resetProgress();
      currentLoadingItem.value = 'Starting data load...';

      // This method would typically be called from the auth controller
      // and would use the API services to fetch and cache data

      // print('DataCacheService: All data loading completed');
    } catch (e) {
      print('DataCacheService: Error during comprehensive data load: $e');
    }
  }

  // ========== CLIENT METADATA CACHING ==========
  // Cache client area tags (fetched once during login)
  Future<void> cacheClientAreaTags(List<dynamic> areaTags) async {
    try {
      await _clientMetadataBox.put('area_tags', jsonEncode(areaTags));
      await _clientMetadataBox.put('area_tags_last_update', DateTime.now().toIso8601String());
      print('DataCacheService: Cached ${areaTags.length} client area tags');
    } catch (e) {
      print('DataCacheService: Error caching client area tags: $e');
    }
  }

  // Get cached client area tags
  List<dynamic> getCachedClientAreaTags() {
    try {
      final areaTagsJson = _clientMetadataBox.get('area_tags');
      if (areaTagsJson != null) {
        return jsonDecode(areaTagsJson) as List<dynamic>;
      }
      return [];
    } catch (e) {
      print('DataCacheService: Error getting cached client area tags: $e');
      return [];
    }
  }

  // Cache client industries (fetched once during login)
  Future<void> cacheClientIndustries(List<dynamic> industries) async {
    try {
      await _clientMetadataBox.put('industries', jsonEncode(industries));
      await _clientMetadataBox.put('industries_last_update', DateTime.now().toIso8601String());
      print('DataCacheService: Cached ${industries.length} client industries');
    } catch (e) {
      print('DataCacheService: Error caching client industries: $e');
    }
  }

  // Get cached client industries
  List<dynamic> getCachedClientIndustries() {
    try {
      final industriesJson = _clientMetadataBox.get('industries');
      if (industriesJson != null) {
        return jsonDecode(industriesJson) as List<dynamic>;
      }
      return [];
    } catch (e) {
      print('DataCacheService: Error getting cached client industries: $e');
      return [];
    }
  }

  // Cache client types (fetched once during login)
  Future<void> cacheClientTypes(List<dynamic> clientTypes) async {
    try {
      await _clientMetadataBox.put('client_types', jsonEncode(clientTypes));
      await _clientMetadataBox.put('client_types_last_update', DateTime.now().toIso8601String());
      print('DataCacheService: Cached ${clientTypes.length} client types');
    } catch (e) {
      print('DataCacheService: Error caching client types: $e');
    }
  }

  // Get cached client types
  List<dynamic> getCachedClientTypes() {
    try {
      final clientTypesJson = _clientMetadataBox.get('client_types');
      if (clientTypesJson != null) {
        return jsonDecode(clientTypesJson) as List<dynamic>;
      }
      return [];
    } catch (e) {
      print('DataCacheService: Error getting cached client types: $e');
      return [];
    }
  }

  // Cache countries with governorates (fetched once during login)
  Future<void> cacheCountriesWithGovernorates(List<Map<String, dynamic>> countries) async {
    try {
      await _clientMetadataBox.put('countries_with_governorates', jsonEncode(countries));
      await _clientMetadataBox.put('countries_with_governorates_last_update', DateTime.now().toIso8601String());
      print('DataCacheService: Cached ${countries.length} countries with governorates');
    } catch (e) {
      print('DataCacheService: Error caching countries with governorates: $e');
    }
  }

  // Get cached countries with governorates
  List<Map<String, dynamic>> getCachedCountriesWithGovernorates() {
    try {
      final rawJson = _clientMetadataBox.get('countries_with_governorates');
      if (rawJson == null) {
        return [];
      }

      final decoded = jsonDecode(rawJson);
      if (decoded is Map && decoded['countries'] is List) {
        return (decoded['countries'] as List).whereType<Map>().map((item) => Map<String, dynamic>.from(item)).toList();
      }

      if (decoded is List) {
        return decoded.whereType<Map>().map((item) => Map<String, dynamic>.from(item)).toList();
      }

      return [];
    } catch (e) {
      print('DataCacheService: Error getting cached countries with governorates: $e');
      return [];
    }
  }

  // Clear client metadata cache (useful when logging out or refreshing)
  Future<void> clearClientMetadata() async {
    try {
      await _clientMetadataBox.clear();
      print('DataCacheService: Client metadata cache cleared');
    } catch (e) {
      print('DataCacheService: Error clearing client metadata: $e');
    }
  }
  // ========== END CLIENT METADATA CACHING ==========

  // ========== PRODUCT METADATA CACHING ==========
  Future<void> cacheProductCategories(List<dynamic> categories) async {
    try {
      await _metadataBox.put('product_categories', jsonEncode(categories));
      await _metadataBox.put('product_categories_last_update', DateTime.now().toIso8601String());
      // print('DataCacheService: Cached ${categories.length} product categories');
    } catch (e) {
      print('DataCacheService: Error caching product categories: $e');
    }
  }

  List<dynamic> getCachedProductCategories() {
    try {
      final categoriesJson = _metadataBox.get('product_categories');
      if (categoriesJson != null) {
        final decoded = jsonDecode(categoriesJson);
        if (decoded is List) {
          return decoded;
        }
      }
    } catch (e) {
      print('DataCacheService: Error getting cached product categories: $e');
    }
    return [];
  }

  DateTime? getProductCategoriesLastUpdate() {
    try {
      final lastUpdate = _metadataBox.get('product_categories_last_update');
      if (lastUpdate is String && lastUpdate.isNotEmpty) {
        return DateTime.tryParse(lastUpdate);
      }
    } catch (e) {
      print('DataCacheService: Error getting product categories last update: $e');
    }
    return null;
  }

  Future<void> clearProductCategories() async {
    try {
      await _metadataBox.delete('product_categories');
      await _metadataBox.delete('product_categories_last_update');
      print('DataCacheService: Product categories cache cleared');
    } catch (e) {
      print('DataCacheService: Error clearing product categories cache: $e');
    }
  }

  Future<void> cachePackagingTypes(List<dynamic> packagingTypes) async {
    try {
      await _metadataBox.put('packaging_types', jsonEncode(packagingTypes));
      await _metadataBox.put('packaging_types_last_update', DateTime.now().toIso8601String());
      // print('DataCacheService: Cached ${packagingTypes.length} packaging types');
    } catch (e) {
      print('DataCacheService: Error caching packaging types: $e');
    }
  }

  List<dynamic> getCachedPackagingTypes() {
    try {
      final packagingTypesJson = _metadataBox.get('packaging_types');
      if (packagingTypesJson != null) {
        final decoded = jsonDecode(packagingTypesJson);
        if (decoded is List) {
          return decoded;
        }
      }
    } catch (e) {
      print('DataCacheService: Error getting cached packaging types: $e');
    }
    return [];
  }

  DateTime? getPackagingTypesLastUpdate() {
    try {
      final lastUpdate = _metadataBox.get('packaging_types_last_update');
      if (lastUpdate is String && lastUpdate.isNotEmpty) {
        return DateTime.tryParse(lastUpdate);
      }
    } catch (e) {
      print('DataCacheService: Error getting packaging types last update: $e');
    }
    return null;
  }

  Future<void> clearPackagingTypes() async {
    try {
      await _metadataBox.delete('packaging_types');
      await _metadataBox.delete('packaging_types_last_update');
      print('DataCacheService: Packaging types cache cleared');
    } catch (e) {
      print('DataCacheService: Error clearing packaging types cache: $e');
    }
  }
  // ========== END PRODUCT METADATA CACHING ==========

  @override
  void onClose() {
    // Close all boxes when service is disposed
    _clientsBox.close();
    _productsBox.close();
    _warehousesBox.close();
    _inventoryBox.close();
    _visitsBox.close();
    _visitPlansBox.close();
    _paymentMethodsBox.close();
    _safesBox.close();
    _warehouseProductsBox.close();
    _metadataBox.close();
    _clientMetadataBox.close(); // NEW
    super.onClose();
  }
}
