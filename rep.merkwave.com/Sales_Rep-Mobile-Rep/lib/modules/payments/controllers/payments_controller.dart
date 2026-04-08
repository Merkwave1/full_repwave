// lib/modules/payments/controllers/payments_controller.dart
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '/data/models/payment.dart';
import '/data/models/safe.dart';
import '/data/models/client.dart';
import '/data/repositories/payment_repository.dart';
import '/data/repositories/visit_repository.dart';
import '/modules/shared/controllers/global_data_controller.dart';
import '/modules/auth/controllers/auth_controller.dart';
import '/core/utils/formatting.dart';

class PaymentsController extends GetxController {
  final PaymentRepository _paymentRepository = PaymentRepository();
  final GlobalDataController _globalDataController = Get.find<GlobalDataController>();
  final AuthController _authController = Get.find<AuthController>();

  // Observable variables
  var payments = <Payment>[].obs;
  var isLoading = false.obs;
  var errorMessage = ''.obs;
  final RxString searchQuery = ''.obs;

  // Filter variables
  var selectedClient = Rxn<Client>();
  var selectedPaymentMethod = Rxn<PaymentMethod>();

  // Pagination variables
  var currentPage = 1.obs;
  var totalPages = 0.obs;
  var totalItems = 0.obs;
  var hasMore = false.obs;
  final int itemsPerPage = 20;
  var isLoadingMore = false.obs;

  bool get isSearching => searchQuery.value.trim().isNotEmpty;

  // No longer need client-side filtering since we're using server-side
  List<Payment> get visiblePayments => payments.toList();

  // Get cached data from GlobalDataController
  List<PaymentMethod> get paymentMethods => _globalDataController.paymentMethods;
  List<Safe> get safes => _globalDataController.safes;
  List<Safe> get availableSafes {
    final currentUser = _authController.currentUser.value;
    if (currentUser == null) {
      return const <Safe>[];
    }

    String normalizeType(String? value) => value?.trim().toLowerCase() ?? '';

    final userId = currentUser.id;
    
    // Cash users see all their assigned safes (already filtered by backend)
    if (currentUser.isCash) {
      return safes;
    }
    
    if (currentUser.isStoreKeeper) {
      return safes.where((safe) {
        final type = normalizeType(safe.type);
        if (type != 'store_keeper') {
          return false;
        }
        final ownerId = safe.ownerUserId;
        return ownerId == null || ownerId == userId;
      }).toList();
    }

    if (currentUser.isAdmin) {
      return safes;
    }

    return safes.where((safe) {
      final type = normalizeType(safe.type);
      if (type != 'rep' && type != 'representative') {
        return false;
      }
      final ownerId = safe.ownerUserId;
      return ownerId == null || ownerId == userId;
    }).toList();
  }

  List<Client> get clients => _globalDataController.clients;

  @override
  void onInit() {
    super.onInit();
    _loadInitialData();
  }

  Future<void> _loadInitialData() async {
    await loadPayments();
    await _ensureGlobalDataLoaded();
  }

  Future<void> _ensureGlobalDataLoaded() async {
    if (_globalDataController.clients.isEmpty) {
      await _globalDataController.loadClients();
    }
    if (_globalDataController.paymentMethods.isEmpty) {
      await _globalDataController.loadPaymentMethods();
    }
    if (_globalDataController.safes.isEmpty) {
      await _globalDataController.loadSafes();
    }
  }

  // Load all payments for the logged-in user
  Future<void> loadPayments({bool resetPage = true}) async {
    try {
      if (resetPage) {
        currentPage.value = 1;
        isLoading.value = true;
      } else {
        isLoadingMore.value = true;
      }
      errorMessage.value = '';

      if (_authController.currentUser.value == null) {
        throw Exception('User is not logged in.');
      }

      final result = await _paymentRepository.getAllPayments(
        userUuid: _authController.currentUser.value!.uuid,
        clientId: selectedClient.value?.id,
        methodId: selectedPaymentMethod.value?.id,
        search: searchQuery.value.trim(),
        page: currentPage.value,
        limit: itemsPerPage,
      );

      if (resetPage) {
        payments.value = result['data'] as List<Payment>;
      } else {
        payments.addAll(result['data'] as List<Payment>);
      }

      // Update pagination info
      final pagination = result['pagination'] as Map<String, dynamic>;
      currentPage.value = pagination['current_page'] ?? 1;
      totalPages.value = pagination['total_pages'] ?? 0;
      totalItems.value = pagination['total_items'] ?? 0;
      hasMore.value = pagination['has_more'] ?? false;
    } catch (e) {
      errorMessage.value = e.toString();
      Get.snackbar(
        'Error',
        'Failed to load payments: $e',
        snackPosition: SnackPosition.BOTTOM,
        backgroundColor: Colors.red,
        colorText: Colors.white,
      );
    } finally {
      isLoading.value = false;
      isLoadingMore.value = false;
    }
  }

  // Load more payments for pagination
  Future<void> loadMore() async {
    if (isLoadingMore.value || !hasMore.value) return;
    currentPage.value++;
    await loadPayments(resetPage: false);
  }

  Future<void> refreshCachedData() async {
    try {
      await _globalDataController.refreshAllData();
    } catch (e) {
      print('Failed to refresh cached data: $e');
    }
  }

  // Add payment - MODIFIED to return Payment?
  Future<Payment?> addPayment({
    required int clientId,
    required int safeId,
    required double amount,
    String? transactionId,
    String? notes,
    int? visitId,
  }) async {
    try {
      isLoading.value = true;

      Safe? selectedSafe;
      for (final safe in safes) {
        if (safe.id == safeId) {
          selectedSafe = safe;
          break;
        }
      }

      if (selectedSafe == null) {
        Get.snackbar(
          'error'.tr,
          'safe_not_found'.tr,
          snackPosition: SnackPosition.BOTTOM,
          backgroundColor: Colors.red,
          colorText: Colors.white,
        );
        return null;
      }

      if (selectedSafe.paymentMethodId == null) {
        Get.snackbar(
          'error'.tr,
          'safe_missing_payment_method'.tr,
          snackPosition: SnackPosition.BOTTOM,
          backgroundColor: Colors.red,
          colorText: Colors.white,
        );
        return null;
      }

      final newPayment = await _paymentRepository.addPayment(
        clientId: clientId,
        safeId: safeId,
        methodId: selectedSafe.paymentMethodId!,
        amount: amount,
        transactionId: transactionId,
        notes: notes,
        visitId: visitId,
        userUuid: _authController.currentUser.value!.uuid,
      );

      payments.insert(0, newPayment);

      if (visitId != null) {
        try {
          final visitRepository = Get.find<VisitRepository>();
          await visitRepository.addVisitActivity(
            visitId,
            'Payment_Collected',
            'Payment collected: ${Formatting.amount(amount)}',
            referenceId: newPayment.id,
          );
        } catch (e) {
          print('Failed to log visit activity: $e');
        }
      }

      return newPayment; // MODIFIED: Return the new payment object
    } catch (e) {
      Get.snackbar(
        'error'.tr,
        'failed_to_add_payment'.tr,
        snackPosition: SnackPosition.BOTTOM,
        backgroundColor: Colors.red,
        colorText: Colors.white,
      );
      return null; // MODIFIED: Return null on failure
    } finally {
      isLoading.value = false;
    }
  }

  // Apply filters
  void applyFilters() {
    loadPayments();
  }

  // Clear filters
  void clearFilters() {
    selectedClient.value = null;
    selectedPaymentMethod.value = null;
    loadPayments();
  }

  void onSearchChanged(String query) {
    searchQuery.value = query;
    // Reset to page 1 when search changes
    loadPayments(resetPage: true);
  }

  // Refresh data
  Future<void> refreshData() async {
    await Future.wait([
      loadPayments(),
      refreshCachedData(),
    ]);
  }
}
