// lib/modules/sales_orders/bindings/sales_orders_binding.dart
import 'package:get/get.dart';
import '/data/datasources/sales_order_remote_datasource.dart'; // We will create this
import '/data/repositories/sales_order_repository.dart'; // We will create this
import '/modules/sales_orders/controllers/sales_orders_controller.dart';

class SalesOrdersBinding implements Bindings {
  @override
  void dependencies() {
    // Register SalesOrderRemoteDataSource
    Get.lazyPut<SalesOrderRemoteDataSource>(
      () => SalesOrderRemoteDataSource(apiService: Get.find()),
    );

    // Register SalesOrderRepository
    Get.lazyPut<SalesOrderRepository>(
      () => SalesOrderRepository(remoteDataSource: Get.find()),
    );

    // Register SalesOrdersController
    Get.lazyPut<SalesOrdersController>(
      () => SalesOrdersController(salesOrderRepository: Get.find()),
    );
  }
}
