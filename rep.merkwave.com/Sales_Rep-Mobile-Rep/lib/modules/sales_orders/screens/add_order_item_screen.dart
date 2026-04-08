// lib/modules/sales_orders/screens/add_order_item_screen.dart
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '/data/models/product_lookup.dart'; // ProductVariant, PackagingType
import '/data/models/warehouse_product_variant.dart'; // NEW: Warehouse products and AvailablePackaging
import '/modules/sales_orders/controllers/add_order_item_controller.dart';
import '/modules/shared/controllers/global_data_controller.dart'; // For accessing packaging types
import '/shared_widgets/custom_app_bar.dart';
import '/shared_widgets/loading_indicator.dart';
import '/data/models/sales_order_item.dart'; // For displaying added items
import '/shared_widgets/searchable_dropdown.dart';
import '/core/utils/formatting.dart';
import '/shared_widgets/formatted_amount_field.dart';

class AddOrderItemScreen extends GetView<AddOrderItemController> {
  const AddOrderItemScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final isEditingSingleItem = Get.arguments != null && Get.arguments is SalesOrderItem;
    return Scaffold(
      appBar: CustomAppBar(title: isEditingSingleItem ? 'edit_order_item'.tr : 'add_order_item'.tr),
      body: Obx(() {
        if (controller.isLoading.value) return LoadingIndicator(message: 'loading_products'.tr);
        if (controller.errorMessage.isNotEmpty) {
          return Center(child: Text(controller.errorMessage.value, style: Get.textTheme.titleMedium?.copyWith(color: Colors.red)));
        }
        return Column(
          children: [
            _ProgressHeader(controller: controller),
            const Divider(height: 1),
            Expanded(child: _StepContent(isEditing: isEditingSingleItem, controller: controller)),
            _BottomBar(isEditing: isEditingSingleItem, controller: controller),
          ],
        );
      }),
    );
  }
}

// --- Progress Header ---
class _ProgressHeader extends StatelessWidget {
  final AddOrderItemController controller;
  const _ProgressHeader({required this.controller});
  @override
  Widget build(BuildContext context) {
    final steps = ['variant'.tr, 'pack_qty'.tr, 'pricing'.tr, 'review'.tr];
    return Obx(() => Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          child: Row(
            children: List.generate(steps.length, (i) {
              final active = controller.currentStep.value == i;
              final done = controller.currentStep.value > i;
              return Expanded(
                child: Column(
                  children: [
                    AnimatedContainer(
                      duration: const Duration(milliseconds: 250),
                      height: 6,
                      decoration: BoxDecoration(
                        color: done
                            ? Colors.green
                            : active
                                ? Get.theme.primaryColor
                                : Colors.grey.shade300,
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      steps[i],
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: active ? FontWeight.w600 : FontWeight.w400,
                        color: active ? Get.theme.primaryColor : (done ? Colors.green : Colors.grey.shade600),
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              );
            }),
          ),
        ));
  }
}

// --- Step Content Switcher ---
class _StepContent extends StatelessWidget {
  final bool isEditing;
  final AddOrderItemController controller;
  const _StepContent({required this.isEditing, required this.controller});
  @override
  Widget build(BuildContext context) {
    return Obx(() {
      final step = controller.currentStep.value;
      Widget child;
      switch (step) {
        case 0:
          child = _VariantStep(controller: controller);
          break;
        case 1:
          child = _PackagingQtyStep(controller: controller);
          break;
        case 2:
          child = _PricingTaxStep(controller: controller);
          break;
        default:
          child = _ReviewStepItem(isEditing: isEditing, controller: controller);
      }
      return AnimatedSwitcher(
        duration: const Duration(milliseconds: 300),
        transitionBuilder: (c, anim) => FadeTransition(opacity: anim, child: c),
        child: Builder(builder: (context) {
          final inset = MediaQuery.viewInsetsOf(context).bottom;
          return SingleChildScrollView(
            key: ValueKey(step),
            padding: EdgeInsets.fromLTRB(16, 16, 16, 16 + inset),
            child: child,
          );
        }),
      );
    });
  }
}

// --- Variant Step ---
class _VariantStep extends StatelessWidget {
  final AddOrderItemController controller;
  const _VariantStep({required this.controller});
  @override
  Widget build(BuildContext context) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Obx(() => Row(
            children: [
              Text(controller.showAllProducts.value ? 'all_products_mode'.tr : 'in_stock_mode'.tr, style: Get.textTheme.bodyMedium),
              const SizedBox(width: 8),
              Switch(
                value: controller.showAllProducts.value,
                onChanged: (_) => controller.toggleShowAllProducts(),
              ),
              const SizedBox(width: 8),
              if (!controller.showAllProducts.value && controller.selectedWarehouse.value != null) Text('${'warehouse'.tr}: ${controller.selectedWarehouse.value!.warehouseName}', style: Get.textTheme.bodySmall),
            ],
          )),
      const SizedBox(height: 8),
      if (controller.useWarehouseInventory.value && controller.selectedWarehouse.value != null)
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Get.theme.primaryColor.withOpacity(0.06),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Row(children: [
            const Icon(Icons.store, size: 18),
            const SizedBox(width: 8),
            Expanded(child: Text(controller.selectedWarehouse.value!.warehouseName, style: Get.textTheme.bodyMedium)),
          ]),
        ),
      const SizedBox(height: 14),
      Obx(() {
        final inInventoryMode = !controller.showAllProducts.value && controller.useWarehouseInventory.value;
        if (inInventoryMode) {
          return SearchableDropdown<WarehouseProductVariant>(
            labelText: 'select_product_variant'.tr,
            hintText: 'search_by_variant_name'.tr,
            searchPlaceholder: 'search_variant'.tr,
            options: controller.filteredWarehouseProducts.map((v) => DropdownOption(value: v, label: v.variantName ?? 'unknown'.tr)).toList(),
            value: controller.selectedWarehouseVariant.value != null ? DropdownOption(value: controller.selectedWarehouseVariant.value!, label: controller.selectedWarehouseVariant.value!.variantName ?? 'unknown'.tr) : null,
            onChanged: (o) => controller.onWarehouseVariantSelected(o?.value),
            validator: (v) => v == null ? 'please_select_variant'.tr : null,
          );
        }
        return SearchableDropdown<ProductVariant>(
          labelText: 'select_product_variant'.tr,
          hintText: 'search_by_variant_name'.tr,
          searchPlaceholder: 'search_variant'.tr,
          options: controller.filteredProductVariants.map((v) => DropdownOption(value: v, label: v.variantName)).toList(),
          value: controller.selectedVariant.value != null ? DropdownOption(value: controller.selectedVariant.value!, label: controller.selectedVariant.value!.variantName) : null,
          onChanged: (o) => controller.onVariantSelected(o?.value),
          validator: (v) => v == null ? 'please_select_variant'.tr : null,
        );
      }),
      const SizedBox(height: 16),
      Obx(() {
        final variant = controller.selectedVariant.value;
        final warehouseVariant = controller.selectedWarehouseVariant.value;
        if (variant == null && warehouseVariant == null) return const SizedBox.shrink();
        final taxRate = variant?.variantTaxRate ?? warehouseVariant?.taxRate;
        final hasTax = variant?.variantHasTax ?? warehouseVariant?.hasTax;
        return Card(
          elevation: 0,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          color: Get.theme.colorScheme.surfaceVariant.withOpacity(0.4),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('variant_info'.tr, style: Get.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold)),
              const SizedBox(height: 6),
              if (variant?.variantSku != null || warehouseVariant?.variantSku != null) Text('${'sku'.tr}: ${variant?.variantSku ?? warehouseVariant?.variantSku}', style: Get.textTheme.bodySmall),
              Text('${'tax_applicable'.tr}: ${hasTax == true ? 'yes'.tr : hasTax == false ? 'no'.tr : 'unknown'.tr}'),
              Text('${'tax_rate'.tr}: ${taxRate != null ? taxRate.toStringAsFixed(2) : '-'}%'),
            ]),
          ),
        );
      })
    ]);
  }
}

// --- Packaging & Quantity Step ---
class _PackagingQtyStep extends StatelessWidget {
  final AddOrderItemController controller;
  const _PackagingQtyStep({required this.controller});
  @override
  Widget build(BuildContext context) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Obx(() {
        final inWarehouseMode = !controller.showAllProducts.value && controller.useWarehouseInventory.value;
        if (inWarehouseMode && controller.selectedWarehouseVariant.value != null) {
          final pkgs = controller.selectedWarehouseVariant.value!.availablePackaging;
          if (pkgs.isEmpty) {
            return _InfoBanner(icon: Icons.inventory_2, color: Colors.orange, text: 'no_packaging_available'.tr);
          }
          return DropdownButtonFormField<AvailablePackaging>(
            decoration: InputDecoration(labelText: 'select_packaging_type'.tr, border: OutlineInputBorder(borderRadius: BorderRadius.circular(12))),
            value: controller.selectedWarehousePackaging.value,
            onChanged: controller.onWarehousePackagingSelected,
            items: pkgs.map((p) => DropdownMenuItem(value: p, child: Text('${p.packagingTypeName ?? 'unknown'.tr} (${p.totalQuantity.toStringAsFixed(0)})'))).toList(),
          );
        } else if ((!inWarehouseMode) && controller.selectedVariant.value != null) {
          // Get compatible packaging types (preferred or all compatible with base unit)
          final variant = controller.selectedVariant.value!;
          final List<PackagingType> availablePackaging;

          if (variant.preferredPackaging.isNotEmpty) {
            // Use preferred packaging
            availablePackaging = variant.preferredPackaging
                .map((p) => PackagingType(
                      packagingTypesId: p.packagingTypesId,
                      packagingTypesName: p.packagingTypesName,
                    ))
                .toList();
          } else {
            // Use all packaging types compatible with the variant's base unit
            final baseUnitId = variant.productsUnitOfMeasureId;
            if (baseUnitId != null) {
              final globalData = Get.find<GlobalDataController>();
              availablePackaging = globalData.packagingTypes.where((pkg) => pkg.packagingTypesCompatibleBaseUnitId == baseUnitId).toList();
            } else {
              availablePackaging = [];
            }
          }

          // Check if packaging list is empty
          if (availablePackaging.isEmpty) {
            return _InfoBanner(
              icon: Icons.warning,
              color: Colors.orange,
              text: 'no_packaging_available'.tr,
            );
          }

          return DropdownButtonFormField<PackagingType>(
            decoration: InputDecoration(labelText: 'select_packaging_type'.tr, border: OutlineInputBorder(borderRadius: BorderRadius.circular(12))),
            value: controller.selectedPackagingType.value,
            onChanged: controller.onPackagingTypeSelected,
            items: availablePackaging
                .map((p) => DropdownMenuItem(
                      value: p,
                      child: Text(p.packagingTypesName),
                    ))
                .toList(),
          );
        }
        return _InfoBanner(icon: Icons.info_outline, color: Colors.grey, text: 'please_select_variant_first'.tr);
      }),
      const SizedBox(height: 20),

      // Quantity section title and description
      Text(
        'quantity'.tr,
        style: Get.textTheme.titleMedium?.copyWith(
          fontWeight: FontWeight.bold,
          color: Get.theme.primaryColor,
        ),
      ),
      const SizedBox(height: 8),
      Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Get.theme.primaryColor.withOpacity(0.05),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: Get.theme.primaryColor.withOpacity(0.2)),
        ),
        child: Row(
          children: [
            Icon(Icons.info_outline, color: Get.theme.primaryColor, size: 20),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                'please_enter_quantity'.tr,
                style: TextStyle(
                  color: Get.theme.primaryColor,
                  fontSize: 14,
                ),
              ),
            ),
          ],
        ),
      ),
      const SizedBox(height: 16),

      Obx(() {
        final maxQty = controller.maxAvailableQuantity;
        final exceeds = maxQty != null && controller.liveQuantity > maxQty;
        final inWarehouseMode = !controller.showAllProducts.value && controller.useWarehouseInventory.value;
        final hasPackagingSelected = inWarehouseMode ? controller.selectedWarehousePackaging.value != null : controller.selectedPackagingType.value != null;

        return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          TextFormField(
            controller: controller.quantityController,
            enabled: hasPackagingSelected, // Disable until packaging is selected
            autofocus: hasPackagingSelected,
            keyboardType: TextInputType.number,
            decoration: InputDecoration(
              labelText: 'quantity'.tr,
              hintText: !hasPackagingSelected ? 'select_packaging_first'.tr : (maxQty != null ? 'max_available'.tr + ': ${maxQty.toStringAsFixed(0)}' : 'enter_quantity_hint'.tr),
              suffixIcon: maxQty != null && hasPackagingSelected
                  ? TextButton(
                      onPressed: () {
                        controller.quantityController.text = maxQty.toStringAsFixed(0);
                        controller.onQuantityChanged(maxQty.toStringAsFixed(0));
                      },
                      child: Text('max_short'.tr),
                    )
                  : null,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              filled: !hasPackagingSelected,
              fillColor: !hasPackagingSelected ? Colors.grey.shade100 : null,
            ),
            onChanged: (value) {
              controller.onQuantityChanged(value);
            },
          ),
          if (!hasPackagingSelected)
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: _InfoBanner(icon: Icons.inventory_2_outlined, color: Colors.orange, text: 'select_packaging_before_quantity'.tr),
            ),
          if (hasPackagingSelected && maxQty != null)
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Text('max_quantity_label'.trParams({'max': maxQty.toStringAsFixed(0)}), style: TextStyle(color: exceeds ? Colors.red : Colors.blue, fontSize: 12)),
            ),
          if (hasPackagingSelected && exceeds && inWarehouseMode)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.red.shade50,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.red.shade200),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.warning, color: Colors.red, size: 20),
                        const SizedBox(width: 8),
                        Text(
                          'quantity_exceeds_warning'.tr,
                          style: TextStyle(
                            color: Colors.red.shade700,
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'quantity_exceed_options'.tr,
                      style: TextStyle(
                        color: Colors.red.shade700,
                        fontSize: 13,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () => controller.toggleShowAllProducts(),
                            icon: const Icon(Icons.inventory, size: 16),
                            label: Text('use_all_products'.tr, style: const TextStyle(fontSize: 12)),
                            style: OutlinedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              minimumSize: const Size(0, 32),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () {
                              controller.quantityController.text = maxQty.toStringAsFixed(0);
                              controller.onQuantityChanged(maxQty.toStringAsFixed(0));
                            },
                            icon: const Icon(Icons.edit, size: 16),
                            label: Text('fix_quantity'.tr, style: const TextStyle(fontSize: 12)),
                            style: OutlinedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              minimumSize: const Size(0, 32),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
        ]);
      })
    ]);
  }
}

// --- Pricing & Tax Step ---
class _PricingTaxStep extends StatelessWidget {
  final AddOrderItemController controller;
  const _PricingTaxStep({required this.controller});
  @override
  Widget build(BuildContext context) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Obx(() {
        final packagingName = controller.selectedPackagingDisplayName;
        final labelText = packagingName != null ? '${'unit_price'.tr} ($packagingName)' : 'unit_price'.tr;
        return FormattedAmountField(
          controller: controller.unitPriceController,
          labelText: labelText,
          onChanged: controller.onUnitPriceChanged,
        );
      }),
      const SizedBox(height: 14),
      Obx(() {
        final packagingName = controller.selectedPackagingDisplayName;
        final discountLabel = packagingName != null ? '${'discount_amount'.tr} ($packagingName)' : 'discount_amount'.tr;
        return FormattedAmountField(
          controller: controller.discountAmountController,
          labelText: discountLabel,
          onChanged: controller.onDiscountChanged,
        );
      }),
      const SizedBox(height: 14),
      // FIXED: Always show tax section to allow users to add tax to any product
      Obx(() {
        final hasTax = controller.hasTax.value;
        return Column(children: [
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: Text('apply_tax'.tr),
            value: hasTax,
            onChanged: (v) {
              controller.hasTax.value = v;
              controller.taxRateController.text = v ? controller.calculatedTaxRate.value.toStringAsFixed(2) : '0.00';
            },
          ),
          AnimatedOpacity(
            opacity: hasTax ? 1 : 0.4,
            duration: const Duration(milliseconds: 200),
            child: TextFormField(
              controller: controller.taxRateController,
              enabled: hasTax,
              keyboardType: TextInputType.number,
              decoration: InputDecoration(labelText: 'tax_rate_percentage'.tr, suffixText: '%', border: OutlineInputBorder(borderRadius: BorderRadius.circular(12))),
            ),
          ),
          const SizedBox(height: 20),
        ]);
      }),
      // Removed redundant Obx: _TotalsPreview already contains its own Obx for reactive fields
      _TotalsPreview(controller: controller),
    ]);
  }
}

// --- Review Step ---
class _ReviewStepItem extends StatelessWidget {
  final bool isEditing;
  final AddOrderItemController controller;
  const _ReviewStepItem({required this.isEditing, required this.controller});
  @override
  Widget build(BuildContext context) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      _TotalsPreview(controller: controller),
      const SizedBox(height: 16),
      // TextField(
      //   controller: controller.notesController,
      //   decoration: InputDecoration(labelText: 'item_notes'.tr, border: OutlineInputBorder(borderRadius: BorderRadius.circular(12))),
      //   maxLines: 2,
      // ),
      const SizedBox(height: 24),
      if (!isEditing && controller.itemsToAdd.isNotEmpty)
        Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('added_items'.tr, style: Get.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          ...controller.itemsToAdd.map((item) => Card(
                child: ListTile(
                  title: Text(item.variantName ?? '-'),
                  subtitle: Text('${item.quantity.toStringAsFixed(2)} x ${Formatting.amount(item.unitPrice)}'),
                  trailing: Text(Formatting.amount(item.totalAmount), style: const TextStyle(fontWeight: FontWeight.bold)),
                ),
              )),
        ]),
    ]);
  }
}

// --- Totals Preview Widget ---
class _TotalsPreview extends StatelessWidget {
  final AddOrderItemController controller;
  const _TotalsPreview({required this.controller});
  @override
  Widget build(BuildContext context) {
    return Obx(() {
      final itemName = controller.selectedItemDisplayName;
      final packagingName = controller.selectedPackagingDisplayName;
      final conversionFactor = controller.selectedPackagingConversionFactor;
      final baseUnitName = controller.selectedBaseUnitName;
      final totalBaseUnits = controller.totalQuantityInBaseUnits;
      final quantitySummary = packagingName != null ? '${_formatNumber(controller.liveQuantity)} $packagingName${totalBaseUnits != null ? ' (${_formatNumber(totalBaseUnits)} $baseUnitName)' : ''}' : _formatNumber(controller.liveQuantity);
      final packagingSummary = packagingName != null ? (conversionFactor != null ? '$packagingName (1 = ${_formatNumber(conversionFactor)} $baseUnitName)' : packagingName) : null;
      final packagingPrice = controller.liveUnitPrice;
      final basePrice = controller.liveBaseUnitPrice;
      final priceValue = packagingSummary != null && basePrice != null && conversionFactor != null ? '${Formatting.amount(packagingPrice)} = ${_formatNumber(conversionFactor)} × ${Formatting.amount(basePrice)}' : Formatting.amount(packagingPrice);
      final discountTotal = controller.liveDiscountTotal;
      final discountPerPack = controller.liveDiscountPerPack;
      final discountDisplay = discountPerPack > 0 && controller.liveQuantity > 0 ? '${Formatting.amount(discountTotal)} (${Formatting.amount(discountPerPack)} × ${_formatNumber(controller.liveQuantity)})' : Formatting.amount(discountTotal);

      return Card(
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: Colors.grey.shade300)),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('summary'.tr, style: Get.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 6),
            _kv('item'.tr, itemName),
            if (packagingSummary != null) _kv('packaging'.tr, packagingSummary),
            _kv('unit_price'.tr, priceValue),
            const Divider(height: 18),
            _kv('qty'.tr, quantitySummary),
            _kv('subtotal'.tr, Formatting.amount(controller.liveSubtotal)),
            _kv('discount'.tr, discountDisplay),
            // FIXED: Show tax line when tax is applied (hasTax = true)
            if (controller.hasTax.value) _kv('tax'.tr, Formatting.amount(controller.liveTaxAmount)),
            const Divider(height: 18),
            _kv('total'.tr, Formatting.amount(controller.liveTotal), isBold: true),
          ]),
        ),
      );
    });
  }

  Widget _kv(String k, String v, {bool isBold = false}) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 3),
        child: Row(children: [
          Expanded(child: Text(k)),
          Expanded(
            child: Text(
              v,
              style: TextStyle(fontWeight: isBold ? FontWeight.bold : FontWeight.w500),
              textAlign: TextAlign.end,
              overflow: TextOverflow.ellipsis,
              maxLines: 2,
            ),
          ),
        ]),
      );

  int _decimalsFor(double value) => value % 1 == 0 ? 0 : 2;

  String _formatNumber(double value) => Formatting.formatNumber(value, decimals: _decimalsFor(value));
}

// --- Bottom Navigation Bar ---
class _BottomBar extends StatelessWidget {
  final bool isEditing;
  final AddOrderItemController controller;
  const _BottomBar({required this.isEditing, required this.controller});
  @override
  Widget build(BuildContext context) {
    return Obx(() {
      final isLast = controller.currentStep.value == controller.totalSteps - 1;
      final canGoBack = controller.currentStep.value > 0;
      return Container(
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 16),
        decoration: BoxDecoration(color: Theme.of(context).colorScheme.surface, boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 6)]),
        child: Row(children: [
          if (canGoBack) OutlinedButton(onPressed: controller.previousStep, child: Text('back'.tr)),
          if (canGoBack) const SizedBox(width: 12),
          if (!isLast)
            Expanded(
              child: ElevatedButton(
                onPressed: controller.doesQuantityExceedAvailable() ? null : controller.nextStep,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  backgroundColor: controller.doesQuantityExceedAvailable() ? Colors.grey : null,
                ),
                child: Obx(() {
                  final currentStep = controller.currentStep.value;
                  final inWarehouseMode = !controller.showAllProducts.value && controller.useWarehouseInventory.value;

                  // Step 0: Variant selection step
                  if (currentStep == 0) {
                    if (inWarehouseMode) {
                      if (controller.selectedWarehouseVariant.value == null) {
                        return Text('select_variant_first'.tr);
                      }
                    } else {
                      if (controller.selectedVariant.value == null) {
                        return Text('select_variant_first'.tr);
                      }
                    }
                    return Text('next'.tr);
                  }

                  // Step 1+: Packaging and quantity steps
                  final hasPackagingSelected = inWarehouseMode ? controller.selectedWarehousePackaging.value != null : controller.selectedPackagingType.value != null;

                  if (!hasPackagingSelected) {
                    return Text('select_packaging_first_btn'.tr);
                  } else if (controller.doesQuantityExceedAvailable()) {
                    return Text('quantity_exceeds_available'.tr);
                  } else {
                    return Text('next'.tr);
                  }
                }),
              ),
            )
          else
            Expanded(
              child: ElevatedButton(
                onPressed: controller.doesQuantityExceedAvailable()
                    ? null
                    : () async {
                        // First check validation without showing snackbars
                        if (!controller.validateItemForm(showSnackbars: false)) {
                          // Check if the issue is quantity exceeding available stock
                          if (controller.doesQuantityExceedAvailable()) {
                            // Store context to avoid async gap warning
                            final currentContext = context;
                            // Show price quote dialog instead of snackbar
                            final shouldSwitchToAllProducts = await controller.showPriceQuoteDialog(currentContext); // ignore: use_build_context_synchronously
                            if (shouldSwitchToAllProducts) {
                              await controller.handleQuantityExceeded(currentContext); // ignore: use_build_context_synchronously
                              return; // Don't proceed with adding item
                            } else {
                              // User chose to keep warehouse inventory, show the quantity error
                              final availableQty = controller.getAvailableQuantity();
                              final packagingName = controller.selectedWarehousePackaging.value?.packagingTypeName ?? 'units'.tr;
                              Get.snackbar(
                                'quantity_exceeds_available'.tr,
                                'quantity_exceeds_available_with_unit'.trParams({
                                  'max': (availableQty?.toStringAsFixed(0) ?? '0'),
                                  'unit': packagingName,
                                }),
                                snackPosition: SnackPosition.BOTTOM,
                                backgroundColor: Colors.orange,
                                colorText: Colors.white,
                              );
                              return;
                            }
                          } else {
                            // Other validation errors, show snackbars for user feedback
                            controller.validateItemForm(showSnackbars: true);
                            return;
                          }
                        }

                        // Validation passed, build item and navigate
                        if (isEditing) {
                          final updated = controller.buildOrderItem();
                          if (updated != null) {
                            Navigator.of(context).pop(updated);
                          }
                        } else {
                          final item = controller.buildOrderItem();
                          if (item != null) {
                            Navigator.of(context).pop([item]);
                          }
                        }
                      },
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  backgroundColor: controller.doesQuantityExceedAvailable() ? Colors.grey : null,
                ),
                child: Text(controller.doesQuantityExceedAvailable() ? 'quantity_exceeds_available'.tr : (isEditing ? 'save_item'.tr : 'add_finish'.tr)),
              ),
            ),
        ]),
      );
    });
  }
}

// --- Info Banner Reusable ---
class _InfoBanner extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String text;
  const _InfoBanner({required this.icon, required this.color, required this.text});
  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: color.withOpacity(0.08), borderRadius: BorderRadius.circular(10), border: Border.all(color: color.withOpacity(0.3))),
      child: Row(children: [
        Icon(icon, size: 18, color: color),
        const SizedBox(width: 8),
        Expanded(child: Text(text, style: TextStyle(color: color))),
      ]),
    );
  }
}
