// lib/modules/sales_orders/controllers/sales_orders_controller.dart
import 'package:get/get.dart';
import 'dart:async';
import 'package:flutter/material.dart'; // For ScrollController
import '/data/models/client.dart';
import '/data/models/sales_order.dart';
import '/data/repositories/sales_order_repository.dart';
import '/modules/shared/controllers/global_data_controller.dart';

class SalesOrdersController extends GetxController {
  final SalesOrderRepository _salesOrderRepository;
  final GlobalDataController _globalDataController = Get.find<GlobalDataController>();

  SalesOrdersController({required SalesOrderRepository salesOrderRepository}) : _salesOrderRepository = salesOrderRepository;

  List<Client> get clients => _globalDataController.clients;

  // Observable list to hold sales orders
  final RxList<SalesOrder> salesOrders = <SalesOrder>[].obs;
  // Observable boolean to track loading state
  final RxBool isLoading = true.obs;
  final RxBool isLoadMoreLoading = false.obs; // For pagination loading indicator
  // Observable for error messages
  final RxString errorMessage = ''.obs;
  final RxBool needsRefresh = false.obs; // flag for navigation-triggered refreshes
  final Rx<int?> selectedClientFilter = Rx<int?>(null);
  final RxString deliveryStatusFilter = ''.obs;

  // Pagination state
  final RxInt currentPage = 1.obs;
  final RxInt limit = 10.obs; // Default limit
  final RxBool hasMoreData = true.obs; // To check if there's more data to load

  // Filter and Search state
  final RxString currentStatusFilter = ''.obs; // e.g., 'Draft', 'Approved', '' for all
  final Rx<DateTime?> dateFromFilter = Rx<DateTime?>(null);
  final Rx<DateTime?> dateToFilter = Rx<DateTime?>(null);
  final RxString searchQuery = ''.obs; // For client company name search
  Timer? _searchDebounce;

  // Scroll controller for pagination
  // Initialize here directly as it's a simple object and doesn't depend on context
  late ScrollController scrollController;

  // Computed: whether search is active
  bool get isSearching => searchQuery.value.trim().isNotEmpty;

  // Computed: visible list with search and filter awareness
  List<SalesOrder> get visibleOrders {
    final List<SalesOrder> filtered = salesOrders.where((order) {
      if (selectedClientFilter.value != null && order.clientId != selectedClientFilter.value) {
        return false;
      }
      if (currentStatusFilter.value.isNotEmpty && order.status != currentStatusFilter.value) {
        return false;
      }
      if (deliveryStatusFilter.value.isNotEmpty) {
        final delivery = order.deliveryStatus ?? '';
        if (delivery.isEmpty || !_equalsIgnoreCase(delivery, deliveryStatusFilter.value)) {
          return false;
        }
      }
      if (dateFromFilter.value != null) {
        final orderDate = order.orderDate;
        if (orderDate == null || _dateOnly(orderDate).isBefore(_dateOnly(dateFromFilter.value!))) {
          return false;
        }
      }
      if (dateToFilter.value != null) {
        final orderDate = order.orderDate;
        if (orderDate == null || _dateOnly(orderDate).isAfter(_dateOnly(dateToFilter.value!))) {
          return false;
        }
      }
      return true;
    }).toList();

    final query = searchQuery.value.trim();
    if (query.isEmpty) return filtered;

    final lowerQuery = query.toLowerCase();
    final String? numericQuery = _extractOrderNumberSearch(query);

    return filtered.where((order) {
      final client = (order.clientCompanyName ?? '').toLowerCase();
      final status = order.status.toLowerCase();
      final delivery = (order.deliveryStatus ?? '').toLowerCase();
      final idStr = order.salesOrderId.toString();
      final totalStr = order.totalAmount.toStringAsFixed(2).toLowerCase();
      final dateStr = order.orderDate != null ? _dateOnly(order.orderDate!).toIso8601String().split('T').first.toLowerCase() : '';

      final matchesId = numericQuery != null ? idStr.contains(numericQuery) : false;

      return matchesId || client.contains(lowerQuery) || status.contains(lowerQuery) || delivery.contains(lowerQuery) || totalStr.contains(lowerQuery) || dateStr.contains(lowerQuery);
    }).toList();
  }

  @override
  void onInit() {
    super.onInit();
    scrollController = ScrollController(); // Initialize here
    scrollController.addListener(_scrollListener); // Add listener for infinite scrolling
    fetchSalesOrders(isInitialFetch: true); // Initial fetch
  }

  @override
  void onClose() {
    _searchDebounce?.cancel();
    scrollController.removeListener(_scrollListener);
    scrollController.dispose();
    super.onClose();
  }

  // Scroll listener for pagination
  void _scrollListener() {
    // Disable pagination while searching (client-side filtering mode)
    if (isSearching) return;
    if (scrollController.position.pixels == scrollController.position.maxScrollExtent && !isLoading.value && !isLoadMoreLoading.value && hasMoreData.value) {
      debugPrint('SalesOrdersController: Scrolling to bottom, loading more...');
      _loadMoreSalesOrders();
    }
  }

  // Method to fetch sales orders
  Future<void> fetchSalesOrders({bool isInitialFetch = false}) async {
    if (isInitialFetch) {
      isLoading.value = true;
      hasMoreData.value = true;
      currentPage.value = 1;
      salesOrders.clear(); // Clear existing data for a fresh fetch
    } else {
      isLoadMoreLoading.value = true;
    }
    errorMessage.value = ''; // Clear any previous errors

    try {
      final int effectiveLimit = isSearching ? 100 : limit.value; // Load more when searching
      final String trimmedSearch = searchQuery.value.trim();
      final List<SalesOrder> fetchedOrders = await _salesOrderRepository.getAllSalesOrders(
        status: currentStatusFilter.value.isEmpty ? null : currentStatusFilter.value,
        clientId: selectedClientFilter.value,
        deliveryStatus: deliveryStatusFilter.value.isEmpty ? null : deliveryStatusFilter.value,
        dateFrom: dateFromFilter.value != null ? _formatDateForApi(dateFromFilter.value!) : null,
        dateTo: dateToFilter.value != null ? _formatDateForApi(dateToFilter.value!) : null,
        search: trimmedSearch.isEmpty ? null : trimmedSearch,
        page: currentPage.value,
        limit: effectiveLimit,
      );

      if (fetchedOrders.isEmpty) {
        hasMoreData.value = false; // No more data to load
      } else {
        salesOrders.addAll(fetchedOrders); // Add new data to the existing list
        currentPage.value++; // Increment page for next fetch
      }
    } catch (e) {
      errorMessage.value = 'Failed to load sales orders: ${e.toString()}';
      debugPrint('SalesOrdersController Error: ${errorMessage.value}'); // Log the error for debugging
      Get.snackbar(
        'Error',
        'Failed to load sales orders. Please try again.',
        snackPosition: SnackPosition.BOTTOM,
        backgroundColor: Get.theme.colorScheme.error,
        colorText: Get.theme.colorScheme.onError,
      );
    } finally {
      isLoading.value = false;
      isLoadMoreLoading.value = false;
      if (isInitialFetch) {
        needsRefresh.value = false;
      }
    }
  }

  // Method to load more sales orders (triggered by scroll)
  Future<void> _loadMoreSalesOrders() async {
    if (hasMoreData.value && !isLoadMoreLoading.value) {
      await fetchSalesOrders(isInitialFetch: false);
    }
  }

  // Apply a full filter set from the UI
  void submitFilters({
    String status = '',
    int? clientId,
    String deliveryStatus = '',
    DateTime? dateFrom,
    DateTime? dateTo,
  }) {
    currentStatusFilter.value = status;
    selectedClientFilter.value = clientId;
    deliveryStatusFilter.value = deliveryStatus;
    dateFromFilter.value = dateFrom != null ? _dateOnly(dateFrom) : null;
    dateToFilter.value = dateTo != null ? _dateOnly(dateTo) : null;
    fetchSalesOrders(isInitialFetch: true);
  }

  void resetFilters({bool shouldFetch = true}) {
    currentStatusFilter.value = '';
    selectedClientFilter.value = null;
    deliveryStatusFilter.value = '';
    dateFromFilter.value = null;
    dateToFilter.value = null;
    if (shouldFetch) {
      fetchSalesOrders(isInitialFetch: true);
    }
  }

  // Method to clear search and filters together
  void clearFilters() {
    searchQuery.value = '';
    resetFilters(shouldFetch: false);
    fetchSalesOrders(isInitialFetch: true);
  }

  // Method to handle search input changes
  void onSearchChanged(String query) {
    searchQuery.value = query;
    // Debounce to avoid spamming API
    _searchDebounce?.cancel();
    _searchDebounce = Timer(const Duration(milliseconds: 400), () {
      // Still fetch from server (in case backend search works),
      // but UI will also filter locally via visibleOrders
      fetchSalesOrders(isInitialFetch: true);
    });
  }

  void markNeedsRefresh() {
    needsRefresh.value = true;
  }

  Future<void> refreshIfNeeded({bool force = false}) async {
    if (force || needsRefresh.value) {
      needsRefresh.value = false;
      await fetchSalesOrders(isInitialFetch: true);
    }
  }

  String _formatDateForApi(DateTime date) => _dateOnly(date).toIso8601String().split('T').first;

  DateTime _dateOnly(DateTime date) => DateTime(date.year, date.month, date.day);

  bool _equalsIgnoreCase(String a, String b) => a.toLowerCase() == b.toLowerCase();

  String? _extractOrderNumberSearch(String query) {
    final trimmed = query.trim();
    if (trimmed.isEmpty) return null;
    final normalized = trimmed.startsWith('#') ? trimmed.substring(1) : trimmed;
    final digitsOnly = normalized.replaceAll(RegExp('[^0-9]'), '');
    if (digitsOnly.isEmpty) {
      return null;
    }
    return digitsOnly;
  }
}
