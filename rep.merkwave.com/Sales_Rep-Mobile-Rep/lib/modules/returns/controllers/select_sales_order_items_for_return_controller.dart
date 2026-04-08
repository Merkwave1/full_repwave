// lib/modules/returns/controllers/select_sales_order_items_for_return_controller.dart
import 'package:get/get.dart';
import '/shared_widgets/app_notifier.dart';
import 'package:flutter/material.dart'; // For TextEditingController
import '/data/models/sales_order_item.dart';
import '/data/models/sales_return_item.dart';
import '/data/repositories/sales_order_repository.dart';
import '/data/repositories/sales_return_repository.dart'; // New import
import '/shared_widgets/ultra_safe_navigation.dart'; // For safe back navigation
import '/modules/auth/controllers/auth_controller.dart'; // Import AuthController

class SelectSalesOrderItemsForReturnController extends GetxController {
  final SalesOrderRepository _salesOrderRepository;
  final SalesReturnRepository _salesReturnRepository; // New repository instance
  final AuthController _authController = Get.find<AuthController>(); // Get AuthController instance

  SelectSalesOrderItemsForReturnController({
    required SalesOrderRepository salesOrderRepository,
    required SalesReturnRepository salesReturnRepository, // Inject new repository
  })  : _salesOrderRepository = salesOrderRepository,
        _salesReturnRepository = salesReturnRepository;

  final RxList<SalesOrderItem> salesOrderItems = <SalesOrderItem>[].obs;
  // Map to store selected quantity for each sales order item ID
  final RxMap<int, double> selectedQuantities = <int, double>{}.obs;
  final RxBool isLoading = true.obs;
  final RxString errorMessage = ''.obs;

  int? salesOrderId; // The ID of the sales order whose items we need to fetch

  // Map to hold TextEditingControllers for each item's quantity input
  final Map<int, TextEditingController> quantityControllers = {};
  // Map to store available quantity for each sales order item ID
  final Map<int, double> availableQuantities = {};

  @override
  void onInit() {
    super.onInit();
    if (Get.arguments != null && Get.arguments is int) {
      salesOrderId = Get.arguments as int;
      fetchSalesOrderItems(salesOrderId!);
    } else {
      errorMessage.value = 'Sales Order ID not provided to select items.';
      isLoading.value = false;
      AppNotifier.error('Sales Order ID is missing for item selection.');
    }
  }

  @override
  void onClose() {
    // Dispose all quantity controllers
    quantityControllers.forEach((key, controller) => controller.dispose());
    super.onClose();
  }

  Future<void> fetchSalesOrderItems(int id) async {
    try {
      isLoading.value = true;
      errorMessage.value = '';

      // Fetch the full sales order details, which includes its items
      final salesOrder = await _salesOrderRepository.getSalesOrderById(id);

      if (salesOrder.items.isEmpty) {
        errorMessage.value = 'No items found for this Sales Order.';
        return;
      }

      salesOrderItems.assignAll(salesOrder.items);

      // Fetch all existing sales returns for this sales order to sum up returned quantities
      // Note: This fetches all returns. For very large data, consider a dedicated API endpoint
      // that returns summed quantities per sales_order_item_id.
      final String? userUuid = _authController.currentUser.value?.uuid;
      final Map<int, double> alreadyReturnedMap = await _salesReturnRepository.getSummedReturnedQuantities(salesOrderId: id, usersUuid: userUuid);

      // Calculate already returned quantities per sales_order_item_id
      // The logic for deducting based on status is now handled by the PHP API
      // final Map<int, double> alreadyReturnedMap = {};
      // for (var sReturn in allSalesReturns) {
      //   // Deduct quantity for all statuses EXCEPT 'Draft' and 'Cancelled'
      //   if (sReturn.status != 'Draft' && sReturn.status != 'Cancelled') {
      //     for (var item in sReturn.items) {
      //       alreadyReturnedMap[item.salesOrderItemId] = (alreadyReturnedMap[item.salesOrderItemId] ?? 0.0) + item.quantity;
      //     }
      //   }
      // }

      // Initialize quantity controllers and available quantities
      for (var item in salesOrder.items) {
        final double originalQty = item.quantity;
        final double returnedQty = alreadyReturnedMap[item.salesOrderItemId] ?? 0.0;
        final double availableQty = originalQty - returnedQty;

        availableQuantities[item.salesOrderItemId] = availableQty;

        // Initialize controller with available quantity, but only if it's positive
        final initialText = availableQty > 0 ? availableQty.toStringAsFixed(2) : '0.00';
        quantityControllers[item.salesOrderItemId] = TextEditingController(text: initialText);

        // If available quantity is 0 or less, don't pre-select or allow input
        if (availableQty <= 0) {
          selectedQuantities.remove(item.salesOrderItemId); // Ensure it's not selected
          quantityControllers[item.salesOrderItemId]?.text = '0.00'; // Set to 0 in UI
        } else {
          // Default selected quantity to available quantity if positive
          selectedQuantities[item.salesOrderItemId] = availableQty;
        }
      }
      selectedQuantities.refresh(); // Refresh to update UI if any items were deselected/quantities set to 0
    } catch (e) {
      errorMessage.value = 'Failed to load sales order items: ${e.toString()}';
      print('SelectSalesOrderItemsForReturnController Error: ${errorMessage.value}');
      AppNotifier.error('Failed to load sales order items. Please try again.');
    } finally {
      isLoading.value = false;
    }
  }

  void onQuantityChanged(int salesOrderItemId, String value) {
    final parsedQuantity = double.tryParse(value);
    final maxAvailableQty = availableQuantities[salesOrderItemId] ?? 0.0;

    if (parsedQuantity != null) {
      if (parsedQuantity > maxAvailableQty) {
        AppNotifier.validation('Quantity cannot exceed available: ${maxAvailableQty.toStringAsFixed(2)}');
        selectedQuantities[salesOrderItemId] = maxAvailableQty; // Cap at max
        quantityControllers[salesOrderItemId]?.text = maxAvailableQty.toStringAsFixed(2); // Update UI
      } else if (parsedQuantity < 0) {
        AppNotifier.validation('Quantity cannot be negative.');
        selectedQuantities[salesOrderItemId] = 0.0;
        quantityControllers[salesOrderItemId]?.text = '0.00';
      } else {
        selectedQuantities[salesOrderItemId] = parsedQuantity;
      }
    } else {
      selectedQuantities[salesOrderItemId] = 0.0; // Invalid input, set to 0
    }
    selectedQuantities.refresh(); // Force RxMap update to trigger UI rebuild
  }

  void toggleSelectItem(SalesOrderItem item) {
    final maxAvailableQty = availableQuantities[item.salesOrderItemId] ?? 0.0;

    if (maxAvailableQty <= 0) {
      AppNotifier.info('No quantity available to return for this item.');
      return; // Cannot select if no quantity is available
    }

    if (isItemSelected(item)) {
      selectedQuantities.remove(item.salesOrderItemId);
      quantityControllers[item.salesOrderItemId]?.text = '0.00'; // Clear text if deselected
    } else {
      // Add with default quantity (e.g., available quantity)
      selectedQuantities[item.salesOrderItemId] = maxAvailableQty;
      quantityControllers[item.salesOrderItemId]?.text = maxAvailableQty.toStringAsFixed(2);
    }
    selectedQuantities.refresh(); // Ensure UI updates
  }

  bool isItemSelected(SalesOrderItem item) {
    return selectedQuantities.containsKey(item.salesOrderItemId) && (selectedQuantities[item.salesOrderItemId] ?? 0.0) > 0;
  }

  void confirmSelection() {
    final List<SalesReturnItem> itemsToReturn = [];
    for (var item in salesOrderItems) {
      if (selectedQuantities.containsKey(item.salesOrderItemId)) {
        final returnQuantity = selectedQuantities[item.salesOrderItemId]!;
        final maxAvailableQty = availableQuantities[item.salesOrderItemId] ?? 0.0;

        if (returnQuantity > 0 && returnQuantity <= maxAvailableQty) {
          // Validate against available quantity
          // Calculate proportional tax amount for the return quantity
          final double originalTaxAmount = item.taxAmount ?? 0.0;
          final double originalQuantity = item.quantity;
          final double proportionalTaxAmount = originalQuantity > 0 ? (originalTaxAmount / originalQuantity) * returnQuantity : 0.0;

          itemsToReturn.add(SalesReturnItem(
            returnItemsId: 0, // Placeholder for new item
            returnId: 0, // Will be set when saving the main return
            salesOrderItemId: item.salesOrderItemId,
            quantity: returnQuantity,
            unitPrice: item.unitPrice,
            totalPrice: returnQuantity * item.unitPrice, // Recalculate total price
            notes: item.notes,
            variantName: item.variantName,
            packagingTypeName: item.packagingTypeName,
            salesOrderItemVariantId: item.variantId,
            taxAmount: proportionalTaxAmount, // Use calculated proportional tax amount
            taxRate: item.taxRate, // Include the tax rate
            hasTax: item.hasTax ?? false, // Provide hasTax, fallback to false if null
          ));
        } else {
          AppNotifier.validation('Invalid quantity for ${item.variantName}. Must be > 0 and <= ${maxAvailableQty.toStringAsFixed(2)}.');
          return; // Prevent navigation if validation fails
        }
      }
    }

    if (itemsToReturn.isEmpty) {
      AppNotifier.validation('Please select at least one item to return with a valid quantity.', title: 'Selection Required');
      return;
    }

    // Use UltraSafeNavigation to avoid snackbar controller late init issues
    UltraSafeNavigation.back(Get.context, itemsToReturn);
  }
}
