// lib/modules/sales_orders/controllers/add_order_item_controller.dart
import 'package:get/get.dart';
import 'package:flutter/material.dart'; // For TextEditingController
import '/data/models/product_lookup.dart'; // Product, ProductVariant, PackagingType
import '/data/models/warehouse_product_variant.dart'; // NEW: Warehouse-aware products
import '/data/models/sales_order_item.dart';
import '/data/models/warehouse.dart'; // NEW: For warehouse info
import '/shared_widgets/ultra_safe_navigation.dart';
import '/modules/shared/controllers/global_data_controller.dart'; // For cached data
import '/core/utils/formatting.dart';

class AddOrderItemController extends GetxController {
  final GlobalDataController _globalDataController = Get.find<GlobalDataController>();

  AddOrderItemController();

  // Search and filter
  final RxString searchQuery = ''.obs;
  final RxBool isLoading = false.obs;
  final RxString errorMessage = ''.obs;

  // Warehouse context - NEW
  final Rx<Warehouse?> selectedWarehouse = Rx<Warehouse?>(null);
  final RxBool useWarehouseInventory = false.obs; // NEW: Toggle between all products and warehouse-specific
  final RxBool showAllProducts = false.obs; // NEW: When true show full catalog (no live availability)

  // Product data
  final RxList<ProductVariant> allProductVariants = <ProductVariant>[].obs;
  final RxList<ProductVariant> filteredProductVariants = <ProductVariant>[].obs;
  final RxList<WarehouseProductVariant> warehouseProductVariants = <WarehouseProductVariant>[].obs; // NEW: Warehouse-specific products
  final RxList<WarehouseProductVariant> filteredWarehouseProducts = <WarehouseProductVariant>[].obs; // NEW: Filtered warehouse products

  // Selected item details for adding to order
  final Rx<ProductVariant?> selectedVariant = Rx<ProductVariant?>(null);
  final Rx<WarehouseProductVariant?> selectedWarehouseVariant = Rx<WarehouseProductVariant?>(null);
  final Rx<PackagingType?> selectedPackagingType = Rx<PackagingType?>(null);
  final Rx<AvailablePackaging?> selectedWarehousePackaging = Rx<AvailablePackaging?>(null); // NEW: For warehouse packaging selection
  final RxBool hasTax = true.obs;
  final RxDouble calculatedTaxRate = 14.0.obs; // Default 14% VAT
  final RxBool showTaxSection = true.obs;
  final TextEditingController quantityController = TextEditingController();
  final TextEditingController unitPriceController = TextEditingController();
  final TextEditingController discountAmountController = TextEditingController(text: '0.00');
  final TextEditingController taxRateController = TextEditingController(text: '14.00');
  final TextEditingController notesController = TextEditingController();

  double _parseAmountOrZero(String value) => Formatting.parseAmount(value) ?? 0.0;
  double? _tryParseAmount(String value) => Formatting.parseAmount(value);

  // Reactive quantity for real-time UI updates
  final RxDouble reactiveQuantity = 0.0.obs;
  final RxDouble reactiveUnitPrice = 0.0.obs;
  final RxDouble reactiveDiscountPerPack = 0.0.obs;
  final RxDouble reactiveBaseUnitPrice = 0.0.obs;
  double? _persistedBaseUnitPrice;
  double? _persistedPackagingUnitPrice;

  // List to hold items added in this session
  final RxList<SalesOrderItem> itemsToAdd = <SalesOrderItem>[].obs;

  // --- Stepper State for New UI ---
  final RxInt currentStep = 0.obs; // 0: Variant, 1: Packaging & Qty, 2: Pricing & Tax, 3: Review
  int get totalSteps => 4;

  bool canProceedFromStep(int step) {
    switch (step) {
      case 0:
        if (showAllProducts.value) {
          return selectedVariant.value != null; // any catalog variant
        }
        if (useWarehouseInventory.value) {
          return selectedWarehouseVariant.value != null; // inventory mode
        }
        return selectedVariant.value != null; // fallback
      case 1:
        return selectedPackagingType.value != null && (double.tryParse(quantityController.text) ?? 0) > 0;
      case 2:
        final parsedUnitPrice = _tryParseAmount(unitPriceController.text);
        return (parsedUnitPrice ?? -1) >= 0;
      default:
        return true;
    }
  }

  void nextStep() {
    if (currentStep.value == totalSteps - 1) {
      // Final step -> Add or return item
      if (Get.arguments is SalesOrderItem) {
        final updated = buildOrderItem();
        if (updated != null) UltraSafeNavigation.back(Get.context, updated);
      } else {
        addItemToList();
        // Stay on review for multi-add so user can finish or add more
      }
      return;
    }
    if (!canProceedFromStep(currentStep.value)) {
      Get.snackbar('validation_error'.tr, 'validation_complete_current_step'.tr, snackPosition: SnackPosition.BOTTOM);
      return;
    }
    currentStep.value++;
  }

  void previousStep() {
    if (currentStep.value > 0) currentStep.value--;
  }

  // Live calculation helpers
  double get liveQuantity => reactiveQuantity.value;
  double get liveUnitPrice => reactiveUnitPrice.value;
  double get liveDiscountPerPack => reactiveDiscountPerPack.value;
  double get liveDiscountTotal => liveDiscountPerPack * liveQuantity;
  double get liveTaxRate => hasTax.value ? (double.tryParse(taxRateController.text) ?? 0.0) : 0.0;
  double get liveEffectiveUnitPrice => liveUnitPrice;
  double get liveSubtotal => liveQuantity * liveEffectiveUnitPrice;
  double get liveTotalBeforeTax => (liveSubtotal - liveDiscountTotal).clamp(0, double.infinity);
  double get liveTaxAmount => liveTotalBeforeTax * liveTaxRate / 100;
  double get liveTotal => liveTotalBeforeTax + liveTaxAmount;
  double? get liveBaseUnitPrice {
    if (reactiveBaseUnitPrice.value > 0) {
      return reactiveBaseUnitPrice.value;
    }
    final factor = selectedPackagingConversionFactor;
    if (factor != null && factor > 0) {
      if (liveUnitPrice <= 0) return null;
      return liveUnitPrice / factor;
    }
    return liveUnitPrice > 0 ? liveUnitPrice : null;
  }

  String get selectedItemDisplayName {
    if (!showAllProducts.value && useWarehouseInventory.value) {
      final warehouseVariant = selectedWarehouseVariant.value;
      if (warehouseVariant != null) {
        final variantName = warehouseVariant.variantName;
        if (variantName != null && variantName.trim().isNotEmpty) {
          return variantName;
        }
        return warehouseVariant.productsName;
      }
    }

    final variant = selectedVariant.value;
    if (variant != null) {
      final productName = variant.productsName;
      if (productName != null && productName.isNotEmpty && productName.trim() != variant.variantName.trim()) {
        return '$productName • ${variant.variantName}';
      }
      return variant.variantName;
    }

    return '--';
  }

  String? get selectedPackagingDisplayName {
    if (!showAllProducts.value && useWarehouseInventory.value) {
      return selectedWarehousePackaging.value?.packagingTypeName;
    }
    return selectedPackagingType.value?.packagingTypesName;
  }

  PackagingType? get resolvedSelectedPackagingType {
    final int? packagingId = selectedPackagingType.value?.packagingTypesId ?? selectedWarehousePackaging.value?.packagingTypeId;
    if (packagingId == null) {
      return selectedPackagingType.value;
    }
    final resolved = _lookupPackagingType(packagingId);
    return resolved ?? selectedPackagingType.value;
  }

  double? get selectedPackagingConversionFactor {
    final warehouseFactor = selectedWarehousePackaging.value?.packagingFactor;
    if (warehouseFactor != null && warehouseFactor > 0) {
      return warehouseFactor;
    }

    final packaging = resolvedSelectedPackagingType;
    if (packaging?.packagingTypesDefaultConversionFactor != null) {
      final parsed = double.tryParse(packaging!.packagingTypesDefaultConversionFactor!);
      if (parsed != null && parsed > 0) {
        return parsed;
      }
    }
    return null;
  }

  String get selectedBaseUnitName {
    final packaging = resolvedSelectedPackagingType;
    if (packaging?.compatibleBaseUnitName != null && packaging!.compatibleBaseUnitName!.trim().isNotEmpty) {
      return packaging.compatibleBaseUnitName!.trim();
    }

    final variant = selectedVariant.value;
    if (variant?.baseUnitName != null && variant!.baseUnitName!.trim().isNotEmpty) {
      return variant.baseUnitName!.trim();
    }

    return 'Units';
  }

  double? get totalQuantityInBaseUnits {
    final factor = selectedPackagingConversionFactor;
    if (factor == null) {
      return null;
    }
    return liveQuantity * factor;
  }

  // Method to update reactive quantity when text changes
  void onQuantityChanged(String value) {
    reactiveQuantity.value = double.tryParse(value) ?? 0.0;
  }

  void onUnitPriceChanged(String value) {
    final parsedValue = _parseAmountOrZero(value);
    reactiveUnitPrice.value = parsedValue;
    _updateBaseUnitPriceFromPackaging(parsedValue);
  }

  void onDiscountChanged(String value) {
    reactiveDiscountPerPack.value = _parseAmountOrZero(value);
  }

  @override
  void onInit() {
    super.onInit();

    // Initialize reactive quantity and set up listener
    reactiveQuantity.value = double.tryParse(quantityController.text) ?? 0.0;
    quantityController.addListener(() {
      reactiveQuantity.value = double.tryParse(quantityController.text) ?? 0.0;
    });
    reactiveUnitPrice.value = double.tryParse(unitPriceController.text) ?? 0.0;
    unitPriceController.addListener(() {
      reactiveUnitPrice.value = double.tryParse(unitPriceController.text) ?? 0.0;
      _updateBaseUnitPriceFromPackaging(reactiveUnitPrice.value);
    });
    reactiveDiscountPerPack.value = double.tryParse(discountAmountController.text) ?? 0.0;
    discountAmountController.addListener(() {
      reactiveDiscountPerPack.value = double.tryParse(discountAmountController.text) ?? 0.0;
    });
    reactiveBaseUnitPrice.value = _deriveBaseUnitPriceFromPackaging(reactiveUnitPrice.value);
    _rememberBaselinePrices(
      baseUnitPrice: reactiveBaseUnitPrice.value > 0 ? reactiveBaseUnitPrice.value : null,
      packagingUnitPrice: reactiveUnitPrice.value > 0 ? reactiveUnitPrice.value : null,
    );

    // Check if warehouse context is passed as argument
    final arguments = Get.arguments;
    print('AddOrderItemController - Arguments received: $arguments');

    if (arguments != null && arguments is Map) {
      print('Arguments is a Map with keys: ${arguments.keys}');
      if (arguments.containsKey('warehouse') && arguments['warehouse'] is Warehouse) {
        selectedWarehouse.value = arguments['warehouse'] as Warehouse;
        useWarehouseInventory.value = true;
        print('WAREHOUSE MODE: Using warehouse ${selectedWarehouse.value!.warehouseName} (ID: ${selectedWarehouse.value!.warehouseId})');
        // Ensure data is loaded before accessing it
        _ensureDataLoadedThenInit();
      } else {
        print('STANDARD MODE: No warehouse found in arguments, using cached representative warehouse...');
        _ensureDataLoadedThenInit();
      }
    } else {
      print('STANDARD MODE: No arguments, using cached representative warehouse...');
      _ensureDataLoadedThenInit();
    }

    // Listen for changes in search query to filter products
    debounce(searchQuery, (_) => _filterProducts(), time: const Duration(milliseconds: 500));

    // If an item is passed as argument, it means we are in edit mode for a single item
    if (Get.arguments != null && Get.arguments is SalesOrderItem) {
      final SalesOrderItem itemToEdit = Get.arguments as SalesOrderItem;
      // Populate fields for editing
      selectedVariant.value = allProductVariants.firstWhereOrNull((v) => v.variantId == itemToEdit.variantId);
      // Create a PackagingType object from itemToEdit.packagingType
      if (itemToEdit.packagingType != null) {
        selectedPackagingType.value = PackagingType(
          packagingTypesId: itemToEdit.packagingType!.packagingTypesId,
          packagingTypesName: itemToEdit.packagingType!.packagingTypesName,
        );
      } else {
        selectedPackagingType.value = null;
      }

      quantityController.text = itemToEdit.quantity.toStringAsFixed(2);
      reactiveQuantity.value = itemToEdit.quantity; // Initialize reactive quantity for editing
      unitPriceController.text = itemToEdit.unitPrice.toStringAsFixed(2);
      discountAmountController.text = itemToEdit.discountAmount.toStringAsFixed(2);
      final bool variantTaxable = selectedVariant.value?.variantHasTax != false;
      final double? variantTaxRate = selectedVariant.value?.variantTaxRate;
      _applyTaxSettings(isTaxable: variantTaxable, taxRate: variantTaxRate);

      // FIXED: Set tax state from existing item
      hasTax.value = itemToEdit.hasTax ?? variantTaxable;
      if (hasTax.value) {
        final double resolvedTaxRate = itemToEdit.taxRate ?? calculatedTaxRate.value;
        calculatedTaxRate.value = resolvedTaxRate;
        taxRateController.text = resolvedTaxRate.toStringAsFixed(2);
      } else {
        calculatedTaxRate.value = 14.0; // Keep default rate available
        taxRateController.text = '0.00';
      }

      notesController.text = itemToEdit.notes ?? '';
      // Add the item to itemsToAdd so it can be updated
      itemsToAdd.add(itemToEdit);
    }
  }

  // NEW: Ensure all data is loaded before initializing
  Future<void> _ensureDataLoadedThenInit() async {
    try {
      print('📦 Ensuring GlobalDataController has products loaded...');

      // Wait for core data - GlobalDataController has its own timeout protection
      await _globalDataController.ensureCoreDataLoaded(
        includeSafes: false,
        includeRepInventory: true,
      );

      // Double-check products are loaded, if not use fallback
      if (_globalDataController.products.isEmpty) {
        print('⚠️ Products still empty after ensureCoreDataLoaded, using direct fetch fallback...');
        // Don't use timeout here - let fetchProducts handle it
        await fetchProducts();
      } else {
        print('✅ Products ready: ${_globalDataController.products.length} items');
      }

      // Now proceed with initialization
      final arguments = Get.arguments;
      if (arguments != null && arguments is Map && arguments.containsKey('warehouse')) {
        _loadCachedWarehouseInventory();
      } else {
        _useCachedRepresentativeWarehouse();
      }
    } catch (e) {
      print('❌ Error ensuring data loaded: $e');
      errorMessage.value = 'Failed to load product data: $e';
      // Fallback to direct fetch
      fetchProducts();
    }
  }

  // NEW: Use cached representative's warehouse inventory without API fetching
  Future<void> _useCachedRepresentativeWarehouse() async {
    isLoading.value = true;
    errorMessage.value = '';
    try {
      print('REPRESENTATIVE WAREHOUSE: Using only cached warehouse data');

      // Ensure cached data is loaded
      await _globalDataController.ensureCoreDataLoaded(includeSafes: false, includeRepInventory: true);

      if (_globalDataController.myWarehouses.isNotEmpty) {
        // Use the first (usually only) representative warehouse
        selectedWarehouse.value = _globalDataController.myWarehouses.first;
        useWarehouseInventory.value = true;
        print('REPRESENTATIVE WAREHOUSE: Using cached warehouse ${selectedWarehouse.value!.warehouseName} (ID: ${selectedWarehouse.value!.warehouseId})');
        // Use cached inventory instead of API fetch
        _loadCachedWarehouseInventory();
      } else {
        print('REPRESENTATIVE WAREHOUSE: No warehouses found for this representative, using all products');
        fetchProducts(); // Fallback to all products
      }
    } catch (e) {
      errorMessage.value = 'Failed to load representative warehouse: ${e.toString()}';
      print('REPRESENTATIVE WAREHOUSE ERROR: ${errorMessage.value}');
      // Fallback to all products on error
      fetchProducts();
    } finally {
      isLoading.value = false;
    }
  }

  // (Removed old _fetchRepresentativeWarehouse method - using cached data only)

  // NEW: Load cached warehouse inventory instead of API call
  void _loadCachedWarehouseInventory() {
    print('WAREHOUSE INVENTORY: Using cached inventory data');
    // Use cached rep inventory from GlobalDataController
    if (_globalDataController.repInventory.isNotEmpty) {
      warehouseProductVariants.assignAll(_globalDataController.repInventory);
      print('WAREHOUSE INVENTORY: Loaded ${warehouseProductVariants.length} cached items');
    } else {
      // If no cached data, ensure it's loaded
      _globalDataController.loadRepInventory().then((_) {
        warehouseProductVariants.assignAll(_globalDataController.repInventory);
        print('WAREHOUSE INVENTORY: Loaded ${warehouseProductVariants.length} items after cache refresh');
      });
    }
    _filterProducts();
    print('WAREHOUSE INVENTORY: Using cached data (${warehouseProductVariants.length} items)');
  }

  @override
  void onClose() {
    quantityController.dispose();
    unitPriceController.dispose();
    discountAmountController.dispose();
    taxRateController.dispose();
    notesController.dispose();
    super.onClose();
  }

  Future<void> fetchProducts() async {
    print('PRODUCTS: Ensuring cached product data is loaded...');
    isLoading.value = true;
    errorMessage.value = '';
    try {
      // Ensure products are loaded from GlobalDataController
      if (_globalDataController.products.isEmpty) {
        print('⚠️ Products cache is empty, loading from GlobalDataController...');
        await _globalDataController.loadProducts();
      }

      // Verify we have products now
      if (_globalDataController.products.isEmpty) {
        print('❌ Still no products after loading! This might indicate a data loading issue.');
        throw Exception('No products available. Please try again or contact support.');
      }

      allProductVariants.assignAll(_globalDataController.products);
      _filterProducts(); // Apply initial filter/search

      print('✅ PRODUCTS SUCCESS: Using ${_globalDataController.products.length} cached products');

      // If in edit mode, ensure selected variant and packaging are set after products are loaded
      if (Get.arguments != null && Get.arguments is SalesOrderItem) {
        final SalesOrderItem itemToEdit = Get.arguments as SalesOrderItem;
        selectedVariant.value = allProductVariants.firstWhereOrNull((v) => v.variantId == itemToEdit.variantId);
        // Create a PackagingType object from preferredPackaging
        if (selectedVariant.value != null) {
          final preferredPackagingMatch = selectedVariant.value!.preferredPackaging.firstWhereOrNull((p) => p.packagingTypesId == itemToEdit.packagingTypeId);
          if (preferredPackagingMatch != null) {
            selectedPackagingType.value = PackagingType(
              packagingTypesId: preferredPackagingMatch.packagingTypesId,
              packagingTypesName: preferredPackagingMatch.packagingTypesName,
            );
          } else {
            selectedPackagingType.value = null;
          }
        } else {
          selectedPackagingType.value = null;
        }
      }
    } catch (e) {
      errorMessage.value = 'Failed to load products: ${e.toString()}';
      print('❌ AddOrderItemController Error: ${errorMessage.value}');
      Get.snackbar('error'.tr, 'products_load_failed'.tr, snackPosition: SnackPosition.BOTTOM, backgroundColor: Get.theme.colorScheme.error, colorText: Get.theme.colorScheme.onError);
    } finally {
      isLoading.value = false;
    }
  }

  // NOTE: This method now uses cached warehouse inventory instead of API calls
  Future<void> fetchWarehouseProducts(int warehouseId) async {
    print('WAREHOUSE INVENTORY: Using cached data for warehouse ID: $warehouseId');
    isLoading.value = true;
    errorMessage.value = '';
    try {
      // Use cached inventory data instead of API call
      _loadCachedWarehouseInventory();
      print('WAREHOUSE INVENTORY SUCCESS: Using cached inventory data');
    } catch (e) {
      errorMessage.value = 'Failed to load warehouse products: ${e.toString()}';
      print('WAREHOUSE INVENTORY ERROR: ${errorMessage.value}');
      Get.snackbar('error'.tr, 'warehouse_products_failed'.tr, snackPosition: SnackPosition.BOTTOM, backgroundColor: Get.theme.colorScheme.error, colorText: Get.theme.colorScheme.onError);
    } finally {
      isLoading.value = false;
    }
  }

  void _filterProducts() {
    if (!showAllProducts.value && useWarehouseInventory.value && selectedWarehouse.value != null) {
      // Filter warehouse products
      if (searchQuery.value.isEmpty) {
        filteredWarehouseProducts.assignAll(warehouseProductVariants);
      } else {
        filteredWarehouseProducts.assignAll(warehouseProductVariants.where((variant) {
          final query = searchQuery.value.toLowerCase();
          // Search by variant name or product name
          return (variant.variantName?.toLowerCase().contains(query) ?? false) || (variant.productsName.toLowerCase().contains(query));
        }).toList());
      }
    } else {
      // Filter regular products
      if (searchQuery.value.isEmpty) {
        filteredProductVariants.assignAll(allProductVariants);
      } else {
        filteredProductVariants.assignAll(allProductVariants.where((variant) {
          final query = searchQuery.value.toLowerCase();
          // Search by variant name or product name
          return (variant.variantName.toLowerCase().contains(query)) || (variant.productsName?.toLowerCase().contains(query) ?? false);
        }).toList());
      }
    }
  }

  // Public method to refresh filters immediately (used by UI toggle)
  void refreshFilters() => _filterProducts();

  // Toggle between in-stock (warehouse inventory) and full catalog
  Future<void> toggleShowAllProducts({bool? forceValue}) async {
    final targetValue = forceValue ?? !showAllProducts.value;
    showAllProducts.value = targetValue;

    if (targetValue) {
      useWarehouseInventory.value = false;
      if (allProductVariants.isEmpty) {
        await fetchProducts();
      }
      selectedWarehouseVariant.value = null;
      selectedWarehousePackaging.value = null;
    } else {
      if (_globalDataController.myWarehouses.isNotEmpty) {
        useWarehouseInventory.value = true;
        selectedWarehouse.value ??= _globalDataController.myWarehouses.first;
        if (warehouseProductVariants.isEmpty) {
          _loadCachedWarehouseInventory();
        }
      } else {
        useWarehouseInventory.value = false;
      }
      selectedWarehouseVariant.value = null;
      selectedWarehousePackaging.value = null;
    }

    selectedVariant.value = null;
    selectedPackagingType.value = null;
    quantityController.clear();
    reactiveQuantity.value = 0.0;
    currentStep.value = 0;
    _applyTaxSettings(isTaxable: true, taxRate: 14.0);
    unitPriceController.clear();
    reactiveUnitPrice.value = 0.0;
    reactiveBaseUnitPrice.value = 0.0;
    _resetBaselinePrices();
    _updatePackagingPriceFromBase(force: true);
    refreshFilters();
  }

  void onSearchChanged(String query) {
    searchQuery.value = query;
  }

  // Helper method to get compatible packaging types for a variant
  List<PackagingType> _getCompatiblePackagingTypes(ProductVariant variant) {
    // If variant has preferred packaging configured, use that
    if (variant.preferredPackaging.isNotEmpty) {
      return variant.preferredPackaging
          .map((p) => PackagingType(
                packagingTypesId: p.packagingTypesId,
                packagingTypesName: p.packagingTypesName,
              ))
          .toList();
    }

    // Otherwise, return all packaging types that match the variant's base unit
    final baseUnitId = variant.productsUnitOfMeasureId;
    if (baseUnitId == null) {
      print('⚠️ Variant has no base unit ID, cannot determine compatible packaging');
      return [];
    }

    final compatiblePackaging = _globalDataController.packagingTypes.where((pkg) => pkg.packagingTypesCompatibleBaseUnitId == baseUnitId).toList();

    if (compatiblePackaging.isEmpty) {
      print('⚠️ No packaging types found compatible with base unit ID: $baseUnitId');
    } else {
      print('✅ Found ${compatiblePackaging.length} compatible packaging types for base unit ID: $baseUnitId');
    }

    return compatiblePackaging;
  }

  void onVariantSelected(ProductVariant? variant) {
    selectedVariant.value = variant;
    _resetBaselinePrices();

    // Debug: Print variant tax and packaging information
    if (variant != null) {
      print('✅ Selected variant: ${variant.variantName}');
      print('📦 Variant has tax: ${variant.variantHasTax}');
      print('💰 Variant tax rate: ${variant.variantTaxRate}');
      print('📦 Preferred packaging count: ${variant.preferredPackaging.length}');
      if (variant.preferredPackaging.isEmpty) {
        print('⚠️ WARNING: No preferred packaging configured for this variant!');
        print('🔍 Base unit ID: ${variant.productsUnitOfMeasureId}');
        print('🔍 Searching for compatible packaging types...');
      } else {
        print('📦 Available packaging:');
        for (var pkg in variant.preferredPackaging) {
          print('   - ${pkg.packagingTypesName} (ID: ${pkg.packagingTypesId})');
        }
      }
    }

    final resolvedBaseUnitPrice = _resolveVariantBaseUnitPrice(catalogVariant: variant);
    reactiveBaseUnitPrice.value = resolvedBaseUnitPrice ?? 0.0;
    _rememberBaselinePrices(baseUnitPrice: resolvedBaseUnitPrice);

    // Get compatible packaging types (uses preferred or all compatible with base unit)
    if (variant != null) {
      final compatiblePackaging = _getCompatiblePackagingTypes(variant);

      if (compatiblePackaging.isNotEmpty) {
        // Select the first compatible packaging type by default
        final firstPackaging = compatiblePackaging.first;
        onPackagingTypeSelected(firstPackaging);

        print('✅ Auto-selected packaging: ${firstPackaging.packagingTypesName}');
      } else {
        print('❌ No compatible packaging types found for this variant');
        onPackagingTypeSelected(null);
      }
    } else {
      onPackagingTypeSelected(null);
    }

    _updatePackagingPriceFromBase(force: resolvedBaseUnitPrice != null && resolvedBaseUnitPrice > 0);

    // Set tax information from variant
    if (variant != null) {
      final bool isTaxable = variant.variantHasTax != false;
      final double? taxRate = variant.variantTaxRate;
      _applyTaxSettings(isTaxable: isTaxable, taxRate: taxRate);

      print('Final tax settings - Has Tax: $isTaxable, Tax Rate: ${taxRate ?? calculatedTaxRate.value}');
    } else {
      _applyTaxSettings(isTaxable: true, taxRate: 14.0);
      reactiveBaseUnitPrice.value = 0.0;
      unitPriceController.clear();
      reactiveUnitPrice.value = 0.0;
      _resetBaselinePrices();
    }
  }

  void onPackagingTypeSelected(PackagingType? packaging) {
    selectedPackagingType.value = packaging;
    _updatePackagingPriceFromBase();
  }

  // NEW: Handle warehouse packaging selection
  void onWarehousePackagingSelected(AvailablePackaging? packaging) {
    selectedWarehousePackaging.value = packaging;

    // Also update the regular packaging type for compatibility
    if (packaging != null) {
      final resolvedPackaging = _lookupPackagingType(packaging.packagingTypeId);
      selectedPackagingType.value = resolvedPackaging ??
          PackagingType(
            packagingTypesId: packaging.packagingTypeId ?? 0,
            packagingTypesName: packaging.packagingTypeName ?? 'unknown'.tr,
          );
    } else {
      selectedPackagingType.value = null;
    }

    _updatePackagingPriceFromBase();
  }

  // NEW: Handle warehouse variant selection
  void onWarehouseVariantSelected(WarehouseProductVariant? warehouseVariant) {
    selectedWarehouseVariant.value = warehouseVariant;
    _resetBaselinePrices();

    // Reset packaging selections when variant changes
    selectedWarehousePackaging.value = null;
    selectedPackagingType.value = null;

    if (warehouseVariant != null) {
      // Set unit price and tax information based on selected warehouse variant
      final resolvedBaseUnitPrice = _resolveVariantBaseUnitPrice(warehouseVariant: warehouseVariant);
      reactiveBaseUnitPrice.value = resolvedBaseUnitPrice ?? 0.0;
      _rememberBaselinePrices(baseUnitPrice: resolvedBaseUnitPrice);

      // Handle tax based on variant or product level
      _applyTaxSettings(isTaxable: warehouseVariant.hasTax, taxRate: warehouseVariant.taxRate);

      // Auto-select the first available packaging (prefer one with stock)
      AvailablePackaging? defaultPackaging;
      for (final packaging in warehouseVariant.availablePackaging) {
        defaultPackaging ??= packaging;
        if (packaging.totalQuantity > 0) {
          defaultPackaging = packaging;
          break;
        }
      }

      if (defaultPackaging != null) {
        onWarehousePackagingSelected(defaultPackaging);
      }

      _updatePackagingPriceFromBase(force: resolvedBaseUnitPrice != null && resolvedBaseUnitPrice > 0);
    } else {
      // Clear form when no variant selected
      unitPriceController.clear();
      _applyTaxSettings(isTaxable: true, taxRate: 14.0);
      reactiveBaseUnitPrice.value = 0.0;
      reactiveUnitPrice.value = 0.0;
      _resetBaselinePrices();
    }
  }

  bool validateItemForm({bool showSnackbars = true}) {
    // Variant selection validation depending on mode
    if (showAllProducts.value) {
      if (selectedVariant.value == null) {
        if (showSnackbars) {
          Get.snackbar('validation_error'.tr, 'validation_select_variant'.tr, snackPosition: SnackPosition.BOTTOM);
        }
        return false;
      }
    } else if (useWarehouseInventory.value) {
      if (selectedWarehouseVariant.value == null) {
        if (showSnackbars) {
          Get.snackbar('validation_error'.tr, 'validation_select_variant'.tr, snackPosition: SnackPosition.BOTTOM);
        }
        return false;
      }
    } else {
      if (selectedVariant.value == null) {
        if (showSnackbars) {
          Get.snackbar('validation_error'.tr, 'validation_select_variant'.tr, snackPosition: SnackPosition.BOTTOM);
        }
        return false;
      }
    }

    if (selectedPackagingType.value == null) {
      if (showSnackbars) {
        Get.snackbar('validation_error'.tr, 'validation_select_packaging_type'.tr, snackPosition: SnackPosition.BOTTOM);
      }
      return false;
    }
    final quantity = reactiveQuantity.value;
    if (quantity <= 0) {
      if (showSnackbars) {
        Get.snackbar('validation_error'.tr, 'validation_enter_quantity'.tr, snackPosition: SnackPosition.BOTTOM);
      }
      return false;
    }

    // Check quantity limits for warehouse inventory
    if (!showAllProducts.value && useWarehouseInventory.value && selectedWarehousePackaging.value != null) {
      final availableQuantity = selectedWarehousePackaging.value!.totalQuantity;
      if (quantity > availableQuantity) {
        // Don't return false here anymore - let the UI handle the dialog
        // This will be handled by doesQuantityExceedAvailable() method
        // and showPriceQuoteDialog() in the screen
      }
    }
    final unitPrice = double.tryParse(unitPriceController.text);
    if (unitPrice == null || unitPrice < 0) {
      if (showSnackbars) {
        Get.snackbar('validation_error'.tr, 'validation_enter_unit_price'.tr, snackPosition: SnackPosition.BOTTOM);
      }
      return false;
    }
    // Discount can be null/empty, will default to 0.00
    final discountPerPack = liveDiscountPerPack;
    if (discountPerPack < 0) {
      if (showSnackbars) {
        Get.snackbar('validation_error'.tr, 'validation_discount_negative'.tr, snackPosition: SnackPosition.BOTTOM);
      }
      return false;
    }
    return true;
  }

  // This method builds and returns a single SalesOrderItem
  SalesOrderItem? buildOrderItem() {
    if (!validateItemForm()) {
      return null;
    }

    final quantity = liveQuantity;
    final unitPrice = liveEffectiveUnitPrice;
    final discountTotal = liveDiscountTotal;

    final subtotal = liveSubtotal;

    // Calculate tax
    final taxRate = liveTaxRate;
    final taxAmount = hasTax.value ? liveTaxAmount : 0.0;
    final totalAmount = liveTotal;

    // Build item using warehouse variant or regular variant
    if (useWarehouseInventory.value && selectedWarehouseVariant.value != null) {
      final warehouseVariant = selectedWarehouseVariant.value!;
      return SalesOrderItem(
        salesOrderItemId: 0, // Will be set by API on save
        salesOrderId: 0, // Will be set by API on save
        variantId: warehouseVariant.variantId,
        packagingTypeId: selectedPackagingType.value!.packagingTypesId,
        quantity: quantity,
        unitPrice: unitPrice,
        subtotal: subtotal,
        discountAmount: discountTotal,
        totalAmount: totalAmount,
        taxAmount: taxAmount,
        taxRate: taxRate,
        hasTax: hasTax.value,
        notes: notesController.text.trim().isEmpty ? null : notesController.text.trim(),
        variantName: warehouseVariant.variantName,
        packagingTypeName: selectedPackagingType.value!.packagingTypesName,
        productVariant: null, // Not available for warehouse variants
        packagingType: selectedPackagingType.value,
        isFromRepInventory: true, // Mark as from rep inventory
        originalUnitPrice: warehouseVariant.variantUnitPrice,
        originalTaxRate: warehouseVariant.taxRate,
      );
    } else if (selectedVariant.value != null) {
      // Check if this variant exists in rep inventory (even when selected from "all products")
      final existsInRepInventory = _globalDataController.repInventory.any((inv) => inv.variantId == selectedVariant.value!.variantId);

      return SalesOrderItem(
        salesOrderItemId: 0, // Will be set by API on save
        salesOrderId: 0, // Will be set by API on save
        variantId: selectedVariant.value!.variantId,
        packagingTypeId: selectedPackagingType.value!.packagingTypesId,
        quantity: quantity,
        unitPrice: unitPrice,
        subtotal: subtotal,
        discountAmount: discountTotal,
        totalAmount: totalAmount,
        taxAmount: taxAmount,
        taxRate: taxRate,
        hasTax: hasTax.value,
        notes: notesController.text.trim().isEmpty ? null : notesController.text.trim(),
        variantName: selectedVariant.value!.variantName,
        packagingTypeName: selectedPackagingType.value!.packagingTypesName,
        productVariant: selectedVariant.value,
        packagingType: selectedPackagingType.value,
        isFromRepInventory: existsInRepInventory, // Mark as from rep inventory if it exists there
        originalUnitPrice: selectedVariant.value!.variantUnitPrice != null ? double.tryParse(selectedVariant.value!.variantUnitPrice!) : null,
        originalTaxRate: selectedVariant.value!.variantTaxRate,
      );
    }

    return null;
  }

  // This method adds the current item to the internal list and clears the form
  void addItemToList() {
    final item = buildOrderItem(); // Use the existing buildOrderItem logic
    if (item != null) {
      // Check if this product variant + packaging combination already exists
      final isDuplicate = itemsToAdd.any((existingItem) {
        final sameVariant = existingItem.variantId == item.variantId;
        final samePackaging = existingItem.packagingTypeId == item.packagingTypeId;
        return sameVariant && samePackaging;
      });

      if (isDuplicate) {
        Get.snackbar(
          'warning'.tr,
          'item_already_added_to_order'.tr,
          snackPosition: SnackPosition.BOTTOM,
          backgroundColor: Colors.orange,
          colorText: Colors.white,
          duration: const Duration(seconds: 3),
        );
        return;
      }

      itemsToAdd.add(item);
      clearForm(); // Clear form for next item
      Get.snackbar('success'.tr, 'item_added_to_list'.tr, snackPosition: SnackPosition.BOTTOM);
    }
  }

  // Helper method to get maximum available quantity
  double? get maxAvailableQuantity {
    if (useWarehouseInventory.value && selectedWarehousePackaging.value != null) {
      return selectedWarehousePackaging.value!.totalQuantity;
    }
    return null; // No limit for non-warehouse items
  }

  // Helper method to check if a quantity exceeds available stock
  bool isQuantityAvailable(double quantity) {
    final maxQuantity = maxAvailableQuantity;
    return maxQuantity == null || quantity <= maxQuantity;
  }

  // Method to show price quote dialog when quantity exceeds available
  Future<bool> showPriceQuoteDialog(BuildContext context) async {
    final result = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext context) {
        return AlertDialog(
          title: Text('quantity_exceeds_available'.tr),
          content: Text('price_quote_option'.tr),
          actions: <Widget>[
            TextButton(
              onPressed: () => Navigator.of(context).pop(false), // Cancel
              child: Text('keep_warehouse_inventory'.tr),
            ),
            TextButton(
              onPressed: () => Navigator.of(context).pop(true), // Switch to all products
              child: Text('switch_to_all_products'.tr),
            ),
          ],
        );
      },
    );
    return result ?? false;
  }

  // Method to check if quantity exceeds available stock (without showing snackbar)
  bool doesQuantityExceedAvailable() {
    // On variant step (step 0), only check if variant is selected
    if (currentStep.value == 0) {
      final inWarehouseMode = !showAllProducts.value && useWarehouseInventory.value;
      if (inWarehouseMode) {
        return selectedWarehouseVariant.value == null; // Disable if no warehouse variant selected
      } else {
        return selectedVariant.value == null; // Disable if no variant selected
      }
    }

    // On pack_qty step (step 1) and beyond, check packaging selection
    final inWarehouseMode = !showAllProducts.value && useWarehouseInventory.value;
    final hasPackagingSelected = inWarehouseMode ? selectedWarehousePackaging.value != null : selectedPackagingType.value != null;

    if (!hasPackagingSelected) {
      return true; // Disable next button if no packaging selected
    }

    // Only check quantity limits if we're in warehouse mode and have packaging selected
    if (showAllProducts.value || !useWarehouseInventory.value || selectedWarehousePackaging.value == null) {
      return false;
    }
    final quantity = reactiveQuantity.value;
    if (quantity <= 0) {
      return false;
    }
    final availableQuantity = selectedWarehousePackaging.value!.totalQuantity;
    return quantity > availableQuantity;
  }

  // Method to get the available quantity for display
  double? getAvailableQuantity() {
    if (showAllProducts.value || !useWarehouseInventory.value || selectedWarehousePackaging.value == null) {
      return null;
    }
    return selectedWarehousePackaging.value!.totalQuantity;
  }

  // Method to handle quantity exceeding available stock
  Future<void> handleQuantityExceeded(BuildContext context) async {
    await toggleShowAllProducts(forceValue: true);
    selectedWarehouse.value = null;
    Get.snackbar('success'.tr, 'switched_to_all_products_message'.tr, snackPosition: SnackPosition.BOTTOM, backgroundColor: Colors.green, colorText: Colors.white);
  }

  PackagingType? _lookupPackagingType(int? packagingId) {
    if (packagingId == null) {
      return null;
    }
    for (final packaging in _globalDataController.packagingTypes) {
      if (packaging.packagingTypesId == packagingId) {
        return packaging;
      }
    }
    return null;
  }

  void _applyTaxSettings({required bool isTaxable, double? taxRate, bool updateControllers = true}) {
    // FIXED: Always show tax section to allow user to enable tax even for non-taxable products
    showTaxSection.value = true;

    // Set initial tax state based on product's tax configuration
    hasTax.value = isTaxable;

    if (!updateControllers) {
      return;
    }

    if (!isTaxable) {
      // Product doesn't have tax by default, but user can still enable it
      calculatedTaxRate.value = 14.0; // Keep default rate available
      taxRateController.text = '0.00'; // Show 0 initially
    } else {
      // Product has tax - apply the rate
      final fallbackRate = calculatedTaxRate.value > 0 ? calculatedTaxRate.value : 14.0;
      final resolvedRate = (taxRate != null && taxRate > 0) ? taxRate : fallbackRate;
      calculatedTaxRate.value = resolvedRate;
      taxRateController.text = resolvedRate.toStringAsFixed(2);
    }
  }

  double? _resolveVariantBaseUnitPrice({ProductVariant? catalogVariant, WarehouseProductVariant? warehouseVariant}) {
    final int? variantId = warehouseVariant?.variantId ?? catalogVariant?.variantId;

    final double? warehousePrice = warehouseVariant?.variantUnitPrice;
    if (warehousePrice != null && warehousePrice > 0) {
      return warehousePrice;
    }

    final String? catalogPriceString = catalogVariant?.variantUnitPrice;
    if (catalogPriceString != null && catalogPriceString.trim().isNotEmpty) {
      final parsed = double.tryParse(catalogPriceString.trim());
      if (parsed != null && parsed > 0) {
        return parsed;
      }
    }

    if (variantId != null) {
      final warehouseFallback = _globalDataController.repInventory.firstWhereOrNull((v) => v.variantId == variantId);
      final double? repPrice = warehouseFallback?.variantUnitPrice;
      if (repPrice != null && repPrice > 0) {
        return repPrice;
      }

      final catalogFallback = _globalDataController.products.firstWhereOrNull((v) => v.variantId == variantId);
      final String? fallbackPriceString = catalogFallback?.variantUnitPrice;
      if (fallbackPriceString != null && fallbackPriceString.trim().isNotEmpty) {
        final parsed = double.tryParse(fallbackPriceString.trim());
        if (parsed != null && parsed > 0) {
          return parsed;
        }
      }
    }

    return _persistedBaseUnitPrice;
  }

  void _rememberBaselinePrices({double? baseUnitPrice, double? packagingUnitPrice}) {
    if (baseUnitPrice != null && baseUnitPrice > 0) {
      _persistedBaseUnitPrice = baseUnitPrice;
    }
    if (packagingUnitPrice != null && packagingUnitPrice > 0) {
      _persistedPackagingUnitPrice = packagingUnitPrice;
    }
  }

  void _resetBaselinePrices() {
    _persistedBaseUnitPrice = null;
    _persistedPackagingUnitPrice = null;
  }

  void clearForm() {
    selectedVariant.value = null;
    selectedWarehouseVariant.value = null;
    selectedPackagingType.value = null;
    selectedWarehousePackaging.value = null;
    quantityController.clear();
    reactiveQuantity.value = 0.0;
    unitPriceController.clear();
    discountAmountController.text = '0.00';
    _applyTaxSettings(isTaxable: true, taxRate: 14.0);
    notesController.clear();
    reactiveUnitPrice.value = 0.0;
    reactiveBaseUnitPrice.value = 0.0;
    _resetBaselinePrices();
  }

  void _updatePackagingPriceFromBase({bool force = false}) {
    final basePrice = reactiveBaseUnitPrice.value > 0 ? reactiveBaseUnitPrice.value : (_persistedBaseUnitPrice ?? 0.0);
    if (basePrice <= 0) {
      final fallbackPackaging = _persistedPackagingUnitPrice;
      if (fallbackPackaging != null && fallbackPackaging > 0) {
        final formattedFallback = fallbackPackaging.toStringAsFixed(2);
        if (unitPriceController.text != formattedFallback) {
          unitPriceController.text = formattedFallback;
        } else {
          reactiveUnitPrice.value = fallbackPackaging;
        }
        return;
      }
      if (force) {
        unitPriceController.text = '0.00';
        reactiveUnitPrice.value = 0.0;
      }
      return;
    }

    final factor = selectedPackagingConversionFactor;
    final packagingPrice = factor != null && factor > 0 ? basePrice * factor : basePrice;
    final formatted = packagingPrice.toStringAsFixed(2);
    if (unitPriceController.text != formatted) {
      unitPriceController.text = formatted;
    } else {
      reactiveUnitPrice.value = packagingPrice;
    }
    _rememberBaselinePrices(baseUnitPrice: basePrice, packagingUnitPrice: packagingPrice);
  }

  void _updateBaseUnitPriceFromPackaging(double packagingPrice) {
    if (packagingPrice <= 0) {
      return;
    }
    final factor = selectedPackagingConversionFactor;
    final basePrice = factor != null && factor > 0 ? packagingPrice / factor : packagingPrice;
    reactiveBaseUnitPrice.value = basePrice;
    _rememberBaselinePrices(baseUnitPrice: basePrice, packagingUnitPrice: packagingPrice);
  }

  double _deriveBaseUnitPriceFromPackaging(double packagingPrice) {
    final factor = selectedPackagingConversionFactor;
    if (factor != null && factor > 0 && packagingPrice > 0) {
      return packagingPrice / factor;
    }
    return packagingPrice;
  }
}
