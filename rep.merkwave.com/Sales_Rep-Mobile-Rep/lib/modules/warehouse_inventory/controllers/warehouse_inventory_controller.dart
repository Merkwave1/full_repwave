// lib/modules/warehouse_inventory/controllers/warehouse_inventory_controller.dart
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '/shared_widgets/ultra_safe_navigation.dart';
import '/data/models/inventory_item.dart';
import '/data/models/product_lookup.dart';
import '/data/models/warehouse.dart';
import '/data/models/warehouse_product_variant.dart' as warehouse_models;
import '/data/repositories/inventory_repository.dart';
import '/data/repositories/product_repository.dart';
import '/modules/shared/controllers/global_data_controller.dart';
import 'package:collection/collection.dart'; // Import for groupBy
import '/modules/auth/controllers/auth_controller.dart';

// Data structure to hold a grouped variant with its total quantity in the base unit.
class GroupedVariantDisplay {
  // Now uses ProductVariant directly as it contains product-level info
  final ProductVariant productVariant; // Changed from Product product; and ProductVariant variant;
  final double totalBaseUnitQuantity;
  final String baseUnitName;
  final List<InventoryBatch> batches;
  final Map<int, PackagingType> packagingTypesMap; // Add packaging types map

  GroupedVariantDisplay({
    required this.productVariant, // Changed to productVariant
    required this.totalBaseUnitQuantity,
    required this.baseUnitName,
    required this.batches,
    required this.packagingTypesMap, // Add to constructor
  });
}

class WarehouseInventoryController extends GetxController {
  final InventoryRepository _inventoryRepository;
  final ProductRepository _productRepository;
  final AuthController _authController = Get.find<AuthController>();

  late final Warehouse warehouse;

  final RxList<GroupedVariantDisplay> groupedVariants = <GroupedVariantDisplay>[].obs;
  final isLoading = true.obs;
  final errorMessage = ''.obs;
  Map<int, PackagingType> _allPackagingTypesMap = {};

  Map<int, PackagingType> get allPackagingTypesMap => _allPackagingTypesMap;

  WarehouseInventoryController({
    required InventoryRepository inventoryRepository,
    required ProductRepository productRepository,
  })  : _inventoryRepository = inventoryRepository,
        _productRepository = productRepository {
    warehouse = Get.arguments['warehouse'];
  }

  @override
  void onInit() {
    super.onInit();
    fetchInventoryData();
  }

  Future<void> fetchInventoryData({bool forceRefresh = false}) async {
    isLoading.value = true;
    errorMessage.value = '';
    try {
      final results = await Future.wait([
        _inventoryRepository.getInventoryByWarehouse(warehouse.warehouseId, forceRefresh: forceRefresh),
        _productRepository.getPackagingTypes(forceRefresh: forceRefresh),
      ]);

      final inventoryItems = results[0] as List<InventoryItem>;
      final allPackagingTypes = results[1] as List<PackagingType>;

      // Use empty list for warehouseVariants to force fallback logic
      _processAndGroupVariants(inventoryItems, [], allPackagingTypes);
    } catch (e) {
      errorMessage.value = 'Failed to load inventory data: ${e.toString()}';
      debugPrint('Error fetching inventory data: $e');
    } finally {
      isLoading.value = false;
    }
  }

  Future<void> refreshInventoryData() async {
    await fetchInventoryData(forceRefresh: true);
  }

  double _resolveConversionFactor(warehouse_models.AvailablePackaging packaging, PackagingType? packagingType) {
    if ((packaging.packagingFactor ?? 0) > 0) {
      return packaging.packagingFactor!;
    }
    final fallback = packagingType?.packagingTypesDefaultConversionFactor;
    if (fallback == null) {
      return 1.0;
    }
    return double.tryParse(fallback) ?? 1.0;
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

  String _resolveBaseUnitName(
    String? candidateBaseUnitName,
    warehouse_models.WarehouseProductVariant warehouseVariant,
    Map<int, PackagingType> packagingTypesMap,
  ) {
    final candidate = candidateBaseUnitName?.trim();
    if (candidate != null && candidate.isNotEmpty) {
      return candidate;
    }

    String? baseUnitFromFactor;
    for (final availablePackaging in warehouseVariant.availablePackaging) {
      final packagingTypeId = availablePackaging.packagingTypeId;
      if (packagingTypeId == null) {
        continue;
      }
      final packagingType = packagingTypesMap[packagingTypeId];
      final factor = _resolveConversionFactor(availablePackaging, packagingType);
      if ((factor - 1).abs() < 0.0001) {
        if (packagingType?.compatibleBaseUnitName != null && packagingType!.compatibleBaseUnitName!.isNotEmpty) {
          baseUnitFromFactor = packagingType.compatibleBaseUnitName;
          break;
        }
        if (availablePackaging.packagingTypeName != null && availablePackaging.packagingTypeName!.trim().isNotEmpty) {
          baseUnitFromFactor = availablePackaging.packagingTypeName;
          break;
        }
        if (packagingType?.packagingTypesName != null && packagingType!.packagingTypesName.trim().isNotEmpty) {
          baseUnitFromFactor = packagingType.packagingTypesName;
          break;
        }
      }
    }

    baseUnitFromFactor = baseUnitFromFactor?.trim();
    if (baseUnitFromFactor != null && baseUnitFromFactor.isNotEmpty) {
      return baseUnitFromFactor;
    }

    for (final availablePackaging in warehouseVariant.availablePackaging) {
      final packagingTypeId = availablePackaging.packagingTypeId;
      if (packagingTypeId == null) {
        continue;
      }
      final packagingType = packagingTypesMap[packagingTypeId];
      if (packagingType?.compatibleBaseUnitName != null && packagingType!.compatibleBaseUnitName!.isNotEmpty) {
        return packagingType.compatibleBaseUnitName!.trim();
      }
    }

    return 'units'.tr;
  }

  ProductVariant _buildPlaceholderVariant(int variantId, InventoryItem source, {String? baseUnitName}) {
    // Try to get variant info from GlobalDataController
    try {
      if (Get.isRegistered<GlobalDataController>()) {
        final globalData = GlobalDataController.instance;
        final existingVariant = globalData.products.firstWhereOrNull((p) => p.variantId == variantId);
        if (existingVariant != null) {
          debugPrint('📦 Found variant $variantId in global data: ${existingVariant.variantName}');
          return existingVariant;
        }
      }
    } catch (e) {
      debugPrint('⚠️ Error getting variant from global data: $e');
    }

    // Fallback to placeholder
    debugPrint('📦 Creating placeholder for variant $variantId');
    return ProductVariant(
      productsId: source.productsId,
      productsName: 'Product #${source.productsId}',
      productsUnitOfMeasureId: source.productsUnitOfMeasureId,
      baseUnitName: baseUnitName,
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
    final packagingTypeId = packaging.packagingTypeId;
    if (packaging.packagingTypeName != null && packaging.packagingTypeName!.trim().isNotEmpty) {
      return packaging.packagingTypeName!;
    }
    if (packagingTypeId != null && packagingTypesMap.containsKey(packagingTypeId)) {
      final resolvedName = packagingTypesMap[packagingTypeId]?.packagingTypesName;
      if (resolvedName != null && resolvedName.trim().isNotEmpty) {
        return resolvedName;
      }
    }
    return 'unknown'.tr;
  }

  void _processAndGroupVariants(
    List<InventoryItem> items,
    List<warehouse_models.WarehouseProductVariant> warehouseVariants,
    List<PackagingType> packagingTypes,
  ) {
    final packagingTypesMap = {for (final pt in packagingTypes) pt.packagingTypesId: pt};
    final Map<int, ProductVariant> resolvedVariants = {};
    _allPackagingTypesMap = packagingTypesMap;

    final List<GroupedVariantDisplay> result = [];

    debugPrint('📦 Processing variants - warehouseVariants: ${warehouseVariants.length}, items: ${items.length}');

    for (final warehouseVariant in warehouseVariants) {
      final baseUnitName = _resolveBaseUnitName(
        resolvedVariants[warehouseVariant.variantId]?.baseUnitName,
        warehouseVariant,
        packagingTypesMap,
      );

      final productVariant = warehouseVariant.toProductVariant(baseUnitName: baseUnitName);
      resolvedVariants[warehouseVariant.variantId] = productVariant;

      final List<InventoryBatch> batches = [];
      double computedBaseUnits = 0;

      for (final availablePackaging in warehouseVariant.availablePackaging) {
        // Don't skip packaging with 0 quantity - we still need to process it
        // if (availablePackaging.totalQuantity <= 0) {
        //   continue;
        // }

        final packagingName = _resolvePackagingName(availablePackaging, packagingTypesMap);
        final packagingTypeId = availablePackaging.packagingTypeId ?? 0;
        final packagingType = packagingTypesMap[packagingTypeId];
        final conversionFactor = _resolveConversionFactor(availablePackaging, packagingType);

        computedBaseUnits += availablePackaging.totalQuantity * conversionFactor;

        if (availablePackaging.inventoryBatches.isEmpty) {
          // Only add batch if quantity > 0
          if (availablePackaging.totalQuantity > 0) {
            batches.add(
              InventoryBatch(
                inventoryId: packagingTypeId * -1,
                packagingTypeName: packagingName,
                productionDate: null,
                quantity: _formatQuantity(availablePackaging.totalQuantity),
              ),
            );
          }
          continue;
        }

        for (final batch in availablePackaging.inventoryBatches) {
          // Only add batch if quantity > 0
          if (batch.quantity > 0) {
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
      }

      final effectiveBaseUnits = warehouseVariant.totalAvailableInBaseUnits > 0 ? warehouseVariant.totalAvailableInBaseUnits : computedBaseUnits;

      debugPrint('📦 Variant ${warehouseVariant.variantId}: batches=${batches.length}, baseUnits=$effectiveBaseUnits');

      if (batches.isEmpty || effectiveBaseUnits <= 0) {
        debugPrint('⚠️ Skipping variant ${warehouseVariant.variantId} - no batches or zero quantity');
        continue;
      }

      result.add(
        GroupedVariantDisplay(
          productVariant: productVariant,
          totalBaseUnitQuantity: effectiveBaseUnits,
          baseUnitName: baseUnitName,
          batches: batches,
          packagingTypesMap: packagingTypesMap,
        ),
      );
    }

    debugPrint('📦 After processing warehouseVariants: result count = ${result.length}');

    if (result.isEmpty) {
      debugPrint('📦 No results from warehouseVariants, falling back to raw inventory items');
      if (items.isEmpty) {
        groupedVariants.clear();
        return;
      }

      final itemsByVariant = groupBy(items, (InventoryItem item) => item.variantId);
      debugPrint('📦 Grouped raw items into ${itemsByVariant.length} variants');

      itemsByVariant.forEach((variantId, variantItems) {
        if (variantItems.isEmpty) {
          return;
        }

        final packagingType = packagingTypesMap[variantItems.first.packagingTypeId];
        final placeholder = _buildPlaceholderVariant(
          variantId,
          variantItems.first,
          baseUnitName: packagingType?.compatibleBaseUnitName ?? packagingType?.packagingTypesName,
        );

        double totalBaseUnitQuantity = 0;
        final List<InventoryBatch> batches = [];

        for (var item in variantItems) {
          final packaging = packagingTypesMap[item.packagingTypeId];
          final quantityInPackage = double.tryParse(item.inventoryQuantity) ?? 0.0;

          if (quantityInPackage <= 0) {
            continue;
          }

          final conversionFactor = packaging?.packagingTypesDefaultConversionFactor != null ? (double.tryParse(packaging!.packagingTypesDefaultConversionFactor!) ?? 1.0) : 1.0;

          totalBaseUnitQuantity += quantityInPackage * conversionFactor;

          batches.add(
            InventoryBatch(
              inventoryId: item.inventoryId,
              packagingTypeName: packaging?.packagingTypesName ?? 'unknown'.tr,
              productionDate: item.inventoryProductionDate,
              quantity: item.inventoryQuantity,
            ),
          );
        }

        debugPrint('📦 Fallback variant $variantId: batches=${batches.length}, totalQty=$totalBaseUnitQuantity');

        if (batches.isNotEmpty && totalBaseUnitQuantity > 0) {
          result.add(
            GroupedVariantDisplay(
              productVariant: placeholder,
              totalBaseUnitQuantity: totalBaseUnitQuantity,
              baseUnitName: placeholder.baseUnitName ?? packagingType?.packagingTypesName ?? 'units'.tr,
              batches: batches,
              packagingTypesMap: packagingTypesMap,
            ),
          );
        }
      });
    }

    result.sort((a, b) => a.productVariant.variantName.compareTo(b.productVariant.variantName));
    groupedVariants.assignAll(result);
    debugPrint('📦 Final grouped variants count: ${groupedVariants.length}');
  }

  Future<void> repackInventory({
    required int inventoryId,
    required int toPackagingTypeId,
    required double quantityToConvert,
  }) async {
    final userUuid = _authController.currentUser.value?.uuid;
    if (userUuid == null) {
      UltraSafeNavigation.showMessage(
        'Error',
        'User not found. Please log in again.',
        backgroundColor: Colors.red,
      );
      return;
    }

    Get.dialog(
      const Center(child: CircularProgressIndicator()),
      barrierDismissible: false,
    );

    try {
      await _inventoryRepository.repackInventoryItem(
        inventoryId: inventoryId,
        toPackagingTypeId: toPackagingTypeId,
        quantityToConvert: quantityToConvert,
        userUuid: userUuid,
      );

      try {
        UltraSafeNavigation.closeDialog(); // Close loading dialog safely
      } catch (e) {
        // Ignore if dialog wasn't open
      }

      UltraSafeNavigation.showMessage(
        'Success',
        'Item repacked successfully!',
        backgroundColor: Colors.green,
      );

      await fetchInventoryData(forceRefresh: true); // Refresh data to show changes
    } catch (e) {
      try {
        UltraSafeNavigation.closeDialog(); // Close loading dialog safely
      } catch (e) {
        // Ignore if dialog wasn't open
      }
      UltraSafeNavigation.showMessage(
        'Error',
        'Failed to repack item: ${e.toString()}',
        backgroundColor: Colors.red,
      );
    }
  }
}
