// lib/modules/shared/controllers/global_data_controller.dart
import 'package:collection/collection.dart';
import 'package:get/get.dart';
import 'package:get_storage/get_storage.dart';
import '/data/models/client.dart';
import '/data/models/payment.dart';
import '/data/models/safe.dart';
import '/data/models/warehouse.dart';
import '/data/models/product_lookup.dart';
import '/data/models/warehouse_product_variant.dart';
import '/data/models/inventory_item.dart' as inventory_models;
import '/data/models/client_area_tag.dart';
import '/data/models/client_industry.dart';
import '/data/models/client_type.dart';
import '/data/models/country_with_governorates.dart';
import '/data/repositories/client_repository.dart';
import '/data/repositories/payment_repository.dart';
import '/data/repositories/warehouse_repository.dart';
import '/data/repositories/product_repository.dart';
import '/data/repositories/inventory_repository.dart';
import '/data/repositories/location_repository.dart';
import '/modules/auth/controllers/auth_controller.dart';

class GlobalDataController extends GetxController {
  static GlobalDataController get instance => Get.find<GlobalDataController>();

  // Persistent storage
  final GetStorage _storage = GetStorage();

  // Lazy initialization of repositories
  ClientRepository get _clientRepository => Get.find<ClientRepository>();
  PaymentRepository get _paymentRepository => Get.find<PaymentRepository>();
  WarehouseRepository get _warehouseRepository => Get.find<WarehouseRepository>();
  ProductRepository get _productRepository => Get.find<ProductRepository>();
  InventoryRepository get _inventoryRepository => Get.find<InventoryRepository>();
  LocationRepository get _locationRepository => Get.find<LocationRepository>();
  AuthController get _authController => Get.find<AuthController>();

  // Global data storage
  final RxList<Client> clients = <Client>[].obs;
  final RxList<PaymentMethod> paymentMethods = <PaymentMethod>[].obs;
  final RxList<Safe> safes = <Safe>[].obs;
  final RxList<Warehouse> myWarehouses = <Warehouse>[].obs;
  final RxList<Warehouse> otherMainWarehouses = <Warehouse>[].obs;
  final RxList<ProductVariant> products = <ProductVariant>[].obs;
  // NEW: Rep warehouse inventory cache
  final RxList<WarehouseProductVariant> repInventory = <WarehouseProductVariant>[].obs;
  // Client metadata
  final RxList<ClientAreaTag> clientAreaTags = <ClientAreaTag>[].obs;
  final RxList<ClientIndustry> clientIndustries = <ClientIndustry>[].obs;
  final RxList<ClientType> clientTypes = <ClientType>[].obs;
  final RxList<CountryWithGovernorates> countriesWithGovernorates = <CountryWithGovernorates>[].obs;
  // Catalog metadata
  final RxList<PackagingType> packagingTypes = <PackagingType>[].obs;
  final RxList<ProductCategory> productCategories = <ProductCategory>[].obs;

  // Loading states
  final RxBool isLoadingClients = false.obs;
  final RxBool isLoadingPaymentMethods = false.obs;
  final RxBool isLoadingSafes = false.obs;
  final RxBool isLoadingWarehouses = false.obs;
  final RxBool isLoadingProducts = false.obs;
  final RxBool isLoadingRepInventory = false.obs;
  final RxBool isLoadingClientMetadata = false.obs;
  final RxBool isLoadingCountries = false.obs;
  final RxBool isLoadingPackagingTypes = false.obs;
  final RxBool isLoadingProductCategories = false.obs;

  // Cache timestamps
  DateTime? _clientsLastFetch;
  DateTime? _paymentMethodsLastFetch;
  DateTime? _safesLastFetch;
  DateTime? _warehousesLastFetch;
  DateTime? _productsLastFetch;
  DateTime? _repInventoryLastFetch;
  DateTime? _clientMetadataLastFetch;
  DateTime? _countriesLastFetch;
  DateTime? _packagingTypesLastFetch;
  DateTime? _productCategoriesLastFetch;

  // In-flight loader trackers to avoid race conditions
  Future<void>? _productsLoadingFuture;
  Future<void>? _repInventoryLoadingFuture;
  Future<void>? _packagingTypesLoadingFuture;

  // Cache duration (5 minutes)
  static const Duration _cacheDuration = Duration(minutes: 5);

  @override
  void onInit() {
    super.onInit();
    print('GlobalDataController initialized');
    // Load cached data on initialization
    _loadFromStorage();
  }

  // Load cached data from storage
  void _loadFromStorage() {
    try {
      // Load clients
      final clientsJson = _storage.read<List>('cached_clients');
      if (clientsJson != null) {
        clients.assignAll(clientsJson.map((json) => Client.fromJson(Map<String, dynamic>.from(json))).toList());
        print('Loaded ${clients.length} clients from storage');
      }

      // Load payment methods
      final paymentMethodsJson = _storage.read<List>('cached_payment_methods');
      if (paymentMethodsJson != null) {
        paymentMethods.assignAll(paymentMethodsJson.map((json) => PaymentMethod.fromJson(Map<String, dynamic>.from(json))).toList());
        print('Loaded ${paymentMethods.length} payment methods from storage');
      }

      // Load safes
      final safesJson = _storage.read<List>('cached_safes');
      if (safesJson != null) {
        safes.assignAll(safesJson.map((json) => Safe.fromJson(Map<String, dynamic>.from(json))).toList());
        print('Loaded ${safes.length} safes from storage');
      }

      // Load warehouses
      final myWarehousesJson = _storage.read<List>('cached_my_warehouses');
      if (myWarehousesJson != null) {
        myWarehouses.assignAll(myWarehousesJson.map((json) => Warehouse.fromJson(Map<String, dynamic>.from(json))).toList());
        print('Loaded ${myWarehouses.length} my warehouses from storage');
      }

      final otherWarehousesJson = _storage.read<List>('cached_other_warehouses');
      if (otherWarehousesJson != null) {
        otherMainWarehouses.assignAll(otherWarehousesJson.map((json) => Warehouse.fromJson(Map<String, dynamic>.from(json))).toList());
        print('Loaded ${otherMainWarehouses.length} other warehouses from storage');
      }

      // Load products
      final productsJson = _storage.read<List>('cached_products');
      if (productsJson != null) {
        products.assignAll(productsJson.map((json) => ProductVariant.fromJson(Map<String, dynamic>.from(json))).toList());
        print('Loaded ${products.length} products from storage');
      }

      // Load rep inventory
      final repInventoryJson = _storage.read<List>('cached_rep_inventory');
      if (repInventoryJson != null) {
        repInventory.assignAll(repInventoryJson.map((json) => WarehouseProductVariant.fromJson(Map<String, dynamic>.from(json))).toList());
        print('Loaded ${repInventory.length} rep inventory items from storage');
      }

      // Load client metadata
      final areaTagsJson = _storage.read<List>('cached_client_area_tags');
      if (areaTagsJson != null) {
        clientAreaTags.assignAll(areaTagsJson.map((json) => ClientAreaTag.fromJson(Map<String, dynamic>.from(json))).toList());
        print('Loaded ${clientAreaTags.length} client area tags from storage');
      }

      final industriesJson = _storage.read<List>('cached_client_industries');
      if (industriesJson != null) {
        clientIndustries.assignAll(industriesJson.map((json) => ClientIndustry.fromJson(Map<String, dynamic>.from(json))).toList());
        print('Loaded ${clientIndustries.length} client industries from storage');
      }

      final clientTypesJson = _storage.read<List>('cached_client_types');
      if (clientTypesJson != null) {
        clientTypes.assignAll(clientTypesJson.map((json) => ClientType.fromJson(Map<String, dynamic>.from(json))).toList());
        print('Loaded ${clientTypes.length} client types from storage');
      }

      final countriesJson = _storage.read<List>('cached_countries_with_governorates');
      if (countriesJson != null) {
        countriesWithGovernorates.assignAll(
          countriesJson.map((json) => CountryWithGovernorates.fromJson(Map<String, dynamic>.from(json))).toList(),
        );
        print('Loaded ${countriesWithGovernorates.length} countries with governorates from storage');
      }

      // Load catalog metadata
      final packagingTypesJson = _storage.read<List>('cached_packaging_types');
      if (packagingTypesJson != null) {
        packagingTypes.assignAll(packagingTypesJson.map((json) => PackagingType.fromJson(Map<String, dynamic>.from(json))).toList());
        print('Loaded ${packagingTypes.length} packaging types from storage');
      }

      final productCategoriesJson = _storage.read<List>('cached_product_categories');
      if (productCategoriesJson != null) {
        productCategories.assignAll(productCategoriesJson.map((json) => ProductCategory.fromJson(Map<String, dynamic>.from(json))).toList());
        print('Loaded ${productCategories.length} product categories from storage');
      }

      // Load timestamps
      _clientsLastFetch = _storage.read<String>('clients_last_fetch') != null ? DateTime.parse(_storage.read<String>('clients_last_fetch')!) : null;
      _paymentMethodsLastFetch = _storage.read<String>('payment_methods_last_fetch') != null ? DateTime.parse(_storage.read<String>('payment_methods_last_fetch')!) : null;
      _safesLastFetch = _storage.read<String>('safes_last_fetch') != null ? DateTime.parse(_storage.read<String>('safes_last_fetch')!) : null;
      _warehousesLastFetch = _storage.read<String>('warehouses_last_fetch') != null ? DateTime.parse(_storage.read<String>('warehouses_last_fetch')!) : null;
      _productsLastFetch = _storage.read<String>('products_last_fetch') != null ? DateTime.parse(_storage.read<String>('products_last_fetch')!) : null;
      _repInventoryLastFetch = _storage.read<String>('rep_inventory_last_fetch') != null ? DateTime.parse(_storage.read<String>('rep_inventory_last_fetch')!) : null;
      _clientMetadataLastFetch = _storage.read<String>('client_metadata_last_fetch') != null ? DateTime.parse(_storage.read<String>('client_metadata_last_fetch')!) : null;
      _countriesLastFetch = _storage.read<String>('countries_last_fetch') != null ? DateTime.parse(_storage.read<String>('countries_last_fetch')!) : null;
      _packagingTypesLastFetch = _storage.read<String>('packaging_types_last_fetch') != null ? DateTime.parse(_storage.read<String>('packaging_types_last_fetch')!) : null;
      _productCategoriesLastFetch = _storage.read<String>('product_categories_last_fetch') != null ? DateTime.parse(_storage.read<String>('product_categories_last_fetch')!) : null;
    } catch (e) {
      print('Error loading cached data from storage: $e');
    }
  }

  // Save data to storage
  void _saveToStorage() {
    try {
      // Save data
      _storage.write('cached_clients', clients.map((e) => e.toJson()).toList());
      _storage.write('cached_payment_methods', paymentMethods.map((e) => e.toJson()).toList());
      _storage.write('cached_safes', safes.map((e) => e.toJson()).toList());
      _storage.write('cached_my_warehouses', myWarehouses.map((e) => e.toJson()).toList());
      _storage.write('cached_other_warehouses', otherMainWarehouses.map((e) => e.toJson()).toList());
      _storage.write('cached_client_area_tags', clientAreaTags.map((e) => e.toJson()).toList());
      _storage.write('cached_client_industries', clientIndustries.map((e) => e.toJson()).toList());
      _storage.write('cached_client_types', clientTypes.map((e) => e.toJson()).toList());
      _storage.write('cached_countries_with_governorates', countriesWithGovernorates.map((e) => e.toJson()).toList());
      _storage.write('cached_packaging_types', packagingTypes.map((e) => e.toJson()).toList());
      _storage.write('cached_product_categories', productCategories.map((e) => e.toJson()).toList());
      // Skip products and rep inventory for now due to toJson issues
      // _storage.write('cached_products', products.map((e) => e.toJson()).toList());
      // _storage.write('cached_rep_inventory', repInventory.map((e) => e.toJson()).toList());

      // Save timestamps
      if (_clientsLastFetch != null) _storage.write('clients_last_fetch', _clientsLastFetch!.toIso8601String());
      if (_paymentMethodsLastFetch != null) _storage.write('payment_methods_last_fetch', _paymentMethodsLastFetch!.toIso8601String());
      if (_safesLastFetch != null) _storage.write('safes_last_fetch', _safesLastFetch!.toIso8601String());
      if (_warehousesLastFetch != null) _storage.write('warehouses_last_fetch', _warehousesLastFetch!.toIso8601String());
      if (_productsLastFetch != null) _storage.write('products_last_fetch', _productsLastFetch!.toIso8601String());
      if (_repInventoryLastFetch != null) _storage.write('rep_inventory_last_fetch', _repInventoryLastFetch!.toIso8601String());
      if (_clientMetadataLastFetch != null) _storage.write('client_metadata_last_fetch', _clientMetadataLastFetch!.toIso8601String());
      if (_countriesLastFetch != null) _storage.write('countries_last_fetch', _countriesLastFetch!.toIso8601String());
      if (_packagingTypesLastFetch != null) _storage.write('packaging_types_last_fetch', _packagingTypesLastFetch!.toIso8601String());
      if (_productCategoriesLastFetch != null) _storage.write('product_categories_last_fetch', _productCategoriesLastFetch!.toIso8601String());

      print('Cached data saved to storage');
    } catch (e) {
      print('Error saving cached data to storage: $e');
    }
  }

  /// Initialize all global data - call this after login
  Future<void> initializeGlobalData({bool forceRefresh = true}) async {
    print('Initializing global data...');
    await Future.wait([
      loadClients(forceRefresh: forceRefresh),
      loadPaymentMethods(forceRefresh: forceRefresh),
      loadSafes(forceRefresh: forceRefresh),
      loadWarehouses(forceRefresh: forceRefresh),
      loadProducts(forceRefresh: forceRefresh),
      loadRepInventory(forceRefresh: forceRefresh),
      loadClientMetadata(forceRefresh: forceRefresh),
      loadCountriesWithGovernorates(forceRefresh: forceRefresh),
      loadPackagingTypes(forceRefresh: forceRefresh),
      loadProductCategories(forceRefresh: forceRefresh),
    ]);
    print('Global data initialization completed');
  }

  /// Load clients with caching
  Future<void> loadClients({bool forceRefresh = false}) async {
    if (!forceRefresh && _isCacheValid(_clientsLastFetch) && clients.isNotEmpty) {
      print('Using cached clients data');
      return;
    }

    if (isLoadingClients.value) {
      print('Clients already loading, waiting...');
      return;
    }

    try {
      isLoadingClients.value = true;
      print('Fetching clients from API...');

      final String? userUuid = _authController.currentUser.value?.uuid;
      if (userUuid == null) {
        throw Exception('User UUID not available');
      }

      final fetchedClients = await _clientRepository.getAllClients(userUuid);
      clients.assignAll(fetchedClients);
      _clientsLastFetch = DateTime.now();
      _saveToStorage(); // Save to storage after successful fetch

      print('Clients loaded: ${clients.length} items');
    } catch (e) {
      print('Error loading clients: $e');
      Get.snackbar('Error', 'Failed to load clients: $e');
    } finally {
      isLoadingClients.value = false;
    }
  }

  /// Load payment methods with caching
  Future<void> loadPaymentMethods({bool forceRefresh = false}) async {
    if (!forceRefresh && _isCacheValid(_paymentMethodsLastFetch) && paymentMethods.isNotEmpty) {
      print('Using cached payment methods data');
      return;
    }

    if (isLoadingPaymentMethods.value) {
      print('Payment methods already loading, waiting...');
      return;
    }

    try {
      isLoadingPaymentMethods.value = true;
      print('Fetching payment methods from API...');

      final fetchedMethods = await _paymentRepository.getAllPaymentMethods();
      paymentMethods.assignAll(fetchedMethods);
      _paymentMethodsLastFetch = DateTime.now();
      _saveToStorage(); // Save to storage after successful fetch

      print('Payment methods loaded: ${paymentMethods.length} items');
    } catch (e) {
      print('Error loading payment methods: $e');
      Get.snackbar('Error', 'Failed to load payment methods: $e');
    } finally {
      isLoadingPaymentMethods.value = false;
    }
  }

  /// Load safes with caching
  Future<void> loadSafes({bool forceRefresh = false}) async {
    if (!forceRefresh && _isCacheValid(_safesLastFetch) && safes.isNotEmpty) {
      print('Using cached safes data');
      return;
    }

    if (isLoadingSafes.value) {
      print('Safes already loading, waiting...');
      return;
    }

    try {
      isLoadingSafes.value = true;
      print('Fetching safes from API...');

      final String? userUuid = _authController.currentUser.value?.uuid;
      if (userUuid == null) {
        throw Exception('User UUID not available');
      }

      final fetchedSafes = await _paymentRepository.getAllSafes(userUuid);
      safes.assignAll(fetchedSafes);
      _safesLastFetch = DateTime.now();
      _saveToStorage(); // Save to storage after successful fetch

      print('Safes loaded: ${safes.length} items');
    } catch (e) {
      print('Error loading safes: $e');
      Get.snackbar('Error', 'Failed to load safes: $e');
    } finally {
      isLoadingSafes.value = false;
    }
  }

  /// Load warehouses with caching
  Future<void> loadWarehouses({bool forceRefresh = false}) async {
    if (!forceRefresh && _isCacheValid(_warehousesLastFetch) && myWarehouses.isNotEmpty && otherMainWarehouses.isNotEmpty) {
      print('Using cached warehouses data');
      return;
    }

    if (isLoadingWarehouses.value) {
      print('Warehouses already loading, waiting...');
      return;
    }

    try {
      isLoadingWarehouses.value = true;
      print('Fetching warehouses from API...');

      final String? userUuid = _authController.currentUser.value?.uuid;
      if (userUuid == null) {
        throw Exception('User UUID not available');
      }

      final fetchedWarehouses = await _warehouseRepository.getWarehouses(userUuid);
      myWarehouses.assignAll(fetchedWarehouses['my_warehouses'] ?? []);
      otherMainWarehouses.assignAll(fetchedWarehouses['other_main_warehouses'] ?? []);
      _warehousesLastFetch = DateTime.now();
      _saveToStorage(); // Save to storage after successful fetch

      print('Warehouses loaded: ${myWarehouses.length} my warehouses, ${otherMainWarehouses.length} other main warehouses');
    } catch (e) {
      print('Error loading warehouses: $e');
      Get.snackbar('Error', 'Failed to load warehouses: $e');
    } finally {
      isLoadingWarehouses.value = false;
    }
  }

  /// Load products with caching
  Future<void> loadProducts({bool forceRefresh = false}) async {
    if (!forceRefresh && _isCacheValid(_productsLastFetch) && products.isNotEmpty) {
      print('Using cached products data');
      return;
    }

    if (_productsLoadingFuture != null) {
      print('Products already loading, waiting...');
      try {
        // Add timeout to prevent infinite waiting (30 seconds for slow networks)
        await _productsLoadingFuture!.timeout(
          const Duration(seconds: 30),
          onTimeout: () {
            print('⏱️ Timeout waiting for products to load, proceeding anyway...');
            _productsLoadingFuture = null;
          },
        );
        if (!forceRefresh) return;
      } catch (e) {
        print('❌ Error waiting for products: $e');
        _productsLoadingFuture = null;
        // Continue with new load attempt
      }
    }

    Future<void> _runLoad() async {
      try {
        isLoadingProducts.value = true;
        print('Fetching products from API...');

        final fetchedProducts = await _productRepository.getAllProducts(forceRefresh: forceRefresh);
        products.assignAll(fetchedProducts);
        _productsLastFetch = DateTime.now();

        print('Products loaded: ${products.length} items');
      } catch (e) {
        print('Error loading products: $e');
        Get.snackbar('Error', 'Failed to load products: $e');
      } finally {
        isLoadingProducts.value = false;
      }
    }

    final future = _runLoad();
    _productsLoadingFuture = future;
    try {
      await future;
    } finally {
      _productsLoadingFuture = null;
    }
  }

  /// Load rep inventory with caching
  Future<void> loadRepInventory({bool forceRefresh = false}) async {
    if (!forceRefresh && _isCacheValid(_repInventoryLastFetch) && repInventory.isNotEmpty) {
      print('Using cached rep inventory data');
      return;
    }

    if (_repInventoryLoadingFuture != null) {
      print('Rep inventory already loading, waiting...');
      try {
        // Add timeout to prevent infinite waiting (30 seconds for slow networks)
        await _repInventoryLoadingFuture!.timeout(
          const Duration(seconds: 30),
          onTimeout: () {
            print('⏱️ Timeout waiting for rep inventory to load, proceeding anyway...');
            _repInventoryLoadingFuture = null;
          },
        );
        if (!forceRefresh) return;
      } catch (e) {
        print('❌ Error waiting for rep inventory: $e');
        _repInventoryLoadingFuture = null;
        // Continue with new load attempt
      }
    }

    Future<void> _runLoad() async {
      try {
        isLoadingRepInventory.value = true;
        print('Preparing representative warehouse inventory...');

        if (_authController.currentUser.value?.uuid == null) {
          throw Exception('User UUID not available');
        }

        if (myWarehouses.isEmpty) {
          await loadWarehouses(forceRefresh: forceRefresh);
        }

        if (myWarehouses.isEmpty) {
          print('No rep warehouses found');
          repInventory.clear();
          return;
        }

        final repWarehouse = myWarehouses.first;
        print('Building rep inventory for warehouse ${repWarehouse.warehouseName} (ID: ${repWarehouse.warehouseId})');

        // Load dependencies in parallel, but only if not already loaded/loading
        final futures = <Future<void>>[];

        // Only load products if not cached and not already loading
        if (products.isEmpty || forceRefresh) {
          futures.add(loadProducts(forceRefresh: forceRefresh));
        } else {
          print('Products already cached (${products.length} items), skipping load');
        }

        // Only load packaging types if not cached and not already loading
        if (packagingTypes.isEmpty || forceRefresh) {
          futures.add(loadPackagingTypes(forceRefresh: forceRefresh));
        } else {
          print('Packaging types already cached (${packagingTypes.length} items), skipping load');
        }

        if (futures.isNotEmpty) {
          await Future.wait(futures);
        }

        final List<inventory_models.InventoryItem> rawItems = await _inventoryRepository.getInventoryByWarehouse(repWarehouse.warehouseId, forceRefresh: forceRefresh);

        if (rawItems.isEmpty) {
          print('No inventory rows returned for warehouse ${repWarehouse.warehouseId}');
          repInventory.clear();
        } else {
          final variants = _buildWarehouseVariantsFromInventoryItems(rawItems);
          repInventory.assignAll(variants);
          print('Rep inventory rebuilt from ${rawItems.length} rows into ${variants.length} variants');
        }

        _repInventoryLastFetch = DateTime.now();
      } catch (e) {
        print('Error loading rep inventory: $e');
        Get.snackbar('Error', 'Failed to load rep inventory: $e');
      } finally {
        isLoadingRepInventory.value = false;
      }
    }

    final future = _runLoad();
    _repInventoryLoadingFuture = future;
    try {
      await future;
    } finally {
      _repInventoryLoadingFuture = null;
    }
  }

  List<WarehouseProductVariant> _buildWarehouseVariantsFromInventoryItems(List<inventory_models.InventoryItem> items) {
    if (items.isEmpty) {
      return <WarehouseProductVariant>[];
    }

    final Map<int, PackagingType> packagingTypesMap = {
      for (final packagingType in packagingTypes) packagingType.packagingTypesId: packagingType,
    };
    final Map<int, ProductVariant> variantLookup = {
      for (final productVariant in products) productVariant.variantId: productVariant,
    };

    final Map<int, List<inventory_models.InventoryItem>> groupedByVariant = groupBy(items, (inventory_models.InventoryItem item) => item.variantId);

    final List<WarehouseProductVariant> variants = <WarehouseProductVariant>[];

    groupedByVariant.forEach((variantId, variantItems) {
      if (variantItems.isEmpty) {
        return;
      }

      final ProductVariant? productVariant = variantLookup[variantId];
      final int productId = productVariant?.productsId ?? variantItems.first.productsId;
      final String productName = (productVariant?.productsName != null && productVariant!.productsName!.trim().isNotEmpty) ? productVariant.productsName!.trim() : 'Product #$productId';
      final String variantName = (productVariant?.variantName != null && productVariant!.variantName.trim().isNotEmpty) ? productVariant.variantName.trim() : productName;

      final Map<int, List<inventory_models.InventoryItem>> groupedByPackaging = groupBy(variantItems, (inventory_models.InventoryItem item) => item.packagingTypeId ?? -1);

      final List<AvailablePackaging> packagingList = <AvailablePackaging>[];
      double totalBaseUnits = 0;

      groupedByPackaging.forEach((packagingKey, packagingItems) {
        double totalQuantity = 0;
        final List<InventoryBatch> batches = <InventoryBatch>[];

        for (final inventoryItem in packagingItems) {
          final double quantity = double.tryParse(inventoryItem.inventoryQuantity) ?? 0;
          if (quantity <= 0) {
            continue;
          }

          totalQuantity += quantity;
          batches.add(
            InventoryBatch(
              inventoryId: inventoryItem.inventoryId,
              quantity: quantity,
              productionDate: inventoryItem.inventoryProductionDate?.toIso8601String(),
              status: inventoryItem.inventoryStatus,
            ),
          );
        }

        if (totalQuantity <= 0) {
          return;
        }

        final int? packagingTypeId = packagingKey > 0 ? packagingKey : null;
        final PackagingType? packagingType = packagingTypeId != null ? packagingTypesMap[packagingTypeId] : null;
        final double conversionFactor = _resolvePackagingConversionFactor(packagingType);
        totalBaseUnits += totalQuantity * conversionFactor;

        final String packagingName = _resolvePackagingName(
          packagingType: packagingType,
          packagingTypeId: packagingTypeId,
          variant: productVariant,
          fallback: productVariant?.baseUnitName,
        );

        packagingList.add(
          AvailablePackaging(
            packagingTypeId: packagingTypeId,
            packagingTypeName: packagingName,
            packagingFactor: conversionFactor,
            compatibleBaseUnitId: packagingType?.packagingTypesCompatibleBaseUnitId,
            totalQuantity: totalQuantity,
            inventoryBatches: batches,
          ),
        );
      });

      if (packagingList.isEmpty || totalBaseUnits <= 0) {
        return;
      }

      packagingList.sort((a, b) => b.totalQuantity.compareTo(a.totalQuantity));

      final double? variantUnitPrice = _parseNullableDouble(productVariant?.variantUnitPrice);
      final double? variantCostPrice = _parseNullableDouble(productVariant?.variantCostPrice);
      final double? variantWeight = _parseNullableDouble(productVariant?.variantWeight);
      final double? variantVolume = _parseNullableDouble(productVariant?.variantVolume);
      final bool variantHasTaxFlag = productVariant?.variantHasTax ?? ((productVariant?.variantTaxRate ?? 0) > 0);

      variants.add(
        WarehouseProductVariant(
          productsId: productId,
          productsName: productName,
          productsUnitOfMeasureId: productVariant?.productsUnitOfMeasureId ?? variantItems.first.productsUnitOfMeasureId,
          productsCategoryId: productVariant?.productsCategoryId,
          productsDescription: productVariant?.productsDescription,
          productsBrand: productVariant?.productsBrand,
          productsImageUrl: productVariant?.productsImageUrl,
          productsIsActive: productVariant?.variantStatus ?? 1,
          productsWeight: null,
          productsVolume: null,
          productsSupplierId: productVariant?.productsSupplierId,
          productsExpiryPeriodInDays: productVariant?.productsExpiryPeriodInDays,
          productsHasTax: variantHasTaxFlag ? 1 : 0,
          productsTaxRate: productVariant?.variantTaxRate,
          variantId: variantId,
          variantName: variantName,
          variantSku: productVariant?.variantSku,
          variantBarcode: productVariant?.variantBarcode,
          variantImageUrl: productVariant?.variantImageUrl ?? productVariant?.productsImageUrl,
          variantUnitPrice: variantUnitPrice,
          variantCostPrice: variantCostPrice,
          variantWeight: variantWeight,
          variantVolume: variantVolume,
          variantStatus: (productVariant?.variantStatus ?? 1).toString(),
          variantNotes: productVariant?.variantNotes,
          variantHasTax: variantHasTaxFlag ? 1 : 0,
          variantTaxRate: productVariant?.variantTaxRate,
          attributes: productVariant?.attributes.map((attr) => attr.toJson()).toList() ?? <Map<String, dynamic>>[],
          availablePackaging: packagingList,
          totalAvailableInBaseUnits: totalBaseUnits,
        ),
      );
    });

    variants.sort((a, b) {
      final String nameA = (a.variantName ?? a.productsName).toLowerCase();
      final String nameB = (b.variantName ?? b.productsName).toLowerCase();
      return nameA.compareTo(nameB);
    });

    return variants;
  }

  double _resolvePackagingConversionFactor(PackagingType? packagingType) {
    final double? parsed = _parseNullableDouble(packagingType?.packagingTypesDefaultConversionFactor);
    if (parsed == null || parsed <= 0) {
      return 1.0;
    }
    return parsed;
  }

  String _resolvePackagingName({
    required PackagingType? packagingType,
    ProductVariant? variant,
    String? fallback,
    int? packagingTypeId,
  }) {
    final List<String?> candidates = <String?>[
      packagingType?.packagingTypesName,
      packagingType?.compatibleBaseUnitName,
    ];

    if (variant != null && packagingTypeId != null) {
      final preferred = variant.preferredPackaging.firstWhereOrNull(
        (preferredPackaging) => preferredPackaging.packagingTypesId == packagingTypeId,
      );
      candidates.add(preferred?.packagingTypesName);
    }

    candidates
      ..add(fallback)
      ..add(variant?.baseUnitName);

    for (final candidate in candidates) {
      if (candidate != null && candidate.trim().isNotEmpty) {
        return candidate.trim();
      }
    }

    return 'Units';
  }

  double? _parseNullableDouble(dynamic value) {
    if (value == null) {
      return null;
    }
    if (value is double) {
      return value;
    }
    if (value is int) {
      return value.toDouble();
    }
    if (value is String) {
      final trimmed = value.trim();
      if (trimmed.isEmpty) {
        return null;
      }
      return double.tryParse(trimmed);
    }
    return double.tryParse(value.toString());
  }

  /// Load client metadata (area tags, industries, types) with caching
  Future<void> loadClientMetadata({bool forceRefresh = false}) async {
    final bool hasCached = clientAreaTags.isNotEmpty && clientIndustries.isNotEmpty && clientTypes.isNotEmpty;
    if (!forceRefresh && hasCached && _isCacheValid(_clientMetadataLastFetch)) {
      print('Using cached client metadata');
      return;
    }

    if (isLoadingClientMetadata.value) {
      print('Client metadata already loading, waiting...');
      return;
    }

    try {
      isLoadingClientMetadata.value = true;
      print('Fetching client metadata from API...');

      final tagsFuture = _clientRepository.getClientAreaTags(forceRefresh: forceRefresh);
      final industriesFuture = _clientRepository.getClientIndustries(forceRefresh: forceRefresh);
      final typesFuture = _clientRepository.getClientTypes(forceRefresh: forceRefresh);

      final tags = await tagsFuture;
      final industries = await industriesFuture;
      final types = await typesFuture;

      clientAreaTags.assignAll(tags);
      clientIndustries.assignAll(industries);
      clientTypes.assignAll(types);
      _clientMetadataLastFetch = DateTime.now();
      _saveToStorage();

      print('Client metadata loaded: tags=${clientAreaTags.length}, industries=${clientIndustries.length}, types=${clientTypes.length}');
    } catch (e) {
      print('Error loading client metadata: $e');
      Get.snackbar('Error', 'Failed to load client metadata: $e');
    } finally {
      isLoadingClientMetadata.value = false;
    }
  }

  /// Load countries with their governorates (for client forms) with caching
  Future<void> loadCountriesWithGovernorates({bool forceRefresh = false}) async {
    if (!forceRefresh && _isCacheValid(_countriesLastFetch) && countriesWithGovernorates.isNotEmpty) {
      print('Using cached countries with governorates');
      return;
    }

    if (isLoadingCountries.value) {
      print('Countries with governorates already loading, waiting...');
      return;
    }

    try {
      isLoadingCountries.value = true;
      print('Fetching countries with governorates from API...');

      final countries = await _locationRepository.getCountriesWithGovernorates(forceRefresh: forceRefresh);
      countriesWithGovernorates.assignAll(countries);
      _countriesLastFetch = DateTime.now();
      _saveToStorage();

      print('Countries with governorates loaded: ${countriesWithGovernorates.length} items');
    } catch (e) {
      print('Error loading countries with governorates: $e');
      Get.snackbar('Error', 'Failed to load countries: $e');
    } finally {
      isLoadingCountries.value = false;
    }
  }

  /// Load packaging types with caching
  Future<void> loadPackagingTypes({bool forceRefresh = false}) async {
    if (!forceRefresh && _isCacheValid(_packagingTypesLastFetch) && packagingTypes.isNotEmpty) {
      print('Using cached packaging types');
      return;
    }

    if (_packagingTypesLoadingFuture != null) {
      print('Packaging types already loading, waiting...');
      await _packagingTypesLoadingFuture;
      if (!forceRefresh) return;
    }

    Future<void> _runLoad() async {
      try {
        isLoadingPackagingTypes.value = true;
        print('Fetching packaging types from API...');

        final types = await _productRepository.getPackagingTypes(forceRefresh: forceRefresh);
        packagingTypes.assignAll(types);
        _packagingTypesLastFetch = DateTime.now();
        _saveToStorage();

        print('Packaging types loaded: ${packagingTypes.length} items');
      } catch (e) {
        print('Error loading packaging types: $e');
        Get.snackbar('Error', 'Failed to load packaging types: $e');
      } finally {
        isLoadingPackagingTypes.value = false;
      }
    }

    final future = _runLoad();
    _packagingTypesLoadingFuture = future;
    try {
      await future;
    } finally {
      _packagingTypesLoadingFuture = null;
    }
  }

  /// Load product categories with caching
  Future<void> loadProductCategories({bool forceRefresh = false}) async {
    if (!forceRefresh && _isCacheValid(_productCategoriesLastFetch) && productCategories.isNotEmpty) {
      print('Using cached product categories');
      return;
    }

    if (isLoadingProductCategories.value) {
      print('Product categories already loading, waiting...');
      return;
    }

    try {
      isLoadingProductCategories.value = true;
      print('Fetching product categories from API...');

      final categories = await _productRepository.getProductCategories(forceRefresh: forceRefresh);
      productCategories.assignAll(categories);
      _productCategoriesLastFetch = DateTime.now();
      _saveToStorage();

      print('Product categories loaded: ${productCategories.length} items');
    } catch (e) {
      print('Error loading product categories: $e');
      Get.snackbar('Error', 'Failed to load product categories: $e');
    } finally {
      isLoadingProductCategories.value = false;
    }
  }

  /// Check if cache is still valid
  bool _isCacheValid(DateTime? lastFetch) {
    if (lastFetch == null) return false;
    return DateTime.now().difference(lastFetch) < _cacheDuration;
  }

  /// Force refresh all data
  Future<void> refreshAllData() async {
    print('Force refreshing all global data...');
    await Future.wait([
      loadClients(forceRefresh: true),
      loadPaymentMethods(forceRefresh: true),
      loadSafes(forceRefresh: true),
      loadWarehouses(forceRefresh: true),
      loadProducts(forceRefresh: true),
      loadRepInventory(forceRefresh: true),
      loadClientMetadata(forceRefresh: true),
      loadCountriesWithGovernorates(forceRefresh: true),
      loadPackagingTypes(forceRefresh: true),
      loadProductCategories(forceRefresh: true),
    ]);
  }

  /// Ensure core data is loaded (uses cache if valid, fetches only missing/expired)
  Future<void> ensureCoreDataLoaded({
    bool includeSafes = true,
    bool includeRepInventory = true,
    bool includeClientMetadata = true,
    bool includeCountries = true,
    bool includePackagingTypes = true,
    bool includeProductCategories = true,
  }) async {
    print(
        'Ensuring core cached data loaded (no forced refresh)... includeSafes=$includeSafes includeRepInventory=$includeRepInventory includeClientMetadata=$includeClientMetadata includeCountries=$includeCountries includePackagingTypes=$includePackagingTypes includeProductCategories=$includeProductCategories');
    final futures = <Future<void>>[];
    futures.add(loadClients());
    futures.add(loadPaymentMethods());
    if (includeSafes) futures.add(loadSafes());
    futures.add(loadWarehouses());
    futures.add(loadProducts());
    if (includeRepInventory) futures.add(loadRepInventory());
    if (includeClientMetadata) futures.add(loadClientMetadata());
    if (includeCountries) futures.add(loadCountriesWithGovernorates());
    if (includePackagingTypes) futures.add(loadPackagingTypes());
    if (includeProductCategories) futures.add(loadProductCategories());
    await Future.wait(futures);
    print('Core data ensured.');
  }

  /// Clear all cached data
  void clearCache() {
    print('Clearing global data cache...');
    clients.clear();
    paymentMethods.clear();
    safes.clear();
    myWarehouses.clear();
    otherMainWarehouses.clear();
    products.clear();
    repInventory.clear();
    clientAreaTags.clear();
    clientIndustries.clear();
    clientTypes.clear();
    countriesWithGovernorates.clear();
    packagingTypes.clear();
    productCategories.clear();
    _clientsLastFetch = null;
    _paymentMethodsLastFetch = null;
    _safesLastFetch = null;
    _warehousesLastFetch = null;
    _productsLastFetch = null;
    _repInventoryLastFetch = null;
    _clientMetadataLastFetch = null;
    _countriesLastFetch = null;
    _packagingTypesLastFetch = null;
    _productCategoriesLastFetch = null;
  }

  /// Clear all cached data and remove persisted storage entries
  void clearAllUserData() {
    clearCache();

    final keysToRemove = [
      'cached_clients',
      'cached_payment_methods',
      'cached_safes',
      'cached_my_warehouses',
      'cached_other_warehouses',
      'cached_products',
      'cached_rep_inventory',
      'cached_client_area_tags',
      'cached_client_industries',
      'cached_client_types',
      'cached_countries_with_governorates',
      'cached_packaging_types',
      'cached_product_categories',
      'clients_last_fetch',
      'payment_methods_last_fetch',
      'safes_last_fetch',
      'warehouses_last_fetch',
      'products_last_fetch',
      'rep_inventory_last_fetch',
      'client_metadata_last_fetch',
      'countries_last_fetch',
      'packaging_types_last_fetch',
      'product_categories_last_fetch',
    ];

    for (final key in keysToRemove) {
      _storage.remove(key);
    }
  }

  /// Get client by ID
  Client? getClientById(int clientId) {
    try {
      return clients.firstWhere((client) => client.id == clientId);
    } catch (e) {
      return null;
    }
  }

  /// Get payment method by ID
  PaymentMethod? getPaymentMethodById(int methodId) {
    try {
      return paymentMethods.firstWhere((method) => method.id == methodId);
    } catch (e) {
      return null;
    }
  }

  /// Get safe by ID
  Safe? getSafeById(int safeId) {
    try {
      return safes.firstWhere((safe) => safe.id == safeId);
    } catch (e) {
      return null;
    }
  }

  @override
  void onClose() {
    clearCache();
    super.onClose();
  }
}
