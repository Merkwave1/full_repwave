// lib/data/repositories/transfers_repository.dart
import '/data/datasources/transfers_remote_datasource.dart';
import 'dart:convert';

class TransfersRepository {
  final TransfersRemoteDataSource _remoteDataSource;

  TransfersRepository({required TransfersRemoteDataSource remoteDataSource}) : _remoteDataSource = remoteDataSource;

  Future<Map<String, dynamic>> createTransfer({
    required int sourceWarehouseId,
    required int destinationWarehouseId,
    required List<Map<String, dynamic>> transferItems, // Changed to dynamic for quantity
    required String userUuid, // Added required userUuid parameter
  }) async {
    final Map<String, dynamic> transferData = {
      'source_warehouse_id': sourceWarehouseId.toString(),
      'destination_warehouse_id': destinationWarehouseId.toString(),
      'items': jsonEncode(transferItems),
      'users_uuid': userUuid, // Pass the uuid to the data map
    };

    return await _remoteDataSource.createTransfer(transferData);
  }

  Future<Map<String, dynamic>> createTransferRequest({
    required int sourceWarehouseId,
    required int destinationWarehouseId,
    required List<Map<String, dynamic>> items,
    String? note,
  }) async {
    final data = {
      'source_warehouse_id': sourceWarehouseId.toString(),
      'destination_warehouse_id': destinationWarehouseId.toString(),
      'items': jsonEncode(items),
      if (note != null && note.isNotEmpty) 'note': note,
    };
    return await _remoteDataSource.createTransferRequest(data);
  }
}
