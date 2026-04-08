import 'package:get/get.dart';
import '/modules/account_statement/controllers/account_statement_controller.dart';
import '/services/api_service.dart';
import '/data/repositories/payment_repository.dart';
import '/data/repositories/sales_order_repository.dart';
import '/data/repositories/sales_return_repository.dart';
import '/data/repositories/client_refund_repository.dart';
import '/data/datasources/sales_order_remote_datasource.dart';
import '/data/datasources/sales_return_remote_datasource.dart';

class AccountStatementBinding extends Bindings {
  @override
  void dependencies() {
    // Ensure repositories are available
    Get.lazyPut<PaymentRepository>(() => PaymentRepository());
    Get.lazyPut<SalesOrderRepository>(() => SalesOrderRepository(
          remoteDataSource: SalesOrderRemoteDataSource(apiService: Get.find<ApiService>()),
        ));
    Get.lazyPut<SalesReturnRepository>(() => SalesReturnRepository(
          remoteDataSource: SalesReturnRemoteDataSource(apiService: Get.find<ApiService>()),
        ));
    Get.lazyPut<ClientRefundRepository>(() => ClientRefundRepository());
    Get.lazyPut<AccountStatementController>(() => AccountStatementController());
  }
}
