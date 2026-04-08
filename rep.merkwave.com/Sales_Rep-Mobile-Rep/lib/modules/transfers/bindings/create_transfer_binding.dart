// lib/modules/transfers/bindings/create_transfer_binding.dart
import 'package:get/get.dart';
import '/data/datasources/transfers_remote_datasource.dart';
import '/data/repositories/transfers_repository.dart';
import '/modules/transfers/controllers/create_transfer_controller.dart';

class CreateTransferBinding implements Bindings {
  @override
  void dependencies() {
    // This binding is responsible for creating dependencies that are specific
    // to the transfer feature and are not already in InitialBinding.
    Get.lazyPut<TransfersRemoteDataSource>(() => TransfersRemoteDataSource(apiService: Get.find()), fenix: true);
    Get.lazyPut<TransfersRepository>(() => TransfersRepository(remoteDataSource: Get.find()), fenix: true);

    // This binding's main responsibility is to create the CreateTransferController.
    // It uses Get.find() to retrieve the repositories that were already
    // created by a higher-level binding (like InitialBinding).
    Get.lazyPut<CreateTransferController>(() => CreateTransferController(
          productRepository: Get.find(),
          transfersRepository: Get.find(),
          inventoryRepository: Get.find(),
        ));
  }
}
