// lib/modules/client_interested_products/bindings/client_interested_products_binding.dart
import 'package:get/get.dart';
import '/data/repositories/client_repository.dart';
import '/modules/client_interested_products/controllers/client_interested_products_controller.dart';

class ClientInterestedProductsBinding implements Bindings {
  const ClientInterestedProductsBinding();

  @override
  void dependencies() {
    Get.lazyPut<ClientInterestedProductsController>(
      () => ClientInterestedProductsController(
        clientRepository: Get.find<ClientRepository>(),
      ),
    );
  }
}
