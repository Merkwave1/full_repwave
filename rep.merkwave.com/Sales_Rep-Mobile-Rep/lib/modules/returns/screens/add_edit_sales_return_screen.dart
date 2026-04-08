// lib/modules/returns/screens/add_edit_sales_return_screen.dart
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '/data/models/client.dart';
import '/data/models/sales_order.dart';
import '/data/models/sales_return_item.dart';
import '/modules/returns/controllers/add_edit_sales_return_controller.dart'; // Added missing import
import '/shared_widgets/app_notifier.dart';
import '/shared_widgets/custom_app_bar.dart';
import '/shared_widgets/loading_indicator.dart';
import '/shared_widgets/searchable_dropdown.dart';
import '/core/routes/app_routes.dart'; // For navigation to select sales order items
import '/core/utils/formatting.dart';
import 'package:intl/intl.dart';

class AddEditSalesReturnScreen extends StatefulWidget {
  final int? preSelectedClientId;

  const AddEditSalesReturnScreen({
    super.key,
    this.preSelectedClientId,
  });

  @override
  State<AddEditSalesReturnScreen> createState() => _AddEditSalesReturnScreenState();
}

class _AddEditSalesReturnScreenState extends State<AddEditSalesReturnScreen> {
  late final AddEditSalesReturnController controller;
  Client? selectedClient;

  @override
  void initState() {
    super.initState();
    controller = Get.find<AddEditSalesReturnController>();

    // Set up client pre-selection if provided
    if (widget.preSelectedClientId != null) {
      _setupClientPreselection();
    }
  }

  void _setupClientPreselection() {
    if (widget.preSelectedClientId != null) {
      print('Setting up client pre-selection for return, ID: ${widget.preSelectedClientId}');

      // Use reactive listener to wait for clients to be loaded
      ever(controller.clients, (clients) {
        if (clients.isNotEmpty) {
          print('Clients loaded for return, looking for client ID: ${widget.preSelectedClientId}');

          final targetClient = clients.firstWhereOrNull((client) => client.id.toString() == widget.preSelectedClientId.toString());

          if (targetClient != null) {
            print('Found target client for return: ${targetClient.companyName}');
            setState(() {
              selectedClient = targetClient;
            });
            controller.onClientSelected(targetClient);
          } else {
            print('Client with ID ${widget.preSelectedClientId} not found in loaded clients for return');
          }
        }
      });
    }
  }

  @override
  void dispose() {
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final dateTimeFormatter = DateFormat('yyyy-MM-dd HH:mm');

    return Scaffold(
      appBar: CustomAppBar(
        title: controller.isEditMode.value ? 'edit_sales_return'.tr : 'add_new_return'.tr,
      ),
      body: Obx(
        () {
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

          return SingleChildScrollView(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Client Selection
                _buildSectionTitle('client_info'.tr),
                Obx(
                  () => SearchableDropdown<Client>(
                    labelText: 'select_client'.tr,
                    hintText: 'select_client'.tr,
                    searchPlaceholder: 'search_client'.tr,
                    options: controller.clients.map((client) {
                      return DropdownOption<Client>(value: client, label: client.companyName);
                    }).toList(),
                    value:
                        (selectedClient ?? controller.selectedClient.value) != null ? DropdownOption<Client>(value: selectedClient ?? controller.selectedClient.value!, label: (selectedClient ?? controller.selectedClient.value!).companyName) : null,
                    onChanged: controller.isEditMode.value
                        ? (option) {}
                        : (option) {
                            setState(() {
                              selectedClient = option?.value;
                            });
                            controller.onClientSelected(option?.value);
                          },
                    validator: (value) => value == null ? 'please_select_client'.tr : null,
                    enabled: !controller.isEditMode.value, // Disable client change in edit mode
                  ),
                ),
                const SizedBox(height: 16.0),

                // Linked Sales Order Selection (Now Mandatory: only invoiced orders shown)
                _buildSectionTitle('select_sales_order'.tr),
                Obx(
                  () => SearchableDropdown<SalesOrder>(
                    labelText: 'select_sales_order'.tr,
                    hintText: 'select_sales_order'.tr,
                    searchPlaceholder: 'search_sales_order'.tr,
                    options: controller.salesOrders.map((order) {
                      return DropdownOption<SalesOrder>(
                        value: order,
                        label: '${'order'.tr} #${order.salesOrderId} - ${order.clientCompanyName ?? 'not_available'.tr}',
                      );
                    }).toList(),
                    value: controller.selectedSalesOrder.value != null
                        ? DropdownOption<SalesOrder>(
                            value: controller.selectedSalesOrder.value!,
                            label: '${'order'.tr} #${controller.selectedSalesOrder.value!.salesOrderId} - ${controller.selectedSalesOrder.value!.clientCompanyName ?? 'not_available'.tr}',
                          )
                        : null,
                    onChanged: controller.onSalesOrderSelected,
                    enabled: !controller.isEditMode.value, // Disabled in edit mode
                    validator: (value) => value == null ? 'please_select_sales_order'.tr : null,
                  ),
                ),
                const SizedBox(height: 16.0),

                // Return Date
                _buildSectionTitle('return_date'.tr),
                Obx(() => InkWell(
                      onTap: () async {
                        final current = controller.returnDate.value ?? DateTime.now();
                        final pickedDate = await showDatePicker(
                          context: context,
                          initialDate: current,
                          firstDate: DateTime(2000),
                          lastDate: DateTime(2101),
                        );
                        if (pickedDate == null) return;

                        final pickedTime = await showTimePicker(
                          context: context,
                          initialTime: TimeOfDay.fromDateTime(current),
                        );

                        final selected = DateTime(
                          pickedDate.year,
                          pickedDate.month,
                          pickedDate.day,
                          (pickedTime ?? TimeOfDay.fromDateTime(current)).hour,
                          (pickedTime ?? TimeOfDay.fromDateTime(current)).minute,
                        );
                        controller.onReturnDateSelected(selected);
                      },
                      child: InputDecorator(
                        decoration: InputDecoration(
                          labelText: 'return_date'.tr,
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        child: Text(
                          controller.returnDate.value != null ? dateTimeFormatter.format(controller.returnDate.value!.toLocal()) : 'select_date'.tr,
                        ),
                      ),
                    )),
                const SizedBox(height: 16.0),

                // Status selection (Draft / Pending)
                _buildSectionTitle('status'.tr),
                Obx(() {
                  final baseOptions = <String>{'Draft', 'Pending'};
                  if (controller.status.value.isNotEmpty) {
                    baseOptions.add(controller.status.value);
                  }
                  final options = baseOptions.toList();
                  return DropdownButtonFormField<String>(
                    value: options.contains(controller.status.value) ? controller.status.value : 'Draft',
                    items: options
                        .map(
                          (status) => DropdownMenuItem<String>(
                            value: status,
                            child: Text(_statusLabel(status)),
                          ),
                        )
                        .toList(),
                    onChanged: (value) {
                      if (value == null) return;
                      if (value == controller.status.value) return;
                      if (value == 'Draft' || value == 'Pending' || controller.isEditMode.value) {
                        controller.onStatusChanged(value);
                      }
                    },
                    decoration: InputDecoration(
                      labelText: 'status'.tr,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  );
                }),
                const SizedBox(height: 16.0),

                // Reason for Return
                TextField(
                  controller: controller.reasonController,
                  decoration: InputDecoration(
                    labelText: 'reason_for_return'.tr,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  maxLines: 2,
                ),
                const SizedBox(height: 16.0),

                // Notes
                TextField(
                  controller: controller.notesController,
                  decoration: InputDecoration(
                    labelText: 'return_notes'.tr,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  maxLines: 3,
                ),
                const SizedBox(height: 24.0),

                // Return Items Section
                _buildSectionTitle('return_items'.tr),
                Obx(
                  () => ListView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: controller.returnItems.length,
                    itemBuilder: (context, index) {
                      final item = controller.returnItems[index];
                      return Card(
                        margin: const EdgeInsets.symmetric(vertical: 8.0),
                        elevation: 1,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        child: Padding(
                          padding: const EdgeInsets.all(12.0),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Expanded(
                                    child: Text(
                                      _localizedItemName(item),
                                      style: Get.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold),
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                  IconButton(
                                    icon: const Icon(Icons.delete, color: Colors.red, size: 20),
                                    onPressed: () => controller.removeReturnItem(index),
                                  ),
                                ],
                              ),
                              Text('${'quantity'.tr}: ${item.quantity.toStringAsFixed(2)} ${item.packagingTypeName ?? ''}'),
                              Text('${'unit_price'.tr} (${'excluding_tax'.tr}): ${Formatting.amount(item.unitPrice)}'),
                              if (item.hasTax && item.taxRate != null) Text('${'tax_rate'.tr}: ${item.taxRate!.toStringAsFixed(1)}%'),
                              if (item.hasTax && item.taxAmount > 0) Text('${'tax_amount'.tr}: ${Formatting.amount(item.taxAmount)}'),
                              Text('${'total'.tr} (${'including_tax'.tr}): ${Formatting.amount(item.totalPriceWithTax)}'),
                              if (item.notes != null && item.notes!.isNotEmpty) Text('${'item_notes'.tr}: ${item.notes}'),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(height: 16.0),
                Center(
                  child: ElevatedButton.icon(
                    onPressed: () async {
                      // Navigate to a screen to select sales order items to return
                      // You'll need to create this screen (e.g., SelectReturnItemsScreen)
                      // and pass the selectedSalesOrder.value.salesOrderId to it
                      if (controller.selectedSalesOrder.value == null) {
                        AppNotifier.validation('please_select_sales_order_first'.tr, title: 'selection_required'.tr);
                        return;
                      }

                      final selectedSoItems = await Get.toNamed(
                        AppRoutes.selectSalesOrderItemsForReturn,
                        arguments: controller.selectedSalesOrder.value!.salesOrderId,
                      );

                      if (selectedSoItems != null && selectedSoItems is List<SalesReturnItem>) {
                        for (var item in selectedSoItems) {
                          controller.addReturnItem(item);
                        }
                      }
                    },
                    icon: const Icon(Icons.add),
                    label: Text('add_item'.tr),
                  ),
                ),
                const SizedBox(height: 24.0),

                // Save Button
                Obx(
                  () => SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: controller.isSaving.value ? null : controller.saveSalesReturn,
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 15),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: controller.isSaving.value
                          ? const CircularProgressIndicator(color: Colors.white)
                          : Text(
                              controller.isEditMode.value ? 'update_return'.tr : 'create_return'.tr,
                              style: const TextStyle(fontSize: 18),
                            ),
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0, top: 16.0),
      child: Text(
        title,
        style: Get.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
      ),
    );
  }

  String _statusLabel(String status) {
    switch (status.toLowerCase()) {
      case 'draft':
        return 'draft'.tr;
      case 'pending':
        return 'pending'.tr;
      case 'approved':
        return 'approved'.tr;
      case 'cancelled':
        return 'cancelled'.tr;
      default:
        return status.tr;
    }
  }

  String _localizedItemName(SalesReturnItem item) {
    final name = item.displayDescription.trim();
    if (name.isEmpty || item.isUnknownProduct || name == SalesReturnItem.unknownProductPlaceholder) {
      return _translateOrDefault('unknown_product', SalesReturnItem.unknownProductPlaceholder);
    }
    return name;
  }

  String _translateOrDefault(String key, String fallback) {
    final translated = key.tr;
    return translated == key ? fallback : translated;
  }
}
