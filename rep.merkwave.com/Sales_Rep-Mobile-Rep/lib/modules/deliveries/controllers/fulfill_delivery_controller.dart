// lib/modules/deliveries/controllers/fulfill_delivery_controller.dart
import 'package:get/get.dart';
import 'package:flutter/material.dart';
import '/data/repositories/sales_delivery_repository.dart';
import '/data/models/sales_delivery.dart';

class FulfillDeliveryController extends GetxController {
  final SalesDeliveryRepository repository;
  FulfillDeliveryController({required this.repository});

  // Was late final causing LateInitializationError on repeated screen opens; now nullable & assign-once
  Map<String, dynamic>? order; // passed via arguments
  final RxList<Map<String, dynamic>> itemInputs = <Map<String, dynamic>>[].obs; // {sales_order_items_id, deliver_qty}
  // Each entry also gets 'batches': [ {production_date, quantity_available, selected} ]
  final RxBool isSubmitting = false.obs;
  final RxString errorMessage = ''.obs;
  final TextEditingController notesController = TextEditingController();

  @override
  void onInit() {
    super.onInit();
    // Assign only if not already set (in case controller reused inadvertently)
    order ??= Get.arguments as Map<String, dynamic>;
    print('DEBUG: FulfillDeliveryController received order: ${order!['sales_orders_id']}');
    // Initialize with pending quantities suggested
    final items = (order!['items'] as List<dynamic>).cast<Map<String, dynamic>>();
    print('DEBUG: Processing ${items.length} items');
    itemInputs.assignAll(items.map((i) {
      final batches = (i['batches'] as List?)?.cast<Map<String, dynamic>>() ?? [];
      print('DEBUG: Item ${i['sales_order_items_id']}: pending=${i['quantity_pending']}, available=${i['available_quantity']}, packaging=${i['packaging_types_name']}, batches=${batches.length}');
      // Initialize selected field = 0 for each batch
      final batchStates = batches
          .map((b) => {
                'production_date': b['production_date'],
                // tolerate both 'quantity' and 'quantity_available' keys
                'quantity_available': (b['quantity'] ?? b['quantity_available']),
                'selected': 0.0,
              })
          .toList();
      // Accept multiple shapes for incoming item keys
      final packagingName = i['packaging_types_name'] ?? i['packaging_type_name'] ?? i['packaging_name'];
      final packagingFactor = i['packaging_types_units_per_package'] ?? i['packaging_types_default_conversion_factor'] ?? i['packaging_factor'];
      final pendingQty = i['quantity_pending'] ?? i['pending_quantity'] ?? i['sales_order_items_quantity_pending'] ?? 0.0;
      final availableQty = i['available_quantity'] ?? i['available_in_stock'] ?? 0.0;
      print('DEBUG: Processed item - pending: $pendingQty, available: $availableQty, packaging: $packagingName');
      return {
        'sales_order_items_id': i['sales_order_items_id'],
        // Start from zero; user chooses what to deliver instead of auto-filling pending quantity
        'quantity': 0.0,
        'max_pending': pendingQty,
        'variant_name': i['variant_name'],
        'available_quantity': availableQty,
        'batches': batchStates, // all selected = 0
        'packaging_type_name': packagingName,
        'packaging_factor': packagingFactor,
      };
    }));
  }

  void updateQuantity(int salesOrderItemId, double newQty) {
    itemInputs.assignAll(itemInputs.map((row) {
      if (row['sales_order_items_id'] == salesOrderItemId) {
        final maxPending = (row['max_pending'] as num).toDouble();
        final clamped = newQty < 0 ? 0 : (newQty > maxPending ? maxPending : newQty);
        // Re-auto-distribute across batches proportionally or FIFO
        List<Map<String, dynamic>> batches = (row['batches'] as List).cast<Map<String, dynamic>>();
        double remaining = clamped.toDouble();
        for (final b in batches) {
          final avail = (b['quantity_available'] as num).toDouble();
          if (remaining <= 0) {
            b['selected'] = 0.0;
          } else {
            final take = remaining > avail ? avail : remaining;
            b['selected'] = take;
            remaining -= take;
          }
        }
        return {...row, 'quantity': clamped, 'batches': batches};
      }
      return row;
    }).toList());
  }

  void updateBatchSelection(int salesOrderItemId, String productionDate, double newQty) {
    itemInputs.assignAll(itemInputs.map((row) {
      if (row['sales_order_items_id'] == salesOrderItemId) {
        List<Map<String, dynamic>> batches = (row['batches'] as List).cast<Map<String, dynamic>>();
        double maxPending = (row['max_pending'] as num).toDouble();
        double totalOther = 0;
        for (final b in batches) {
          if (b['production_date'] != productionDate) {
            totalOther += (b['selected'] as num).toDouble();
          }
        }
        // Clamp newQty to batch availability and remaining capacity
        for (final b in batches) {
          if (b['production_date'] == productionDate) {
            final avail = (b['quantity_available'] as num).toDouble();
            final allowed = maxPending - totalOther;
            double clamped = newQty < 0 ? 0 : newQty;
            if (clamped > avail) clamped = avail;
            if (clamped > allowed) clamped = allowed;
            b['selected'] = clamped;
          }
        }
        // Recompute total quantity as sum of selected batches
        final totalSelected = batches.fold<double>(0, (p, b) => p + (b['selected'] as num).toDouble());
        return {...row, 'quantity': totalSelected, 'batches': batches};
      }
      return row;
    }).toList());
  }

  Future<SalesDelivery?> submit({bool closeAfter = true}) async {
    isSubmitting.value = true;
    errorMessage.value = '';
    try {
      final filtered = itemInputs.where((e) => (e['quantity'] as num) > 0).toList();
      if (filtered.isEmpty) {
        errorMessage.value = 'no_items_with_positive_quantity'.tr;
        return null;
      }
      final delivery = await repository.createDelivery(
        salesOrderId: order!['sales_orders_id'] as int,
        warehouseId: order!['sales_orders_warehouse_id'] as int,
        items: filtered.expand((e) {
          final batches = (e['batches'] as List).cast<Map<String, dynamic>>();
          // Return one entry per batch with quantity > 0 including batch_date
          return batches.where((b) => (b['selected'] as num) > 0).map((b) => {
                'sales_order_items_id': e['sales_order_items_id'],
                'quantity': b['selected'],
                'batch_date': b['production_date'],
              });
        }).toList(),
        notes: notesController.text.trim().isEmpty ? null : notesController.text.trim(),
      );

      // Return the delivery data for external navigation handling
      return delivery;
    } catch (e) {
      errorMessage.value = e.toString();
      return null;
    } finally {
      isSubmitting.value = false;
    }
  }
}
