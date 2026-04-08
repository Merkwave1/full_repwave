// lib/modules/sales_orders/controllers/sales_order_detail_controller.dart
import 'package:get/get.dart';
import '/data/models/sales_order.dart';
import '/data/repositories/sales_order_repository.dart';
import '/modules/sales_orders/controllers/sales_orders_controller.dart'; // Import SalesOrdersController
import '/data/repositories/sales_delivery_repository.dart';
import '/data/models/sales_delivery.dart';
import '/services/api_service.dart';
import '/data/datasources/sales_delivery_remote_datasource.dart';

class SalesOrderDetailController extends GetxController {
  final SalesOrderRepository _salesOrderRepository;
  // Lazy (re)resolved so we can fetch history even if repository wasn't registered before navigating here.
  SalesDeliveryRepository? _salesDeliveryRepository = Get.isRegistered<SalesDeliveryRepository>() ? Get.find<SalesDeliveryRepository>() : null;

  SalesOrderDetailController({required SalesOrderRepository salesOrderRepository}) : _salesOrderRepository = salesOrderRepository;

  final Rx<SalesOrder?> salesOrder = Rx<SalesOrder?>(null);
  final RxList<SalesDelivery> deliveriesHistory = <SalesDelivery>[].obs; // fulfillment history
  final RxBool isLoading = true.obs;
  final RxString errorMessage = ''.obs;
  final RxBool isUpdatingStatus = false.obs; // New observable for status update loading
  final RxBool isLoadingHistory = false.obs;
  final RxBool forceInvoiceLayout = false.obs;
  final RxBool forceSalesOrderLayout = false.obs;

  int? orderId;

  @override
  void onInit() {
    super.onInit();
    final args = Get.arguments;
    if (args is int) {
      orderId = args;
    } else if (args is Map) {
      final mapArgs = Map<String, dynamic>.from(args as Map);
      if (mapArgs['salesOrderId'] is int) {
        orderId = mapArgs['salesOrderId'] as int;
      }
      if (mapArgs['forceInvoiceView'] == true) {
        forceInvoiceLayout.value = true;
      }
      if (mapArgs['forceSalesOrderView'] == true) {
        forceSalesOrderLayout.value = true;
      }
    }

    if (orderId != null) {
      fetchSalesOrderDetail(orderId!);
      loadFulfillmentHistory();
    } else {
      errorMessage.value = 'Sales Order ID not provided for details screen. Please navigate with an ID.';
      isLoading.value = false;
      print('SalesOrderDetailController Error: ${errorMessage.value}');
      Get.snackbar('Error', 'Sales Order ID is missing for details screen.', snackPosition: SnackPosition.BOTTOM, backgroundColor: Get.theme.colorScheme.error, colorText: Get.theme.colorScheme.onError);
    }
  }

  bool shouldDisplayInvoiceLayout(SalesOrder? order) {
    if (forceInvoiceLayout.value) {
      return true;
    }
    if (forceSalesOrderLayout.value) {
      return false;
    }
    if (order == null) {
      return false;
    }
    return order.status == 'Invoiced';
  }

  Future<void> fetchSalesOrderDetail(int id) async {
    try {
      isLoading.value = true;
      errorMessage.value = '';
      final fetchedOrder = await _salesOrderRepository.getSalesOrderById(id);
      salesOrder.value = fetchedOrder;
    } catch (e) {
      errorMessage.value = 'Failed to load sales order details: ${e.toString()}';
      print('SalesOrderDetailController Error: ${errorMessage.value}');
      Get.snackbar(
        'Error',
        'Failed to load sales order details. Please try again.',
        snackPosition: SnackPosition.BOTTOM,
        backgroundColor: Get.theme.colorScheme.error,
        colorText: Get.theme.colorScheme.onError,
      );
    } finally {
      isLoading.value = false;
    }
  }

  Future<void> loadFulfillmentHistory() async {
    if (orderId == null) return;
    // Ensure repository exists (mobile might not have created it yet if user didn't open other delivery flows)
    if (_salesDeliveryRepository == null) {
      if (Get.isRegistered<ApiService>()) {
        final api = Get.find<ApiService>();
        _salesDeliveryRepository = SalesDeliveryRepository(remote: SalesDeliveryRemoteDataSource(apiService: api));
        if (!Get.isRegistered<SalesDeliveryRepository>()) {
          Get.put(_salesDeliveryRepository!);
        }
      } else {
        print('ApiService not registered; cannot load deliveries history');
        return;
      }
    }
    try {
      isLoadingHistory.value = true;
      print('=== FETCH DELIVERIES HISTORY START ===');
      print('Building URL for deliveries history...');
      // We can't access ApiService URL here directly; rely on ApiService debug prints.
      final history = await _salesDeliveryRepository!.getDeliveriesForOrder(orderId!);
      print('Deliveries history fetched count: ${history.length}');
      for (final d in history) {
        print('History Delivery: id=${d.deliveryId} order=${d.salesOrderId} date=${d.deliveryDate.toIso8601String()} status=${d.status} items=${d.items.length}');
      }
      print('=== FETCH DELIVERIES HISTORY END ===');
      deliveriesHistory.assignAll(history);
    } catch (e) {
      print('Failed to load fulfillment history: $e');
    } finally {
      isLoadingHistory.value = false;
    }
  }

  // New method to update sales order status
  Future<void> updateSalesOrderStatus(String newStatus) async {
    if (salesOrder.value == null || isUpdatingStatus.value) return;

    isUpdatingStatus.value = true;
    errorMessage.value = '';

    try {
      final updatedOrder = salesOrder.value!.copyWith(
        status: newStatus,
        // Keep or default deliveryStatus to a valid value for update payloads
        deliveryStatus: (salesOrder.value!.deliveryStatus == null || salesOrder.value!.deliveryStatus!.isEmpty) ? 'Not_Delivered' : salesOrder.value!.deliveryStatus,
      ); // Create a copy with new status
      // Assuming your repository has an update method that takes a SalesOrder object
      await _salesOrderRepository.updateSalesOrder(updatedOrder);
      salesOrder.value = updatedOrder; // Update local observable
      Get.snackbar('Success', 'Sales Order status updated to $newStatus!', snackPosition: SnackPosition.BOTTOM);

      // Mark the list screen for refresh when user navigates back
      if (Get.isRegistered<SalesOrdersController>()) {
        Get.find<SalesOrdersController>().markNeedsRefresh();
      }
    } catch (e) {
      errorMessage.value = 'Failed to update status: ${e.toString()}';
      print('SalesOrderDetailController Status Update Error: ${errorMessage.value}');
      Get.snackbar(
        'Error',
        'Failed to update sales order status. Please try again.',
        snackPosition: SnackPosition.BOTTOM,
        backgroundColor: Get.theme.colorScheme.error,
        colorText: Get.theme.colorScheme.onError,
      );
    } finally {
      isUpdatingStatus.value = false;
    }
  }

  Future<void> updateDeliveryStatus(String newDeliveryStatus) async {
    if (salesOrder.value == null || isUpdatingStatus.value) return;
    isUpdatingStatus.value = true;
    try {
      final updatedOrder = salesOrder.value!.copyWith(deliveryStatus: newDeliveryStatus);
      final result = await _salesOrderRepository.updateDeliveryStatus(updatedOrder.salesOrderId, newDeliveryStatus);
      salesOrder.value = result;
      Get.snackbar('Success', 'Delivery status updated to $newDeliveryStatus');
      if (Get.isRegistered<SalesOrdersController>()) {
        Get.find<SalesOrdersController>().markNeedsRefresh();
      }
    } catch (e) {
      print('Failed to update delivery status: $e');
      Get.snackbar('Error', 'Failed to update delivery status');
    } finally {
      isUpdatingStatus.value = false;
    }
  }

  // New method to get available status options based on current status
  List<String> getAvailableStatusOptions() {
    final currentStatus = salesOrder.value?.status;
    if (currentStatus == null) {
      return []; // No options if no order or status
    }

    switch (currentStatus) {
      case 'Draft':
        return ['Draft', 'Pending', 'Cancelled'];
      case 'Pending':
        return ['Pending', 'Cancelled']; // Pending can only be cancelled
      case 'Approved':
        return ['Approved', 'Invoiced', 'Cancelled'];
      case 'Invoiced':
        return ['Invoiced']; // Cannot change after invoiced
      case 'Cancelled':
        return ['Cancelled']; // Cannot change after cancelled
      default:
        return [currentStatus]; // Fallback to current status if unknown
    }
  }
}
