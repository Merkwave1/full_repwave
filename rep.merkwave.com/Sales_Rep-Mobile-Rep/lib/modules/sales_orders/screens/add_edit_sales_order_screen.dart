// lib/modules/sales_orders/screens/add_edit_sales_order_screen.dart
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '/data/models/client.dart';
import '/data/models/sales_order_item.dart';
import '/modules/sales_orders/controllers/add_edit_sales_order_controller.dart';
import '/shared_widgets/custom_app_bar.dart';
import '/shared_widgets/loading_indicator.dart';
import '/core/routes/app_routes.dart';
import '/shared_widgets/searchable_dropdown.dart';
import '/core/utils/formatting.dart';

class AddEditSalesOrderScreen extends StatefulWidget {
  const AddEditSalesOrderScreen({super.key});
  @override
  State<AddEditSalesOrderScreen> createState() => _AddEditSalesOrderScreenState();

  static String _translateDeliveryStatusBilingual(String status) {
    switch (status) {
      case 'Not_Delivered':
        return 'delivery_status_badge_not_delivered'.tr;
      case 'Delivered':
        return 'delivery_status_badge_delivered'.tr;
      default:
        return status;
    }
  }
}

class _AddEditSalesOrderScreenState extends State<AddEditSalesOrderScreen> {
  final AddEditSalesOrderController controller = Get.find<AddEditSalesOrderController>();

  final ScrollController _scrollController = ScrollController();
  final _sectionKeys = List.generate(4, (_) => GlobalKey());

  void _scrollToStep(int step) {
    if (step < 0 || step >= _sectionKeys.length) return;
    final ctx = _sectionKeys[step].currentContext;
    if (ctx != null) {
      Scrollable.ensureVisible(ctx, duration: const Duration(milliseconds: 350), curve: Curves.easeInOut, alignment: 0.05);
    }
  }

  void _onNext() async {
    // Check if user can create order now (has minimum requirements)
    final hasMinimumRequirements = controller.selectedClient.value != null && controller.orderItems.isNotEmpty;

    if (hasMinimumRequirements && controller.currentStep.value >= 1) {
      // User can create order now, but let them continue to next step if they want
      // The create order button will be available regardless
      if (controller.currentStep.value == controller.totalSteps - 1) {
        // Before saving, check for inventory exceeded items
        if (controller.hasItemsExceedingInventory) {
          final canProceed = await controller.showInventoryExceededNotification(context);
          if (!canProceed) return; // User chose to adjust or create quote
        }

        controller.saveSalesOrder(
          onSuccess: () => Navigator.of(context).pop(true),
        );
        return;
      }
    }

    if (controller.currentStep.value == controller.totalSteps - 1) {
      // Before saving, check for inventory exceeded items
      if (controller.hasItemsExceedingInventory) {
        final canProceed = await controller.showInventoryExceededNotification(context);
        if (!canProceed) return; // User chose to adjust or create quote
      }

      controller.saveSalesOrder(
        onSuccess: () => Navigator.of(context).pop(true),
      );
      return;
    }
    if (!controller.canProceedFromStep(controller.currentStep.value)) return;
    controller.currentStep.value++;
    WidgetsBinding.instance.addPostFrameCallback((_) => _scrollToStep(controller.currentStep.value));
  }

  void _onBack() {
    if (controller.currentStep.value == 0) return;
    controller.currentStep.value--;
    WidgetsBinding.instance.addPostFrameCallback((_) => _scrollToStep(controller.currentStep.value));
  }

  Future<bool?> _confirmLeaveWithoutSaving(BuildContext context) async {
    return await showDialog<bool>(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          title: Text('discard_changes_title'.tr),
          content: Text('discard_changes_message'.tr),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(false),
              child: Text('stay'.tr),
            ),
            ElevatedButton(
              onPressed: () => Navigator.of(ctx).pop(true),
              child: Text('leave'.tr),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return WillPopScope(
      onWillPop: () async {
        if (controller.hasUnsavedChanges) {
          final shouldLeave = await _confirmLeaveWithoutSaving(context);
          return shouldLeave ?? false;
        }
        return true;
      },
      child: Scaffold(
        resizeToAvoidBottomInset: true,
        appBar: CustomAppBar(
          title: controller.isEditMode.value ? 'edit_sales_order'.tr : 'add_new_order'.tr,
        ),
        body: Obx(() {
          if (controller.isLoading.value) {
            return LoadingIndicator(message: 'loading_data'.tr);
          }
          if (controller.errorMessage.isNotEmpty) {
            return Center(
              child: Text(
                controller.errorMessage.value,
                style: Get.textTheme.titleMedium?.copyWith(color: Colors.red),
                textAlign: TextAlign.center,
              ),
            );
          }
          return Column(
            children: [
              const SizedBox(height: 8),
              _ProgressHeader(
                  controller: controller,
                  onTap: (i) {
                    // Only allow navigation to current step or completed steps
                    if (i <= controller.currentStep.value ||
                        (i == 0) || // Always allow client step
                        (i == 1 && controller.selectedClient.value != null) || // Allow items if client selected
                        (i == 2 && controller.selectedClient.value != null && controller.orderItems.isNotEmpty) || // Allow status if client & items done
                        (i == 3 && controller.selectedClient.value != null && controller.orderItems.isNotEmpty)) {
                      // Allow review if previous steps done
                      controller.currentStep.value = i;
                      _scrollToStep(i);
                    }
                  }),
              const Divider(height: 1),
              Expanded(
                child: LayoutBuilder(builder: (context, constraints) {
                  final viewInset = MediaQuery.viewInsetsOf(context).bottom;
                  return SingleChildScrollView(
                    controller: _scrollController,
                    padding: EdgeInsets.fromLTRB(16, 16, 16, 120 + viewInset),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Obx(() => _SectionCard(
                              key: _sectionKeys[0],
                              index: 0,
                              title: 'client'.tr,
                              isCompleted: controller.selectedClient.value != null,
                              isEnabled: true, // Client step always enabled
                              child: _ClientStep(controller: controller),
                            )),
                        Obx(() => _SectionCard(
                              key: _sectionKeys[1],
                              index: 1,
                              title: 'items'.tr,
                              isCompleted: controller.orderItems.isNotEmpty,
                              isEnabled: controller.currentStep.value >= 1 || controller.selectedClient.value != null,
                              action: controller.orderItems.isNotEmpty
                                  ? TextButton.icon(
                                      onPressed: () async {
                                        final result = await Get.toNamed(AppRoutes.quickAddOrderItems);
                                        if (result is List<SalesOrderItem>) {
                                          controller.replaceItems(result);
                                        } else if (result is SalesOrderItem) {
                                          controller.replaceItems([result]);
                                        }
                                      },
                                      icon: const Icon(Icons.edit_outlined),
                                      label: Text('edit'.tr),
                                      style: TextButton.styleFrom(foregroundColor: Get.theme.colorScheme.primary),
                                    )
                                  : null,
                              child: _ItemsStep(controller: controller),
                            )),
                        Obx(() => _SectionCard(
                              key: _sectionKeys[2],
                              index: 2,
                              title: 'status'.tr,
                              isCompleted: controller.status.value.isNotEmpty,
                              isEnabled: controller.currentStep.value >= 2 || (controller.selectedClient.value != null && controller.orderItems.isNotEmpty),
                              child: _StatusStep(controller: controller),
                            )),
                        Obx(() => _SectionCard(
                              key: _sectionKeys[3],
                              index: 3,
                              title: 'review'.tr,
                              isCompleted: false,
                              isEnabled: controller.currentStep.value >= 3 || (controller.selectedClient.value != null && controller.orderItems.isNotEmpty),
                              child: _ReviewStep(controller: controller),
                            )),
                        const SizedBox(height: 16),
                      ],
                    ),
                  );
                }),
              ),
            ],
          );
        }),
        bottomNavigationBar: Obx(() {
          final isLast = controller.currentStep.value == controller.totalSteps - 1;
          final hasMinimumRequirements = controller.selectedClient.value != null && controller.orderItems.isNotEmpty;
          final canCreateOrder = hasMinimumRequirements;
          final total = controller.grandTotalAmount.value;
          final itemsLabel = 'order_items_count'.trParams({'count': controller.orderItems.length.toString()});
          final totalLabel = 'total_with_value'.trParams({'value': Formatting.amount(total)});
          return Container(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
            decoration: BoxDecoration(
              color: Get.theme.colorScheme.surface,
              boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.08), blurRadius: 8, offset: const Offset(0, -2))],
            ),
            child: SafeArea(
              top: false,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (controller.orderItems.isNotEmpty)
                    Container(
                      padding: const EdgeInsets.all(12),
                      margin: const EdgeInsets.only(bottom: 12),
                      decoration: BoxDecoration(
                        color: Get.theme.colorScheme.primaryContainer.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(itemsLabel, style: Get.textTheme.bodyMedium),
                          Text(totalLabel, style: Get.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
                        ],
                      ),
                    ),
                  // Inventory warning banner
                  if (controller.hasItemsExceedingInventory && controller.orderItems.isNotEmpty)
                    Container(
                      margin: const EdgeInsets.only(bottom: 16),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.orange.shade50,
                        border: Border.all(color: Colors.orange.shade200),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.warning, color: Colors.orange.shade700, size: 20),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'items_exceed_inventory_warning'.tr,
                              style: TextStyle(
                                color: Colors.orange.shade700,
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                          TextButton(
                            onPressed: () => controller.currentStep.value = 1, // Go back to items
                            child: Text('adjust'.tr, style: TextStyle(fontSize: 12)),
                          ),
                        ],
                      ),
                    ),
                  Row(
                    children: [
                      if (controller.currentStep.value > 0)
                        OutlinedButton(
                          onPressed: controller.isSaving.value ? null : _onBack,
                          child: Text('back'.tr),
                        ),
                      if (controller.currentStep.value > 0) const SizedBox(width: 12),
                      if (!canCreateOrder && !isLast)
                        Expanded(
                          child: ElevatedButton(
                            onPressed: controller.isSaving.value ? null : _onNext,
                            style: ElevatedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                            child: controller.isSaving.value ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : Text('next'.tr),
                          ),
                        ),
                      if (canCreateOrder)
                        Expanded(
                          child: ElevatedButton(
                            onPressed: controller.isSaving.value
                                ? null
                                : () async {
                                    // Check for inventory exceeded items before saving
                                    if (controller.hasItemsExceedingInventory) {
                                      final canProceed = await controller.showInventoryExceededNotification(context);
                                      if (!canProceed) return; // User chose to adjust or create quote
                                    }

                                    controller.saveSalesOrder(
                                      onSuccess: () => Navigator.of(context).pop(true),
                                    );
                                  },
                            style: ElevatedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                            child: controller.isSaving.value ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : Text(controller.isEditMode.value ? 'update_order'.tr : 'create_order'.tr),
                          ),
                        ),
                      if (!canCreateOrder && isLast)
                        Expanded(
                          child: ElevatedButton(
                            onPressed: controller.isSaving.value ? null : _onNext,
                            style: ElevatedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                            child: controller.isSaving.value ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : Text(controller.isEditMode.value ? 'update_order'.tr : 'create_order'.tr),
                          ),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          );
        }),
        floatingActionButton: Obx(() => controller.currentStep.value == 1
            ? FloatingActionButton.extended(
                heroTag: 'add_edit_sales_order_add_item_fab',
                onPressed: () async {
                  final result = await Get.toNamed(AppRoutes.quickAddOrderItems);
                  if (result is List<SalesOrderItem>) {
                    controller.replaceItems(result);
                  } else if (result is SalesOrderItem) {
                    controller.replaceItems([result]);
                  }
                },
                icon: const Icon(Icons.add),
                label: Text('add_item'.tr),
                backgroundColor: Get.theme.colorScheme.secondary,
              )
            : const SizedBox.shrink()),
      ),
    );
  }
}

class _ProgressHeader extends StatelessWidget {
  final AddEditSalesOrderController controller;
  final void Function(int) onTap;
  const _ProgressHeader({required this.controller, required this.onTap});
  @override
  Widget build(BuildContext context) {
    final labels = ['client'.tr, 'items'.tr, 'status'.tr, 'review'.tr];
    return Obx(() => Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12),
          child: Row(
            children: List.generate(labels.length * 2 - 1, (i) {
              if (i.isOdd) {
                final lineIndex = (i - 1) ~/ 2;
                final active = controller.currentStep.value > lineIndex + 0;
                return Expanded(
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 300),
                    height: 3,
                    margin: const EdgeInsets.symmetric(horizontal: 6),
                    decoration: BoxDecoration(
                      color: active ? Get.theme.colorScheme.primary : Get.theme.dividerColor,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                );
              }
              final step = i ~/ 2;
              final isActive = controller.currentStep.value == step;
              final isCompleted = controller.currentStep.value > step || (step == 0 && controller.selectedClient.value != null) || (step == 1 && controller.orderItems.isNotEmpty);

              // Determine if step is accessible
              final isAccessible = step <= controller.currentStep.value ||
                  (step == 0) || // Always allow client step
                  (step == 1 && controller.selectedClient.value != null) || // Allow items if client selected
                  (step == 2 && controller.selectedClient.value != null && controller.orderItems.isNotEmpty) || // Allow status if client & items done
                  (step == 3 && controller.selectedClient.value != null && controller.orderItems.isNotEmpty); // Allow review if previous steps done

              return InkWell(
                onTap: isAccessible ? () => onTap(step) : null,
                borderRadius: BorderRadius.circular(20),
                child: Opacity(
                  opacity: isAccessible ? 1.0 : 0.4,
                  child: Padding(
                    padding: const EdgeInsets.all(4),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        AnimatedContainer(
                          duration: const Duration(milliseconds: 300),
                          width: 38,
                          height: 38,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: isCompleted ? Get.theme.colorScheme.primary : (isActive ? Get.theme.colorScheme.primaryContainer : (isAccessible ? Get.theme.colorScheme.surfaceContainerHighest : Get.theme.disabledColor.withOpacity(0.2))),
                            border: Border.all(
                              color: isActive ? Get.theme.colorScheme.primary : (isAccessible ? Get.theme.dividerColor : Get.theme.disabledColor),
                              width: isActive ? 2 : 1,
                            ),
                            boxShadow: isActive ? [BoxShadow(color: Get.theme.colorScheme.primary.withOpacity(0.3), blurRadius: 8)] : null,
                          ),
                          alignment: Alignment.center,
                          child: isCompleted && controller.currentStep.value > step
                              ? const Icon(Icons.check, size: 20, color: Colors.white)
                              : !isAccessible && step > controller.currentStep.value
                                  ? Icon(Icons.lock, size: 16, color: Get.theme.disabledColor)
                                  : Text('${step + 1}',
                                      style: TextStyle(
                                        color: isCompleted ? Colors.white : (isAccessible ? Get.theme.colorScheme.onSurface : Get.theme.disabledColor),
                                        fontWeight: FontWeight.w600,
                                      )),
                        ),
                        const SizedBox(height: 6),
                        SizedBox(
                            width: 75,
                            child: Text(labels[step],
                                textAlign: TextAlign.center,
                                style: Get.textTheme.bodySmall?.copyWith(
                                  fontWeight: isActive ? FontWeight.w600 : FontWeight.normal,
                                  color: isActive ? Get.theme.colorScheme.primary : (isAccessible ? null : Get.theme.disabledColor),
                                )))
                      ],
                    ),
                  ),
                ),
              );
            }),
          ),
        ));
  }
}

class _SectionCard extends StatelessWidget {
  final int index;
  final String title;
  final Widget child;
  final bool isCompleted;
  final bool isEnabled;
  final Widget? action;
  const _SectionCard({super.key, required this.index, required this.title, required this.child, required this.isCompleted, this.isEnabled = true, this.action});
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return AnimatedContainer(
      duration: const Duration(milliseconds: 250),
      margin: const EdgeInsets.only(bottom: 20),
      decoration: BoxDecoration(
        color: isEnabled ? theme.cardColor : theme.cardColor.withOpacity(0.6),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: isCompleted ? theme.colorScheme.primary.withOpacity(0.4) : (isEnabled ? theme.dividerColor : theme.disabledColor),
          width: isCompleted ? 2 : 1,
        ),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(isCompleted && isEnabled ? 0.08 : 0.04), blurRadius: isCompleted && isEnabled ? 12 : 6, offset: const Offset(0, 3))],
      ),
      padding: const EdgeInsets.fromLTRB(20, 18, 20, 22),
      child: Opacity(
        opacity: isEnabled ? 1.0 : 0.5,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(title,
                    style: theme.textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: isEnabled ? null : theme.disabledColor,
                    )),
                const Spacer(),
                if (action != null)
                  Padding(
                    padding: const EdgeInsets.only(right: 8.0),
                    child: action!,
                  ),
                if (isCompleted && isEnabled)
                  AnimatedContainer(duration: const Duration(milliseconds: 200), child: Icon(Icons.check_circle, color: theme.colorScheme.primary, size: 24))
                else if (!isEnabled)
                  Icon(Icons.lock, color: theme.disabledColor, size: 20),
              ],
            ),
            const SizedBox(height: 16),
            IgnorePointer(
              ignoring: !isEnabled,
              child: child,
            ),
          ],
        ),
      ),
    );
  }
}

// --- Step Widgets ---
class _ClientStep extends StatelessWidget {
  final AddEditSalesOrderController controller;
  const _ClientStep({required this.controller});
  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SearchableDropdown<Client>(
          labelText: 'select_client'.tr,
          hintText: 'select_client'.tr,
          searchPlaceholder: 'search_client'.tr,
          options: controller.clients.map((c) => DropdownOption<Client>(value: c, label: c.companyName)).toList(),
          value: controller.selectedClient.value != null ? DropdownOption(value: controller.selectedClient.value!, label: controller.selectedClient.value!.companyName) : null,
          onChanged: controller.isEditMode.value ? (o) {} : (o) => controller.onClientSelected(o?.value),
          enabled: !controller.isEditMode.value,
        ),
        if (controller.isEditMode.value)
          Padding(
            padding: const EdgeInsets.only(top: 12.0),
            child: Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Colors.grey.withOpacity(.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  const Icon(Icons.lock, size: 16, color: Colors.grey),
                  const SizedBox(width: 6),
                  Text('client_locked_edit_mode'.tr, style: Get.textTheme.bodySmall?.copyWith(color: Colors.grey)),
                ],
              ),
            ),
          ),
      ],
    );
  }
}

class _ItemsStep extends StatelessWidget {
  final AddEditSalesOrderController controller;
  const _ItemsStep({required this.controller});
  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Obx(() => controller.orderItems.isEmpty
            ? Container(
                padding: const EdgeInsets.all(24.0),
                decoration: BoxDecoration(
                  color: Get.theme.colorScheme.surfaceVariant.withOpacity(0.3),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Get.theme.dividerColor, style: BorderStyle.solid),
                ),
                child: Column(
                  children: [
                    Icon(Icons.shopping_cart_outlined, size: 48, color: Get.theme.colorScheme.onSurfaceVariant),
                    const SizedBox(height: 8),
                    Text('no_items_added'.tr, style: Get.textTheme.bodyLarge?.copyWith(color: Get.theme.colorScheme.onSurfaceVariant)),
                    const SizedBox(height: 12),
                    OutlinedButton.icon(
                      onPressed: () async {
                        final result = await Get.toNamed(AppRoutes.quickAddOrderItems);
                        if (result is List<SalesOrderItem>) {
                          controller.replaceItems(result);
                        } else if (result is SalesOrderItem) {
                          controller.replaceItems([result]);
                        }
                      },
                      icon: const Icon(Icons.add),
                      label: Text('add_first_item'.tr),
                    ),
                  ],
                ),
              )
            : ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: controller.orderItems.length,
                itemBuilder: (context, index) {
                  final item = controller.orderItems[index];
                  final baselinePrice = item.productVariant?.variantUnitPrice != null ? double.tryParse(item.productVariant!.variantUnitPrice!) : null;
                  final baselineTax = item.productVariant?.variantTaxRate;
                  final priceEdited = baselinePrice != null && (item.unitPrice - baselinePrice).abs() > 0.0001;
                  final taxEdited = baselineTax != null && item.taxRate != null && (item.taxRate! - baselineTax).abs() > 0.0001;
                  final hasDiscount = item.discountAmount > 0.0;
                  return Container(
                    margin: const EdgeInsets.symmetric(vertical: 8),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Get.theme.dividerColor.withOpacity(0.5)),
                      color: Get.theme.colorScheme.surface,
                      boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 8, offset: const Offset(0, 2))],
                    ),
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(item.variantName ?? 'unknown_product'.tr, style: Get.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
                            ),
                            IconButton(
                              tooltip: 'delete'.tr,
                              onPressed: () => controller.removeOrderItem(index),
                              icon: const Icon(Icons.delete_outline, color: Colors.redAccent),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            _InfoChip(
                              label: '${item.quantity.toStringAsFixed(2)} ${item.packagingTypeName ?? 'units'.tr}',
                              icon: Icons.inventory_2_outlined,
                              color: Colors.blue.withOpacity(0.1),
                            ),
                            _InfoChip(
                              label: 'price_per_unit_label'.trParams({'price': Formatting.amount(item.unitPrice)}),
                              icon: Icons.attach_money,
                              color: Colors.green.withOpacity(0.1),
                            ),
                            _InfoChip(
                              label: 'total_with_value'.trParams({'value': Formatting.amount(item.totalAmount)}),
                              icon: Icons.receipt_long,
                              color: Colors.purple.withOpacity(0.1),
                            ),
                            if (priceEdited) _FlagChip(color: Colors.orange, text: 'price_edited_flag'.tr),
                            if (taxEdited) _FlagChip(color: Colors.deepOrange, text: 'tax_edited_flag'.tr),
                            if (hasDiscount) _FlagChip(color: Colors.purple, text: 'discount_applied_flag'.tr),
                          ],
                        ),
                      ],
                    ),
                  );
                },
              )),
        if (controller.orderItems.isNotEmpty) ...[
          const SizedBox(height: 16),
          _OrderTotalsCard(controller: controller),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: () async {
                final result = await Get.toNamed(AppRoutes.quickAddOrderItems);
                if (result is List<SalesOrderItem>) {
                  controller.replaceItems(result);
                } else if (result is SalesOrderItem) {
                  controller.replaceItems([result]);
                }
              },
              icon: const Icon(Icons.add),
              label: Text('add_another_item'.tr),
              style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ),
        ],
      ],
    );
  }
}

class _OrderTotalsCard extends StatelessWidget {
  final AddEditSalesOrderController controller;
  const _OrderTotalsCard({required this.controller});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Obx(() {
      final subtotal = controller.subtotalAmount.value;
      final itemsDiscount = controller.itemsDiscountAmount.value;
      final orderDiscount = controller.orderDiscount.value;
      final combinedDiscount = controller.combinedDiscountAmount.value;
      final tax = controller.taxAmountTotal.value;
      final total = controller.grandTotalAmount.value;

      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: theme.colorScheme.surfaceVariant.withOpacity(0.25),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: theme.dividerColor.withOpacity(0.6)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('summary'.tr, style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
            const SizedBox(height: 12),
            _buildRow('subtotal'.tr, Formatting.amount(subtotal), theme: theme),
            if (itemsDiscount > 0)
              _buildRow(
                '${'discount'.tr} (${'items'.tr})',
                '-${Formatting.amount(itemsDiscount)}',
                theme: theme,
                valueStyle: TextStyle(color: theme.colorScheme.error),
              ),
            const SizedBox(height: 12),
            TextField(
              controller: controller.orderDiscountController,
              keyboardType: const TextInputType.numberWithOptions(decimal: true, signed: false),
              decoration: InputDecoration(
                labelText: '${'discount'.tr} (${'order'.tr})',
                prefixIcon: const Icon(Icons.percent),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                filled: true,
                fillColor: theme.colorScheme.surface,
              ),
              onChanged: controller.onOrderDiscountChanged,
            ),
            if (orderDiscount > 0)
              Padding(
                padding: const EdgeInsets.only(top: 8.0),
                child: _buildRow(
                  '${'discount'.tr} (${'order'.tr})',
                  '-${Formatting.amount(orderDiscount)}',
                  theme: theme,
                  valueStyle: TextStyle(color: theme.colorScheme.error),
                ),
              ),
            if (combinedDiscount > 0)
              Padding(
                padding: const EdgeInsets.only(top: 8.0),
                child: _buildRow(
                  '${'discount'.tr} (${'total'.tr})',
                  '-${Formatting.amount(combinedDiscount)}',
                  theme: theme,
                  valueStyle: TextStyle(color: theme.colorScheme.error),
                ),
              ),
            const Divider(height: 24),
            _buildRow('tax'.tr, Formatting.amount(tax), theme: theme),
            _buildRow('total'.tr, Formatting.amount(total), theme: theme, valueStyle: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
          ],
        ),
      );
    });
  }

  Widget _buildRow(String label, String value, {required ThemeData theme, TextStyle? valueStyle}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        children: [
          Expanded(
            child: Text(
              label,
              style: theme.textTheme.bodyMedium,
            ),
          ),
          Text(
            value,
            style: valueStyle ?? theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }
}

class _StatusStep extends StatelessWidget {
  final AddEditSalesOrderController controller;
  const _StatusStep({required this.controller});

  String _translatedStatusLabel(String status) {
    final normalizedKey = status.toLowerCase();
    final normalizedTranslation = normalizedKey.tr;
    if (normalizedTranslation != normalizedKey) {
      return normalizedTranslation;
    }

    final directTranslation = status.tr;
    if (directTranslation != status) {
      return directTranslation;
    }

    return status;
  }

  @override
  Widget build(BuildContext context) {
    return Obx(() {
      final statuses = controller.availableStatuses;
      final invoicedDisabled = !controller.canSelectInvoiced;
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('order_status'.tr, style: Get.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600, letterSpacing: 0.5)),
          const SizedBox(height: 12),
          Wrap(
            spacing: 12,
            runSpacing: 8,
            children: statuses.map((s) {
              final selected = controller.status.value == s;
              final disabled = (s == 'Invoiced' && invoicedDisabled);
              return ChoiceChip(
                label: Text(_translatedStatusLabel(s)),
                selected: selected,
                onSelected: disabled
                    ? null
                    : (v) {
                        if (v) controller.onStatusChanged(s);
                      },
                selectedColor: Get.theme.colorScheme.primary,
                backgroundColor: Get.theme.colorScheme.surfaceVariant,
                labelStyle: TextStyle(
                  color: selected ? Colors.white : Get.theme.colorScheme.onSurfaceVariant,
                  fontWeight: selected ? FontWeight.w600 : FontWeight.normal,
                ),
                disabledColor: Get.theme.disabledColor.withOpacity(.2),
                elevation: selected ? 2 : 0,
                pressElevation: 4,
              );
            }).toList(),
          ),
          if (invoicedDisabled)
            Container(
              margin: const EdgeInsets.only(top: 12.0),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.orange.withOpacity(.1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.orange.withOpacity(.3)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.info_outline, size: 18, color: Colors.orange),
                  const SizedBox(width: 8),
                  Expanded(child: Text('invoiced_disabled_due_to_edits'.tr, style: Get.textTheme.bodySmall?.copyWith(color: Colors.orange.shade700))),
                ],
              ),
            ),
          const SizedBox(height: 20),
          if (controller.status.value == 'Invoiced') ...[
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Get.theme.colorScheme.primaryContainer.withOpacity(0.3),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Get.theme.colorScheme.primary.withOpacity(0.2)),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('delivery_status'.tr, style: Get.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
                      Switch.adaptive(
                        value: controller.deliveryStatus.value == 'Delivered',
                        onChanged: controller.canMarkDeliveredNow
                            ? (v) {
                                controller.onDeliveryStatusChanged(v ? 'Delivered' : 'Not_Delivered');
                              }
                            : null,
                        activeColor: Get.theme.colorScheme.primary,
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: controller.deliveryStatus.value == 'Delivered' ? Colors.green.withOpacity(.15) : Colors.blueGrey.withOpacity(.15),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      AddEditSalesOrderScreen._translateDeliveryStatusBilingual(controller.deliveryStatus.value),
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: controller.deliveryStatus.value == 'Delivered' ? Colors.green.shade700 : Colors.blueGrey.shade700,
                      ),
                    ),
                  ),
                  if (controller.hasInventoryShortage)
                    Container(
                      margin: const EdgeInsets.only(top: 12.0),
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: Colors.red.withOpacity(.1),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: Colors.red.withOpacity(.3)),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Icon(Icons.warning_amber, size: 16, color: Colors.red),
                          const SizedBox(width: 8),
                          Expanded(
                              child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('inventory_shortage_cannot_mark_delivered'.tr, style: Get.textTheme.bodySmall?.copyWith(color: Colors.red.shade700)),
                              ...controller.shortageItems.take(5).map((it) {
                                final avail = controller.availableForItem(it);
                                final availStr = avail == null ? '?' : avail.toStringAsFixed(2);
                                final itemName = it.variantName ?? 'item'.tr;
                                return Padding(
                                  padding: const EdgeInsets.only(top: 4.0),
                                  child: Text(
                                    'inventory_shortage_item_status'.trParams({
                                      'item': itemName,
                                      'needed': it.quantity.toStringAsFixed(2),
                                      'available': availStr,
                                    }),
                                    style: Get.textTheme.bodySmall?.copyWith(color: Colors.red.shade400, fontSize: 11),
                                  ),
                                );
                              }),
                              if (controller.shortageItems.length > 5)
                                Padding(
                                  padding: const EdgeInsets.only(top: 4.0),
                                  child: Text(
                                    'inventory_shortage_more_items'.trParams({'count': (controller.shortageItems.length - 5).toString()}),
                                    style: Get.textTheme.bodySmall?.copyWith(color: Colors.red.shade400, fontSize: 11),
                                  ),
                                ),
                            ],
                          )),
                        ],
                      ),
                    ),
                ],
              ),
            ),
          ],
        ],
      );
    });
  }
}

class _ReviewStep extends StatelessWidget {
  final AddEditSalesOrderController controller;
  const _ReviewStep({required this.controller});
  @override
  Widget build(BuildContext context) {
    return Obx(() {
      final subtotal = controller.subtotalAmount.value;
      final itemsDiscount = controller.itemsDiscountAmount.value;
      final orderDiscount = controller.orderDiscount.value;
      final combinedDiscount = controller.combinedDiscountAmount.value;
      final tax = controller.taxAmountTotal.value;
      final total = controller.grandTotalAmount.value;

      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('summary'.tr, style: Get.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Get.theme.colorScheme.surfaceVariant.withOpacity(0.3),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Column(
              children: [
                _kv('client'.tr, controller.selectedClient.value?.companyName ?? '-'),
                _kv('items'.tr, controller.orderItems.length.toString()),
                _kv('status'.tr, controller.status.value.tr),
                if (controller.status.value == 'Invoiced') _kv('delivery_status'.tr, AddEditSalesOrderScreen._translateDeliveryStatusBilingual(controller.deliveryStatus.value)),
                const Divider(height: 24),
                _kv('subtotal'.tr, Formatting.amount(subtotal)),
                if (itemsDiscount > 0) _kv('${'discount'.tr} (${'items'.tr})', '-${Formatting.amount(itemsDiscount)}'),
                if (orderDiscount > 0) _kv('${'discount'.tr} (${'order'.tr})', '-${Formatting.amount(orderDiscount)}'),
                if (combinedDiscount > 0) _kv('${'discount'.tr} (${'total'.tr})', '-${Formatting.amount(combinedDiscount)}'),
                _kv('tax'.tr, Formatting.amount(tax)),
                _kv('total'.tr, Formatting.amount(total), isTotal: true),
              ],
            ),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: controller.notesController,
            decoration: InputDecoration(
              labelText: 'order_notes'.tr,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              filled: true,
              fillColor: Get.theme.colorScheme.surfaceVariant.withOpacity(0.3),
            ),
            maxLines: 3,
          ),
        ],
      );
    });
  }

  Widget _kv(String k, String v, {bool isTotal = false}) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 4.0),
        child: Row(
          children: [
            Expanded(
                child: Text(k,
                    style: TextStyle(
                      fontWeight: isTotal ? FontWeight.w700 : FontWeight.w500,
                      fontSize: isTotal ? 16 : 14,
                    ))),
            Text(v,
                style: TextStyle(
                  fontWeight: isTotal ? FontWeight.w700 : FontWeight.normal,
                  fontSize: isTotal ? 16 : 14,
                )),
          ],
        ),
      );
}

// --- Helper Chips ---
class _InfoChip extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color? color;
  const _InfoChip({required this.label, required this.icon, this.color});
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: (color ?? theme.colorScheme.primary.withOpacity(.08)),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: theme.colorScheme.primary),
          const SizedBox(width: 6),
          Text(label, style: theme.textTheme.labelMedium),
        ],
      ),
    );
  }
}

class _FlagChip extends StatelessWidget {
  final Color color;
  final String text;
  const _FlagChip({required this.color, required this.text});
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withOpacity(.15),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: color.withOpacity(.5)),
      ),
      child: Text(text, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: _darken(color))),
    );
  }
}

// Simple color extension for better contrast
Color _darken(Color color, [double amount = .25]) {
  final hsl = HSLColor.fromColor(color);
  final hslDark = hsl.withLightness((hsl.lightness - amount).clamp(0.0, 1.0));
  return hslDark.toColor();
}
