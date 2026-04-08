// lib/data/repositories/warehouse_repository.dart
import '/data/models/warehouse.dart';
import '/data/datasources/warehouse_remote_datasource.dart';

class WarehouseRepository {
  final WarehouseRemoteDataSource _remoteDataSource;

  WarehouseRepository({required WarehouseRemoteDataSource remoteDataSource}) : _remoteDataSource = remoteDataSource;

  Future<Map<String, List<Warehouse>>> getWarehouses(String userUuid) async {
    try {
      final Map<String, dynamic> data = await _remoteDataSource.fetchWarehouses(userUuid);

      final List<Warehouse> myWarehouses = (data['my_warehouses'] as List).map((warehouseJson) => Warehouse.fromJson(warehouseJson)).toList();

      final List<Warehouse> otherMainWarehouses = (data['other_main_warehouses'] as List).map((warehouseJson) => Warehouse.fromJson(warehouseJson)).toList();

      return {
        'my_warehouses': myWarehouses,
        'other_main_warehouses': otherMainWarehouses,
      };
    } catch (e) {
      print('WarehouseRepository: Failed to get warehouses: $e');
      rethrow;
    }
  }
}
