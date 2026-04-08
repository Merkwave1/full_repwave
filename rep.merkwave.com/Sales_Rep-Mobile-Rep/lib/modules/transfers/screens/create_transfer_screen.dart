import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import '/modules/transfers/controllers/create_transfer_controller.dart';
import '/shared_widgets/app_notifier.dart';
import '/shared_widgets/loading_indicator.dart';
import '/data/models/inventory_item.dart';
import '/data/models/product_lookup.dart';

class CreateTransferScreen extends GetView<CreateTransferController> {
  const CreateTransferScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[50],
      body: Obx(() {
        if (controller.isLoading.value) return const LoadingIndicator();
        if (controller.errorMessage.value.isNotEmpty) return _buildErrorState();
        return _buildMainContent();
      }),
    );
  }

  Widget _buildErrorState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error_outline, color: Colors.red, size: 60),
          const SizedBox(height: 12),
          Text(
            controller.errorMessage.value,
            style: const TextStyle(color: Colors.black54, fontSize: 16),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 20),
          ElevatedButton(
            onPressed: controller.refreshData,
            child: Text('retry'.tr),
          )
        ],
      ),
    );
  }

  Widget _buildMainContent() {
    return Column(
      children: [
        _buildCompactTopSection(),
        _buildSearchBar(),
        Expanded(child: _buildTabSection()),
      ],
    );
  }

  /// Top Section: one line (from > to)
  Widget _buildCompactTopSection() {
    // Determine if we're unloading from van to warehouse
    // Check both warehouseType for 'mobile' or if warehouse name contains mobile/van indicators
    final bool isFromMobile =
        controller.fromWarehouse.warehouseType == 'mobile' || controller.fromWarehouse.warehouseType == 'Mobile' || controller.fromWarehouse.warehouseName.contains('عربية') || controller.fromWarehouse.warehouseName.toLowerCase().contains('ahmed');

    // Choose icons based on transfer direction
    // If FROM is mobile (van), we're UNLOADING: van 🚚 → warehouse 🏪
    // If FROM is warehouse, we're LOADING: warehouse 🏪 → van 🚚
    final IconData fromIcon = isFromMobile ? Icons.local_shipping : Icons.storefront;
    final IconData toIcon = isFromMobile ? Icons.storefront : Icons.local_shipping;

    return Container(
      color: Colors.blue,
      child: SafeArea(
        top: true,
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          child: Row(
            children: [
              // From (right) → To (left)
              Expanded(
                child: _headerChip(
                  label: 'from'.tr,
                  name: controller.fromWarehouse.warehouseName,
                  icon: fromIcon,
                ),
              ),
              const SizedBox(width: 8),
              const Icon(Icons.arrow_forward, color: Colors.white70, size: 20),
              const SizedBox(width: 8),
              Expanded(
                child: _headerChip(
                  label: 'to'.tr,
                  name: controller.toWarehouse.warehouseName,
                  icon: toIcon,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _headerChip({required String label, required String name, required IconData icon}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.15),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Icon(icon, color: Colors.white, size: 18),
          const SizedBox(width: 6),
          Text(label, style: const TextStyle(color: Colors.white70, fontWeight: FontWeight.w500)),
          const SizedBox(width: 6),
          Expanded(
            child: Text(
              name,
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchBar() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              decoration: InputDecoration(
                filled: true,
                fillColor: Colors.white,
                hintText: 'search_products_hint'.tr,
                prefixIcon: const Icon(Icons.search, color: Colors.grey),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
              ),
              onChanged: (val) => controller.searchQuery.value = val,
            ),
          ),
          const SizedBox(width: 8),
          Obx(() => DropdownButton<int?>(
                value: controller.selectedCategoryId.value,
                hint: Text('categories'.tr),
                underline: const SizedBox(),
                onChanged: (val) => controller.selectedCategoryId.value = val,
                items: [
                  DropdownMenuItem(value: null, child: Text('all'.tr)),
                  ...controller.categories.map((cat) => DropdownMenuItem(
                        value: cat.categoriesId,
                        child: Text(cat.categoriesName),
                      )),
                ],
              )),
        ],
      ),
    );
  }

  Widget _buildTabSection() {
    return DefaultTabController(
      length: 2,
      child: Column(
        children: [
          TabBar(
            labelColor: Colors.blue,
            unselectedLabelColor: Colors.grey,
            indicatorColor: Colors.blue,
            tabs: [
              Tab(icon: const Icon(Icons.inventory_2), text: 'products'.tr),
              Tab(icon: _buildCartTabIcon(), text: 'order'.tr),
            ],
          ),
          Expanded(
            child: TabBarView(
              children: [
                _buildProductsList(),
                _buildCartList(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // Cart tab icon with badge
  Widget _buildCartTabIcon() {
    return Obx(() {
      final count = controller.transferItems.length;
      return Stack(
        clipBehavior: Clip.none,
        children: [
          const Icon(Icons.shopping_cart),
          if (count > 0)
            Positioned(
              right: -6,
              top: -6,
              child: Container(
                padding: const EdgeInsets.all(2),
                decoration: const BoxDecoration(color: Colors.red, shape: BoxShape.circle),
                constraints: const BoxConstraints(minWidth: 18, minHeight: 18),
                child: Center(
                  child: Text(
                    '$count',
                    style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                  ),
                ),
              ),
            ),
        ],
      );
    });
  }

  Widget _buildProductsList() {
    return Obx(() {
      if (controller.isRequesting) {
        // Request mode: show variants list (not inventory)
        final lower = controller.searchQuery.value.toLowerCase();
        final List<ProductVariant> source = controller.requestVariants.where((pv) {
          final catOk = controller.selectedCategoryId.value == null || pv.productsCategoryId == controller.selectedCategoryId.value;
          final searchOk = controller.searchQuery.value.isEmpty || (pv.variantName.toLowerCase().contains(lower) || (pv.productsName ?? '').toLowerCase().contains(lower));
          return catOk && searchOk;
        }).toList();

        if (source.isEmpty) {
          return Center(child: Text('no_products_available'.tr, style: const TextStyle(color: Colors.black54)));
        }

        return ListView.builder(
          padding: const EdgeInsets.all(12),
          itemCount: source.length,
          itemBuilder: (ctx, i) => _buildRequestVariantCard(source[i]),
        );
      }

      // Unloading mode: show inventory grouped by batches
      if (controller.filteredInventory.isEmpty) {
        return Center(child: Text('no_products_available'.tr, style: const TextStyle(color: Colors.black54)));
      }
      return ListView.builder(
        padding: const EdgeInsets.all(12),
        itemCount: controller.filteredInventory.length,
        itemBuilder: (ctx, i) => _buildProductCard(controller.filteredInventory[i]),
      );
    });
  }

  Widget _buildProductCard(DisplayVariant variant) {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      margin: const EdgeInsets.only(bottom: 12),
      child: ExpansionTile(
        leading: CircleAvatar(
          backgroundColor: Colors.grey[200],
          backgroundImage: (variant.productVariant.variantImageUrl?.isNotEmpty ?? false) ? NetworkImage(variant.productVariant.variantImageUrl!) : null,
          child: (variant.productVariant.variantImageUrl?.isEmpty ?? true) ? const Icon(Icons.inventory_2, color: Colors.blue) : null,
        ),
        title: Text(
          variant.productVariant.variantName,
          style: const TextStyle(fontWeight: FontWeight.w600),
        ),
        children: variant.batches.map((b) => _buildBatchTile(variant.productVariant, b)).toList(),
      ),
    );
  }

  Widget _buildBatchTile(ProductVariant variant, InventoryBatch batch) {
    final formattedDate = batch.productionDate != null ? DateFormat('yyyy-MM-dd').format(batch.productionDate!) : 'unknown'.tr;

    return Obx(() => CheckboxListTile(
          value: controller.isBatchInTransfer(batch.inventoryId),
          onChanged: (_) => controller.toggleBatchInTransfer(variant, batch),
          title: Text(batch.packagingTypeName),
          subtitle: Text('${'date'.tr}: $formattedDate'),
          secondary: !controller.isRequesting ? Text('available_quantity'.trParams({'qty': batch.quantity.toString()}), style: const TextStyle(color: Colors.green)) : null,
        ));
  }

  Widget _buildCartList() {
    return Obx(() {
      if (controller.transferItems.isEmpty) {
        return Center(child: Text('cart_empty'.tr));
      }
      return Column(
        children: [
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
              itemCount: controller.transferItems.length,
              itemBuilder: (ctx, i) => _buildCartItem(controller.transferItems[i]),
            ),
          ),
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 8, offset: const Offset(0, -2)),
              ],
            ),
            child: SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (controller.isRequesting)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: TextField(
                          controller: controller.requestNoteController,
                          maxLines: 2,
                          minLines: 1,
                          decoration: InputDecoration(
                            hintText: 'notes_for_manager_optional'.tr,
                            prefixIcon: const Icon(Icons.note_alt_outlined),
                            filled: true,
                            fillColor: Colors.grey[50],
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: BorderSide(color: Colors.grey.shade300),
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: BorderSide(color: Colors.grey.shade300),
                            ),
                          ),
                        ),
                      ),
                    Row(
                      children: [
                        Obx(() => Text('${'items'.tr}: ${controller.transferItems.length}', style: const TextStyle(fontWeight: FontWeight.w600))),
                        const Spacer(),
                        Obx(() => ElevatedButton.icon(
                              icon: controller.isSubmitting.value
                                  ? const SizedBox(
                                      width: 16,
                                      height: 16,
                                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                    )
                                  : const Icon(Icons.send),
                              label: Text(controller.isRequesting ? 'send_request'.tr : 'execute_transfer'.tr),
                              onPressed: controller.isSubmitting.value
                                  ? null
                                  : () {
                                      controller.submitTransfer();
                                    },
                            )),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      );
    });
  }

  Widget _buildCartItem(TransferCartItem item) {
    final formattedDate = item.productionDate != null ? DateFormat('yyyy-MM-dd').format(item.productionDate!) : 'unknown'.tr;
    final subtitleText = item.productionDate == null ? item.packagingTypeName : '${'date'.tr}: $formattedDate';

    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
        child: Row(
          children: [
            CircleAvatar(
              backgroundImage: (item.variantImageUrl?.isNotEmpty ?? false) ? NetworkImage(item.variantImageUrl!) : null,
              child: (item.variantImageUrl?.isEmpty ?? true) ? const Icon(Icons.inventory_2, color: Colors.blue) : null,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(item.variantName, style: const TextStyle(fontWeight: FontWeight.w600)),
                  Text(subtitleText, style: const TextStyle(color: Colors.black54)),
                ],
              ),
            ),
            Row(
              children: [
                IconButton(
                  iconSize: 20,
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                  visualDensity: const VisualDensity(horizontal: -4, vertical: -4),
                  icon: const Icon(Icons.remove_circle, color: Colors.red),
                  onPressed: () {
                    if (item.quantity.value > 1) item.quantity.value--;
                  },
                ),
                SizedBox(
                  width: 75, // tighter
                  child: TextFormField(
                    controller: item.quantityController,
                    textAlign: TextAlign.center,
                    keyboardType: TextInputType.number,
                    inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                    decoration: const InputDecoration(
                      isDense: true,
                      contentPadding: EdgeInsets.symmetric(vertical: 6, horizontal: 4),
                      border: OutlineInputBorder(borderSide: BorderSide.none),
                      filled: true,
                      fillColor: Colors.white,
                    ),
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                    onChanged: (text) {
                      final newQuantity = int.tryParse(text);
                      if (newQuantity == null) return;
                      if (newQuantity < 1) {
                        item.quantity.value = 1;
                        item.quantityController.text = '1';
                        item.quantityController.selection = const TextSelection.collapsed(offset: 1);
                        return;
                      }
                      if (controller.isRequesting) {
                        item.quantity.value = newQuantity;
                      } else {
                        if (newQuantity <= item.maxQuantity) {
                          item.quantity.value = newQuantity;
                        } else {
                          item.quantity.value = item.maxQuantity.toInt();
                          item.quantityController.text = item.maxQuantity.toInt().toString();
                          item.quantityController.selection = TextSelection.fromPosition(
                            TextPosition(offset: item.quantityController.text.length),
                          );
                          AppNotifier.warning('reached_maximum'.tr, title: 'maximum'.tr);
                        }
                      }
                    },
                  ),
                ),
                IconButton(
                  iconSize: 20,
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                  visualDensity: const VisualDensity(horizontal: -4, vertical: -4),
                  icon: const Icon(Icons.add_circle, color: Colors.green),
                  onPressed: () {
                    if (!controller.isRequesting && item.quantity.value < item.maxQuantity) {
                      item.quantity.value++;
                    } else if (controller.isRequesting) {
                      item.quantity.value++;
                    } else {
                      AppNotifier.warning('reached_maximum'.tr, title: 'maximum'.tr);
                    }
                  },
                ),
                IconButton(
                  tooltip: 'delete'.tr,
                  iconSize: 20,
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                  visualDensity: const VisualDensity(horizontal: -4, vertical: -4),
                  icon: const Icon(Icons.delete_forever, color: Colors.grey),
                  onPressed: () => controller.removeCartItem(item),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  // Request mode: card with Add action
  Widget _buildRequestVariantCard(ProductVariant variant) {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: Colors.grey[200],
          backgroundImage: (variant.variantImageUrl?.isNotEmpty ?? false) ? NetworkImage(variant.variantImageUrl!) : null,
          child: (variant.variantImageUrl?.isEmpty ?? true) ? const Icon(Icons.inventory_2, color: Colors.blue) : null,
        ),
        title: Text(
          variant.variantName,
          style: const TextStyle(fontWeight: FontWeight.w600),
        ),
        subtitle: (variant.productsName != null && variant.productsName!.isNotEmpty) ? Text(variant.productsName!, style: const TextStyle(color: Colors.black54)) : null,
        trailing: ElevatedButton.icon(
          icon: const Icon(Icons.add),
          label: const Text('أضف'),
          onPressed: () => _showAddRequestItemSheet(variant),
        ),
      ),
    );
  }

  void _showAddRequestItemSheet(ProductVariant variant) {
    // Build packaging options: prefer variant.preferredPackaging; fallback to all
    final preferredIds = variant.preferredPackaging.map((e) => e.packagingTypesId).toList();
    final List<PackagingType> preferred = preferredIds
        .map((id) =>
            controller.allPackagingTypes.firstWhereOrNull((p) => p.packagingTypesId == id) ?? PackagingType(packagingTypesId: id, packagingTypesName: variant.preferredPackaging.firstWhere((pp) => pp.packagingTypesId == id).packagingTypesName))
        .toList();
    final List<PackagingType> all = controller.allPackagingTypes;
    final List<PackagingType> options = preferred.isNotEmpty ? preferred : all;

    PackagingType? selected = options.isNotEmpty ? options.first : null;
    int quantity = 1;
    final qtyController = TextEditingController(text: quantity.toString());

    showModalBottomSheet(
      context: Get.context!,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (ctx) {
        return AnimatedPadding(
          duration: const Duration(milliseconds: 200),
          curve: Curves.decelerate,
          padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
          child: StatefulBuilder(builder: (ctx, setState) {
            return SingleChildScrollView(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(variant.variantName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                    const SizedBox(height: 12),
                    Text('packaging_unit'.tr),
                    const SizedBox(height: 8),
                    DropdownButton<PackagingType>(
                      value: selected,
                      isExpanded: true,
                      items: options
                          .map((p) => DropdownMenuItem<PackagingType>(
                                value: p,
                                child: Text(p.packagingTypesName),
                              ))
                          .toList(),
                      onChanged: (val) {
                        setState(() {
                          selected = val;
                          if (selected != null) {
                            final exist = controller.findRequestItem(variant.variantId, selected!.packagingTypesId);
                            if (exist != null) {
                              quantity = exist.quantity.value;
                            }
                          }
                        });
                      },
                    ),
                    const SizedBox(height: 12),
                    Text('quantity'.tr),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        IconButton(
                          icon: const Icon(Icons.remove_circle, color: Colors.red),
                          onPressed: () => setState(() => quantity = quantity > 1 ? quantity - 1 : 1),
                        ),
                        SizedBox(
                          width: 80,
                          child: TextFormField(
                            controller: qtyController,
                            textAlign: TextAlign.center,
                            keyboardType: TextInputType.number,
                            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                            decoration: const InputDecoration(
                              isDense: true,
                              contentPadding: EdgeInsets.symmetric(vertical: 8, horizontal: 6),
                              border: OutlineInputBorder(borderSide: BorderSide.none),
                              filled: true,
                              fillColor: Colors.white,
                            ),
                            onChanged: (text) {
                              final v = int.tryParse(text);
                              if (v == null) return;
                              quantity = v < 1 ? 1 : v;
                            },
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.add_circle, color: Colors.green),
                          onPressed: () {
                            setState(() {
                              quantity += 1;
                              qtyController.text = quantity.toString();
                              qtyController.selection = TextSelection.fromPosition(
                                TextPosition(offset: qtyController.text.length),
                              );
                            });
                          },
                        ),
                        const Spacer(),
                        ElevatedButton(
                          onPressed: selected == null
                              ? null
                              : () {
                                  // Ensure final clamp
                                  final v = int.tryParse(qtyController.text);
                                  final q = (v == null || v < 1) ? 1 : v;
                                  controller.upsertRequestItem(variant: variant, packaging: selected!, quantity: q);
                                  Navigator.of(ctx).pop();
                                  AppNotifier.success('item_added_to_order'.tr);
                                },
                          child: Text('add'.tr),
                        )
                      ],
                    ),
                    const SizedBox(height: 8),
                  ],
                ),
              ),
            );
          }),
        );
      },
    );
  }
}
