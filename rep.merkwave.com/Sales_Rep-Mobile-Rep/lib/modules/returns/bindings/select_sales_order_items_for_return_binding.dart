// lib/modules/returns/bindings/select_sales_order_items_for_return_binding.dart
import 'package:get/get.dart';
import '/data/datasources/sales_order_remote_datasource.dart';
import '/data/repositories/sales_order_repository.dart';
import '/modules/returns/controllers/select_sales_order_items_for_return_controller.dart';
import '/services/api_service.dart'; // Import ApiService
import '/data/datasources/sales_return_remote_datasource.dart'; // New import
import '/data/repositories/sales_return_repository.dart'; // New import

class SelectSalesOrderItemsForReturnBinding implements Bindings {
  @override
  void dependencies() {
    // SalesOrderRemoteDataSource requires ApiService
    Get.put(SalesOrderRemoteDataSource(apiService: Get.find<ApiService>()));
    Get.put(SalesOrderRepository(remoteDataSource: Get.find<SalesOrderRemoteDataSource>()));
    // Corrected: Provide ApiService to SalesReturnRemoteDataSource
    Get.put(SalesReturnRemoteDataSource(apiService: Get.find<ApiService>()));
    Get.put(SalesReturnRepository(remoteDataSource: Get.find<SalesReturnRemoteDataSource>()));
    Get.put(SelectSalesOrderItemsForReturnController(
      salesOrderRepository: Get.find<SalesOrderRepository>(),
      salesReturnRepository: Get.find<SalesReturnRepository>(),
    ));
  }
}
