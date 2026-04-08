// lib/modules/client_interested_products/controllers/add_interested_product_controller.dart
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '/data/models/product_lookup.dart';
import '/data/repositories/client_repository.dart';
import '/data/repositories/product_repository.dart';
import '/modules/client_interested_products/controllers/client_interested_products_controller.dart';
import '/modules/clients/controllers/client_detail_controller.dart';

class AddInterestedProductController extends GetxController {
  final ClientRepository _clientRepository;
  final ProductRepository _productRepository;

  AddInterestedProductController({
    required ClientRepository clientRepository,
    required ProductRepository productRepository,
  })  : _clientRepository = clientRepository,
        _productRepository = productRepository;

  final TextEditingController searchController = TextEditingController();
  final RxList<SimpleProduct> filteredProducts = <SimpleProduct>[].obs;
  final isLoading = true.obs;
  final errorMessage = ''.obs;
  final isSubmitting = false.obs;
  final RxnInt submittingProductId = RxnInt();

  final RxnString clientName = RxnString();
  final RxnInt clientId = RxnInt();

  List<SimpleProduct> _allProducts = <SimpleProduct>[];

  @override
  void onInit() {
    super.onInit();
    _parseArguments();
    searchController.addListener(() {
      _filterProducts(searchController.text);
    });
    _loadProducts();
  }

  void _parseArguments() {
    final args = Get.arguments;
    if (args is int) {
      clientId.value = args;
    } else if (args is Map) {
      final dynamic idValue = args['clientId'];
      if (idValue is int) {
        clientId.value = idValue;
      } else if (idValue is String) {
        final parsed = int.tryParse(idValue);
        if (parsed != null) {
          clientId.value = parsed;
        }
      }
      final dynamic nameValue = args['clientName'];
      if (nameValue != null) {
        clientName.value = nameValue.toString();
      }
    }
  }

  Future<void> _loadProducts() async {
    isLoading.value = true;
    errorMessage.value = '';
    try {
      // Use the new products-only endpoint, excluding already added products
      final products = await _productRepository.getProductsOnly(clientId: clientId.value);
      _allProducts = products;
      filteredProducts.assignAll(_allProducts);
    } catch (e) {
      errorMessage.value = e.toString();
      filteredProducts.clear();
    } finally {
      isLoading.value = false;
    }
  }

  void _filterProducts(String query) {
    final String trimmed = query.trim();
    if (trimmed.isEmpty) {
      filteredProducts.assignAll(_allProducts);
      return;
    }

    final String lower = trimmed.toLowerCase();
    filteredProducts.assignAll(
      _allProducts.where((product) {
        return product.productsName.toLowerCase().contains(lower) || (product.productsBrand?.toLowerCase().contains(lower) ?? false) || (product.productsDescription?.toLowerCase().contains(lower) ?? false);
      }).toList(),
    );
  }

  Future<void> selectProduct(SimpleProduct product) async {
    final int? id = clientId.value;
    if (id == null || id <= 0) {
      Get.snackbar('Error', 'client_not_found'.tr, snackPosition: SnackPosition.BOTTOM);
      return;
    }

    isSubmitting.value = true;
    submittingProductId.value = product.productsId;
    try {
      final response = await _clientRepository.addClientInterestedProduct(
        id,
        product.productsId,
      );
      Get.snackbar('Success', response['message'] ?? 'interested_product_added'.tr, snackPosition: SnackPosition.BOTTOM);

      if (Get.isRegistered<ClientInterestedProductsController>()) {
        await Get.find<ClientInterestedProductsController>().refreshAfterModification();
      } else if (Get.isRegistered<ClientDetailController>()) {
        await Get.find<ClientDetailController>().refreshInterestedProducts();
      }

      // Reload the products list to remove the just-added product from the display
      await _loadProducts();

      // Don't close the screen - let user add more products
      // Get.back(result: true);
    } catch (e) {
      Get.snackbar('Error', 'failed_to_add_interested_product'.trParams({'error': e.toString()}), snackPosition: SnackPosition.BOTTOM);
    } finally {
      isSubmitting.value = false;
      submittingProductId.value = null;
    }
  }

  @override
  void onClose() {
    searchController.dispose();
    super.onClose();
  }
}
