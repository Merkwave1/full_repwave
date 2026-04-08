// lib/modules/returns/bindings/add_edit_sales_return_binding.dart
import 'package:get/get.dart';
import '/data/datasources/sales_return_remote_datasource.dart';
import '/data/repositories/sales_return_repository.dart';
import '/data/datasources/client_remote_datasource.dart';
import '/data/repositories/client_repository.dart';
import '/data/datasources/sales_order_remote_datasource.dart';
import '/data/repositories/sales_order_repository.dart';
import '/modules/auth/controllers/auth_controller.dart';
import '/modules/returns/controllers/add_edit_sales_return_controller.dart';
import '/services/api_service.dart'; // Import ApiService
import '/data/datasources/client_document_remote_datasource.dart'; // New import

class AddEditSalesReturnBinding implements Bindings {
  @override
  void dependencies() {
    // Correctly provide apiService to SalesReturnRemoteDataSource
    Get.put(SalesReturnRemoteDataSource(apiService: Get.find<ApiService>()));
    Get.put(SalesReturnRepository(remoteDataSource: Get.find()));
    // Correctly provide apiService to ClientRemoteDataSource
    Get.put(ClientRemoteDataSource(apiService: Get.find<ApiService>()));
    // Provide ClientDocumentRemoteDataSource
    Get.put(ClientDocumentRemoteDataSource(apiService: Get.find<ApiService>()));
    Get.put(ClientRepository(
      remoteDataSource: Get.find<ClientRemoteDataSource>(),
      documentRemoteDataSource: Get.find<ClientDocumentRemoteDataSource>(), // Provide the required argument
    ));
    // Correctly provide apiService to SalesOrderRemoteDataSource
    Get.put(SalesOrderRemoteDataSource(apiService: Get.find<ApiService>()));
    Get.put(SalesOrderRepository(remoteDataSource: Get.find<SalesOrderRemoteDataSource>()));
    Get.put(AddEditSalesReturnController(
      salesReturnRepository: Get.find<SalesReturnRepository>(),
      clientRepository: Get.find<ClientRepository>(),
      salesOrderRepository: Get.find<SalesOrderRepository>(),
      authController: Get.find<AuthController>(),
    ));
  }
}
