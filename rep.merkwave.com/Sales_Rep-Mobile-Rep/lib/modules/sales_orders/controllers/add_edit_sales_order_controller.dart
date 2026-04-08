// lib/modules/sales_orders/controllers/add_edit_sales_order_controller.dart
import 'dart:async';
import 'package:get/get.dart';
import 'package:flutter/material.dart'; // For TextEditingController, etc.
import '/data/models/sales_order.dart';
import '/data/models/sales_order_item.dart';
import '/data/models/client.dart'; // For client selection
import '/data/models/product_lookup.dart'; // For product/variant selection
import '/data/models/warehouse_product_variant.dart'; // NEW: For warehouse-aware products
import '/data/models/warehouse.dart'; // For warehouse selection
import '/core/utils/formatting.dart';
import '/data/exceptions/api_exceptions.dart';
import '/data/repositories/sales_order_repository.dart';
import '/data/repositories/product_repository.dart'; // To fetch products/variants
import '/data/repositories/visit_repository.dart'; // To log visit activities
import '/modules/auth/controllers/auth_controller.dart'; // To get current user ID
import '/modules/shared/controllers/global_data_controller.dart'; // For cached data

class AddEditSalesOrderController extends GetxController {
  final SalesOrderRepository _salesOrderRepository;
  final VisitRepository _visitRepository; // To log visit activities
  final AuthController _authController; // To get the current user's ID
  final GlobalDataController _globalDataController = Get.find<GlobalDataController>();

  AddEditSalesOrderController({
    required SalesOrderRepository salesOrderRepository,
    required VisitRepository visitRepository,
    required AuthController authController,
  })  : _salesOrderRepository = salesOrderRepository,
        _visitRepository = visitRepository,
        _authController = authController;

  // Form fields controllers
  final TextEditingController notesController = TextEditingController();
  final TextEditingController orderDiscountController = TextEditingController(text: '0.00');

  // Order-level discount
  final RxDouble orderDiscount = 0.0.obs;

  // Live totals tracking
  final RxDouble subtotalAmount = 0.0.obs;
  final RxDouble itemsDiscountAmount = 0.0.obs;
  final RxDouble combinedDiscountAmount = 0.0.obs;
  final RxDouble netSubtotalAmount = 0.0.obs;
  final RxDouble taxAmountTotal = 0.0.obs;
  final RxDouble grandTotalAmount = 0.0.obs;

  // Observable form values
  final Rx<Client?> selectedClient = Rx<Client?>(null);
  final Rx<Warehouse?> selectedWarehouse = Rx<Warehouse?>(null);
  final Rx<DateTime?> orderDate = Rx<DateTime?>(DateTime.now());
  final RxString status = 'Draft'.obs; // Default status
  final RxString deliveryStatus = 'Not_Delivered'.obs; // Delivery status for invoiced orders

  // Observable lists for dropdowns - use getters to access cached data
  List<Client> get clients => _globalDataController.clients;
  List<Warehouse> get myWarehouses => _globalDataController.myWarehouses;
  List<Warehouse> get otherMainWarehouses => _globalDataController.otherMainWarehouses;
  List<ProductVariant> get products => _globalDataController.products;
  final RxList<WarehouseProductVariant> warehouseProducts = <WarehouseProductVariant>[].obs; // NEW: For warehouse-specific products
  // NEW: Representative own (cached) warehouse inventory variants (should be pre-fetched elsewhere and injected / assigned)
  final RxList<WarehouseProductVariant> repInventoryProducts = <WarehouseProductVariant>[].obs; // Only my (rep) warehouse inventory

  // Observable list for sales order items
  final RxList<SalesOrderItem> orderItems = <SalesOrderItem>[].obs;

  // --- Stepper State (New Add Order Style) ---
  final RxInt currentStep = 0.obs; // 0: Client, 1: Items, 2: Status/Delivery, 3: Notes & Review
  int get totalSteps => 4;
  List<String> get stepTitles => ['client'.tr, 'items'.tr, 'status'.tr, 'review'.tr];

  void nextStep() {
    if (currentStep.value == totalSteps - 1) {
      saveSalesOrder(); // No callback needed for internal calls
      return;
    }
    if (!canProceedFromStep(currentStep.value)) return;
    currentStep.value++;
  }

  void previousStep() {
    if (currentStep.value > 0) currentStep.value--;
  }

  // Detect unsaved changes (used to confirm leaving the screen)
  bool get hasUnsavedChanges {
    // If just saved successfully, allow leaving without prompt
    if (saveSuccess.value || isSaving.value) return false;

    // New order mode: any input constitutes unsaved changes
    if (!isEditMode.value) {
      // Show confirm dialog for new orders until saved, regardless of fields
      return true;
    }

    // Edit mode: compare against initial order core fields
    final order = initialSalesOrder;
    if (order == null) {
      // Shouldn't happen in edit mode, fallback to basic checks
      return selectedClient.value != null || orderItems.isNotEmpty || notesController.text.trim().isNotEmpty;
    }

    final clientChanged = (selectedClient.value?.id ?? order.clientId) != order.clientId;
    final warehouseChanged = (selectedWarehouse.value?.warehouseId ?? order.warehouseId) != order.warehouseId;
    final dateChanged = (orderDate.value ?? order.orderDate) != order.orderDate;
    final statusChanged = status.value != order.status;
    final deliveryChanged = (deliveryStatus.value) != (order.deliveryStatus ?? 'Not_Delivered');
    final notesChanged = (notesController.text.trim()) != (order.notes ?? '');
    final itemsCountChanged = orderItems.length != order.items.length;
    final orderDiscountChanged = (orderDiscount.value - (order.orderDiscountAmount)).abs() > 0.009;

    return clientChanged || warehouseChanged || dateChanged || statusChanged || deliveryChanged || notesChanged || itemsCountChanged || orderDiscountChanged;
  }

  bool canProceedFromStep(int step) {
    switch (step) {
      case 0:
        if (selectedClient.value == null) {
          Get.snackbar('validation_error'.tr, 'validation_select_client_first'.tr, snackPosition: SnackPosition.BOTTOM);
          return false;
        }
        return true;
      case 1:
        if (orderItems.isEmpty) {
          Get.snackbar('validation_error'.tr, 'validation_add_item_first'.tr, snackPosition: SnackPosition.BOTTOM);
          return false;
        }
        return true;
      default:
        return true;
    }
  }

  // --- Invoice Eligibility (price / tax / discount integrity) ---
  // If representative edits any item's unit price, tax rate, or applies discount (compared to baseline productVariant values), disallow selecting Invoiced.
  bool get _hasPriceOrTaxEdits {
    for (final item in orderItems) {
      double? basePrice;
      double? baseTaxRate;

      // Priority: explicit original baseline captured at creation
      if (item.originalUnitPrice != null) basePrice = item.originalUnitPrice;
      if (item.originalTaxRate != null) baseTaxRate = item.originalTaxRate;

      // Fallback to attached product variant (catalog) values
      final pv = item.productVariant;
      if (pv != null) {
        if (basePrice == null && pv.variantUnitPrice != null) {
          basePrice = double.tryParse(pv.variantUnitPrice!.trim());
        }
        if (baseTaxRate == null) baseTaxRate = pv.variantTaxRate;
      }

      // Debug logging
      print('=== Checking item: ${item.variantName} ===');
      print('basePrice: $basePrice, item.unitPrice: ${item.unitPrice}');
      print('baseTaxRate: $baseTaxRate, item.taxRate: ${item.taxRate}');
      print('item.hasTax: ${item.hasTax}');
      print('item.discountAmount: ${item.discountAmount}');
      print('item.originalUnitPrice: ${item.originalUnitPrice}');
      print('item.originalTaxRate: ${item.originalTaxRate}');

      // FIXED: Only detect price edit if there's a base price to compare against
      // AND the difference is significant (> 0.01 to handle floating point precision)
      if (basePrice != null) {
        final priceDiff = (item.unitPrice - basePrice).abs();
        print('Price diff: $priceDiff');
        if (priceDiff > 0.01) {
          print('❌ Price was edited!');
          return true;
        }
      }

      // FIXED: Improved tax edit detection
      // Normalize null and 0 values for comparison
      final normalizedBaseTaxRate = baseTaxRate ?? 0.0;
      final normalizedItemTaxRate = item.taxRate ?? 0.0;

      print('Normalized baseTaxRate: $normalizedBaseTaxRate, normalizedItemTaxRate: $normalizedItemTaxRate');

      // Only flag as edit if there's a significant difference (> 0.01)
      if ((normalizedItemTaxRate - normalizedBaseTaxRate).abs() > 0.01) {
        print('❌ Tax rate was edited!');
        return true;
      }

      // Any significant discount flags as edit
      if (item.discountAmount > 0.01) {
        print('❌ Discount was applied!');
        return true;
      }

      print('✅ No edits detected for this item');
    }
    print('✅ No edits detected for any items - can select Invoiced');
    return false;
  }

  bool get canSelectInvoiced => !_hasPriceOrTaxEdits;
  List<String> get availableStatuses => canSelectInvoiced ? const ['Draft', 'Pending', 'Invoiced'] : const ['Draft', 'Pending'];

  // Verification prefers repInventoryProducts; if empty, falls back to warehouseProducts (previous global/selected load)
  List<WarehouseProductVariant> get _inventorySource => repInventoryProducts.isNotEmpty ? repInventoryProducts : warehouseProducts;

  // Verification checks: items from rep inventory need quantity validation, others always pass if marked as such
  bool get _allItemsStockVerified {
    if (orderItems.isEmpty) return false; // nothing to deliver

    for (final item in orderItems) {
      // If item was selected from rep inventory, check actual available quantity
      if (item.isFromRepInventory == true) {
        if (_inventorySource.isEmpty) {
          print('DEBUG: Rep inventory item ${item.variantId} but no inventory source to verify quantity');
          return false; // cannot verify quantity
        }

        final wpv = _inventorySource.firstWhereOrNull((w) => w.variantId == item.variantId);
        if (wpv == null) {
          print('DEBUG: Rep inventory item ${item.variantId} NOT FOUND in current inventory source');
          return false; // variant not found
        }

        final available = wpv.getAvailableQuantity(item.packagingTypeId);
        print('DEBUG: Rep inventory item ${item.variantId}, available=${available}, requested=${item.quantity}');
        if (available + 0.000001 < item.quantity) {
          print('DEBUG: Rep inventory item ${item.variantId} EXCEEDS available stock: available=${available}, requested=${item.quantity}');
          return false; // exceeds available quantity
        }
        print('DEBUG: Rep inventory item ${item.variantId} quantity OK');
        continue;
      }

      // For items not from rep inventory, check against inventory source
      if (_inventorySource.isEmpty) {
        print('DEBUG: No inventory source for verification of item ${item.variantId}');
        return false; // cannot verify yet (treat as not verified)
      }

      print('DEBUG: Checking non-rep item variantId=${item.variantId}, packagingTypeId=${item.packagingTypeId}, quantity=${item.quantity}');
      final wpv = _inventorySource.firstWhereOrNull((w) => w.variantId == item.variantId);
      if (wpv == null) {
        print('DEBUG: Variant ${item.variantId} NOT FOUND in inventory source');
        return false; // variant not in inventory
      }
      final available = wpv.getAvailableQuantity(item.packagingTypeId);
      print('DEBUG: Found variant ${item.variantId}, available=${available}, needed=${item.quantity}');
      if (available + 0.000001 < item.quantity) {
        print('DEBUG: INSUFFICIENT stock for variant ${item.variantId}: available=${available}, needed=${item.quantity}');
        return false; // insufficient
      }
    }
    print('DEBUG: All items verified successfully');
    return true;
  }

  bool get canMarkDeliveredNow => status.value == 'Invoiced' && _allItemsStockVerified; // UI helper

  List<SalesOrderItem> get shortageItems {
    if (orderItems.isEmpty) return const [];
    final lacking = <SalesOrderItem>[];
    for (final item in orderItems) {
      // Check ALL items against available quantities (both rep inventory and non-rep)
      if (_inventorySource.isEmpty) {
        lacking.add(item); // cannot verify yet -> show as pending verification
        continue;
      }

      final wpv = _inventorySource.firstWhereOrNull((w) => w.variantId == item.variantId);
      if (wpv == null) {
        lacking.add(item);
        continue;
      }
      final available = wpv.getAvailableQuantity(item.packagingTypeId);
      if (available + 0.000001 < item.quantity) lacking.add(item);
    }
    return lacking;
  }

  // NEW: Check if any items exceed available quantity
  bool get hasItemsExceedingInventory {
    return shortageItems.isNotEmpty && _inventorySource.isNotEmpty;
  }

  // NEW: Show notification when items exceed inventory with price quote option
  Future<bool> showInventoryExceededNotification(BuildContext context) async {
    if (!hasItemsExceedingInventory) return false;

    final exceedingItems = shortageItems;
    final itemNames = exceedingItems.map((item) => item.variantName ?? 'Unknown').join(', ');

    final result = await showDialog<String>(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext context) {
        return AlertDialog(
          title: Row(
            children: [
              Icon(Icons.warning, color: Colors.orange),
              SizedBox(width: 8),
              Expanded(child: Text('inventory_shortage_detected'.tr)),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('items_exceed_available_inventory'.tr),
              SizedBox(height: 8),
              Container(
                padding: EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.orange.shade50,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.orange.shade200),
                ),
                child: Text(
                  itemNames,
                  style: TextStyle(fontWeight: FontWeight.bold, color: Colors.orange.shade800),
                ),
              ),
              SizedBox(height: 12),
              Text('what_would_you_like_to_do'.tr, style: TextStyle(fontWeight: FontWeight.w600)),
            ],
          ),
          actions: <Widget>[
            TextButton(
              onPressed: () => Navigator.of(context).pop('adjust'),
              child: Text('adjust_quantities'.tr),
            ),
            ElevatedButton(
              onPressed: () => Navigator.of(context).pop('proceed'),
              style: ElevatedButton.styleFrom(backgroundColor: Colors.orange.shade700),
              child: Text('proceed_anyway'.tr),
            ),
          ],
        );
      },
    );

    if (result == 'quote') {
      // TODO: Navigate to price quote creation
      Get.snackbar(
        'info'.tr,
        'price_quote_feature_coming_soon'.tr,
        snackPosition: SnackPosition.BOTTOM,
        backgroundColor: Colors.blue,
        colorText: Colors.white,
      );
      return false; // Don't proceed with order
    } else if (result == 'adjust') {
      // Go back to items step
      currentStep.value = 1;
      return false; // Don't proceed
    }

    return result == 'proceed'; // Only proceed if user explicitly chooses to
  }

  // Helper: get available quantity for an order item (variant + packaging match)
  double? availableForItem(SalesOrderItem item) {
    if (_inventorySource.isEmpty) return null;
    final wpv = _inventorySource.firstWhereOrNull((w) => w.variantId == item.variantId);
    if (wpv == null) return null;
    return wpv.getAvailableQuantity(item.packagingTypeId);
  }

  // Availability problem if status is Invoiced but verification failed.
  // Only show shortage if items exist but stock verification fails (not for empty inventory data)
  bool get hasInventoryShortage => status.value == 'Invoiced' && orderItems.isNotEmpty && !_allItemsStockVerified && _inventorySource.isNotEmpty;

  // Loading and error states
  final RxBool isLoading = false.obs;
  final RxBool isSaving = false.obs;
  final RxBool saveSuccess = false.obs; // New flag for save success
  final RxBool isLoadingWarehouseProducts = false.obs; // NEW: Loading state for warehouse products
  final RxString errorMessage = ''.obs;

  // For edit mode
  SalesOrder? initialSalesOrder; // Holds the order if in edit mode
  final RxBool isEditMode = false.obs;

  // Visit context for activity logging
  int? visitId; // To track which visit this sales order is created from

  @override
  void onInit() {
    super.onInit();
    // Ensure cached data is loaded before using it
    _ensureDataLoaded();

    if (Get.arguments != null) {
      if (Get.arguments is SalesOrder) {
        // Edit mode - existing sales order
        initialSalesOrder = Get.arguments as SalesOrder;
        isEditMode.value = true;
        _populateFormForEdit(initialSalesOrder!);
      } else if (Get.arguments is Map<String, dynamic>) {
        // New mode with parameters (e.g., client ID, visit ID)
        final args = Get.arguments as Map<String, dynamic>;
        if (args.containsKey('clientId')) {
          final clientId = args['clientId'] as int;
          _preselectClient(clientId);
        }
        if (args.containsKey('visitId')) {
          visitId = args['visitId'] as int?;
          print('Sales order controller initialized with visitId: $visitId');
        }
      }
    }

    _calculateTotals();
  }

  // Ensure all required data is loaded from cache
  Future<void> _ensureDataLoaded() async {
    try {
      // Force refresh inventory to get latest stock quantities before creating sales order
      await _globalDataController.loadRepInventory(forceRefresh: true);

      // Ensure core data is loaded (clients, warehouses, products)
      await _globalDataController.ensureCoreDataLoaded(includeSafes: false, includeRepInventory: false); // Already loaded above

      // Populate rep inventory products from cache
      repInventoryProducts.assignAll(_globalDataController.repInventory);
      print('SalesOrder: Force refreshed and loaded ${repInventoryProducts.length} rep inventory items from cache');
    } catch (e) {
      print('Error ensuring data loaded: $e');
    }
  }

  @override
  void onClose() {
    notesController.dispose();
    orderDiscountController.dispose();
    super.onClose();
  }

  // --- Data Loading (Removed - using cached data only) ---

  // NEW: Fetch products available in a specific warehouse
  Future<void> fetchWarehouseProducts(int warehouseId, {String? searchTerm}) async {
    isLoadingWarehouseProducts.value = true;
    try {
      final productRepository = Get.find<ProductRepository>();
      final fetchedWarehouseProducts = await productRepository.getAvailableProductsInWarehouse(warehouseId, searchTerm: searchTerm);
      warehouseProducts.assignAll(fetchedWarehouseProducts);

      // Show success message with count
      if (fetchedWarehouseProducts.isNotEmpty) {
        Get.snackbar('success'.tr, 'warehouse_products_loaded'.trParams({'count': fetchedWarehouseProducts.length.toString()}),
            snackPosition: SnackPosition.BOTTOM, backgroundColor: Get.theme.colorScheme.primary, colorText: Get.theme.colorScheme.onPrimary);
      } else {
        Get.snackbar('info'.tr, 'warehouse_products_empty'.tr, snackPosition: SnackPosition.BOTTOM, backgroundColor: Get.theme.colorScheme.secondary, colorText: Get.theme.colorScheme.onSecondary);
      }
    } catch (e) {
      errorMessage.value = 'Failed to load warehouse products: ${e.toString()}';
      print('AddEditSalesOrderController Error: ${errorMessage.value}');
      Get.snackbar('error'.tr, 'warehouse_products_failed'.tr, snackPosition: SnackPosition.BOTTOM, backgroundColor: Get.theme.colorScheme.error, colorText: Get.theme.colorScheme.onError);
    } finally {
      isLoadingWarehouseProducts.value = false;
    }
  }

  // --- Form Population for Edit Mode ---
  void _populateFormForEdit(SalesOrder order) {
    // Ensure clients list is populated before attempting to find the client
    if (clients.isNotEmpty) {
      selectedClient.value = clients.firstWhereOrNull((c) => c.id == order.clientId);
    } else {
      // Fallback or error handling if clients are not loaded
      print('Warning: Clients list is empty when populating form for edit.');
      // You might want to show a snackbar or set an error message here
    }

    selectedWarehouse.value = myWarehouses.firstWhereOrNull((w) => w.warehouseId == order.warehouseId) ?? otherMainWarehouses.firstWhereOrNull((w) => w.warehouseId == order.warehouseId);
    orderDate.value = order.orderDate;
    status.value = order.status;
    // Ensure delivery status reflects existing order or defaults
    deliveryStatus.value = order.deliveryStatus ?? 'Not_Delivered';
    notesController.text = order.notes ?? '';
    orderDiscount.value = order.orderDiscountAmount;
    orderDiscountController.text = Formatting.formatNumber(order.orderDiscountAmount, decimals: 2);
    orderItems.assignAll(order.items); // Populate existing items
    _calculateTotals();
  }

  // --- Preselect Client for New Order ---
  void _preselectClient(int clientId) {
    // Find and select the client with the given ID
    if (clients.isNotEmpty) {
      final client = clients.firstWhereOrNull((c) => c.id == clientId);
      if (client != null) {
        selectedClient.value = client;
        print('Preselected client: ${client.companyName}');
      } else {
        print('Warning: Client with ID $clientId not found in clients list.');
      }
    } else {
      // If clients aren't loaded yet, set up a timer to check periodically
      print('Clients not loaded yet, will try to select client $clientId when available.');
      _tryPreSelectClientPeriodically(clientId);
    }
  }

  void _tryPreSelectClientPeriodically(int clientId) {
    // Check every 500ms for up to 10 seconds for the client to be available
    int attempts = 0;
    const maxAttempts = 20; // 10 seconds with 500ms intervals

    Timer.periodic(const Duration(milliseconds: 500), (timer) {
      attempts++;

      if (clients.isNotEmpty) {
        final client = clients.firstWhereOrNull((c) => c.id == clientId);
        if (client != null) {
          selectedClient.value = client;
          print('Preselected client after loading: ${client.companyName}');
          timer.cancel();
          return;
        }
      }

      if (attempts >= maxAttempts) {
        print('Timeout: Could not preselect client $clientId after 10 seconds');
        timer.cancel();
      }
    });
  }

  // --- Form Actions ---
  void onClientSelected(Client? client) {
    selectedClient.value = client;
  }

  void onWarehouseSelected(Warehouse? warehouse) {
    selectedWarehouse.value = warehouse;
    // Remove automatic API fetching - use cached data only
    // warehouseProducts should be populated from cached inventory data
  }

  void onOrderDateSelected(DateTime? date) {
    orderDate.value = date;
  }

  void onStatusChanged(String? newStatus) {
    if (newStatus != null) {
      if (newStatus == 'Invoiced' && !canSelectInvoiced) {
        Get.snackbar('error'.tr, 'status_invoiced_not_allowed_due_to_edits'.tr, snackPosition: SnackPosition.BOTTOM);
        return;
      }
      status.value = newStatus;
      // Debug inventory verification when switching to Invoiced
      if (newStatus == 'Invoiced') {
        print('DEBUG: Status changed to Invoiced, checking inventory verification...');
        print('DEBUG: canMarkDeliveredNow=${canMarkDeliveredNow}');
        print('DEBUG: _allItemsStockVerified=${_allItemsStockVerified}');
        print('DEBUG: hasInventoryShortage=${hasInventoryShortage}');
      }
      // Reset delivery status when leaving Invoiced state
      if (newStatus != 'Invoiced') {
        deliveryStatus.value = 'Not_Delivered';
      }
    }
  }

  void onDeliveryStatusChanged(String? newStatus) {
    if (newStatus != null) deliveryStatus.value = newStatus;
  }

  void onOrderDiscountChanged(String value) {
    final parsed = Formatting.parseAmount(value, decimalDigits: 2) ?? 0.0;
    orderDiscount.value = parsed;
    _calculateTotals();
  }

  // --- Order Item Management ---
  // This method will now receive a list of items
  void addItems(List<SalesOrderItem> newItems) {
    for (final newItem in newItems) {
      // Check if this product variant + packaging combination already exists
      final isDuplicate = orderItems.any((existingItem) {
        final sameVariant = existingItem.variantId == newItem.variantId;
        final samePackaging = existingItem.packagingTypeId == newItem.packagingTypeId;
        return sameVariant && samePackaging;
      });

      if (isDuplicate) {
        Get.snackbar(
          'warning'.tr,
          'item_already_added_to_order'.tr,
          snackPosition: SnackPosition.BOTTOM,
          backgroundColor: Colors.orange,
          colorText: Colors.white,
          duration: const Duration(seconds: 3),
        );
        continue; // Skip this item and continue with the next
      }

      orderItems.add(newItem);
    }
    _enforceInvoiceEligibility();
    _calculateTotals();
  }

  void replaceItems(List<SalesOrderItem> newItems) {
    orderItems.assignAll(newItems);
    _enforceInvoiceEligibility();
    _calculateTotals();
  }

  void updateOrderItem(int index, SalesOrderItem newItem) {
    if (index >= 0 && index < orderItems.length) {
      orderItems[index] = newItem;
      _enforceInvoiceEligibility();
      _calculateTotals();
    }
  }

  void removeOrderItem(int index) {
    if (index >= 0 && index < orderItems.length) {
      orderItems.removeAt(index);
      _enforceInvoiceEligibility();
      _calculateTotals();
    }
  }

  // --- Calculation Logic ---
  void _calculateTotals() {
    final double subtotal = orderItems.fold(0.0, (sum, item) => sum + item.subtotal);
    final double itemDiscount = orderItems.fold(0.0, (sum, item) => sum + item.discountAmount);
    final double taxTotal = orderItems.fold(0.0, (sum, item) => sum + (item.taxAmount ?? 0.0));
    final double orderLevelDiscount = orderDiscount.value;
    final double combinedDiscount = itemDiscount + orderLevelDiscount;
    final double adjustedSubtotal = (subtotal - combinedDiscount).clamp(0.0, double.infinity).toDouble();
    final double total = adjustedSubtotal + taxTotal;

    subtotalAmount.value = subtotal;
    itemsDiscountAmount.value = itemDiscount;
    combinedDiscountAmount.value = combinedDiscount;
    netSubtotalAmount.value = adjustedSubtotal;
    taxAmountTotal.value = taxTotal;
    grandTotalAmount.value = total;
  }

  // --- Save/Submit Logic ---
  Future<void> saveSalesOrder({VoidCallback? onSuccess}) async {
    if (!validateForm()) {
      return;
    }

    isSaving.value = true;
    saveSuccess.value = false; // Reset success flag
    errorMessage.value = '';

    try {
      final currentUser = _authController.currentUser.value;
      if (currentUser == null) {
        errorMessage.value = 'User not logged in. Cannot save order.';
        Get.snackbar('error'.tr, errorMessage.value, snackPosition: SnackPosition.BOTTOM, backgroundColor: Get.theme.colorScheme.error, colorText: Get.theme.colorScheme.onError);
        return;
      }

      _calculateTotals();

      // currentUserUuid not needed directly; using user id instead

      final SalesOrder salesOrderToSave = SalesOrder(
        salesOrderId: isEditMode.value ? initialSalesOrder!.salesOrderId : 0, // 0 for new order, actual ID for edit
        clientId: selectedClient.value!.id,
        representativeId: currentUser.id, // or currentUser.representativeId
        warehouseId: selectedWarehouse.value?.warehouseId ?? (myWarehouses.isNotEmpty ? myWarehouses.first.warehouseId : 0), // Use selected, fallback to first if available
        visitId: initialSalesOrder?.visitId, // Keep original visit ID if editing
        orderDate: orderDate.value ?? DateTime.now(), // Default to now if not selected
        actualDeliveryDate: initialSalesOrder?.actualDeliveryDate, // Keep original if editing
        status: status.value,
        // Always send a valid delivery status; default to Not_Delivered when not invoiced
        deliveryStatus: status.value == 'Invoiced' ? deliveryStatus.value : 'Not_Delivered',
        subtotal: subtotalAmount.value,
        discountAmount: combinedDiscountAmount.value,
        orderDiscountAmount: orderDiscount.value,
        taxAmount: taxAmountTotal.value,
        totalAmount: grandTotalAmount.value,
        notes: notesController.text.trim().isEmpty ? null : notesController.text.trim(),
        createdAt: isEditMode.value ? initialSalesOrder!.createdAt : DateTime.now(),
        updatedAt: DateTime.now(),
        items: orderItems.toList(), // Pass the list of items
      );
      print('SalesOrder data to send: ${salesOrderToSave.toJson()}');

      SalesOrder savedOrder;
      if (isEditMode.value) {
        savedOrder = await _salesOrderRepository.updateSalesOrder(salesOrderToSave);
      } else {
        savedOrder = await _salesOrderRepository.createSalesOrder(salesOrderToSave);

        // Backend now handles immediate full delivery when status=Invoiced & deliveryStatus=Delivered.

        // Log visit activity after successful sales order creation
        if (visitId != null) {
          try {
            await _visitRepository.addVisitActivity(
              visitId!,
              'SalesOrder_Created',
              'Created sales order #${savedOrder.salesOrderId} for ${selectedClient.value?.companyName ?? 'client'}',
              referenceId: savedOrder.salesOrderId,
            );
            print('Visit activity logged for sales order ${savedOrder.salesOrderId}');
          } catch (activityError) {
            print('Warning: Failed to log visit activity: $activityError');
            // Don't fail the entire operation if activity logging fails
          }
        }
      }

      // Set success flag and call callback if provided
      saveSuccess.value = true;
      if (onSuccess != null) {
        onSuccess();
      }
    } catch (e) {
      if (e is CreditLimitExceededException) {
        final availableText = Formatting.amount(e.available, decimals: 2);
        final requiredText = Formatting.amount(e.requiredAmount, decimals: 2);
        final translatedMessage = 'credit_limit_exceeded_message'.trParams({
          'available': availableText,
          'required': requiredText,
        });
        print('AddEditSalesOrderController Credit Limit Error: ${e.message}');
        Get.snackbar(
          'credit_limit_exceeded_title'.tr,
          translatedMessage,
          snackPosition: SnackPosition.BOTTOM,
          backgroundColor: Colors.orange.shade700,
          colorText: Colors.white,
          duration: const Duration(seconds: 6),
        );
      } else if (e is ApiException) {
        errorMessage.value = e.message;
        print('AddEditSalesOrderController API Error: ${e.message}');
        Get.snackbar(
          'error'.tr,
          e.message,
          snackPosition: SnackPosition.BOTTOM,
          backgroundColor: Get.theme.colorScheme.error,
          colorText: Get.theme.colorScheme.onError,
        );
      } else {
        errorMessage.value = 'Failed to save sales order: ${e.toString()}';
        print('AddEditSalesOrderController Save Error: ${errorMessage.value}');
        Get.snackbar(
          'error'.tr,
          'sales_order_save_failed'.tr,
          snackPosition: SnackPosition.BOTTOM,
          backgroundColor: Get.theme.colorScheme.error,
          colorText: Get.theme.colorScheme.onError,
        );
      }
    } finally {
      isSaving.value = false;
    }
  }

  bool validateForm() {
    if (selectedClient.value == null) {
      Get.snackbar('validation_error'.tr, 'validation_select_client'.tr, snackPosition: SnackPosition.BOTTOM);
      return false;
    }

    if (orderItems.isEmpty) {
      Get.snackbar('validation_error'.tr, 'validation_add_order_item'.tr, snackPosition: SnackPosition.BOTTOM);
      return false;
    }
    return true;
  }

  void _enforceInvoiceEligibility() {
    if (!_hasPriceOrTaxEdits) return;
    if (status.value == 'Invoiced') {
      status.value = 'Draft';
      deliveryStatus.value = 'Not_Delivered';
      Get.snackbar('info'.tr, 'status_adjusted_due_to_edits'.tr, snackPosition: SnackPosition.BOTTOM);
    }
  }
}
