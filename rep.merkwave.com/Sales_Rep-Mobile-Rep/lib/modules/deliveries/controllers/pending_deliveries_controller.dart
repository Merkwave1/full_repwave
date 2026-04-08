// lib/modules/deliveries/controllers/pending_deliveries_controller.dart
import 'package:get/get.dart';
import '/data/repositories/sales_delivery_repository.dart';

class PendingDeliveriesController extends GetxController {
  final SalesDeliveryRepository repository;
  PendingDeliveriesController({required this.repository});

  final RxBool isLoading = false.obs;
  final RxString errorMessage = ''.obs;
  final RxList<Map<String, dynamic>> pendingOrders = <Map<String, dynamic>>[].obs;
  final RxString searchQuery = ''.obs;
  final RxString statusFilter = ''.obs;
  final RxString warehouseFilter = ''.obs;
  final RxString clientFilter = ''.obs;

  // Pagination support
  final RxInt currentPage = 1.obs;
  final RxInt totalPages = 1.obs;
  final RxBool hasMore = true.obs;
  final int itemsPerPage = 20;

  bool get isSearching => searchQuery.value.trim().isNotEmpty;

  // Now visibleOrders just returns all orders since filtering is done server-side
  List<Map<String, dynamic>> get visibleOrders => pendingOrders;

  List<String> get availableStatuses {
    final statuses = pendingOrders.map((order) => _normalizeStatus(order['sales_orders_delivery_status'])).where((status) => status.isNotEmpty).toSet().toList();
    statuses.sort();
    return statuses;
  }

  List<String> get availableWarehouses {
    final warehouses = pendingOrders.map((order) => (order['warehouse_name'] ?? '').toString().trim()).where((name) => name.isNotEmpty).toSet().toList();
    warehouses.sort();
    return warehouses;
  }

  List<String> get availableClients {
    final clients = pendingOrders.map((order) => (order['clients_company_name'] ?? '').toString().trim()).where((name) => name.isNotEmpty).toSet().toList();
    clients.sort();
    return clients;
  }

  @override
  void onInit() {
    super.onInit();
    loadPending();
  }

  Future<void> loadPending({bool resetPage = true}) async {
    if (resetPage) {
      currentPage.value = 1;
      hasMore.value = true;
    }

    isLoading.value = true;
    errorMessage.value = '';
    try {
      final data = await repository.getPendingOrders(
        search: searchQuery.value.trim().isNotEmpty ? searchQuery.value.trim() : null,
        status: statusFilter.value.trim().isNotEmpty ? statusFilter.value.trim() : null,
        warehouse: warehouseFilter.value.trim().isNotEmpty ? warehouseFilter.value.trim() : null,
        client: clientFilter.value.trim().isNotEmpty ? clientFilter.value.trim() : null,
        page: currentPage.value,
        limit: itemsPerPage,
      );

      if (resetPage) {
        pendingOrders.assignAll(data);
      } else {
        pendingOrders.addAll(data);
      }

      // Update pagination state
      hasMore.value = data.length >= itemsPerPage;
    } catch (e) {
      errorMessage.value = e.toString();
    } finally {
      isLoading.value = false;
    }
  }

  Future<void> loadMore() async {
    if (!hasMore.value || isLoading.value) return;
    currentPage.value++;
    await loadPending(resetPage: false);
  }

  void onSearchChanged(String query) {
    searchQuery.value = query;
    loadPending(); // Reload with new search query
  }

  void applyStatusFilter(String? value) {
    statusFilter.value = value?.trim() ?? '';
    loadPending(); // Reload with new filter
  }

  void applyWarehouseFilter(String? value) {
    warehouseFilter.value = value?.trim() ?? '';
    loadPending(); // Reload with new filter
  }

  void applyClientFilter(String? value) {
    clientFilter.value = value?.trim() ?? '';
    loadPending(); // Reload with new filter
  }

  void clearFilters() {
    statusFilter.value = '';
    warehouseFilter.value = '';
    clientFilter.value = '';
    searchQuery.value = '';
    loadPending(); // Reload without filters
  }

  String _normalizeStatus(dynamic value) {
    if (value == null) return '';
    return value.toString().trim().toLowerCase().replaceAll(' ', '_');
  }
}
