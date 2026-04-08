// lib/modules/sales_orders/screens/quick_add_order_items_screen.dart
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:get/get.dart';
import '/core/utils/formatting.dart';
import '/data/models/product_lookup.dart';
import '/data/models/warehouse_product_variant.dart';
import '/modules/sales_orders/controllers/quick_add_order_items_controller.dart';
import '/shared_widgets/custom_app_bar.dart';
import '/shared_widgets/loading_indicator.dart';

class QuickAddOrderItemsScreen extends GetView<QuickAddOrderItemsController> {
  const QuickAddOrderItemsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: CustomAppBar(title: 'add_item'.tr),
      body: Obx(() {
        if (controller.isLoading.value) {
          return const LoadingIndicator();
        }
        return Column(
          children: [
            if (controller.inventoryAvailable)
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
                child: _buildModeToggle(),
              ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
              child: _buildSearchBar(),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: _buildCategoryDropdown(),
            ),
            const SizedBox(height: 8),
            Expanded(
              child: DefaultTabController(
                length: 2,
                child: Column(
                  children: [
                    TabBar(
                      labelColor: Get.theme.colorScheme.primary,
                      indicatorColor: Get.theme.colorScheme.primary,
                      unselectedLabelColor: Get.theme.textTheme.bodyMedium?.color,
                      tabs: [
                        Tab(text: 'products'.tr),
                        Obx(() {
                          final count = controller.distinctItemCount;
                          return Tab(
                            text: count == 0 ? 'order'.tr : 'order'.tr + ' ($count)',
                          );
                        }),
                      ],
                    ),
                    Expanded(
                      child: TabBarView(
                        children: [
                          Obx(() => _buildProductsList()),
                          Obx(() => _buildCartList()),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        );
      }),
      bottomNavigationBar: Obx(() {
        final canSubmit = controller.cartItems.isNotEmpty;
        final subtotal = Formatting.amount(controller.cartSubtotal);
        final tax = Formatting.amount(controller.cartTaxTotal);
        final total = Formatting.amount(controller.cartGrandTotal);
        return Container(
          decoration: BoxDecoration(
            color: Get.theme.colorScheme.surface,
            boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, -2))],
          ),
          child: SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (canSubmit)
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('subtotal'.tr, style: Get.textTheme.bodyMedium),
                            Text(subtotal, style: Get.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600)),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('tax'.tr, style: Get.textTheme.bodyMedium),
                            Text(tax, style: Get.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600)),
                          ],
                        ),
                        const Divider(height: 20),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('total'.tr, style: Get.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                            Text(total, style: Get.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                          ],
                        ),
                        const SizedBox(height: 12),
                      ],
                    ),
                  ElevatedButton.icon(
                    onPressed: canSubmit
                        ? () {
                            final items = controller.buildSalesOrderItems();
                            if (items.isEmpty) {
                              Get.snackbar('warning'.tr, 'cart_empty'.tr, snackPosition: SnackPosition.BOTTOM);
                              return;
                            }
                            Get.back(result: items);
                          }
                        : null,
                    icon: const Icon(Icons.playlist_add_check),
                    label: Text('add'.tr),
                    style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14)),
                  ),
                ],
              ),
            ),
          ),
        );
      }),
    );
  }

  Widget _buildModeToggle() {
    return Obx(() {
      final inventoryMode = controller.useInventoryMode.value;
      return Row(
        children: [
          Expanded(
            child: _ModeToggleButton(
              active: inventoryMode,
              label: 'inventory'.tr,
              icon: Icons.store,
              onTap: () => controller.toggleMode(true),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: _ModeToggleButton(
              active: !inventoryMode,
              label: 'all_products_mode'.tr,
              icon: Icons.inventory_2,
              onTap: () => controller.toggleMode(false),
            ),
          ),
        ],
      );
    });
  }

  Widget _buildSearchBar() {
    return TextField(
      decoration: InputDecoration(
        hintText: 'search_products_hint'.tr,
        prefixIcon: const Icon(Icons.search),
        filled: true,
        fillColor: Get.theme.colorScheme.surface,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
      ),
      onChanged: (value) => controller.searchQuery.value = value,
    );
  }

  Widget _buildCategoryDropdown() {
    final categories = controller.categories;
    if (categories.isEmpty) {
      return const SizedBox.shrink();
    }
    return Obx(() {
      return DropdownButtonFormField<int?>(
        value: controller.selectedCategoryId.value,
        decoration: InputDecoration(
          labelText: 'categories'.tr,
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        ),
        items: [
          DropdownMenuItem<int?>(value: null, child: Text('all'.tr)),
          ...categories.map(
            (cat) => DropdownMenuItem<int?>(value: cat.categoriesId, child: Text(cat.categoriesName)),
          ),
        ],
        onChanged: (value) => controller.selectedCategoryId.value = value,
      );
    });
  }

  Widget _buildProductsList() {
    final inventoryMode = controller.useInventoryMode.value && controller.inventoryAvailable;
    if (inventoryMode) {
      final variants = controller.filteredInventoryVariants;
      if (variants.isEmpty) {
        return Center(child: Text('no_products_available'.tr));
      }
      return ListView.builder(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        itemCount: variants.length,
        itemBuilder: (context, index) => _InventoryVariantCard(
          variant: variants[index],
          onAdd: () => _showAddSheet(
            context,
            variants[index].toProductVariant(),
            inventoryVariant: variants[index],
          ),
        ),
      );
    }
    final variants = controller.filteredCatalogVariants;
    if (variants.isEmpty) {
      return Center(child: Text('no_products_available'.tr));
    }
    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      itemCount: variants.length,
      itemBuilder: (context, index) => _CatalogVariantCard(
        variant: variants[index],
        onAdd: () => _showAddSheet(context, variants[index]),
      ),
    );
  }

  Widget _buildCartList() {
    if (controller.cartItems.isEmpty) {
      return Center(child: Text('cart_empty'.tr));
    }
    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
      itemCount: controller.cartItems.length,
      itemBuilder: (context, index) {
        final item = controller.cartItems[index];
        return Obx(() {
          final maxQty = item.availableQuantity;
          final borderRadius = BorderRadius.circular(16);
          return Tooltip(
            message: '${'edit'.tr} ${'price'.tr} & ${'tax'.tr}',
            child: Card(
              shape: RoundedRectangleBorder(borderRadius: borderRadius),
              margin: const EdgeInsets.only(bottom: 12),
              child: InkWell(
                borderRadius: borderRadius,
                onTap: () => _showEditItemSheet(context, item),
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(item.variant.variantName, style: Get.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                                const SizedBox(height: 4),
                                Text(
                                  '${item.packaging.packagingTypesName} • ${Formatting.amount(item.packagingUnitPrice)}',
                                  style: Get.textTheme.bodySmall,
                                ),
                                const SizedBox(height: 6),
                                Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const Icon(Icons.edit, size: 16, color: Colors.blueGrey),
                                    const SizedBox(width: 4),
                                    Text('edit'.tr, style: Get.textTheme.bodySmall?.copyWith(color: Colors.blueGrey)),
                                  ],
                                ),
                                if (maxQty != null)
                                  Padding(
                                    padding: const EdgeInsets.only(top: 4),
                                    child: Text(
                                      'available_quantity'.trParams({'qty': maxQty.toStringAsFixed(0)}),
                                      style: Get.textTheme.bodySmall?.copyWith(color: Colors.green.shade700),
                                    ),
                                  ),
                              ],
                            ),
                          ),
                          IconButton(
                            tooltip: 'delete'.tr,
                            onPressed: () => controller.removeItem(item),
                            icon: const Icon(Icons.delete_outline, color: Colors.redAccent),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          IconButton(
                            onPressed: () => item.decrement(),
                            icon: const Icon(Icons.remove_circle, color: Colors.redAccent),
                          ),
                          SizedBox(
                            width: 80,
                            child: TextFormField(
                              controller: item.quantityController,
                              textAlign: TextAlign.center,
                              keyboardType: const TextInputType.numberWithOptions(decimal: true),
                              inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9.]'))],
                              decoration: const InputDecoration(isDense: true, contentPadding: EdgeInsets.symmetric(vertical: 8, horizontal: 6)),
                              onChanged: (value) {
                                final newQty = double.tryParse(value);
                                if (newQty == null) return;
                                item.setQuantity(newQty);
                              },
                            ),
                          ),
                          IconButton(
                            onPressed: () => item.increment(),
                            icon: const Icon(Icons.add_circle, color: Colors.green),
                          ),
                          const Spacer(),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(Formatting.amount(item.subtotal), style: Get.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600)),
                              if (item.hasTax && item.taxAmount > 0)
                                Text(
                                  '+ ${Formatting.amount(item.taxAmount)} ${'tax'.tr}',
                                  style: Get.textTheme.bodySmall?.copyWith(color: Colors.blueGrey),
                                ),
                            ],
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
          );
        });
      },
    );
  }

  Future<void> _showEditItemSheet(BuildContext context, QuickOrderCartItem item) async {
    String formatEditable(double value) {
      if (value % 1 == 0) {
        return value.toStringAsFixed(0);
      }
      return value.toStringAsFixed(2);
    }

    double parseInput(String value, double fallback) {
      final normalized = value.replaceAll(',', '.');
      final parsed = double.tryParse(normalized);
      if (parsed == null || !parsed.isFinite) {
        return fallback;
      }
      return parsed;
    }

    double workingPrice = item.packagingUnitPrice;
    double workingTaxRate = item.taxRate;
    bool hasTax = item.hasTax;

    final priceController = TextEditingController(text: formatEditable(workingPrice));
    final taxController = TextEditingController(text: formatEditable(workingTaxRate));

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) {
        return AnimatedPadding(
          duration: const Duration(milliseconds: 200),
          curve: Curves.decelerate,
          padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
          child: StatefulBuilder(
            builder: (ctx, setState) {
              final quantity = item.quantity.value;
              final subtotal = workingPrice * quantity;
              final taxAmount = hasTax ? subtotal * (workingTaxRate / 100) : 0.0;
              final total = subtotal + taxAmount;

              void updatePriceField(double value) {
                final formatted = formatEditable(value);
                if (priceController.text != formatted) {
                  priceController
                    ..text = formatted
                    ..selection = TextSelection.fromPosition(TextPosition(offset: formatted.length));
                }
              }

              void updateTaxField(double value) {
                final formatted = formatEditable(value);
                if (taxController.text != formatted) {
                  taxController
                    ..text = formatted
                    ..selection = TextSelection.fromPosition(TextPosition(offset: formatted.length));
                }
              }

              return SingleChildScrollView(
                padding: const EdgeInsets.all(20),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('edit'.tr, style: Get.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                    const SizedBox(height: 6),
                    Text(item.variant.variantName, style: Get.textTheme.bodyMedium),
                    const SizedBox(height: 16),
                    Text('price'.tr, style: Get.textTheme.bodySmall?.copyWith(fontWeight: FontWeight.w600)),
                    const SizedBox(height: 6),
                    TextField(
                      controller: priceController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9.,]'))],
                      onChanged: (value) {
                        final parsed = parseInput(value, workingPrice);
                        setState(() {
                          workingPrice = parsed;
                        });
                      },
                      decoration: InputDecoration(
                        suffixText: Formatting.amount(item.initialUnitPrice),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                    const SizedBox(height: 12),
                    SwitchListTile.adaptive(
                      contentPadding: EdgeInsets.zero,
                      value: hasTax,
                      onChanged: (value) {
                        setState(() {
                          hasTax = value;
                        });
                      },
                      title: Text('tax'.tr, style: Get.textTheme.bodyMedium),
                    ),
                    const SizedBox(height: 6),
                    Text('${'tax'.tr} (%)', style: Get.textTheme.bodySmall?.copyWith(fontWeight: FontWeight.w600)),
                    const SizedBox(height: 6),
                    TextField(
                      controller: taxController,
                      enabled: hasTax,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9.,]'))],
                      onChanged: (value) {
                        final parsed = parseInput(value, workingTaxRate);
                        setState(() {
                          workingTaxRate = parsed;
                        });
                      },
                      decoration: InputDecoration(
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Container(
                      decoration: BoxDecoration(
                        color: Get.theme.colorScheme.surfaceVariant.withOpacity(0.4),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text('subtotal'.tr, style: Get.textTheme.bodyMedium),
                              Text(Formatting.amount(subtotal), style: Get.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600)),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text('tax'.tr, style: Get.textTheme.bodyMedium),
                              Text(Formatting.amount(taxAmount), style: Get.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600)),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text('total'.tr, style: Get.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                              Text(Formatting.amount(total), style: Get.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),
                    Row(
                      children: [
                        TextButton.icon(
                          onPressed: () {
                            setState(() {
                              item.resetPricing();
                              workingPrice = item.packagingUnitPrice;
                              workingTaxRate = item.taxRate;
                              hasTax = item.hasTax;
                              updatePriceField(workingPrice);
                              updateTaxField(workingTaxRate);
                            });
                          },
                          icon: const Icon(Icons.refresh),
                          label: Text('reset'.tr),
                        ),
                        const Spacer(),
                        ElevatedButton(
                          onPressed: () {
                            final newPrice = parseInput(priceController.text, workingPrice);
                            final newTax = hasTax ? parseInput(taxController.text, workingTaxRate) : 0.0;
                            item.setUnitPrice(newPrice);
                            item.setTax(enabled: hasTax, rate: hasTax ? newTax : null);
                            controller.cartItems.refresh();
                            Navigator.of(ctx).pop();
                          },
                          child: Text('save'.tr),
                        ),
                      ],
                    ),
                  ],
                ),
              );
            },
          ),
        );
      },
    );

    priceController.dispose();
    taxController.dispose();
  }

  Future<void> _showAddSheet(
    BuildContext context,
    ProductVariant variant, {
    WarehouseProductVariant? inventoryVariant,
  }) async {
    final options = controller.packagingOptionsForVariant(variant, inventoryVariant: inventoryVariant);
    if (options.isEmpty) {
      Get.snackbar('warning'.tr, 'no_packaging_available'.tr, snackPosition: SnackPosition.BOTTOM);
      return;
    }

    QuickPackagingOption selectedOption = options.first;
    double normalizeQuantity(double value, QuickPackagingOption option) {
      var result = value;
      if (result < 1) result = 1;
      final max = option.availableQuantity;
      if (max != null && max > 0 && result > max) {
        result = max;
      }
      return result;
    }

    double quantity = normalizeQuantity(
      selectedOption.availableQuantity != null && selectedOption.availableQuantity! < 1 ? selectedOption.availableQuantity! : 1.0,
      selectedOption,
    );
    final qtyController = TextEditingController(text: quantity.toStringAsFixed(quantity % 1 == 0 ? 0 : 2));

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) {
        return AnimatedPadding(
          duration: const Duration(milliseconds: 200),
          curve: Curves.decelerate,
          padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
          child: StatefulBuilder(
            builder: (ctx, setState) {
              void syncQuantityField() {
                final decimals = quantity % 1 == 0 ? 0 : 2;
                final formatted = quantity.toStringAsFixed(decimals);
                if (qtyController.text != formatted) {
                  qtyController
                    ..text = formatted
                    ..selection = TextSelection.fromPosition(TextPosition(offset: formatted.length));
                }
              }

              final packagingPrice = controller.resolvePackagingUnitPrice(variant, selectedOption);
              final maxQty = selectedOption.availableQuantity;
              return SingleChildScrollView(
                padding: const EdgeInsets.all(20),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(variant.variantName, style: Get.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                    const SizedBox(height: 12),
                    Text('select_packaging_type'.tr, style: Get.textTheme.bodySmall?.copyWith(fontWeight: FontWeight.w600)),
                    const SizedBox(height: 8),
                    DropdownButtonFormField<QuickPackagingOption>(
                      value: selectedOption,
                      isExpanded: true,
                      items: options
                          .map(
                            (opt) => DropdownMenuItem<QuickPackagingOption>(
                              value: opt,
                              child: Text(opt.packaging.packagingTypesName),
                            ),
                          )
                          .toList(),
                      onChanged: (val) {
                        if (val == null) return;
                        setState(() {
                          selectedOption = val;
                          quantity = normalizeQuantity(quantity, selectedOption);
                          syncQuantityField();
                        });
                      },
                    ),
                    const SizedBox(height: 16),
                    Text('quantity'.tr, style: Get.textTheme.bodySmall?.copyWith(fontWeight: FontWeight.w600)),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        IconButton(
                          onPressed: () {
                            setState(() {
                              quantity = normalizeQuantity(quantity - 1, selectedOption);
                              syncQuantityField();
                            });
                          },
                          icon: const Icon(Icons.remove_circle, color: Colors.redAccent),
                        ),
                        SizedBox(
                          width: 90,
                          child: TextField(
                            controller: qtyController,
                            textAlign: TextAlign.center,
                            keyboardType: const TextInputType.numberWithOptions(decimal: true),
                            inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9.]'))],
                            onChanged: (val) {
                              final parsed = double.tryParse(val);
                              if (parsed == null) return;
                              setState(() {
                                quantity = normalizeQuantity(parsed, selectedOption);
                                syncQuantityField();
                              });
                            },
                          ),
                        ),
                        IconButton(
                          onPressed: () {
                            setState(() {
                              quantity = normalizeQuantity(quantity + 1, selectedOption);
                              syncQuantityField();
                            });
                          },
                          icon: const Icon(Icons.add_circle, color: Colors.green),
                        ),
                        if (maxQty != null)
                          Padding(
                            padding: const EdgeInsets.only(left: 12),
                            child: Text(
                              'max_quantity_label'.trParams({'max': maxQty.toStringAsFixed(0)}),
                              style: Get.textTheme.bodySmall?.copyWith(color: Colors.blueGrey),
                            ),
                          )
                      ],
                    ),
                    const SizedBox(height: 16),
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: CircleAvatar(
                        radius: 20,
                        backgroundColor: Get.theme.colorScheme.primary.withOpacity(0.1),
                        child: const Icon(Icons.attach_money),
                      ),
                      title: Text('price_per_unit_label'.trParams({'price': Formatting.amount(packagingPrice)})),
                      subtitle: selectedOption.availableQuantity != null ? Text('available_quantity'.trParams({'qty': selectedOption.availableQuantity!.toStringAsFixed(0)})) : null,
                    ),
                    const SizedBox(height: 20),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: () {
                          final parsed = double.tryParse(qtyController.text);
                          final double qty = normalizeQuantity(parsed ?? quantity, selectedOption);
                          controller.addToCart(variant: variant, option: selectedOption, quantity: qty);
                          Navigator.of(ctx).pop();
                        },
                        child: Text('add'.tr),
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        );
      },
    );
    qtyController.dispose();
  }
}

class _ModeToggleButton extends StatelessWidget {
  const _ModeToggleButton({required this.active, required this.label, required this.icon, required this.onTap});

  final bool active;
  final String label;
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        decoration: BoxDecoration(
          color: active ? Get.theme.colorScheme.primary.withOpacity(0.1) : Get.theme.colorScheme.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: active ? Get.theme.colorScheme.primary : Get.theme.dividerColor),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: active ? Get.theme.colorScheme.primary : Get.theme.iconTheme.color),
            const SizedBox(width: 8),
            Text(
              label,
              style: Get.textTheme.bodyMedium?.copyWith(
                fontWeight: active ? FontWeight.w600 : FontWeight.w400,
                color: active ? Get.theme.colorScheme.primary : Get.theme.textTheme.bodyMedium?.color,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _InventoryVariantCard extends StatelessWidget {
  const _InventoryVariantCard({required this.variant, required this.onAdd});

  final WarehouseProductVariant variant;
  final VoidCallback onAdd;

  @override
  Widget build(BuildContext context) {
    final availableInfo = variant.availabilityInfo;
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(variant.displayName, style: Get.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 6),
            Text(availableInfo, style: Get.textTheme.bodySmall?.copyWith(color: Colors.green.shade700)),
            const SizedBox(height: 12),
            Align(
              alignment: Alignment.centerRight,
              child: ElevatedButton.icon(
                onPressed: onAdd,
                icon: const Icon(Icons.add),
                label: Text('add'.tr),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CatalogVariantCard extends StatelessWidget {
  const _CatalogVariantCard({required this.variant, required this.onAdd});

  final ProductVariant variant;
  final VoidCallback onAdd;

  @override
  Widget build(BuildContext context) {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(variant.variantName, style: Get.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
            if (variant.productsName != null && variant.productsName!.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text(variant.productsName!, style: Get.textTheme.bodySmall?.copyWith(color: Colors.grey.shade600)),
              ),
            const SizedBox(height: 12),
            Align(
              alignment: Alignment.centerRight,
              child: ElevatedButton.icon(
                onPressed: onAdd,
                icon: const Icon(Icons.add),
                label: Text('add'.tr),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
