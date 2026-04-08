// lib/data/datasources/transfers_remote_datasource.dart
import 'package:get/get.dart';
import '/services/api_service.dart';
import '/core/app_constants.dart';
import 'dart:convert';

class TransfersRemoteDataSource {
  final ApiService _apiService;

  TransfersRemoteDataSource({required ApiService apiService}) : _apiService = apiService;

  Future<Map<String, dynamic>> createTransfer(Map<String, dynamic> transferData) async {
    try {
      final response = await _apiService.post(
        AppConstants.apiAddTransferEndpoint,
        transferData,
      );
      print('Create Transfer API Response: ${jsonEncode(response)}');
      return response;
    } catch (e) {
      Get.snackbar('API Error', 'Error creating transfer: $e', snackPosition: SnackPosition.BOTTOM);
      rethrow;
    }
  }

  Future<Map<String, dynamic>> createTransferRequest(Map<String, dynamic> data) async {
    try {
      final response = await _apiService.post(
        AppConstants.apiAddTransferRequestEndpoint,
        data,
      );
      print('Create Transfer Request API Response: ${jsonEncode(response)}');
      return response;
    } catch (e) {
      Get.snackbar('API Error', 'Error creating transfer request: $e', snackPosition: SnackPosition.BOTTOM);
      rethrow;
    }
  }
}
