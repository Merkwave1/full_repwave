// lib/modules/invoices/bindings/invoice_detail_binding.dart
import 'package:get/get.dart';
import '/data/datasources/sales_invoice_remote_datasource.dart';
import '/data/repositories/sales_invoice_repository.dart';
import '/data/datasources/sales_order_remote_datasource.dart';
import '/data/repositories/sales_order_repository.dart';
import '/services/api_service.dart';
import '/modules/invoices/controllers/invoice_detail_controller.dart';

class InvoiceDetailBinding implements Bindings {
  @override
  void dependencies() {
    Get.put(SalesInvoiceRemoteDataSource());
    Get.put(SalesInvoiceRepository(remoteDataSource: Get.find()));
    // Provide sales order datasource/repository to allow fetching linked sales order details
    if (!Get.isRegistered<ApiService>()) {
      Get.put(ApiService());
    }
    Get.put(SalesOrderRemoteDataSource(apiService: Get.find()));
    Get.put(SalesOrderRepository(remoteDataSource: Get.find()));
    Get.put(InvoiceDetailController(salesInvoiceRepository: Get.find(), salesOrderRepository: Get.find<SalesOrderRepository>()));
  }
}
