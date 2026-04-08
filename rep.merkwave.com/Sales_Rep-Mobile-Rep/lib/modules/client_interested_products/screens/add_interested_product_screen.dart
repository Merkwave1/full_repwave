// lib/modules/client_interested_products/screens/add_interested_product_screen.dart
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '/modules/client_interested_products/controllers/add_interested_product_controller.dart';
import '/shared_widgets/custom_app_bar.dart';
import '/shared_widgets/loading_indicator.dart';
import '/data/models/product_lookup.dart';

class AddInterestedProductScreen extends GetView<AddInterestedProductController> {
  const AddInterestedProductScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final String title = controller.clientName.value != null && controller.clientName.value!.isNotEmpty ? '${'add_interested_product'.tr} - ${controller.clientName.value}' : 'add_interested_product'.tr;

    return Scaffold(
      appBar: CustomAppBar(title: title),
      body: Column(
        children: [
          Obx(() => controller.isSubmitting.value ? const LinearProgressIndicator(minHeight: 2) : const SizedBox.shrink()),
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: TextField(
              controller: controller.searchController,
              decoration: InputDecoration(
                prefixIcon: const Icon(Icons.search),
                hintText: 'search_products'.tr,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ),
          Expanded(
            child: Obx(() {
              if (controller.isLoading.value) {
                return LoadingIndicator(message: 'loading'.tr);
              }

              if (controller.errorMessage.value.isNotEmpty) {
                return Center(
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Text(
                      controller.errorMessage.value,
                      style: const TextStyle(color: Colors.red, fontSize: 16),
                      textAlign: TextAlign.center,
                    ),
                  ),
                );
              }

              if (controller.filteredProducts.isEmpty) {
                return Center(
                  child: Text(
                    controller.searchController.text.trim().isEmpty ? 'no_interested_products_found'.tr : 'no_products_match_search'.tr,
                    style: TextStyle(color: Colors.grey.shade600, fontSize: 16),
                    textAlign: TextAlign.center,
                  ),
                );
              }

              return ListView.builder(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: controller.filteredProducts.length,
                itemBuilder: (context, index) {
                  final product = controller.filteredProducts[index];
                  return _ProductCard(product: product);
                },
              );
            }),
          ),
        ],
      ),
    );
  }
}

class _ProductCard extends StatelessWidget {
  const _ProductCard({required this.product});

  final SimpleProduct product;

  @override
  Widget build(BuildContext context) {
    final controller = Get.find<AddInterestedProductController>();
    return Obx(() {
      final bool isProcessing = controller.submittingProductId.value == product.productsId;
      final theme = Theme.of(context);

      return Card(
        margin: const EdgeInsets.symmetric(vertical: 8.0),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12.0)),
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildThumbnail(product.productsImageUrl),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          product.productsName,
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        if (product.productsBrand != null)
                          Padding(
                            padding: const EdgeInsets.only(top: 4.0),
                            child: Text(
                              product.productsBrand!,
                              style: theme.textTheme.bodySmall?.copyWith(
                                color: Colors.grey.shade600,
                              ),
                            ),
                          ),
                        if (product.productsDescription != null)
                          Padding(
                            padding: const EdgeInsets.only(top: 8.0),
                            child: Text(
                              product.productsDescription!,
                              style: theme.textTheme.bodySmall?.copyWith(
                                color: Colors.grey.shade700,
                              ),
                              maxLines: 3,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Align(
                alignment: Alignment.centerRight,
                child: FilledButton.icon(
                  onPressed: isProcessing || controller.isSubmitting.value ? null : () => controller.selectProduct(product),
                  icon: isProcessing
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.add_circle_outline),
                  label: Text('add'.tr),
                ),
              ),
            ],
          ),
        ),
      );
    });
  }

  Widget _buildThumbnail(String? imageUrl) {
    final placeholder = Container(
      width: 60,
      height: 60,
      decoration: BoxDecoration(
        color: Colors.grey.shade100,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade200),
      ),
      alignment: Alignment.center,
      child: const Icon(Icons.inventory_2_outlined, color: Colors.blueGrey, size: 28),
    );

    if (imageUrl == null || imageUrl.isEmpty) {
      return placeholder;
    }

    return ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: Image.network(
        imageUrl,
        width: 60,
        height: 60,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => placeholder,
      ),
    );
  }
}
