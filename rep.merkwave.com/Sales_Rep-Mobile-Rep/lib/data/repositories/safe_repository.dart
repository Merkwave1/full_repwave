// lib/data/repositories/safe_repository.dart
import 'package:image_picker/image_picker.dart';
import '../data_sources/safe_remote_data_source.dart';
import '../models/safe.dart';
import '../models/account.dart';

abstract class SafeRepository {
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

class SafeRepositoryImpl implements SafeRepository {
  final SafeRemoteDataSource remoteDataSource;

  SafeRepositoryImpl({required this.remoteDataSource});

  @override
  Future<List<Safe>> getSafes() async {
    try {
      return await remoteDataSource.getSafes();
    } catch (e) {
      throw Exception('Repository Error: $e');
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
      return await remoteDataSource.getSafeTransactions(
        safeId: safeId,
        search: search,
        transactionType: transactionType,
        paymentMethodId: paymentMethodId,
        status: status,
        page: page,
        limit: limit,
      );
    } catch (e) {
      throw Exception('Repository Error: $e');
    }
  }

  @override
  Future<Safe> getSafeDetail(int safeId) async {
    try {
      return await remoteDataSource.getSafeDetail(safeId);
    } catch (e) {
      throw Exception('Repository Error: $e');
    }
  }

  @override
  Future<List<Account>> getAccounts({String? type}) async {
    try {
      return await remoteDataSource.getAccounts(type: type);
    } catch (e) {
      throw Exception('Repository Error: $e');
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
      return await remoteDataSource.requestSafeTransfer(
        sourceSafeId: sourceSafeId,
        destinationSafeId: destinationSafeId,
        amount: amount,
        amountText: amountText,
        notes: notes,
        receiptImage: receiptImage,
      );
    } catch (e) {
      throw Exception('Repository Error: $e');
    }
  }
}
