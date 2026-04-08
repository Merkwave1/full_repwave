// lib/modules/inventory/controllers/inventory_controller.dart
import 'package:get/get.dart';
import '/data/models/inventory_item.dart';
import '/data/models/product_lookup.dart';
import '/data/models/warehouse.dart';
import '/data/models/warehouse_product_variant.dart' as warehouse_models;
import '/data/repositories/inventory_repository.dart';
import '/data/repositories/product_repository.dart';
import '/data/repositories/warehouse_repository.dart';
import '/modules/auth/controllers/auth_controller.dart';
import '/modules/shared/controllers/global_data_controller.dart';
import 'package:collection/collection.dart';

// Data structure to hold inventory batch information
class InventoryBatch {
  final String inventoryId;
  final String packagingTypeName;
  final DateTime? productionDate;
  final String quantity;

  InventoryBatch({
    required this.inventoryId,
    required this.packagingTypeName,
    this.productionDate,
    required this.quantity,
  });

  // Copy with method for updating batch data
  InventoryBatch copyWith({
    String? inventoryId,
    String? packagingTypeName,
    DateTime? productionDate,
    String? quantity,
  }) {
    return InventoryBatch(
      inventoryId: inventoryId ?? this.inventoryId,
      packagingTypeName: packagingTypeName ?? this.packagingTypeName,
      productionDate: productionDate ?? this.productionDate,
      quantity: quantity ?? this.quantity,
    );
  }
}

// Data structure to hold a flattened inventory item for direct display
// Each variant is treated as a unique product
class InventoryDisplayItem {
  // The 'product' field in InventoryDisplayItem is now redundant if
  // all product-level info is within ProductVariant.
  // Consider removing 'product' from InventoryDisplayItem if it's no longer needed.
  // For now, I'll keep it but note the change in how it's assigned.
  final ProductVariant productVariant; // Renamed to productVariant for clarity
  final InventoryBatch batch;

  InventoryDisplayItem({
    required this.productVariant, // Updated to productVariant
    required this.batch,
  });
}

class InventoryController extends GetxController {
  // Dependencies to be injected via constructor
  final InventoryRepository _inventoryRepository;
  final ProductRepository _productRepository;
  final WarehouseRepository _warehouseRepository;
  final AuthController _authController = Get.find<AuthController>();
  final GlobalDataController _globalDataController = Get.find<GlobalDataController>();

  final Rx<Warehouse?> myWarehouse = Rx<Warehouse?>(null);
  final RxList<InventoryDisplayItem> inventoryList = <InventoryDisplayItem>[].obs;

  final isLoading = true.obs;
  final errorMessage = ''.obs;

  // Constructor updated to accept dependencies, matching the binding file.
  InventoryController({
    required InventoryRepository inventoryRepository,
    required ProductRepository productRepository,
    required WarehouseRepository warehouseRepository,
  })  : _inventoryRepository = inventoryRepository,
        _productRepository = productRepository,
        _warehouseRepository = warehouseRepository;

  @override
  void onInit() {
    super.onInit();
    _fetchUserWarehouseAndInventory();
  }

  /// Refresh inventory data
  Future<void> refreshInventory() async {
    await _fetchUserWarehouseAndInventory();
  }

  /// Main method to fetch warehouse and inventory data
  Future<void> _fetchUserWarehouseAndInventory() async {
    isLoading.value = true;
    errorMessage.value = '';

    try {
      final String? userUuid = _authController.currentUser.value?.uuid;
      if (userUuid == null) {
        throw Exception('User not logged in or UUID not available.');
      }

      // Use cached warehouses from GlobalDataController instead of making API call
      if (_globalDataController.myWarehouses.isEmpty) {
        await _globalDataController.loadWarehouses();
        if (_globalDataController.myWarehouses.isEmpty) {
          final fallbackWarehouses = await _warehouseRepository.getWarehouses(userUuid);
          final myList = fallbackWarehouses['my_warehouses'] ?? <Warehouse>[];
          if (myList.isNotEmpty) {
            _globalDataController.myWarehouses.assignAll(myList);
          }
        }
      }

      if (_globalDataController.myWarehouses.isNotEmpty) {
        myWarehouse.value = _globalDataController.myWarehouses.first;
      } else {
        throw Exception('No personal warehouse (van) assigned to your account.');
      }

      // Use cached products from GlobalDataController instead of making API call
      if (_globalDataController.products.isEmpty) {
        await _globalDataController.loadProducts();
      }

      // Fetch inventory data and packaging types (these are specific to inventory screen)
      final results = await Future.wait([
        _inventoryRepository.getInventoryByWarehouse(myWarehouse.value!.warehouseId),
        _productRepository.getPackagingTypes(), // This is specific to inventory
        _productRepository.getAvailableProductsInWarehouse(myWarehouse.value!.warehouseId),
      ]);

      final inventoryItems = results[0] as List<InventoryItem>;
      final allPackagingTypes = results[1] as List<PackagingType>;
      final warehouseVariants = results[2] as List<warehouse_models.WarehouseProductVariant>;

      // Use cached products instead of fetching them
      final allProductVariants = _globalDataController.products;

      _processAndFlattenInventory(inventoryItems, allProductVariants, warehouseVariants, allPackagingTypes);
    } catch (e) {
      errorMessage.value = 'Failed to load inventory: ${e.toString()}';
      inventoryList.clear();
    } finally {
      isLoading.value = false;
    }
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

  /// Process inventory data and create flat list where each variant is treated as unique product
  void _processAndFlattenInventory(
    List<InventoryItem> items,
    List<ProductVariant> productVariants,
    List<warehouse_models.WarehouseProductVariant> warehouseVariants,
    List<PackagingType> packagingTypes,
  ) {
    final packagingTypesMap = {for (var pt in packagingTypes) pt.packagingTypesId: pt};
    final Map<int, ProductVariant> resolvedVariants = {
      for (final variant in productVariants) variant.variantId: variant,
    };

    final List<InventoryDisplayItem> result = [];

    for (final warehouseVariant in warehouseVariants) {
      final baseUnitName = resolvedVariants[warehouseVariant.variantId]?.baseUnitName;
      final productVariant = warehouseVariant.toProductVariant(baseUnitName: baseUnitName);
      resolvedVariants[warehouseVariant.variantId] = productVariant;

      for (final availablePackaging in warehouseVariant.availablePackaging) {
        final packagingName = _resolvePackagingName(availablePackaging, packagingTypesMap);

        for (final batch in availablePackaging.inventoryBatches) {
          if (batch.quantity <= 0) {
            continue;
          }

          result.add(
            InventoryDisplayItem(
              productVariant: productVariant,
              batch: InventoryBatch(
                inventoryId: '${batch.inventoryId}',
                packagingTypeName: packagingName,
                productionDate: _parseBatchDate(batch.productionDate),
                quantity: _formatQuantity(batch.quantity),
              ),
            ),
          );
        }
      }
    }

    if (result.isEmpty) {
      if (items.isEmpty) {
        inventoryList.clear();
        return;
      }

      final itemsByVariant = groupBy(items, (item) => item.variantId);

      itemsByVariant.forEach((variantId, variantItems) {
        if (variantItems.isEmpty) {
          return;
        }

        final productVariant = resolvedVariants[variantId] ?? _buildPlaceholderVariant(variantId, variantItems.first);

        for (var item in variantItems) {
          result.add(
            InventoryDisplayItem(
              productVariant: productVariant,
              batch: InventoryBatch(
                inventoryId: '${item.inventoryId}',
                packagingTypeName: packagingTypesMap[item.packagingTypeId]?.packagingTypesName ?? 'Unknown',
                productionDate: item.inventoryProductionDate,
                quantity: item.inventoryQuantity,
              ),
            ),
          );
        }
      });
    }

    if (result.isEmpty) {
      inventoryList.clear();
      return;
    }

    // Sort by variant name for better organization
    result.sort((a, b) {
      final aName = a.productVariant.variantName.isNotEmpty ? a.productVariant.variantName : (a.productVariant.productsName ?? '');
      final bName = b.productVariant.variantName.isNotEmpty ? b.productVariant.variantName : (b.productVariant.productsName ?? '');
      return aName.compareTo(bName);
    });

    inventoryList.assignAll(result);
  }

  /// Get total quantity for a specific variant across all batches
  double getTotalQuantityForVariant(int variantId) {
    // Changed parameter type to int
    double total = 0.0;
    for (var item in inventoryList) {
      if (item.productVariant.variantId == variantId) {
        // Use productVariant.variantId
        total += double.tryParse(item.batch.quantity) ?? 0.0;
      }
    }
    return total;
  }

  /// Get all unique variants (without duplicating batches)
  List<InventoryDisplayItem> getUniqueVariants() {
    Map<int, InventoryDisplayItem> uniqueVariants = {}; // Changed key type to int

    for (var item in inventoryList) {
      int variantKey = item.productVariant.variantId; // Use int for key
      if (!uniqueVariants.containsKey(variantKey)) {
        uniqueVariants[variantKey] = item;
      }
    }

    return uniqueVariants.values.toList();
  }

  /// Consolidate variants by summing quantities across batches
  List<InventoryDisplayItem> getConsolidatedVariants() {
    Map<int, InventoryDisplayItem> consolidatedMap = {}; // Changed key type to int

    for (var item in inventoryList) {
      int variantKey = item.productVariant.variantId; // Use int for key

      if (consolidatedMap.containsKey(variantKey)) {
        // Sum quantities
        double existingQty = double.tryParse(consolidatedMap[variantKey]!.batch.quantity) ?? 0.0;
        double currentQty = double.tryParse(item.batch.quantity) ?? 0.0;
        double totalQty = existingQty + currentQty;

        // Update with consolidated data
        consolidatedMap[variantKey] = InventoryDisplayItem(
          productVariant: item.productVariant, // Use productVariant
          batch: consolidatedMap[variantKey]!.batch.copyWith(
                quantity: totalQty.toString(),
              ),
        );
      } else {
        consolidatedMap[variantKey] = item;
      }
    }

    return consolidatedMap.values.toList()..sort((a, b) => a.productVariant.variantName.compareTo(b.productVariant.variantName));
  }

  /// Filter inventory by variant name
  List<InventoryDisplayItem> filterByVariantName(String searchTerm) {
    if (searchTerm.isEmpty) return inventoryList;

    return inventoryList.where((item) => item.productVariant.variantName.toLowerCase().contains(searchTerm.toLowerCase())).toList();
  }

  /// Get low stock variants (quantity below threshold)
  List<InventoryDisplayItem> getLowStockVariants({double threshold = 10.0}) {
    return inventoryList.where((item) {
      double quantity = double.tryParse(item.batch.quantity) ?? 0.0;
      return quantity < threshold;
    }).toList();
  }

  /// Get total number of unique variants
  int get uniqueVariantCount {
    Set<int> uniqueVariantIds = {}; // Changed type to int
    for (var item in inventoryList) {
      uniqueVariantIds.add(item.productVariant.variantId); // Use int
    }
    return uniqueVariantIds.length;
  }

  /// Get total inventory items count
  int get totalItemsCount => inventoryList.length;

  /// Check if inventory has any items
  bool get hasInventory => inventoryList.isNotEmpty;

  /// Get warehouse name
  String get warehouseName => myWarehouse.value?.warehouseName ?? 'N/A';
}
