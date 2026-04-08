// lib/modules/transfers/controllers/create_transfer_controller.dart
// Removed unused imports (dart:convert, ultra_safe_navigation)

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '/shared_widgets/app_notifier.dart';
import '/shared_widgets/ultra_safe_navigation.dart';
import '/data/models/inventory_item.dart';
import '/data/models/product_lookup.dart';
import '/data/models/warehouse.dart';
import '/data/models/warehouse_product_variant.dart' as warehouse_models;
import '/data/repositories/inventory_repository.dart';
import '/data/repositories/product_repository.dart';
import '/data/repositories/transfers_repository.dart';
import '/modules/auth/controllers/auth_controller.dart';
import '/modules/shared/controllers/global_data_controller.dart';
import 'package:collection/collection.dart'; // Import for groupBy

// Represents an item added to the transfer request list (the "cart")
class TransferCartItem {
  final int inventoryId;
  final int? variantId; // Added to identify variant for request items and convenience
  final int? packagingTypeId; // For request-mode duplicate detection
  final String productName;
  final String variantName;
  final String packagingTypeName;
  final DateTime? productionDate;
  final RxInt quantity;
  final double maxQuantity; // The available quantity for this batch
  final String? productImageUrl; // Added for image display in cart
  final String? variantImageUrl; // Added for image display in cart
  final TextEditingController quantityController; // Added TextEditingController

  TransferCartItem({
    required this.inventoryId,
    this.variantId,
    this.packagingTypeId,
    required this.productName,
    required this.variantName,
    required this.packagingTypeName,
    this.productionDate,
    required this.quantity,
    required this.maxQuantity,
    this.productImageUrl,
    this.variantImageUrl,
    required this.quantityController, // Added to constructor
  });

  // Dispose of the controller when the item is no longer needed
  void dispose() {
    quantityController.dispose();
  }
}

// New data structure to hold grouped variants directly for display
class DisplayVariant {
  // Now uses ProductVariant directly as it contains product-level info
  final ProductVariant productVariant;
  final List<InventoryBatch> batches;

  DisplayVariant({
    required this.productVariant, // Changed to productVariant
    required this.batches,
  });
}

class CreateTransferController extends GetxController {
  final ProductRepository _productRepository;
  final TransfersRepository _transfersRepository;
  final InventoryRepository _inventoryRepository;
  final AuthController _authController = Get.find<AuthController>();
  final GlobalDataController _globalDataController = GlobalDataController.instance;

  late final Warehouse fromWarehouse;
  late final Warehouse toWarehouse;
  late final bool isRequesting;

  final RxList<DisplayVariant> _fullVariantList = <DisplayVariant>[].obs;
  final RxList<TransferCartItem> transferItems = <TransferCartItem>[].obs;
  final RxList<ProductCategory> categories = <ProductCategory>[].obs;
  // Request mode sources (variants and packaging)
  final RxList<ProductVariant> requestVariants = <ProductVariant>[].obs;
  final RxList<PackagingType> allPackagingTypes = <PackagingType>[].obs;

  final isLoading = true.obs;
  final isSubmitting = false.obs;
  final errorMessage = ''.obs;
  final TextEditingController requestNoteController = TextEditingController();

  // State for Search and Filter
  final TextEditingController searchController = TextEditingController();
  final RxString searchQuery = ''.obs;
  final Rx<int?> selectedCategoryId = Rx<int?>(null);

  // A computed property that filters the inventory based on search and category
  List<DisplayVariant> get filteredInventory {
    List<DisplayVariant> filtered = _fullVariantList;

    // Apply category filter
    if (selectedCategoryId.value != null) {
      // Access productsCategoryId from productVariant
      filtered = filtered.where((dv) => dv.productVariant.productsCategoryId == selectedCategoryId.value).toList();
    }

    // Apply search filter
    if (searchQuery.value.isNotEmpty) {
      final lowerCaseQuery = searchQuery.value.toLowerCase();
      filtered = filtered.where((dv) {
        // Check product name or variant name from productVariant
        return dv.productVariant.variantName.toLowerCase().contains(lowerCaseQuery) || dv.productVariant.variantName.toLowerCase().contains(lowerCaseQuery);
      }).toList();
    }

    return filtered;
  }

  CreateTransferController({
    required ProductRepository productRepository,
    required TransfersRepository transfersRepository,
    required InventoryRepository inventoryRepository,
  })  : _productRepository = productRepository,
        _transfersRepository = transfersRepository,
        _inventoryRepository = inventoryRepository;

  @override
  void onInit() {
    super.onInit();
    fromWarehouse = Get.arguments['from'];
    toWarehouse = Get.arguments['to'];
    isRequesting = Get.arguments['isRequesting'];
    _fetchSourceWarehouseInventory();

    ever(transferItems, (_) {});
  }

  @override
  void onClose() {
    searchController.dispose();
    requestNoteController.dispose();
    for (var item in transferItems) {
      item.dispose();
    }
    super.onClose();
  }

  Future<void> _fetchSourceWarehouseInventory() async {
    isLoading.value = true;
    errorMessage.value = '';
    try {
      final inventoryFuture = _inventoryRepository.getInventoryByWarehouse(fromWarehouse.warehouseId);
      final productsFuture = _loadProductVariantsForRequest();
      final packagingFuture = _loadPackagingTypesForRequest();
      final categoriesFuture = _loadProductCategoriesForRequest();
      final warehouseVariantsFuture = _productRepository.getAvailableProductsInWarehouse(fromWarehouse.warehouseId);

      final inventoryItems = await inventoryFuture;
      final allProductVariants = await productsFuture;
      final fetchedPackagingTypes = await packagingFuture;
      final allCategories = await categoriesFuture;
      final warehouseVariants = await warehouseVariantsFuture;

      categories.assignAll(allCategories);
      // Keep sources for request mode
      requestVariants.assignAll(allProductVariants);
      allPackagingTypes.assignAll(fetchedPackagingTypes);

      _processAndGroupInventory(inventoryItems, allProductVariants, warehouseVariants, fetchedPackagingTypes); // Pass ProductVariant list
    } catch (e) {
      errorMessage.value = 'Failed to load source inventory: ${e.toString()}';
    } finally {
      isLoading.value = false;
    }
  }

  Future<List<ProductVariant>> _loadProductVariantsForRequest({bool forceRefresh = false}) async {
    if (!forceRefresh && _globalDataController.products.isNotEmpty) {
      return List<ProductVariant>.from(_globalDataController.products);
    }

    await _globalDataController.loadProducts(forceRefresh: forceRefresh);
    if (_globalDataController.products.isNotEmpty) {
      return List<ProductVariant>.from(_globalDataController.products);
    }

    final variants = await _productRepository.getAllProducts(forceRefresh: forceRefresh);
    try {
      _globalDataController.products.assignAll(variants);
    } catch (_) {}
    return variants;
  }

  Future<List<PackagingType>> _loadPackagingTypesForRequest({bool forceRefresh = false}) async {
    if (!forceRefresh && _globalDataController.packagingTypes.isNotEmpty) {
      return List<PackagingType>.from(_globalDataController.packagingTypes);
    }

    await _globalDataController.loadPackagingTypes(forceRefresh: forceRefresh);
    if (_globalDataController.packagingTypes.isNotEmpty) {
      return List<PackagingType>.from(_globalDataController.packagingTypes);
    }

    final types = await _productRepository.getPackagingTypes(forceRefresh: forceRefresh);
    try {
      _globalDataController.packagingTypes.assignAll(types);
    } catch (_) {}
    return types;
  }

  Future<List<ProductCategory>> _loadProductCategoriesForRequest({bool forceRefresh = false}) async {
    if (!forceRefresh && _globalDataController.productCategories.isNotEmpty) {
      return List<ProductCategory>.from(_globalDataController.productCategories);
    }

    await _globalDataController.loadProductCategories(forceRefresh: forceRefresh);
    if (_globalDataController.productCategories.isNotEmpty) {
      return List<ProductCategory>.from(_globalDataController.productCategories);
    }

    final categories = await _productRepository.getProductCategories(forceRefresh: forceRefresh);
    try {
      _globalDataController.productCategories.assignAll(categories);
    } catch (_) {}
    return categories;
  }

  DateTime? _parseBatchDate(String? raw) {
    if (raw == null || raw.trim().isEmpty) {
      return null;
    }
    try {
      return DateTime.parse(raw);
    } catch (_) {
      return null;
    }
  }

  String _formatQuantity(double value) {
    if (value == value.roundToDouble()) {
      return value.toStringAsFixed(0);
    }
    if (value < 1) {
      return value.toStringAsFixed(2);
    }
    return value.toStringAsFixed(1);
  }

  ProductVariant _buildPlaceholderVariant(int variantId, InventoryItem source) {
    return ProductVariant(
      productsId: source.productsId,
      productsName: 'Product #${source.productsId}',
      productsUnitOfMeasureId: source.productsUnitOfMeasureId,
      variantId: variantId,
      variantName: 'Variant #$variantId',
      preferredPackaging: const [],
      attributes: const [],
    );
  }

  String _resolvePackagingName(
    warehouse_models.AvailablePackaging packaging,
    Map<int, PackagingType> packagingTypesMap,
  ) {
    if (packaging.packagingTypeName != null && packaging.packagingTypeName!.trim().isNotEmpty) {
      return packaging.packagingTypeName!;
    }
    final packagingTypeId = packaging.packagingTypeId;
    if (packagingTypeId != null) {
      final resolved = packagingTypesMap[packagingTypeId]?.packagingTypesName;
      if (resolved != null && resolved.trim().isNotEmpty) {
        return resolved;
      }
    }
    return 'Unknown';
  }

  void _processAndGroupInventory(
    List<InventoryItem> items,
    List<ProductVariant> productVariants,
    List<warehouse_models.WarehouseProductVariant> warehouseVariants,
    List<PackagingType> packagingTypes,
  ) {
    final packagingTypesMap = {for (var pt in packagingTypes) pt.packagingTypesId: pt};
    final Map<int, ProductVariant> resolvedVariants = {
      for (final variant in productVariants) variant.variantId: variant,
    };

    final List<DisplayVariant> result = [];

    // For mobile warehouses or when warehouseVariants is incomplete,
    // use raw inventory items as primary source
    final isMobileWarehouse = fromWarehouse.warehouseType == 'mobile' || fromWarehouse.warehouseType == 'Mobile' || fromWarehouse.warehouseName.contains('عربية') || fromWarehouse.warehouseName.toLowerCase().contains('ahmed');

    final useRawInventory = isMobileWarehouse || warehouseVariants.isEmpty || items.length > warehouseVariants.length;

    if (useRawInventory && items.isNotEmpty) {
      // Use raw inventory items grouped by variant
      final itemsByVariant = groupBy(items, (item) => item.variantId);

      itemsByVariant.forEach((variantId, variantItems) {
        if (variantItems.isEmpty) {
          return;
        }

        final productVariant = resolvedVariants[variantId] ?? _buildPlaceholderVariant(variantId, variantItems.first);
        final batches = variantItems
            .map(
              (item) => InventoryBatch(
                inventoryId: item.inventoryId,
                packagingTypeName: packagingTypesMap[item.packagingTypeId]?.packagingTypesName ?? 'Unknown',
                productionDate: item.inventoryProductionDate,
                quantity: item.inventoryQuantity,
              ),
            )
            .toList();

        if (batches.isNotEmpty) {
          result.add(DisplayVariant(productVariant: productVariant, batches: batches));
        }
      });
    } else {
      // Use warehouse variants for regular warehouses
      for (final warehouseVariant in warehouseVariants) {
        final baseUnitName = resolvedVariants[warehouseVariant.variantId]?.baseUnitName;
        final productVariant = warehouseVariant.toProductVariant(baseUnitName: baseUnitName);
        resolvedVariants[warehouseVariant.variantId] = productVariant;

        final List<InventoryBatch> batches = [];

        for (final availablePackaging in warehouseVariant.availablePackaging) {
          if (availablePackaging.inventoryBatches.isEmpty) {
            continue;
          }

          final packagingName = _resolvePackagingName(availablePackaging, packagingTypesMap);

          for (final batch in availablePackaging.inventoryBatches) {
            if (batch.quantity <= 0) {
              continue;
            }

            batches.add(
              InventoryBatch(
                inventoryId: batch.inventoryId,
                packagingTypeName: packagingName,
                productionDate: _parseBatchDate(batch.productionDate),
                quantity: _formatQuantity(batch.quantity),
              ),
            );
          }
        }

        if (batches.isNotEmpty) {
          result.add(DisplayVariant(productVariant: productVariant, batches: batches));
        }
      }
    }

    _fullVariantList.assignAll(result);
  }

  // Changed parameters from Product/Variant to ProductVariant
  void toggleBatchInTransfer(ProductVariant productVariant, InventoryBatch batch) {
    final existingItemIndex = transferItems.indexWhere((item) => item.inventoryId == batch.inventoryId);

    if (existingItemIndex >= 0) {
      transferItems[existingItemIndex].dispose();
      transferItems.removeAt(existingItemIndex);
    } else {
      final maxQty = double.tryParse(batch.quantity) ?? 0.0;
      // For unloading, add the full quantity. For requests, add 1.
      final initialQty = isRequesting ? 1 : maxQty.toInt();

      final RxInt quantity = initialQty.obs;
      final TextEditingController controller = TextEditingController(text: quantity.value.toString());

      quantity.listen((value) {
        if (controller.text != value.toString()) {
          controller.text = value.toString();
        }
      });

      transferItems.add(TransferCartItem(
        inventoryId: batch.inventoryId,
        variantId: productVariant.variantId,
        packagingTypeId: null, // not tracked for unloading
        productName: productVariant.variantName, // Access from productVariant
        variantName: productVariant.variantName, // Access from productVariant
        packagingTypeName: batch.packagingTypeName,
        productionDate: batch.productionDate,
        quantity: quantity,
        maxQuantity: maxQty,
        productImageUrl: productVariant.variantImageUrl, // Access from productVariant
        variantImageUrl: productVariant.variantImageUrl, // Access from productVariant
        quantityController: controller,
      ));
    }
  }

  // Request-mode: add item by variant + packaging + quantity (no inventory batch)
  void addRequestItem({
    required ProductVariant variant,
    required PackagingType packaging,
    required int quantity,
  }) {
    if (!isRequesting) return;

    final RxInt qty = (quantity < 1 ? 1 : quantity).obs;
    final controller = TextEditingController(text: qty.value.toString());
    qty.listen((v) {
      if (controller.text != v.toString()) controller.text = v.toString();
    });

    transferItems.add(TransferCartItem(
      inventoryId: -1, // sentinel for request item (no inventory binding)
      variantId: variant.variantId,
      packagingTypeId: packaging.packagingTypesId,
      productName: variant.productsName ?? variant.variantName,
      variantName: variant.variantName,
      packagingTypeName: packaging.packagingTypesName,
      productionDate: null,
      quantity: qty,
      maxQuantity: 999999, // effectively unlimited in request mode
      productImageUrl: variant.productsImageUrl ?? variant.variantImageUrl,
      variantImageUrl: variant.variantImageUrl,
      quantityController: controller,
    ));
  }

  // ADDED: Method to select all items for unloading.
  void selectAllForUnloading() {
    // Clear existing items to avoid duplicates
    for (var item in transferItems) {
      item.dispose();
    }
    transferItems.clear();

    // Iterate through all available inventory items
    for (var variantGroup in _fullVariantList) {
      for (var batch in variantGroup.batches) {
        final maxQty = double.tryParse(batch.quantity) ?? 0.0;
        if (maxQty > 0) {
          // Only add items that have quantity
          final RxInt quantity = maxQty.toInt().obs;
          final TextEditingController controller = TextEditingController(text: quantity.value.toString());

          quantity.listen((value) {
            if (controller.text != value.toString()) {
              controller.text = value.toString();
            }
          });

          transferItems.add(TransferCartItem(
            inventoryId: batch.inventoryId,
            variantId: variantGroup.productVariant.variantId,
            packagingTypeId: null,
            productName: variantGroup.productVariant.variantName, // Access from productVariant
            variantName: variantGroup.productVariant.variantName, // Access from productVariant
            packagingTypeName: batch.packagingTypeName,
            productionDate: batch.productionDate,
            quantity: quantity,
            maxQuantity: maxQty,
            productImageUrl: variantGroup.productVariant.variantImageUrl, // Access from productVariant
            variantImageUrl: variantGroup.productVariant.variantImageUrl, // Access from productVariant
            quantityController: controller,
          ));
        }
      }
    }
    AppNotifier.success('all_items_added_to_order'.tr, title: 'success'.tr);
  }

  // Helper: check if a request-mode item for variant already exists
  bool isVariantRequested(int variantId) {
    return transferItems.any((it) => it.inventoryId == -1 && it.variantId == variantId);
  }

  // Find existing request-mode item by variantId + packagingTypeId
  TransferCartItem? findRequestItem(int variantId, int packagingTypeId) {
    return transferItems.firstWhereOrNull(
      (it) => it.inventoryId == -1 && it.variantId == variantId && it.packagingTypeId == packagingTypeId,
    );
  }

  // Update or add request item with quantity
  void upsertRequestItem({required ProductVariant variant, required PackagingType packaging, required int quantity}) {
    final existing = findRequestItem(variant.variantId, packaging.packagingTypesId);
    if (existing != null) {
      existing.quantity.value = quantity < 1 ? 1 : quantity;
    } else {
      addRequestItem(variant: variant, packaging: packaging, quantity: quantity);
    }
  }

  bool isBatchInTransfer(int inventoryId) {
    return transferItems.any((item) => item.inventoryId == inventoryId);
  }

  // Remove a specific cart item and dispose its controller
  void removeCartItem(TransferCartItem item) {
    item.dispose();
    transferItems.remove(item);
  }

  Future<void> submitTransfer() async {
    if (transferItems.isEmpty) {
      AppNotifier.validation('Please add at least one item to the transfer.', title: 'Validation');
      return;
    }

    isSubmitting.value = true;
    try {
      Map<String, dynamic> response;
      if (isRequesting) {
        final items = transferItems
            .map((it) => {
                  'variant_id': it.variantId,
                  'packaging_type_id': it.packagingTypeId,
                  'quantity': it.quantity.value,
                })
            .toList();
        response = await _transfersRepository.createTransferRequest(
          sourceWarehouseId: fromWarehouse.warehouseId,
          destinationWarehouseId: toWarehouse.warehouseId,
          items: items,
          note: requestNoteController.text.trim(),
        );
      } else {
        final String? userUuid = _authController.currentUser.value?.uuid;
        if (userUuid == null) throw Exception('User not logged in or UUID not available.');
        final itemsPayload = transferItems
            .map((item) => {
                  "inventory_id": item.inventoryId,
                  "quantity": item.quantity.value,
                })
            .toList();
        response = await _transfersRepository.createTransfer(
          sourceWarehouseId: fromWarehouse.warehouseId,
          destinationWarehouseId: toWarehouse.warehouseId,
          transferItems: itemsPayload,
          userUuid: userUuid,
        );
      }

      if (response['status'] == 'success') {
        final msg = response['message'] ?? 'Transfer request submitted successfully!';
        // Show success before navigating back to avoid context disposal race
        AppNotifier.success(msg);
        // Defer navigation to next microtask using ultra safe back (avoids snackbar close)
        Future.microtask(() => UltraSafeNavigation.back());
      } else {
        throw Exception(response['message'] ?? 'Failed to create transfer.');
      }
    } catch (e) {
      print('Submit Transfer Error: $e');
      AppNotifier.error('Failed to submit transfer: $e');
    } finally {
      isSubmitting.value = false;
    }
  }

  // Public method to allow the UI to retry loading data
  void refreshData() {
    _fetchSourceWarehouseInventory();
  }
}
