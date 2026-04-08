// lib/modules/invoices/controllers/invoices_controller.dart
import 'dart:async';
import 'package:get/get.dart';
import 'package:flutter/material.dart'; // For ScrollController
import '/data/models/sales_invoice.dart';
import '/data/models/client.dart';
import '/data/repositories/sales_invoice_repository.dart';
import '/data/repositories/sales_order_repository.dart';
import '/modules/shared/controllers/global_data_controller.dart';

class InvoicesController extends GetxController {
  final SalesInvoiceRepository _salesInvoiceRepository;
  final SalesOrderRepository? _salesOrderRepository; // optional

  InvoicesController({
    required SalesInvoiceRepository salesInvoiceRepository,
    SalesOrderRepository? salesOrderRepository,
  })  : _salesInvoiceRepository = salesInvoiceRepository,
        _salesOrderRepository = salesOrderRepository;

  final GlobalDataController _globalDataController = Get.find<GlobalDataController>();

  List<Client> get clients => _globalDataController.clients;
  final Rx<int?> selectedClientFilter = Rx<int?>(null);

  // --- LIST STATE VARIABLES ---
  final RxList<SalesInvoice> invoices = <SalesInvoice>[].obs;
  final RxBool isLoading = true.obs;
  final RxBool isLoadMoreLoading = false.obs;
  final RxString listErrorMessage = ''.obs;

  // --- DETAIL STATE VARIABLES ---
  final Rx<SalesInvoice?> selectedInvoice = Rx<SalesInvoice?>(null);
  final RxBool isDetailLoading = false.obs;
  final RxString detailErrorMessage = ''.obs;

  // --- PAGINATION STATE ---
  final RxInt currentPage = 1.obs;
  final RxInt limit = 15.obs; // Increased limit for better user experience
  final RxBool hasMoreData = true.obs;

  // --- FILTER & SEARCH STATE ---
  // Default to showing only invoiced items in the invoices screen
  final RxString currentStatusFilter = 'Invoiced'.obs; // e.g., 'Draft', 'Paid', 'Invoiced'
  final Rx<DateTime?> dateFromFilter = Rx<DateTime?>(null);
  final Rx<DateTime?> dateToFilter = Rx<DateTime?>(null);
  final RxString searchQuery = ''.obs; // For invoice number or client company name

  // --- UI CONTROLLERS ---
  late ScrollController scrollController;

  @override
  void onInit() {
    super.onInit();
    scrollController = ScrollController()..addListener(_scrollListener);

    // --- SEARCH DEBOUNCER ---
    // This listener automatically calls the API when the user stops typing for 500ms.
    // This prevents firing a request for every single keystroke, saving resources.
    debounce(searchQuery, (_) => fetchInvoices(isInitialFetch: true), time: const Duration(milliseconds: 500));

    fetchInvoices(isInitialFetch: true); // Initial fetch
  }

  @override
  void onClose() {
    scrollController.removeListener(_scrollListener);
    scrollController.dispose();
    super.onClose();
  }

  // --- PRIVATE METHODS ---

  /// Listens to scroll events to trigger loading more invoices when the user
  /// reaches the bottom of the list.
  void _scrollListener() {
    if (scrollController.position.pixels >= scrollController.position.maxScrollExtent - 200 && // Load before reaching the absolute end
        !isLoading.value &&
        !isLoadMoreLoading.value &&
        hasMoreData.value) {
      _loadMoreInvoices();
    }
  }

  /// Loads the next page of invoices.
  Future<void> _loadMoreInvoices() async {
    if (hasMoreData.value && !isLoadMoreLoading.value) {
      await fetchInvoices(isInitialFetch: false);
    }
  }

  // --- PUBLIC API METHODS ---

  /// Fetches the list of invoices from the repository.
  Future<void> fetchInvoices({bool isInitialFetch = false}) async {
    if (isInitialFetch) {
      isLoading.value = true;
      hasMoreData.value = true;
      currentPage.value = 1;
      invoices.clear();
    } else {
      isLoadMoreLoading.value = true;
    }
    listErrorMessage.value = '';

    try {
      // If a SalesOrderRepository is injected and the developer prefers using
      // the sales_orders endpoint (recommended for invoices list), use it when
      // the current status filter is 'Invoiced' or when the repository exists
      // and no explicit invoice-only filters are set.
      if (_salesOrderRepository != null && (currentStatusFilter.value == 'Invoiced' || currentStatusFilter.value.isEmpty)) {
        // Fetch sales orders and convert them to SalesInvoice-like objects for display
        final orders = await _salesOrderRepository.getAllSalesOrders(
          status: currentStatusFilter.value.isEmpty ? null : currentStatusFilter.value,
          dateFrom: dateFromFilter.value?.toIso8601String().split('T')[0],
          dateTo: dateToFilter.value?.toIso8601String().split('T')[0],
          search: searchQuery.value.isEmpty ? null : searchQuery.value,
          page: currentPage.value,
          limit: limit.value,
          clientId: selectedClientFilter.value,
        );

        // Map SalesOrder -> SalesInvoice minimal fields to reuse existing UI
        final mapped = orders.map((o) {
          return SalesInvoice(
            salesInvoiceId: o.salesOrderId, // use order id as invoice id placeholder
            salesOrderId: o.salesOrderId,
            clientId: o.clientId ?? 0,
            invoiceNumber: o.salesOrderId.toString(),
            issueDate: o.orderDate ?? DateTime.now(),
            dueDate: o.orderDate ?? DateTime.now(),
            subtotal: o.subtotal,
            discountAmount: o.discountAmount,
            taxAmount: o.taxAmount,
            totalAmount: o.totalAmount,
            amountPaid: 0.0,
            status: o.status,
            notes: o.notes,
            createdAt: o.createdAt,
            updatedAt: o.updatedAt,
            clientCompanyName: o.clientCompanyName,
            salesOrderLinkId: o.salesOrderId,
            salesOrderTotalAmount: o.totalAmount,
            items: [],
          );
        }).toList();

        if (mapped.length < limit.value) {
          hasMoreData.value = false;
        }
        invoices.addAll(mapped);
        currentPage.value++;
      } else {
        final List<SalesInvoice> fetchedInvoices = await _salesInvoiceRepository.getAllSalesInvoices(
          status: currentStatusFilter.value.isEmpty ? null : currentStatusFilter.value,
          dateFrom: dateFromFilter.value?.toIso8601String().split('T')[0],
          dateTo: dateToFilter.value?.toIso8601String().split('T')[0],
          search: searchQuery.value.isEmpty ? null : searchQuery.value,
          page: currentPage.value,
          limit: limit.value,
        );

        if (fetchedInvoices.length < limit.value) {
          hasMoreData.value = false;
        }

        invoices.addAll(fetchedInvoices);
        currentPage.value++;
      }
    } catch (e) {
      listErrorMessage.value = 'Failed to load invoices: ${e.toString()}';
      Get.snackbar(
        'Error',
        'Failed to load invoices. Please try again.',
        snackPosition: SnackPosition.BOTTOM,
        backgroundColor: Get.theme.colorScheme.error,
        colorText: Get.theme.colorScheme.onError,
      );
    } finally {
      isLoading.value = false;
      isLoadMoreLoading.value = false;
    }
  }

  /// Fetches the details for a single invoice by its ID.
  Future<void> fetchInvoiceDetails(String invoiceId) async {
    isDetailLoading.value = true;
    detailErrorMessage.value = '';
    try {
      // This assumes your repository has a method to get a single invoice.
      // You might need to adjust the method name based on your repository implementation.
      final invoice = await _salesInvoiceRepository.getSalesInvoiceById(int.parse(invoiceId));
      selectedInvoice.value = invoice;
    } catch (e) {
      detailErrorMessage.value = 'Failed to load invoice details: ${e.toString()}';
      Get.snackbar(
        'Error',
        'Failed to load invoice details.',
        snackPosition: SnackPosition.BOTTOM,
        backgroundColor: Get.theme.colorScheme.error,
        colorText: Get.theme.colorScheme.onError,
      );
    } finally {
      isDetailLoading.value = false;
    }
  }

  /// Refreshes the invoice list. Typically used with a pull-to-refresh indicator.
  Future<void> refreshInvoices() async {
    await fetchInvoices(isInitialFetch: true);
  }

  /// Applies the selected filters and triggers a refetch of the invoices.
  void applyFilters({
    String? status,
    int? clientId,
    DateTime? dateFrom,
    DateTime? dateTo,
  }) {
    // Keep status default to 'Invoiced' when not provided by UI
    currentStatusFilter.value = status ?? currentStatusFilter.value;
    selectedClientFilter.value = clientId;
    dateFromFilter.value = dateFrom;
    dateToFilter.value = dateTo;
    fetchInvoices(isInitialFetch: true);
  }

  /// Clears all active filters and the search query, then refetches the list.
  void clearFilters() {
    // Keep invoices screen focused on 'Invoiced' by default
    currentStatusFilter.value = 'Invoiced';
    dateFromFilter.value = null;
    dateToFilter.value = null;
    if (searchQuery.value.isNotEmpty) {
      searchQuery.value = ''; // This will trigger the debouncer
    } else {
      fetchInvoices(isInitialFetch: true);
    }
  }

  /// Updates the search query. The debouncer will handle when to call the API.
  void onSearchChanged(String query) {
    if (searchQuery.value != query) {
      searchQuery.value = query;
    }
  }
}
