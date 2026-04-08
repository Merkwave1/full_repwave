// lib/data/repositories/payment_repository.dart
import 'package:get/get.dart';
import '/services/api_service.dart';
import '/data/models/payment.dart';
import '/data/models/safe.dart';

class PaymentRepository {
  final ApiService _apiService = Get.find<ApiService>();

  // Get all payments for a specific representative
  Future<Map<String, dynamic>> getAllPayments({
    required String userUuid,
    int? clientId,
    int? methodId,
    String? search,
    int page = 1,
    int limit = 20,
  }) async {
    try {
      final Map<String, String> params = {
        'users_uuid': userUuid,
        'page': page.toString(),
        'limit': limit.toString(),
      };
      if (clientId != null) params['client_id'] = clientId.toString();
      if (methodId != null) params['method_id'] = methodId.toString();
      if (search != null && search.isNotEmpty) params['search'] = search;

      final response = await _apiService.get('/payments/get_all.php', queryParameters: params);

      if (response['status'] == 'success' && response['data'] != null) {
        // Handle both old format (direct list) and new format (nested with pagination)
        List<Payment> payments;
        Map<String, dynamic> pagination;

        if (response['data'] is List) {
          // Old format: direct list of payments
          final List<dynamic> paymentsJson = response['data'] as List<dynamic>;
          payments = paymentsJson.map((json) => Payment.fromJson(json)).toList();

          // Create default pagination for old format
          pagination = {
            'current_page': page,
            'limit': limit,
            'total_items': payments.length,
            'total_pages': 1,
            'has_more': false,
          };
        } else {
          // New format: nested structure with pagination
          final responseData = response['data'] as Map<String, dynamic>;
          final List<dynamic> paymentsJson = responseData['data'] as List<dynamic>;
          payments = paymentsJson.map((json) => Payment.fromJson(json)).toList();
          pagination = responseData['pagination'];
        }

        return {
          'data': payments,
          'pagination': pagination,
        };
      } else {
        throw Exception(response['message'] ?? 'Failed to fetch payments');
      }
    } catch (e) {
      throw Exception('Error fetching payments: $e');
    }
  }

  // Get payment details
  Future<Payment> getPaymentDetail(int paymentId) async {
    try {
      final response = await _apiService.get('/payments/get_detail.php', queryParameters: {'payments_id': paymentId.toString()});

      if (response['status'] == 'success' && response['data'] != null) {
        return Payment.fromJson(response['data']);
      } else {
        throw Exception(response['message'] ?? 'Failed to fetch payment details');
      }
    } catch (e) {
      throw Exception('Error fetching payment details: $e');
    }
  }

  // Add payment
  Future<Payment> addPayment({
    required String userUuid,
    required int clientId,
    required int safeId,
    required int methodId,
    required double amount,
    String? transactionId,
    String? notes,
    int? visitId,
  }) async {
    try {
      final Map<String, dynamic> data = {
        'users_uuid': userUuid,
        'payments_client_id': clientId.toString(),
        'payments_method_id': methodId.toString(),
        'payments_amount': amount.toString(),
        'payments_safe_id': safeId.toString(),
      };

      if (transactionId != null && transactionId.isNotEmpty) {
        data['payments_transaction_id'] = transactionId;
      }
      if (notes != null && notes.isNotEmpty) {
        data['payments_notes'] = notes;
      }
      if (visitId != null) {
        data['payments_visit_id'] = visitId.toString();
      }

      final response = await _apiService.post('/payments/add.php', data);

      if (response['status'] == 'success') {
        final paymentId = response['data']['payments_id'];
        return await getPaymentDetail(paymentId);
      } else {
        throw Exception(response['message'] ?? 'Failed to add payment');
      }
    } catch (e) {
      throw Exception('Error adding payment: $e');
    }
  }

  // Update payment
  Future<Payment> updatePayment({
    required String userUuid,
    required int paymentId,
    int? clientId,
    int? methodId,
    double? amount,
    int? safeId,
    String? transactionId,
    String? notes,
    DateTime? date,
  }) async {
    try {
      final Map<String, dynamic> data = {
        'users_uuid': userUuid,
        'payments_id': paymentId.toString(),
      };

      if (clientId != null) data['payments_client_id'] = clientId.toString();
      if (methodId != null) data['payments_method_id'] = methodId.toString();
      if (amount != null) data['payments_amount'] = amount.toString();
      if (safeId != null) data['payments_safe_id'] = safeId.toString();
      if (transactionId != null) data['payments_transaction_id'] = transactionId;
      if (notes != null) data['payments_notes'] = notes;
      if (date != null) data['payments_date'] = date.toIso8601String();

      final response = await _apiService.post('/payments/update.php', data);

      if (response['status'] == 'success') {
        return await getPaymentDetail(paymentId);
      } else {
        throw Exception(response['message'] ?? 'Failed to update payment');
      }
    } catch (e) {
      throw Exception('Error updating payment: $e');
    }
  }

  // Delete payment
  Future<bool> deletePayment(String userUuid, int paymentId) async {
    try {
      final response = await _apiService.post('/payments/delete.php', {'users_uuid': userUuid, 'payments_id': paymentId.toString()});

      return response['status'] == 'success';
    } catch (e) {
      throw Exception('Error deleting payment: $e');
    }
  }

  // Get all payment methods
  Future<List<PaymentMethod>> getAllPaymentMethods() async {
    try {
      final response = await _apiService.get('/payment_methods/get_all.php');

      if (response['status'] == 'success' && response['data'] != null) {
        final List<dynamic> methodsJson = response['data'];
        return methodsJson.map((json) => PaymentMethod.fromJson(json)).toList();
      } else {
        throw Exception(response['message'] ?? 'Failed to fetch payment methods');
      }
    } catch (e) {
      throw Exception('Error fetching payment methods: $e');
    }
  }

  // Get all safes
  Future<List<Safe>> getAllSafes(String userUuid) async {
    try {
      // print('[SAFES][Repository] Fetching safes for uuid=$userUuid');
      final response = await _apiService.get('/safes/get_all.php', queryParameters: {'users_uuid': userUuid});
      // print('[SAFES][Repository] Response: ${response['status']} message=${response['message']}');

      if (response['status'] == 'success' && response['data'] != null) {
        final dynamic payload = response['data'];
        final List<dynamic> safesJson;
        if (payload is Map<String, dynamic> && payload['safes'] is List) {
          safesJson = List<dynamic>.from(payload['safes'] as List);
        } else if (payload is List) {
          safesJson = payload;
        } else {
          throw Exception('Unexpected safes payload format');
        }
        return safesJson.map((json) => Safe.fromJson(json as Map<String, dynamic>)).toList();
      } else {
        final msg = response['message'] ?? 'Failed to fetch safes';
        // print('[SAFES][Repository] Error message from API: $msg');
        throw Exception(msg);
      }
    } catch (e) {
      print('[SAFES][Repository] Exception while fetching safes: $e');
      throw Exception('Error fetching safes: $e');
    }
  }
}
