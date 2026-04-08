// lib/modules/returns/controllers/add_edit_sales_return_controller.dart
import 'package:get/get.dart';
import '/shared_widgets/app_notifier.dart';
import 'package:flutter/material.dart';
import '/data/models/client.dart';
import '/data/models/sales_order.dart';
import '/data/models/sales_return.dart'; // Corrected import
import '/data/models/sales_return_item.dart';
import '/data/repositories/client_repository.dart';
import '/data/repositories/sales_order_repository.dart';
import '/data/repositories/sales_return_repository.dart';
import '/data/repositories/visit_repository.dart';
import '/modules/auth/controllers/auth_controller.dart';
import '/shared_widgets/searchable_dropdown.dart'; // Import DropdownOption
import '/shared_widgets/ultra_safe_navigation.dart'; // Safe navigation

class AddEditSalesReturnController extends GetxController {
  final SalesReturnRepository _salesReturnRepository;
  final ClientRepository _clientRepository;
  final SalesOrderRepository _salesOrderRepository;
  final AuthController _authController;

  AddEditSalesReturnController({
    required SalesReturnRepository salesReturnRepository,
    required ClientRepository clientRepository,
    required SalesOrderRepository salesOrderRepository,
    required AuthController authController,
  })  : _salesReturnRepository = salesReturnRepository,
        _clientRepository = clientRepository,
        _salesOrderRepository = salesOrderRepository,
        _authController = authController;

  // Form field controllers
  final TextEditingController reasonController = TextEditingController();
  final TextEditingController notesController = TextEditingController();

  // Observable form values
  final Rx<Client?> selectedClient = Rx<Client?>(null);
  final Rx<SalesOrder?> selectedSalesOrder = Rx<SalesOrder?>(null);
  final Rx<DateTime?> returnDate = Rx<DateTime?>(DateTime.now());
  final RxString status = 'Draft'.obs; // Changed default status from 'Pending' to 'Draft'

  // Observable lists for dropdowns and items
  final RxList<Client> clients = <Client>[].obs;
  final RxList<SalesOrder> salesOrders = <SalesOrder>[].obs; // Sales Orders for selected client
  final RxList<SalesReturnItem> returnItems = <SalesReturnItem>[].obs; // Items for the current return

  // Visit tracking for activity logging
  int? visitId; // To track which visit this return is created from

  // Loading and error states
  final RxBool isLoading = false.obs;
  final RxBool isSaving = false.obs;
  final RxString errorMessage = ''.obs;

  // For edit mode
  SalesReturn? initialSalesReturn;
  final RxBool isEditMode = false.obs;

  @override
  void onInit() {
    super.onInit();

    // Check for arguments (could be visitId for new returns or SalesReturn for editing)
    if (Get.arguments != null) {
      if (Get.arguments is Map<String, dynamic>) {
        final args = Get.arguments as Map<String, dynamic>;
        if (args.containsKey('visitId')) {
          visitId = args['visitId'] as int?;
          print('Return controller initialized with visitId: $visitId');
        }
      } else if (Get.arguments is SalesReturn) {
        initialSalesReturn = Get.arguments as SalesReturn;
        isEditMode.value = true;
      }
    }

    _loadInitialData().then((_) {
      if (isEditMode.value && initialSalesReturn != null) {
        _populateFormForEdit(initialSalesReturn!);
      }
    });
  }

  @override
  void onClose() {
    reasonController.dispose();
    notesController.dispose();
    super.onClose();
  }

  Future<void> _loadInitialData() async {
    isLoading.value = true;
    errorMessage.value = '';
    try {
      final currentUser = _authController.currentUser.value;
      if (currentUser == null) {
        errorMessage.value = 'User not logged in. Cannot load initial data.';
        isLoading.value = false;
        AppNotifier.error(errorMessage.value);
        return;
      }

      final fetchedClients = await _clientRepository.getAllClients(currentUser.uuid);
      clients.assignAll(fetchedClients);

      // If in edit mode, sales orders for the client will be loaded in _populateFormForEdit
      // Otherwise, no sales orders are pre-loaded unless a client is selected.
    } catch (e) {
      errorMessage.value = 'Failed to load initial data: ${e.toString()}';
      print('AddEditSalesReturnController Error: ${errorMessage.value}');
      AppNotifier.error('Failed to load necessary data. Please try again.');
    } finally {
      isLoading.value = false;
    }
  }

  void _populateFormForEdit(SalesReturn salesReturn) async {
    selectedClient.value = clients.firstWhereOrNull((c) => c.id == salesReturn.clientId);
    reasonController.text = salesReturn.reason ?? '';
    notesController.text = salesReturn.notes ?? '';
    returnDate.value = salesReturn.returnsDate;
    status.value = salesReturn.status;
    returnItems.assignAll(salesReturn.items);

    // If there's a linked sales order, fetch it and its items
    if (salesReturn.salesOrderId != null) {
      try {
        final linkedSalesOrder = await _salesOrderRepository.getSalesOrderById(salesReturn.salesOrderId!);
        selectedSalesOrder.value = linkedSalesOrder;
        // Optionally, you might want to filter salesOrder items here for selection.
        // For simplicity, we're just displaying the linked SO.
      } catch (e) {
        print('Error fetching linked sales order for return: $e');
        AppNotifier.error('Could not load linked sales order details.');
      }
    }
  }

  void onClientSelected(Client? client) async {
    selectedClient.value = client;
    selectedSalesOrder.value = null; // Clear selected sales order when client changes
    salesOrders.clear(); // Clear previous sales orders

    if (client != null) {
      isLoading.value = true;
      try {
        // Fetch only INVOICED sales orders (business rule: returns can link only to invoiced orders)
        final invoicedOrders = await _salesOrderRepository.getAllSalesOrders(status: 'Invoiced');
        final clientInvoiced = invoicedOrders.where((order) => order.clientId == client.id).toList();
        salesOrders.assignAll(clientInvoiced);
        print('Loaded ${clientInvoiced.length} invoiced orders for client ${client.companyName} (ID: ${client.id}).');
      } catch (e) {
        print('Error fetching sales orders for client: $e');
        AppNotifier.error('Failed to load sales orders for selected client.');
      } finally {
        isLoading.value = false;
      }
    }
  }

  // Corrected: Accept DropdownOption<SalesOrder>? and extract SalesOrder
  void onSalesOrderSelected(DropdownOption<SalesOrder>? option) {
    selectedSalesOrder.value = option?.value;
    // When a sales order is selected, you might want to automatically populate return items
    // based on the sales order items, or at least make them available for selection.
    // For now, we'll leave item selection to the dedicated add/edit item process.
  }

  void onReturnDateSelected(DateTime? date) {
    returnDate.value = date;
  }

  void onStatusChanged(String? newStatus) {
    if (newStatus != null) {
      status.value = newStatus;
    }
  }

  void addReturnItem(SalesReturnItem newItem) {
    returnItems.add(newItem);
    _calculateTotals();
  }

  void updateReturnItem(int index, SalesReturnItem newItem) {
    if (index >= 0 && index < returnItems.length) {
      returnItems[index] = newItem;
      _calculateTotals();
    }
  }

  void removeReturnItem(int index) {
    if (index >= 0 && index < returnItems.length) {
      returnItems.removeAt(index);
      _calculateTotals();
    }
  }

  void _calculateTotals() {
    // Currently totals are computed on demand when saving.
    // Placeholder for future reactive total calculations.
  }

  Future<void> saveSalesReturn() async {
    if (!validateForm()) {
      return;
    }

    isSaving.value = true;
    errorMessage.value = '';

    try {
      final currentUser = _authController.currentUser.value;
      if (currentUser == null) {
        errorMessage.value = 'User not logged in. Cannot save return.';
        AppNotifier.error(errorMessage.value);
        return;
      }

      final SalesReturn salesReturnToSave = SalesReturn(
        returnsId: isEditMode.value ? initialSalesReturn!.returnsId : 0,
        clientId: selectedClient.value!.id,
        salesOrderId: selectedSalesOrder.value?.salesOrderId,
        returnsDate: returnDate.value ?? DateTime.now(),
        reason: reasonController.text.trim().isEmpty ? null : reasonController.text.trim(),
        totalAmount: returnItems.fold(0.0, (sum, item) => sum + item.totalPrice),
        status: status.value,
        notes: notesController.text.trim().isEmpty ? null : notesController.text.trim(),
        createdByUserId: currentUser.id, // Or currentUser.representativeId
        createdAt: isEditMode.value ? initialSalesReturn!.createdAt : DateTime.now(),
        updatedAt: DateTime.now(),
        items: returnItems.toList(),
      );

      print('SalesReturn data to send: ${salesReturnToSave.toJson()}');

      SalesReturn savedReturn;
      if (isEditMode.value) {
        savedReturn = await _salesReturnRepository.updateSalesReturn(salesReturnToSave);
        // Get.snackbar('Success', 'Sales Return updated successfully!',
        //     snackPosition: SnackPosition.BOTTOM);
      } else {
        savedReturn = await _salesReturnRepository.createSalesReturn(salesReturnToSave);

        // Log visit activity if visitId is provided (only for new returns)
        if (visitId != null) {
          try {
            final visitRepository = Get.find<VisitRepository>();
            await visitRepository.addVisitActivity(
              visitId!,
              'Return_Initiated',
              'Return initiated: ${savedReturn.reason ?? 'No reason specified'} - Total: ${savedReturn.totalAmount.toStringAsFixed(2)}',
              referenceId: savedReturn.returnsId,
            );
            print('Visit activity logged for return ID: ${savedReturn.returnsId}');
          } catch (e) {
            print('Failed to log visit activity: $e');
            // Don't fail the return creation if activity logging fails
          }
        }

        // Get.snackbar('Success', 'Sales Return created successfully!',
        //     snackPosition: SnackPosition.BOTTOM);
      }

      // REMOVED: Get.find<ReturnsController>().fetchReturns(isInitialFetch: true);
      // The refresh will now be triggered by the ReturnOrderScreen's FAB onPressed callback
      UltraSafeNavigation.back(Get.context, true); // Safe navigation without touching snackbar queue
    } catch (e) {
      errorMessage.value = 'Failed to save sales return: ${e.toString()}';
      print('AddEditSalesReturnController Save Error: ${errorMessage.value}');
      AppNotifier.error('Failed to save sales return. Please check your input and try again.');
    } finally {
      isSaving.value = false;
    }
  }

  bool validateForm() {
    if (selectedClient.value == null) {
      AppNotifier.validation('Please select a client.');
      return false;
    }
    if (selectedSalesOrder.value == null) {
      AppNotifier.validation('Please select a sales order.');
      return false;
    }
    // Enforce business rule: linked sales order (if chosen) must be Invoiced
    if (selectedSalesOrder.value != null && selectedSalesOrder.value!.status != 'Invoiced') {
      AppNotifier.validation('Only invoiced sales orders can be used for returns.');
      return false;
    }
    if (returnItems.isEmpty) {
      AppNotifier.validation('Please add at least one item to the return.');
      return false;
    }
    return true;
  }
}
