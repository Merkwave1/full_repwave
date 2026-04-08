// lib/modules/safes/controllers/safe_detail_controller.dart
import 'package:get/get.dart';
import '../../../data/models/safe.dart';
import '../../../data/models/safe_transaction.dart';
import '../../../data/models/payment.dart';
import '../../../data/repositories/safe_repository.dart';
import '../../shared/controllers/global_data_controller.dart';

class SafeDetailController extends GetxController {
  final SafeRepository _safeRepository;

  SafeDetailController({required SafeRepository safeRepository}) : _safeRepository = safeRepository;

  final Rx<Safe?> safe = Rx<Safe?>(null);
  final RxList<SafeTransaction> transactions = <SafeTransaction>[].obs;
  final RxBool isLoading = false.obs;
  final RxBool isLoadingTransactions = false.obs;
  final RxBool isLoadingMore = false.obs;
  final RxString errorMessage = ''.obs;
  final RxString selectedFilter = 'all'.obs;
  final RxString searchQuery = ''.obs;

  // Pagination variables
  var currentPage = 1.obs;
  var totalPages = 0.obs;
  var totalItems = 0.obs;
  var hasMore = false.obs;
  final int itemsPerPage = 20;

  // Filter variables
  var selectedTransactionType = Rxn<String>(); // 'credit', 'debit', 'all'
  var selectedPaymentMethod = Rxn<PaymentMethod>();
  var selectedStatus = Rxn<String>(); // 'approved', 'pending', 'rejected'

  int? safeId;

  // Get available payment methods from GlobalDataController
  List<PaymentMethod> get paymentMethods {
    try {
      final globalData = Get.find<GlobalDataController>();
      return globalData.paymentMethods;
    } catch (e) {
      return [];
    }
  }

  @override
  void onInit() {
    super.onInit();
    if (Get.arguments != null && Get.arguments is int) {
      safeId = Get.arguments as int;
      fetchSafeDetail(safeId!);
      fetchSafeTransactions(safeId!, resetPage: true);
    } else {
      errorMessage.value = 'Safe ID not provided';
    }
  }

  Future<void> fetchSafeDetail(int id) async {
    isLoading.value = true;
    errorMessage.value = '';

    try {
      final fetchedSafe = await _safeRepository.getSafeDetail(id);
      safe.value = fetchedSafe;
    } catch (e) {
      errorMessage.value = e.toString();
      print('SafeDetailController Error: $e');
    } finally {
      isLoading.value = false;
    }
  }

  Future<void> fetchSafeTransactions(int id, {bool resetPage = true}) async {
    if (resetPage) {
      currentPage.value = 1;
      isLoadingTransactions.value = true;
    } else {
      isLoadingMore.value = true;
    }

    try {
      final result = await _safeRepository.getSafeTransactions(
        safeId: id,
        search: searchQuery.value.trim().isEmpty ? null : searchQuery.value.trim(),
        transactionType: selectedTransactionType.value,
        paymentMethodId: selectedPaymentMethod.value?.id,
        status: selectedStatus.value,
        page: currentPage.value,
        limit: itemsPerPage,
      );

      final List<SafeTransaction> fetchedTransactions = result['data'] as List<SafeTransaction>;

      if (resetPage) {
        transactions.assignAll(fetchedTransactions);
      } else {
        transactions.addAll(fetchedTransactions);
      }

      // Update pagination info
      final pagination = result['pagination'] as Map<String, dynamic>;
      currentPage.value = pagination['current_page'] ?? 1;
      totalPages.value = pagination['total_pages'] ?? 0;
      totalItems.value = pagination['total_items'] ?? 0;
      hasMore.value = pagination['has_more'] ?? false;
    } catch (e) {
      errorMessage.value = e.toString();
      print('SafeDetailController Transactions Error: $e');
    } finally {
      isLoadingTransactions.value = false;
      isLoadingMore.value = false;
    }
  }

  // Load more transactions for pagination
  Future<void> loadMore() async {
    if (isLoadingMore.value || !hasMore.value || safeId == null) return;
    currentPage.value++;
    await fetchSafeTransactions(safeId!, resetPage: false);
  }

  // Apply filters
  void applyFilters() {
    if (safeId != null) {
      fetchSafeTransactions(safeId!, resetPage: true);
    }
  }

  // Clear filters
  void clearFilters() {
    searchQuery.value = '';
    selectedTransactionType.value = null;
    selectedPaymentMethod.value = null;
    selectedStatus.value = null;
    if (safeId != null) {
      fetchSafeTransactions(safeId!, resetPage: true);
    }
  }

  // Search handler
  void onSearchChanged(String query) {
    searchQuery.value = query;
    if (safeId != null) {
      fetchSafeTransactions(safeId!, resetPage: true);
    }
  }

  Future<void> refreshSafeDetail() async {
    if (safeId != null) {
      await Future.wait([
        fetchSafeDetail(safeId!),
        fetchSafeTransactions(safeId!, resetPage: true),
      ]);
    }
  }

  Future<void> refreshData() async {
    await refreshSafeDetail();
  }

  void setFilter(String filter) {
    selectedFilter.value = filter;
    // Map filter to transaction type for API
    if (filter == 'credit') {
      selectedTransactionType.value = 'credit';
    } else if (filter == 'debit') {
      selectedTransactionType.value = 'debit';
    } else {
      selectedTransactionType.value = null;
    }
    applyFilters();
  }

  // No longer need client-side filtering since we're using server-side
  List<SafeTransaction> get filteredTransactions => transactions.toList();

  double get totalCredits {
    return transactions
        // Only approved should count
        .where((transaction) => _isApproved(transaction) && transaction.isCredit)
        .fold(0.0, (sum, transaction) => sum + transaction.amount);
  }

  double get totalDebits {
    return transactions
        // Only approved should count
        .where((transaction) => _isApproved(transaction) && !transaction.isCredit)
        .fold(0.0, (sum, transaction) => sum + transaction.amount);
  }

  int get totalTransactions {
    // Count only approved transactions in totals
    return transactions.where(_isApproved).length;
  }

  int get daysSinceLastTransaction {
    // Consider only approved transactions for recency
    final approved = transactions.where(_isApproved).toList();
    if (approved.isEmpty) return 0;
    final lastTransaction = approved.first;
    final now = DateTime.now();
    final difference = now.difference(lastTransaction.date);
    return difference.inDays;
  }

  double get totalDeposits {
    return totalCredits;
  }

  double get totalWithdrawals {
    return totalDebits;
  }

  List<SafeTransaction> get recentTransactions {
    // Show the most recent approved transactions in this summary helper
    return transactions.where(_isApproved).take(10).toList();
  }

  bool _isApproved(SafeTransaction t) {
    final s = t.status?.toLowerCase() ?? 'approved';
    if (s.contains('approve')) return true;
    if (s.contains('reject')) return false;
    if (s.contains('pending')) return false;
    // default: only explicit approved counts; unknown treated as not approved
    return s == 'approved';
  }
}
