// lib/modules/client_interested_products/controllers/client_interested_products_controller.dart
import 'package:get/get.dart';
import '/data/models/client_interested_product.dart';
import '/data/repositories/client_repository.dart';
import '/modules/clients/controllers/client_detail_controller.dart';

class ClientInterestedProductsController extends GetxController {
  final ClientRepository _clientRepository;

  ClientInterestedProductsController({required ClientRepository clientRepository}) : _clientRepository = clientRepository;

  final RxList<ClientInterestedProduct> products = <ClientInterestedProduct>[].obs;
  final isLoading = true.obs;
  final errorMessage = ''.obs;
  final RxSet<int> removingProductIds = <int>{}.obs;

  int? clientId;
  String? clientName;

  @override
  void onInit() {
    super.onInit();
    final args = Get.arguments;
    if (args is int) {
      clientId = args;
    } else if (args is Map) {
      final dynamic idValue = args['clientId'];
      if (idValue is int) {
        clientId = idValue;
      } else if (idValue is String) {
        clientId = int.tryParse(idValue);
      }
      final dynamic nameValue = args['clientName'];
      if (nameValue != null) {
        clientName = nameValue.toString();
      }
    }

    if (clientId != null && clientId! > 0) {
      fetchClientInterestedProducts();
    } else {
      errorMessage.value = 'Error: A valid Client ID was not provided.';
      isLoading.value = false;
    }
  }

  Future<void> fetchClientInterestedProducts() async {
    final int? id = clientId;
    if (id == null || id <= 0) {
      errorMessage.value = 'Error: A valid Client ID was not provided.';
      isLoading.value = false;
      return;
    }

    isLoading.value = true;
    errorMessage.value = '';
    try {
      final results = await _clientRepository.getClientInterestedProducts(id);
      products.assignAll(results);
    } catch (e) {
      errorMessage.value = 'failed_to_load_interested_products'.trParams({'error': e.toString()});
    } finally {
      isLoading.value = false;
    }
  }

  Future<void> refreshAfterModification() async {
    await fetchClientInterestedProducts();
    _notifyDetailScreen();
  }

  Future<void> removeProduct(ClientInterestedProduct product) async {
    final int? id = clientId;
    if (id == null || id <= 0) {
      Get.snackbar('Error', 'client_not_found'.tr, snackPosition: SnackPosition.BOTTOM);
      return;
    }

    final int productId = product.productId;
    if (productId <= 0) {
      Get.snackbar('Error', 'Invalid product selection.', snackPosition: SnackPosition.BOTTOM);
      return;
    }

    removingProductIds.add(productId);
    try {
      final response = await _clientRepository.deleteClientInterestedProduct(
        id,
        productId,
      );
      products.removeWhere((item) => item.productId == productId);
      Get.snackbar('Success', response['message'] ?? 'interested_product_removed'.tr, snackPosition: SnackPosition.BOTTOM);
      _notifyDetailScreen();
    } catch (e) {
      Get.snackbar('Error', 'failed_to_remove_interested_product'.trParams({'error': e.toString()}), snackPosition: SnackPosition.BOTTOM);
    } finally {
      removingProductIds.remove(productId);
    }
  }

  void _notifyDetailScreen() {
    if (Get.isRegistered<ClientDetailController>()) {
      Get.find<ClientDetailController>().refreshInterestedProducts();
    }
  }
}
