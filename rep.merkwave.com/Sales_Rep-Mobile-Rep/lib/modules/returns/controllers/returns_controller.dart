// lib/modules/returns/controllers/returns_controller.dart
import 'package:get/get.dart';
import '/shared_widgets/app_notifier.dart';
import 'package:flutter/material.dart';
import '/data/models/sales_return.dart';
import '/data/repositories/sales_return_repository.dart';
import '/modules/auth/controllers/auth_controller.dart'; // Import AuthController

class ReturnsController extends GetxController {
  final SalesReturnRepository _salesReturnRepository;
  final AuthController _authController = Get.find<AuthController>(); // Get AuthController instance

  ReturnsController({required SalesReturnRepository salesReturnRepository}) : _salesReturnRepository = salesReturnRepository;

  final RxList<SalesReturn> returns = <SalesReturn>[].obs;
  final RxBool isLoading = true.obs;
  final RxBool isLoadMoreLoading = false.obs;
  final RxString errorMessage = ''.obs;
  final RxBool needsRefresh = false.obs;

  final RxInt currentPage = 1.obs;
  final RxInt limit = 10.obs;
  final RxBool hasMoreData = true.obs;

  final RxString currentStatusFilter = ''.obs;
  final Rx<DateTime?> dateFromFilter = Rx<DateTime?>(null);
  final Rx<DateTime?> dateToFilter = Rx<DateTime?>(null);
  final RxString searchQuery = ''.obs;

  late ScrollController scrollController;

  bool get isSearching => searchQuery.value.trim().isNotEmpty;

  List<SalesReturn> get visibleReturns {
    final query = searchQuery.value.trim().toLowerCase();
    final statusFilter = currentStatusFilter.value.trim().toLowerCase();
    final DateTime? fromFilter = dateFromFilter.value != null ? _dateOnly(dateFromFilter.value!) : null;
    final DateTime? toFilter = dateToFilter.value != null ? _dateOnly(dateToFilter.value!) : null;

    Iterable<SalesReturn> filtered = returns;

    if (statusFilter.isNotEmpty) {
      filtered = filtered.where((item) => item.status.toLowerCase() == statusFilter);
    }

    if (fromFilter != null) {
      filtered = filtered.where((item) => _dateOnly(item.returnsDate).isAtSameMomentAs(fromFilter) || _dateOnly(item.returnsDate).isAfter(fromFilter));
    }

    if (toFilter != null) {
      filtered = filtered.where((item) => _dateOnly(item.returnsDate).isAtSameMomentAs(toFilter) || _dateOnly(item.returnsDate).isBefore(toFilter));
    }

    if (query.isEmpty) {
      return filtered.toList();
    }

    return filtered.where((item) {
      final clientName = (item.clientCompanyName ?? '').toLowerCase();
      final status = item.status.toLowerCase();
      final notes = (item.notes ?? '').toLowerCase();
      final reason = (item.reason ?? '').toLowerCase();
      final idMatch = item.returnsId.toString().contains(query.replaceAll('#', ''));

      return idMatch || clientName.contains(query) || status.contains(query) || notes.contains(query) || reason.contains(query);
    }).toList();
  }

  @override
  void onInit() {
    super.onInit();
    scrollController = ScrollController();
    scrollController.addListener(_scrollListener);
    fetchReturns(isInitialFetch: true);
  }

  @override
  void onClose() {
    // Corrected: Use 'scrollController' instead of '_scrollController'
    scrollController.removeListener(_scrollListener);
    scrollController.dispose();
    super.onClose();
  }

  void _scrollListener() {
    if (scrollController.position.pixels == scrollController.position.maxScrollExtent && !isLoading.value && !isLoadMoreLoading.value && hasMoreData.value) {
      print('ReturnsController: Scrolling to bottom, loading more...');
      _loadMoreReturns();
    }
  }

  Future<void> fetchReturns({bool isInitialFetch = false}) async {
    if (isInitialFetch) {
      isLoading.value = true;
      hasMoreData.value = true;
      currentPage.value = 1;
      returns.clear();
    } else {
      isLoadMoreLoading.value = true;
    }
    errorMessage.value = '';

    try {
      final String? userUuid = _authController.currentUser.value?.uuid;
      final List<SalesReturn> fetchedReturns = await _salesReturnRepository.getAllSalesReturns(
        status: currentStatusFilter.value.isEmpty ? null : currentStatusFilter.value,
        dateFrom: dateFromFilter.value?.toIso8601String().split('T')[0],
        dateTo: dateToFilter.value?.toIso8601String().split('T')[0],
        search: searchQuery.value.isEmpty ? null : searchQuery.value,
        page: currentPage.value,
        limit: limit.value,
        usersUuid: userUuid, // Pass the user's UUID
      );

      if (fetchedReturns.isEmpty) {
        hasMoreData.value = false;
      } else {
        returns.addAll(fetchedReturns);
        currentPage.value++;
      }
    } catch (e) {
      errorMessage.value = 'Failed to load returns: ${e.toString()}';
      print('ReturnsController Error: ${errorMessage.value}');
      AppNotifier.error('Failed to load returns. Please try again.');
    } finally {
      isLoading.value = false;
      isLoadMoreLoading.value = false;
      if (isInitialFetch) {
        needsRefresh.value = false;
      }
    }
  }

  Future<void> _loadMoreReturns() async {
    if (hasMoreData.value && !isLoadMoreLoading.value) {
      await fetchReturns(isInitialFetch: false);
    }
  }

  void applyFilters({
    String? status,
    DateTime? dateFrom,
    DateTime? dateTo,
    String? search,
  }) {
    currentStatusFilter.value = status ?? '';
    dateFromFilter.value = dateFrom;
    dateToFilter.value = dateTo;
    searchQuery.value = search ?? '';
    fetchReturns(isInitialFetch: true);
  }

  void clearFilters() {
    currentStatusFilter.value = '';
    dateFromFilter.value = null;
    dateToFilter.value = null;
    searchQuery.value = '';
    fetchReturns(isInitialFetch: true);
  }

  void onSearchChanged(String query) {
    searchQuery.value = query;
    fetchReturns(isInitialFetch: true);
  }

  void markNeedsRefresh() {
    needsRefresh.value = true;
  }

  Future<void> refreshIfNeeded({bool force = false}) async {
    if (force || needsRefresh.value) {
      needsRefresh.value = false;
      await fetchReturns(isInitialFetch: true);
    }
  }

  DateTime _dateOnly(DateTime date) => DateTime(date.year, date.month, date.day);
}
