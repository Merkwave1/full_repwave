// lib/modules/invoices/bindings/invoices_binding.dart
import 'package:get/get.dart';
import '/data/datasources/sales_invoice_remote_datasource.dart';
import '/data/repositories/sales_invoice_repository.dart';
import '/modules/invoices/controllers/invoices_controller.dart';
import '/services/api_service.dart';
import '/data/datasources/sales_order_remote_datasource.dart';
import '/data/repositories/sales_order_repository.dart';

class InvoicesBinding implements Bindings {
  @override
  void dependencies() {
    // Ensure ApiService is available for datasources that require it
    if (!Get.isRegistered<ApiService>()) {
      Get.put(ApiService());
    }

    // Existing sales invoice datasource/repository
    Get.put(SalesInvoiceRemoteDataSource());
    Get.put(SalesInvoiceRepository(remoteDataSource: Get.find()));

    // Provide SalesOrder datasource & repository so invoices screen can optionally
    // fetch using the sales_orders API (recommended when listing 'Invoiced' items)
    Get.put(SalesOrderRemoteDataSource(apiService: Get.find<ApiService>()));
    Get.put(SalesOrderRepository(remoteDataSource: Get.find()));

    // Inject both repositories into the invoices controller. The controller will
    // prefer the SalesOrderRepository when available to fetch 'Invoiced' orders
    // from /sales_orders/get.php and present them using the invoices screen UI.
    Get.put(InvoicesController(
      salesInvoiceRepository: Get.find<SalesInvoiceRepository>(),
      salesOrderRepository: Get.find<SalesOrderRepository>(),
    ));
  }
}
