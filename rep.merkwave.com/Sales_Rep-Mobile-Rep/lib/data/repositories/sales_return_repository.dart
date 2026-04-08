// lib/data/repositories/sales_return_repository.dart
import '/data/datasources/sales_return_remote_datasource.dart';
import '/data/models/sales_return.dart';

class SalesReturnRepository {
  final SalesReturnRemoteDataSource remoteDataSource;

  SalesReturnRepository({required this.remoteDataSource});

  Future<List<SalesReturn>> getAllSalesReturns({
    String? status,
    String? dateFrom,
    String? dateTo,
    String? search,
    int? page,
    int? limit,
    int? salesOrderId,
    String? usersUuid, // Add usersUuid parameter
  }) async {
    try {
      return await remoteDataSource.getAllSalesReturns(
        status: status,
        dateFrom: dateFrom,
        dateTo: dateTo,
        search: search,
        page: page,
        limit: limit,
        salesOrderId: salesOrderId,
        usersUuid: usersUuid, // Pass usersUuid to the data source
      );
    } catch (e) {
      print('SalesReturnRepository Error in getAllSalesReturns: ${e.toString()}');
      throw Exception('Error fetching sales returns: ${e.toString()}');
    }
  }

  // New method to get summed returned quantities
  Future<Map<int, double>> getSummedReturnedQuantities({required int salesOrderId, String? usersUuid}) async {
    try {
      return await remoteDataSource.getSummedReturnedQuantities(salesOrderId: salesOrderId, usersUuid: usersUuid);
    } catch (e) {
      print('SalesReturnRepository Error in getSummedReturnedQuantities: ${e.toString()}');
      throw Exception('Error fetching summed returned quantities: ${e.toString()}');
    }
  }

  Future<SalesReturn> getSalesReturnById(int id) async {
    try {
      return await remoteDataSource.getSalesReturnById(id);
    } catch (e) {
      print('SalesReturnRepository Error in getSalesReturnById: ${e.toString()}');
      throw Exception('Error fetching sales return details: ${e.toString()}');
    }
  }

  Future<SalesReturn> createSalesReturn(SalesReturn salesReturn) async {
    try {
      return await remoteDataSource.createSalesReturn(salesReturn);
    } catch (e) {
      print('SalesReturnRepository Error in createSalesReturn: ${e.toString()}');
      throw Exception('Error creating sales return: ${e.toString()}');
    }
  }

  Future<SalesReturn> updateSalesReturn(SalesReturn salesReturn) async {
    try {
      return await remoteDataSource.updateSalesReturn(salesReturn);
    } catch (e) {
      print('SalesReturnRepository Error in updateSalesReturn: ${e.toString()}');
      throw Exception('Error updating sales return: ${e.toString()}');
    }
  }
}
