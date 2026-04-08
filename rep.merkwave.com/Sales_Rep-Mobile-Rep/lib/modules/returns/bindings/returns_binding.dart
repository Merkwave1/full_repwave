// lib/modules/returns/bindings/returns_binding.dart
import 'package:get/get.dart';
import '/data/datasources/sales_return_remote_datasource.dart';
import '/data/repositories/sales_return_repository.dart';
import '/modules/returns/controllers/returns_controller.dart';
import '/services/api_service.dart'; // Import ApiService

class ReturnsBinding implements Bindings {
  @override
  void dependencies() {
    // Correctly provide apiService to SalesReturnRemoteDataSource
    Get.put(SalesReturnRemoteDataSource(apiService: Get.find<ApiService>()));
    Get.put(SalesReturnRepository(remoteDataSource: Get.find<SalesReturnRemoteDataSource>()));
    Get.put(ReturnsController(salesReturnRepository: Get.find<SalesReturnRepository>()));
  }
}
