// lib/modules/returns/bindings/return_order_detail_binding.dart
import 'package:get/get.dart';
import '/data/datasources/sales_return_remote_datasource.dart';
import '/data/repositories/sales_return_repository.dart';
import '/modules/returns/controllers/return_order_detail_controller.dart';
import '/services/api_service.dart'; // Import ApiService

class ReturnOrderDetailBinding implements Bindings {
  @override
  void dependencies() {
    Get.put(SalesReturnRemoteDataSource(apiService: Get.find<ApiService>()));
    Get.put(SalesReturnRepository(remoteDataSource: Get.find<SalesReturnRemoteDataSource>()));
    Get.put(ReturnOrderDetailController(salesReturnRepository: Get.find<SalesReturnRepository>()));
  }
}
