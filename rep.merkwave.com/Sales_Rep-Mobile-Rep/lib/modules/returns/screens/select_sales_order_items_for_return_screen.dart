// lib/modules/returns/screens/select_sales_order_items_for_return_screen.dart
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '/modules/returns/controllers/select_sales_order_items_for_return_controller.dart';
import '/shared_widgets/custom_app_bar.dart';
import '/shared_widgets/loading_indicator.dart';
import '/core/utils/formatting.dart';

class SelectSalesOrderItemsForReturnScreen extends GetView<SelectSalesOrderItemsForReturnController> {
  const SelectSalesOrderItemsForReturnScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: CustomAppBar(
        title: 'select_items_for_return'.tr,
      ),
      body: Obx(() {
        if (controller.isLoading.value) {
          return LoadingIndicator(message: 'loading_items'.tr);
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

        if (controller.salesOrderItems.isEmpty) {
          return Center(
            child: Text(
              'no_sales_order_items_found'.tr,
              style: Get.textTheme.titleMedium,
            ),
          );
        }

        return Column(
          children: [
            Expanded(
              child: ListView.builder(
                padding: const EdgeInsets.all(8.0),
                itemCount: controller.salesOrderItems.length,
                itemBuilder: (context, index) {
                  final item = controller.salesOrderItems[index];
                  // Ensure controller for this item exists
                  if (!controller.quantityControllers.containsKey(item.salesOrderItemId)) {
                    // This block should ideally not be hit if fetchSalesOrderItems initializes correctly
                    // but as a fallback, ensure controller is created.
                    controller.quantityControllers[item.salesOrderItemId] = TextEditingController(text: item.quantity.toStringAsFixed(2));
                    controller.selectedQuantities[item.salesOrderItemId] = item.quantity;
                  }

                  // Move these variable declarations inside the Obx builder
                  // to ensure reactivity for each item's specific observables.
                  return Obx(() {
                    // This Obx now correctly wraps the reactive parts for each item
                    final availableQty = controller.availableQuantities[item.salesOrderItemId] ?? 0.0;
                    final currentSelectedQty = controller.selectedQuantities[item.salesOrderItemId] ?? 0.0;
                    final isSelected = controller.isItemSelected(item);

                    return Card(
                      margin: const EdgeInsets.symmetric(vertical: 4.0, horizontal: 2.0),
                      elevation: 1,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8.0)),
                      child: Padding(
                        padding: const EdgeInsets.all(8.0),
                        child: Column(
                          children: [
                            CheckboxListTile(
                              controlAffinity: ListTileControlAffinity.leading,
                              value: isSelected,
                              onChanged: (bool? selected) {
                                controller.toggleSelectItem(item);
                              },
                              title: Text(
                                item.variantName ?? 'unknown_product'.tr,
                                style: Get.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold),
                              ),
                              subtitle: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('${'original_quantity'.tr}: ${item.quantity.toStringAsFixed(2)} ${item.packagingTypeName ?? ''}'),
                                  Text(
                                    '${'available_to_return'.tr}: ${availableQty.toStringAsFixed(2)} ${item.packagingTypeName ?? ''}',
                                    style: TextStyle(color: availableQty > 0 ? Colors.green : Colors.red),
                                  ),
                                  Text('${'unit_price'.tr} (${'excluding_tax'.tr}): ${Formatting.amount(item.unitPrice)}'),
                                  if (item.hasTax == true && item.taxRate != null) Text('${'tax_rate'.tr}: ${item.taxRate!.toStringAsFixed(1)}%'),
                                  if (item.hasTax == true && item.taxRate != null) Text('${'unit_price'.tr} (${'including_tax'.tr}): ${Formatting.amount(item.unitPrice * (1 + (item.taxRate! / 100)))}'),
                                  Text('${'total_price'.tr}: ${Formatting.amount(item.totalAmount)}'),
                                ],
                              ),
                            ),
                            // Quantity Input Field, visible only if item is selected and has available quantity
                            if (isSelected && availableQty > 0)
                              Padding(
                                padding: const EdgeInsets.only(left: 16.0, right: 16.0, bottom: 8.0),
                                child: TextField(
                                  controller: controller.quantityControllers[item.salesOrderItemId],
                                  keyboardType: TextInputType.number,
                                  decoration: InputDecoration(
                                    labelText: 'quantity_to_return'.tr,
                                    hintText: 'quantity_max_hint'.trParams({'max': availableQty.toStringAsFixed(2)}),
                                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                                    suffixText: item.packagingTypeName ?? '',
                                    errorText: currentSelectedQty > availableQty && availableQty > 0 ? 'quantity_exceeds_available'.tr : null,
                                  ),
                                  onChanged: (value) {
                                    controller.onQuantityChanged(item.salesOrderItemId, value);
                                  },
                                ),
                              ),
                          ],
                        ),
                      ),
                    );
                  }); // End of inner Obx
                },
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: controller.selectedQuantities.isEmpty || controller.selectedQuantities.values.every((qty) => qty <= 0) ? null : () => controller.confirmSelection(),
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 15),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: Text(
                    'add_selected_items'.tr,
                    style: const TextStyle(fontSize: 18),
                  ),
                ),
              ),
            ),
          ],
        );
      }),
    );
  }
}
