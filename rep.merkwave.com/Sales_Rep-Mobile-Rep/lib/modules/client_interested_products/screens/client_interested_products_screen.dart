// lib/modules/client_interested_products/screens/client_interested_products_screen.dart
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '/core/routes/app_routes.dart';
import '/data/models/client_interested_product.dart';
import '/modules/client_interested_products/controllers/client_interested_products_controller.dart';
import '/shared_widgets/custom_app_bar.dart';
import '/shared_widgets/loading_indicator.dart';

class ClientInterestedProductsScreen extends GetView<ClientInterestedProductsController> {
  const ClientInterestedProductsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final String title = controller.clientName != null && controller.clientName!.isNotEmpty ? '${'interested_products'.tr} - ${controller.clientName}' : 'interested_products'.tr;

    return Scaffold(
      appBar: CustomAppBar(title: title),
      body: Obx(() {
        if (controller.errorMessage.value.isNotEmpty && controller.products.isEmpty) {
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

        if (controller.isLoading.value) {
          return LoadingIndicator(message: 'loading_interested_products'.tr);
        }

        if (controller.products.isEmpty) {
          return Center(
            child: Text(
              'no_interested_products_found'.tr,
              style: TextStyle(color: Colors.grey.shade600, fontSize: 16),
            ),
          );
        }

        return RefreshIndicator(
          onRefresh: controller.fetchClientInterestedProducts,
          child: ListView.separated(
            padding: const EdgeInsets.all(16.0),
            itemCount: controller.products.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (context, index) {
              final product = controller.products[index];
              return Obx(() {
                final bool isRemoving = controller.removingProductIds.contains(product.productId);
                return _buildProductCard(
                  context,
                  product,
                  isRemoving: isRemoving,
                );
              });
            },
          ),
        );
      }),
      floatingActionButton: Obx(() {
        final int? id = controller.clientId;
        final bool hasValidClient = id != null && id > 0;
        if (!hasValidClient) {
          return const SizedBox.shrink();
        }
        final bool isBusy = controller.isLoading.value;
        return FloatingActionButton(
          heroTag: 'client_interested_products_add_fab',
          onPressed: isBusy ? null : _navigateToAddProduct,
          tooltip: 'add_interested_product'.tr,
          child: const Icon(Icons.add),
        );
      }),
    );
  }

  Future<void> _navigateToAddProduct() async {
    final int? id = controller.clientId;
    if (id == null || id <= 0) {
      Get.snackbar('Error', 'client_not_found'.tr, snackPosition: SnackPosition.BOTTOM);
      return;
    }

    final result = await Get.toNamed(
      AppRoutes.addInterestedProduct,
      arguments: {
        'clientId': id,
        'clientName': controller.clientName,
      },
    );

    if (result == true) {
      await controller.fetchClientInterestedProducts();
    }
  }

  Widget _buildProductCard(
    BuildContext context,
    ClientInterestedProduct product, {
    required bool isRemoving,
  }) {
    final theme = Theme.of(context);

    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildThumbnail(product),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    product.productName ?? 'product'.tr,
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 6,
                    children: [
                      if (product.productBrand != null)
                        _buildChip(
                          context,
                          label: '${'product_brand_label'.tr}: ${product.productBrand}',
                        ),
                      if (product.productCategory != null)
                        _buildChip(
                          context,
                          label: '${'product_category_label'.tr}: ${product.productCategory}',
                        ),
                      _buildChip(
                        context,
                        label: product.isActive ? 'active'.tr : 'inactive'.tr,
                        backgroundColor: product.isActive ? Colors.green.shade50 : Colors.red.shade50,
                        textColor: product.isActive ? Colors.green.shade700 : Colors.red.shade700,
                        borderColor: product.isActive ? Colors.green.shade200 : Colors.red.shade200,
                      ),
                    ],
                  ),
                  if (product.productDescription != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 8.0),
                      child: Text(
                        product.productDescription!,
                        style: theme.textTheme.bodySmall?.copyWith(color: Colors.grey.shade700),
                        maxLines: 3,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            Column(
              children: [
                IconButton(
                  icon: isRemoving
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.delete_outline),
                  color: Colors.red.shade400,
                  onPressed: isRemoving ? null : () => _confirmRemoval(context, product),
                  tooltip: 'delete'.tr,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildThumbnail(ClientInterestedProduct product) {
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

    final String? imageUrl = product.productImageUrl;
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

  Widget _buildChip(
    BuildContext context, {
    required String label,
    Color? textColor,
    Color? backgroundColor,
    Color? borderColor,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: backgroundColor ?? Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: borderColor ?? Colors.grey.shade300),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: textColor ?? Colors.grey.shade700,
        ),
      ),
    );
  }

  Future<void> _confirmRemoval(
    BuildContext context,
    ClientInterestedProduct product,
  ) async {
    final bool? confirmed = await Get.dialog<bool>(
      AlertDialog(
        title: Text('confirm'.tr),
        content: Text('confirm_remove_interested_product'.tr),
        actions: [
          TextButton(
            onPressed: () => Get.back(result: false),
            child: Text('cancel'.tr),
          ),
          TextButton(
            onPressed: () => Get.back(result: true),
            child: Text('delete'.tr),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      await controller.removeProduct(product);
    }
  }
}
