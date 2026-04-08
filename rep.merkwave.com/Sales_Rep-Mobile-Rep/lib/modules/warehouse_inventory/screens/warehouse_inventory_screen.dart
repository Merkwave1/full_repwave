// lib/modules/warehouse_inventory/screens/warehouse_inventory_screen.dart
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '/shared_widgets/ultra_safe_navigation.dart';
import 'package:intl/intl.dart';
import 'package:collection/collection.dart';
import '/data/models/inventory_item.dart';
import '/data/models/product_lookup.dart';
import '/modules/warehouse_inventory/controllers/warehouse_inventory_controller.dart';
import '/shared_widgets/custom_app_bar.dart';

class WarehouseInventoryScreen extends GetView<WarehouseInventoryController> {
  const WarehouseInventoryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: CustomAppBar(
        title: controller.warehouse.warehouseName,
      ),
      body: Container(
        color: Colors.grey.shade50,
        child: Obx(() {
          if (controller.isLoading.value) {
            return Center(
              child: Container(
                padding: const EdgeInsets.all(32),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.1),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: const Color(0xFF3F51B5),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(
                        Icons.warehouse_rounded,
                        color: Colors.white,
                        size: 32,
                      ),
                    ),
                    const SizedBox(height: 20),
                    Text(
                      'loading_warehouse_inventory'.tr,
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                        color: Colors.grey.shade700,
                      ),
                    ),
                    const SizedBox(height: 16),
                    const CircularProgressIndicator(
                      valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF3F51B5)),
                    ),
                  ],
                ),
              ),
            );
          }

          if (controller.errorMessage.value.isNotEmpty) {
            return Center(
              child: Container(
                margin: const EdgeInsets.all(24),
                padding: const EdgeInsets.all(32),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.1),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.red.shade100,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(
                        Icons.error_outline_rounded,
                        color: Colors.red.shade600,
                        size: 32,
                      ),
                    ),
                    const SizedBox(height: 20),
                    Text(
                      controller.errorMessage.value,
                      style: theme.textTheme.bodyLarge?.copyWith(
                        color: Colors.red.shade700,
                        fontWeight: FontWeight.w500,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            );
          }

          if (controller.groupedVariants.isEmpty) {
            return Center(
              child: Container(
                margin: const EdgeInsets.all(24),
                padding: const EdgeInsets.all(32),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.1),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: Colors.grey.shade100,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Icon(
                        Icons.warehouse_outlined,
                        color: Colors.grey.shade400,
                        size: 48,
                      ),
                    ),
                    const SizedBox(height: 24),
                    Text(
                      'no_inventory_in_warehouse'.tr,
                      style: theme.textTheme.titleMedium?.copyWith(
                        color: Colors.grey.shade600,
                        fontWeight: FontWeight.w500,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            );
          }

          return Column(
            children: [
              // Header section
              Container(
                margin: const EdgeInsets.all(16),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFF3F51B5),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    const Icon(
                      Icons.warehouse_rounded,
                      color: Colors.white,
                      size: 24,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'warehouse_inventory'.tr,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            controller.warehouse.warehouseName,
                            style: TextStyle(
                              color: Colors.white.withOpacity(0.9),
                              fontSize: 14,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        '${controller.groupedVariants.length} ${'products'.tr}',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              // List of products
              Expanded(
                child: ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: controller.groupedVariants.length,
                  itemBuilder: (context, index) {
                    return _buildVariantCard(controller.groupedVariants[index]);
                  },
                ),
              ),
            ],
          );
        }),
      ),
    );
  }

  Widget _buildVariantCard(GroupedVariantDisplay item) {
    final totalQuantity = item.totalBaseUnitQuantity.toStringAsFixed(0);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Builder(
        builder: (context) => Theme(
          data: Theme.of(context).copyWith(
            dividerColor: Colors.transparent,
            expansionTileTheme: const ExpansionTileThemeData(
              backgroundColor: Colors.transparent,
              collapsedBackgroundColor: Colors.transparent,
            ),
          ),
          child: ExpansionTile(
            leading: Container(
              width: 50,
              height: 50,
              decoration: BoxDecoration(
                color: const Color(0xFF3F51B5).withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
                image: item.productVariant.variantImageUrl != null && item.productVariant.variantImageUrl!.isNotEmpty
                    ? DecorationImage(
                        image: NetworkImage(item.productVariant.variantImageUrl!),
                        fit: BoxFit.cover,
                      )
                    : (item.productVariant.productsImageUrl != null && item.productVariant.productsImageUrl!.isNotEmpty
                        ? DecorationImage(
                            image: NetworkImage(item.productVariant.productsImageUrl!),
                            fit: BoxFit.cover,
                          )
                        : null),
              ),
              child: (item.productVariant.variantImageUrl == null || item.productVariant.variantImageUrl!.isEmpty) && (item.productVariant.productsImageUrl == null || item.productVariant.productsImageUrl!.isEmpty)
                  ? const Icon(
                      Icons.inventory_2_rounded,
                      color: Color(0xFF3F51B5),
                      size: 24,
                    )
                  : null,
            ),
            title: Text(
              item.productVariant.variantName,
              style: const TextStyle(
                fontWeight: FontWeight.w600,
                color: Colors.black87,
                fontSize: 16,
              ),
            ),
            subtitle: Container(
              margin: const EdgeInsets.only(top: 6),
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: const Color(0xFF3F51B5).withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(
                    Icons.inventory_rounded,
                    size: 14,
                    color: Color(0xFF3F51B5),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    '${'total'.tr}: $totalQuantity ${'unit'.tr}',
                    style: const TextStyle(
                      color: Color(0xFF3F51B5),
                      fontWeight: FontWeight.w600,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
            children: item.batches.map((batch) => _buildBatchRow(item, batch)).toList(),
          ),
        ),
      ),
    );
  }

  Widget _buildBatchRow(GroupedVariantDisplay variantItem, InventoryBatch batch) {
    final formattedDate = batch.productionDate != null ? DateFormat('yyyy-MM-dd HH:mm:ss').format(batch.productionDate!) : 'N/A';
    final quantity = double.tryParse(batch.quantity)?.toStringAsFixed(0) ?? batch.quantity;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.grey.shade50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: Colors.grey.shade200,
          width: 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Top row: Packaging info and quantity
          Row(
            children: [
              Expanded(
                flex: 2,
                child: _buildPackagingInfoChip(variantItem, batch.packagingTypeName),
              ),
              const SizedBox(width: 12),
              Expanded(
                flex: 1,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFF3F51B5).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    '${'qty'.tr}: $quantity',
                    style: const TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 12,
                      color: Color(0xFF3F51B5),
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          // Bottom row: Production date and exchange button
          Row(
            children: [
              Expanded(
                child: _buildBatchInfoChip('production_date'.tr, formattedDate),
              ),
              const SizedBox(width: 8),
              Container(
                decoration: BoxDecoration(
                  color: const Color(0xFF3F51B5),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: IconButton(
                  icon: const Icon(
                    Icons.sync_alt_rounded,
                    color: Colors.white,
                    size: 18,
                  ),
                  onPressed: () {
                    _showRepackDialog(variantItem.productVariant, batch);
                  },
                  tooltip: 'repack'.tr,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // Helper method to build batch information chips
  Widget _buildPackagingInfoChip(GroupedVariantDisplay variantItem, String packagingTypeName) {
    // Find the packaging type from the map to get conversion factor
    String packagingInfo = packagingTypeName;

    // Look for matching packaging type by name
    final matchingPackagingType = variantItem.packagingTypesMap.values.where((pt) => pt.packagingTypesName == packagingTypeName).firstOrNull;

    if (matchingPackagingType != null && matchingPackagingType.packagingTypesDefaultConversionFactor != null) {
      final conversionFactor = double.tryParse(matchingPackagingType.packagingTypesDefaultConversionFactor!) ?? 1.0;
      // Show packaging in shorter format
      packagingInfo = '$packagingTypeName (${conversionFactor.toStringAsFixed(0)} ${'unit'.tr})';
    } else {
      // Fallback format if no conversion factor available
      packagingInfo = '$packagingTypeName (1 ${variantItem.baseUnitName})';
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: const Color(0xFF3F51B5).withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: const Color(0xFF3F51B5).withOpacity(0.2),
          width: 0.5,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 4,
            height: 4,
            decoration: const BoxDecoration(
              color: Color(0xFF3F51B5),
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 6),
          Flexible(
            child: Text(
              packagingInfo,
              style: const TextStyle(
                fontSize: 12,
                color: Color(0xFF3F51B5),
                fontWeight: FontWeight.w600,
              ),
              overflow: TextOverflow.visible,
              maxLines: 2,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBatchInfoChip(String label, String value) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.green.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: Colors.green.withOpacity(0.2),
          width: 0.5,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 4,
            height: 4,
            decoration: const BoxDecoration(
              color: Colors.green,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 6),
          Flexible(
            child: Text(
              '$label: $value',
              style: const TextStyle(
                fontSize: 12,
                color: Colors.green,
                fontWeight: FontWeight.w600,
              ),
              overflow: TextOverflow.visible,
              maxLines: 2,
            ),
          ),
        ],
      ),
    );
  }

  void _showRepackDialog(ProductVariant productVariant, InventoryBatch batch) {
    if (batch.inventoryId <= 0) {
      UltraSafeNavigation.showMessage(
        'warning'.tr,
        'repack_not_available'.tr,
        backgroundColor: Colors.orange,
      );
      return;
    }
    int quantityInPackagingUnits = 0;
    final availableQuantity = double.tryParse(batch.quantity) ?? 0.0;
    final availableQuantityText = double.tryParse(batch.quantity)?.toStringAsFixed(0) ?? batch.quantity;
    final packagingMap = controller.allPackagingTypesMap;
    final batchPackagingName = batch.packagingTypeName.trim().toLowerCase();

    final PackagingType resolvedCurrentPackaging = packagingMap.values.firstWhereOrNull((pt) => pt.packagingTypesName.trim().toLowerCase() == batchPackagingName) ??
        PackagingType(
          packagingTypesId: 0,
          packagingTypesName: batch.packagingTypeName,
          packagingTypesDefaultConversionFactor: '1',
          packagingTypesCompatibleBaseUnitId: null,
        );

    final currentPackagingTypeId = resolvedCurrentPackaging.packagingTypesId;
    final Set<int> preferredIds = productVariant.preferredPackaging.map((pType) => pType.packagingTypesId).whereType<int>().where((id) => id != currentPackagingTypeId).toSet();

    final List<PackagingType> preferredPackagingOptions = preferredIds.map((id) => packagingMap[id]).whereType<PackagingType>().toList();

    final int? baseUnitId = resolvedCurrentPackaging.packagingTypesCompatibleBaseUnitId;
    final Iterable<PackagingType> fallbackPackagingOptions = packagingMap.values.where((pt) {
      if (pt.packagingTypesId == currentPackagingTypeId) return false;
      if (baseUnitId == null || pt.packagingTypesCompatibleBaseUnitId == null) return true;
      return pt.packagingTypesCompatibleBaseUnitId == baseUnitId;
    });

    final List<PackagingType> availablePackagingOptions = [];
    final Set<int> seenPackagingIds = {if (currentPackagingTypeId != 0) currentPackagingTypeId};

    for (final option in preferredPackagingOptions) {
      if (seenPackagingIds.add(option.packagingTypesId)) {
        availablePackagingOptions.add(option);
      }
    }

    for (final option in fallbackPackagingOptions) {
      if (seenPackagingIds.add(option.packagingTypesId)) {
        availablePackagingOptions.add(option);
      }
    }

    if (availablePackagingOptions.isEmpty) {
      Get.snackbar(
        'warning'.tr,
        'no_other_packaging_types_available'.tr,
        backgroundColor: Colors.orange,
        colorText: Colors.white,
      );
      return;
    }

    // Find first packaging option with sufficient quantity
    final currentConversionRate = double.tryParse(resolvedCurrentPackaging.packagingTypesDefaultConversionFactor ?? '1') ?? 1.0;
    PackagingType? firstAvailablePackaging;

    for (final option in availablePackagingOptions) {
      final optionConversionRate = double.tryParse(option.packagingTypesDefaultConversionFactor ?? '1') ?? 1.0;
      final int stepSize;
      if (currentConversionRate < optionConversionRate) {
        stepSize = (optionConversionRate / currentConversionRate).round();
      } else {
        stepSize = 1;
      }

      // Check if we have enough quantity for at least one step
      if (availableQuantity >= stepSize) {
        firstAvailablePackaging = option;
        break;
      }
    }

    if (firstAvailablePackaging == null) {
      Get.snackbar(
        'warning'.tr,
        'no_other_packaging_types_available'.tr,
        backgroundColor: Colors.orange,
        colorText: Colors.white,
      );
      return;
    }

    int selectedToPackagingTypeId = firstAvailablePackaging.packagingTypesId;

    Get.dialog(
      StatefulBuilder(
        builder: (context, setState) {
          final dialogMaxHeight = MediaQuery.of(context).size.height * 0.65;
          final selectedPackagingType = packagingMap[selectedToPackagingTypeId] ??
              availablePackagingOptions.firstWhereOrNull((pt) => pt.packagingTypesId == selectedToPackagingTypeId) ??
              PackagingType(
                packagingTypesId: selectedToPackagingTypeId,
                packagingTypesName: 'unknown'.tr,
                packagingTypesDefaultConversionFactor: '1',
              );

          final currentConversionRate = double.tryParse(resolvedCurrentPackaging.packagingTypesDefaultConversionFactor ?? '1') ?? 1.0;
          final selectedConversionRate = double.tryParse(selectedPackagingType.packagingTypesDefaultConversionFactor ?? '1') ?? 1.0;

          // Calculate max units in source packaging
          final maxPossibleUnits = availableQuantity.floor();

          // Calculate base units from source packaging quantity
          final quantityInBaseUnits = quantityInPackagingUnits * currentConversionRate;

          // Calculate equivalent in target packaging
          final equivalentInTargetPackaging = (quantityInBaseUnits / selectedConversionRate);

          // Step size: when converting small→large, need multiple source units per step
          // When converting large→small, step by 1
          final int stepSize;
          if (currentConversionRate < selectedConversionRate) {
            // Converting small to large (e.g., bottle→carton)
            // Need selectedConversionRate / currentConversionRate source units per 1 target unit
            stepSize = (selectedConversionRate / currentConversionRate).round();
          } else {
            // Converting large to small or same size
            stepSize = 1;
          }

          return Dialog(
            backgroundColor: Colors.transparent,
            insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 40),
            child: Container(
              constraints: BoxConstraints(maxHeight: dialogMaxHeight),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(28),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.2),
                    blurRadius: 30,
                    offset: const Offset(0, 10),
                  ),
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Header
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(
                        colors: [Color(0xFF5C6BC0), Color(0xFF7986CB)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.2),
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: const Icon(
                            Icons.autorenew_rounded,
                            color: Colors.white,
                            size: 28,
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'repack'.tr,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 22,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                productVariant.variantName,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  color: Colors.white70,
                                  fontSize: 13,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Content
                  Flexible(
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          // Current package info
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                colors: [Colors.blue[50]!, Colors.blue[100]!.withOpacity(0.3)],
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                              ),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(color: Colors.blue[200]!, width: 1.5),
                            ),
                            child: Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(10),
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Icon(
                                    Icons.inventory_2,
                                    color: Colors.blue[700],
                                    size: 24,
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        '${'from'.tr} • ${batch.packagingTypeName}',
                                        style: TextStyle(
                                          fontSize: 13,
                                          color: Colors.blue[700],
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Row(
                                        children: [
                                          Text(
                                            '1 ${batch.packagingTypeName}',
                                            style: const TextStyle(
                                              fontSize: 16,
                                              fontWeight: FontWeight.bold,
                                              color: Colors.black87,
                                            ),
                                          ),
                                          Text(
                                            ' = ',
                                            style: TextStyle(
                                              fontSize: 14,
                                              color: Colors.grey[600],
                                            ),
                                          ),
                                          Text(
                                            '${currentConversionRate.toStringAsFixed(0)} ${'unit'.tr}',
                                            style: const TextStyle(
                                              fontSize: 16,
                                              fontWeight: FontWeight.bold,
                                              color: Colors.black87,
                                            ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        '${'quantity_available'.tr}: $availableQuantityText ${batch.packagingTypeName}',
                                        style: TextStyle(
                                          fontSize: 12,
                                          color: Colors.grey[600],
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),

                          const SizedBox(height: 20),

                          // Conversion arrow
                          Center(
                            child: Icon(
                              Icons.arrow_downward_rounded,
                              color: Colors.grey[400],
                              size: 32,
                            ),
                          ),

                          const SizedBox(height: 20),

                          // Target package selector
                          Text(
                            '${'to'.tr}:',
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: Colors.black54,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Container(
                            decoration: BoxDecoration(
                              color: Colors.grey[100],
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: Colors.grey[300]!),
                            ),
                            child: DropdownButtonFormField<int>(
                              decoration: const InputDecoration(
                                border: InputBorder.none,
                                contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                              ),
                              dropdownColor: Colors.white,
                              value: selectedToPackagingTypeId,
                              isExpanded: true,
                              items: availablePackagingOptions.map((pType) {
                                final packagingDetails = packagingMap[pType.packagingTypesId] ?? pType;
                                final targetConversionRate = double.tryParse(packagingDetails.packagingTypesDefaultConversionFactor ?? '1') ?? 1.0;

                                // Calculate step size for this packaging option
                                final int requiredSourceUnits;
                                if (currentConversionRate < targetConversionRate) {
                                  requiredSourceUnits = (targetConversionRate / currentConversionRate).round();
                                } else {
                                  requiredSourceUnits = 1;
                                }

                                // Check if we have enough quantity for at least 1 unit of this packaging
                                final canConvert = availableQuantity >= requiredSourceUnits;
                                final insufficientQty = !canConvert;

                                return DropdownMenuItem<int>(
                                  value: pType.packagingTypesId,
                                  enabled: canConvert,
                                  child: Row(
                                    children: [
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            Text(
                                              '${pType.packagingTypesName} (${packagingDetails.packagingTypesDefaultConversionFactor ?? '1'} ${productVariant.baseUnitName ?? 'unit'.tr})',
                                              style: TextStyle(
                                                fontSize: 14,
                                                fontWeight: FontWeight.w500,
                                                color: insufficientQty ? Colors.grey[400] : Colors.black87,
                                              ),
                                            ),
                                            if (insufficientQty)
                                              Padding(
                                                padding: const EdgeInsets.only(top: 2),
                                                child: Text(
                                                  '${'quantity_exceeds_available'.tr}',
                                                  style: TextStyle(
                                                    fontSize: 11,
                                                    color: Colors.red[400],
                                                  ),
                                                ),
                                              ),
                                          ],
                                        ),
                                      ),
                                      if (insufficientQty)
                                        Icon(
                                          Icons.block_rounded,
                                          size: 20,
                                          color: Colors.red[400],
                                        ),
                                    ],
                                  ),
                                );
                              }).toList(),
                              onChanged: (value) {
                                setState(() {
                                  selectedToPackagingTypeId = value!;
                                  quantityInPackagingUnits = 0;
                                });
                              },
                            ),
                          ),

                          const SizedBox(height: 24),

                          // Quantity selector
                          Text(
                            'quantity_to_convert'.tr,
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: Colors.black54,
                            ),
                          ),
                          const SizedBox(height: 12),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              // Minus button
                              _buildQuantityButton(
                                icon: Icons.remove_rounded,
                                color: Colors.red,
                                enabled: quantityInPackagingUnits >= stepSize,
                                onPressed: () {
                                  setState(() {
                                    quantityInPackagingUnits = (quantityInPackagingUnits - stepSize).clamp(0, maxPossibleUnits);
                                  });
                                },
                              ),

                              // Quantity display
                              Container(
                                margin: const EdgeInsets.symmetric(horizontal: 16),
                                padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
                                constraints: const BoxConstraints(minWidth: 120),
                                decoration: BoxDecoration(
                                  gradient: const LinearGradient(
                                    colors: [Color(0xFF5C6BC0), Color(0xFF7986CB)],
                                    begin: Alignment.topLeft,
                                    end: Alignment.bottomRight,
                                  ),
                                  borderRadius: BorderRadius.circular(20),
                                  boxShadow: [
                                    BoxShadow(
                                      color: const Color(0xFF5C6BC0).withOpacity(0.4),
                                      blurRadius: 12,
                                      offset: const Offset(0, 6),
                                    ),
                                  ],
                                ),
                                child: Column(
                                  children: [
                                    Text(
                                      '$quantityInPackagingUnits',
                                      style: const TextStyle(
                                        fontSize: 32,
                                        fontWeight: FontWeight.bold,
                                        color: Colors.white,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      batch.packagingTypeName,
                                      textAlign: TextAlign.center,
                                      style: const TextStyle(
                                        fontSize: 12,
                                        color: Colors.white70,
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                  ],
                                ),
                              ),

                              // Plus button
                              _buildQuantityButton(
                                icon: Icons.add_rounded,
                                color: Colors.green,
                                enabled: (quantityInPackagingUnits + stepSize) <= maxPossibleUnits,
                                onPressed: () {
                                  setState(() {
                                    final newQuantity = quantityInPackagingUnits + stepSize;
                                    if (newQuantity <= maxPossibleUnits) {
                                      quantityInPackagingUnits = newQuantity;
                                    }
                                  });
                                },
                              ),
                            ],
                          ),

                          const SizedBox(height: 20),

                          // Info cards
                          Container(
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: Colors.grey[50],
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: Colors.grey[200]!),
                            ),
                            child: Column(
                              children: [
                                _buildInfoRow(
                                  Icons.straighten,
                                  '${'equivalent_to'.tr}:',
                                  '${equivalentInTargetPackaging.toStringAsFixed(1)} ${selectedPackagingType.packagingTypesName}',
                                  Colors.blue,
                                ),
                                const Divider(height: 16),
                                _buildInfoRow(
                                  Icons.playlist_add_check,
                                  '${'maximum'.tr}:',
                                  '$maxPossibleUnits ${batch.packagingTypeName}',
                                  Colors.orange,
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  // Action buttons
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.grey[50],
                      borderRadius: const BorderRadius.vertical(bottom: Radius.circular(28)),
                      border: Border(top: BorderSide(color: Colors.grey[200]!)),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: TextButton(
                            onPressed: () => UltraSafeNavigation.back(context),
                            style: TextButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                            child: Text(
                              'cancel'.tr,
                              style: const TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          flex: 2,
                          child: ElevatedButton(
                            onPressed: quantityInPackagingUnits > 0 && quantityInPackagingUnits <= maxPossibleUnits
                                ? () {
                                    // Send quantity in original packaging units (not base units)
                                    // The API expects the quantity from the source batch packaging
                                    controller.repackInventory(
                                      inventoryId: batch.inventoryId,
                                      toPackagingTypeId: selectedToPackagingTypeId,
                                      quantityToConvert: quantityInPackagingUnits.toDouble(),
                                    );
                                    UltraSafeNavigation.back(context);
                                  }
                                : null,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF5C6BC0),
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              elevation: 0,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                            child: Text(
                              'confirm'.tr,
                              style: const TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildQuantityButton({
    required IconData icon,
    required Color color,
    required bool enabled,
    required VoidCallback onPressed,
  }) {
    return Material(
      color: enabled ? color.withOpacity(0.1) : Colors.grey[200],
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: enabled ? onPressed : null,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: enabled ? color.withOpacity(0.3) : Colors.grey[300]!,
              width: 2,
            ),
          ),
          child: Icon(
            icon,
            color: enabled ? color : Colors.grey[400],
            size: 24,
          ),
        ),
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String label, String value, Color color) {
    return Row(
      children: [
        Icon(icon, size: 18, color: color),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            label,
            style: TextStyle(
              fontSize: 12,
              color: Colors.grey[600],
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
        Text(
          value,
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.bold,
            color: Colors.black87,
          ),
        ),
      ],
    );
  }
}
