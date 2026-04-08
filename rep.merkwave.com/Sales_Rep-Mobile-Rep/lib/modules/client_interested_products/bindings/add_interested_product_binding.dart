// lib/modules/client_interested_products/bindings/add_interested_product_binding.dart
import 'package:get/get.dart';
import '/data/repositories/client_repository.dart';
import '/data/repositories/product_repository.dart';
import '/modules/client_interested_products/controllers/add_interested_product_controller.dart';

class AddInterestedProductBinding implements Bindings {
  const AddInterestedProductBinding();

  @override
  void dependencies() {
    Get.lazyPut<AddInterestedProductController>(
      () => AddInterestedProductController(
        clientRepository: Get.find<ClientRepository>(),
        productRepository: Get.find<ProductRepository>(),
      ),
    );
  }
}
