// lib/data/data_sources/safe_remote_data_source.dart
import 'package:get/get.dart';
import 'package:image_picker/image_picker.dart';
import '../../services/api_service.dart';
import '../models/safe.dart';
import '../models/safe_transaction.dart';
import '../models/account.dart';
import '../../modules/auth/controllers/auth_controller.dart';

abstract class SafeRemoteDataSource {
  Future<List<Safe>> getSafes();
  Future<Map<String, dynamic>> getSafeTransactions({
    required int safeId,
    String? search,
    String? transactionType,
    int? paymentMethodId,
    String? status,
    int page = 1,
    int limit = 20,
  });
  Future<Safe> getSafeDetail(int safeId);
  Future<List<Account>> getAccounts({String? type});
  Future<String> requestSafeTransfer({
    required int sourceSafeId,
    required int destinationSafeId,
    required double amount,
    required String amountText,
    String? notes,
    XFile? receiptImage,
  });
}

class SafeRemoteDataSourceImpl implements SafeRemoteDataSource {
  final ApiService apiService;

  SafeRemoteDataSourceImpl({required this.apiService});

  String _getUserUuid() {
    final authController = Get.find<AuthController>();
    final userUuid = authController.currentUser.value?.uuid;
    if (userUuid == null || userUuid.isEmpty) {
      throw Exception('User UUID not available. Please login again.');
    }
    return userUuid;
  }

  @override
  Future<List<Safe>> getSafes() async {
    try {
      final userUuid = _getUserUuid();
      final response = await apiService.get('/safes/get_all.php', queryParameters: {
        'users_uuid': userUuid,
      });
      if (response['status'] == 'success') {
        // Handle nested response structure: data.safes contains the array
        final responseData = response['data'];
        final List<dynamic> safesData = (responseData is Map && responseData.containsKey('safes')) ? (responseData['safes'] ?? []) : (responseData ?? []);

        try {
          final safesList = safesData.map((safeJson) => Safe.fromJson(safeJson)).toList();
          // Debug log to help trace why UI might be empty despite API returning data
          print('[SafeRemoteDataSource] Fetched ${safesList.length} safes from API');
          return safesList;
        } catch (e, st) {
          print('[SafeRemoteDataSource] Error parsing safes data: $e');
          print(st);
          rethrow;
        }
      } else {
        throw Exception(response['message'] ?? 'Failed to fetch safes');
      }
    } catch (e) {
      throw Exception('Error fetching safes: $e');
    }
  }

  @override
  Future<Map<String, dynamic>> getSafeTransactions({
    required int safeId,
    String? search,
    String? transactionType,
    int? paymentMethodId,
    String? status,
    int page = 1,
    int limit = 20,
  }) async {
    try {
      final userUuid = _getUserUuid();
      final Map<String, String> queryParams = {
        'users_uuid': userUuid,
        'safe_id': safeId.toString(),
        'page': page.toString(),
        'limit': limit.toString(),
      };

      if (search != null && search.isNotEmpty) queryParams['search'] = search;
      if (transactionType != null && transactionType.isNotEmpty) queryParams['transaction_type'] = transactionType;
      if (paymentMethodId != null) queryParams['payment_method_id'] = paymentMethodId.toString();
      if (status != null && status.isNotEmpty) queryParams['status'] = status;

      final response = await apiService.get('/safe_transactions/get_all.php', queryParameters: queryParams);

      if (response['status'] == 'success') {
        final List<dynamic> transactionsData = response['data'] ?? [];
        final List<SafeTransaction> transactions = transactionsData.map((transactionJson) => SafeTransaction.fromJson(transactionJson)).toList();

        return {
          'data': transactions,
          'pagination': response['pagination'],
        };
      } else {
        throw Exception(response['message'] ?? 'Failed to fetch safe transactions');
      }
    } catch (e) {
      throw Exception('Error fetching safe transactions: $e');
    }
  }

  @override
  Future<Safe> getSafeDetail(int safeId) async {
    try {
      final userUuid = _getUserUuid();
      final response = await apiService.get('/safes/get_detail.php', queryParameters: {
        'users_uuid': userUuid,
        'id': safeId.toString(), // Backend expects 'id', not 'safes_id'
      });
      if (response['status'] == 'success') {
        return Safe.fromJson(response['data']);
      } else {
        throw Exception(response['message'] ?? 'Failed to fetch safe detail');
      }
    } catch (e) {
      throw Exception('Error fetching safe detail: $e');
    }
  }

  @override
  Future<List<Account>> getAccounts({String? type}) async {
    try {
      final Map<String, String> queryParams = {};
      if (type != null) queryParams['type'] = type;

      final response = await apiService.get('/accounts/get_all.php', queryParameters: queryParams);
      if (response['status'] == 'success') {
        final List<dynamic> accountsData = response['data'] ?? [];
        return accountsData.map((json) => Account.fromJson(json)).toList();
      } else {
        throw Exception(response['message'] ?? 'Failed to fetch accounts');
      }
    } catch (e) {
      throw Exception('Error fetching accounts: $e');
    }
  }

  @override
  Future<String> requestSafeTransfer({
    required int sourceSafeId,
    required int destinationSafeId,
    required double amount,
    required String amountText,
    String? notes,
    XFile? receiptImage,
  }) async {
    try {
      final payload = <String, dynamic>{
        'source_safe_id': sourceSafeId.toString(),
        'destination_safe_id': destinationSafeId.toString(),
        'transfer_amount': amountText.isNotEmpty ? amountText : amount.toStringAsFixed(2),
      };

      if (notes != null && notes.trim().isNotEmpty) {
        payload['transfer_notes'] = notes.trim();
      }

      Map<String, dynamic> response;

      if (receiptImage != null) {
        response = await apiService.postMultipart(
          '/safe_transfers/add.php',
          payload.map((key, value) => MapEntry(key, value.toString())),
          filePath: receiptImage.path,
          fileField: 'receipt_image',
        );
      } else {
        response = await apiService.post('/safe_transfers/add.php', payload);
      }
      if (response['status']?.toString().toLowerCase() != 'success') {
        throw Exception(response['message'] ?? 'Failed to submit safe transfer');
      }
      // Return the transfer status (approved or pending)
      return response['data']?['status']?.toString() ?? 'pending';
    } catch (e) {
      throw Exception('Error submitting safe transfer: $e');
    }
  }
}
