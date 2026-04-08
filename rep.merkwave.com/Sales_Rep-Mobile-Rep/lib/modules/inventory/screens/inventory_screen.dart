// lib/modules/inventory/screens/inventory_screen.dart
import 'package:flutter/material.dart';
import '/shared_widgets/ultra_safe_navigation.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import '/modules/inventory/controllers/inventory_controller.dart';
import '/shared_widgets/unified_card.dart';

class InventoryScreen extends GetView<InventoryController> {
  const InventoryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    const primaryColor = Color(0xFF3F51B5); // AppBar color

    return Scaffold(
      backgroundColor: primaryColor.withOpacity(0.05),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header Section with Warehouse Info
            Container(
              width: double.infinity,
              margin: const EdgeInsets.all(16),
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: primaryColor.withOpacity(0.1),
                  width: 1,
                ),
                boxShadow: [
                  BoxShadow(
                    color: primaryColor.withOpacity(0.1),
                    spreadRadius: 1,
                    blurRadius: 6,
                    offset: const Offset(0, 3),
                  ),
                ],
              ),
              child: Obx(() => Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: primaryColor,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Icon(
                              Icons.warehouse,
                              color: Colors.white,
                              size: 24,
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'my_inventory'.tr,
                                  style: TextStyle(
                                    fontSize: 20,
                                    fontWeight: FontWeight.bold,
                                    color: primaryColor,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  controller.myWarehouse.value?.warehouseName ?? 'warehouse'.tr,
                                  style: TextStyle(
                                    fontSize: 14,
                                    color: Colors.grey[600],
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              color: Colors.green.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(
                                color: Colors.green.withOpacity(0.3),
                                width: 1,
                              ),
                            ),
                            child: Text(
                              'active'.tr,
                              style: const TextStyle(
                                color: Colors.green,
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  )),
            ),

            // Overview Section
            Obx(() => _buildOverviewSection()),

            // Inventory List
            Obx(() {
              if (controller.isLoading.value) {
                return const SizedBox(
                  height: 300,
                  child: Center(child: CircularProgressIndicator()),
                );
              }

              if (controller.errorMessage.value.isNotEmpty) {
                return SizedBox(
                  height: 300,
                  child: Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.error_outline, size: 64, color: Colors.red),
                        const SizedBox(height: 16),
                        Text(
                          controller.errorMessage.value,
                          style: const TextStyle(fontSize: 16),
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
                  ),
                );
              }

              if (controller.inventoryList.isEmpty) {
                return SizedBox(
                  height: 300,
                  child: UnifiedEmptyState(
                    icon: Icons.inventory_outlined,
                    title: 'no_inventory_found'.tr,
                    subtitle: 'no_items_in_warehouse'.tr,
                  ),
                );
              }

              return _buildInventoryList();
            }),

            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _buildOverviewSection() {
    const primaryColor = Color(0xFF3F51B5); // AppBar color

    final totalItems = controller.inventoryList.length;
    final lowStockItems = controller.inventoryList.where((item) {
      final quantity = double.tryParse(item.batch.quantity) ?? 0;
      return quantity < 10; // Assuming low stock threshold is 10
    }).length;

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: primaryColor.withOpacity(0.1),
            width: 1,
          ),
          boxShadow: [
            BoxShadow(
              color: primaryColor.withOpacity(0.1),
              spreadRadius: 1,
              blurRadius: 6,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: primaryColor,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(
                      Icons.assessment,
                      color: Colors.white,
                      size: 16,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Text(
                    'inventory_overview'.tr,
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: primaryColor,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                'summary_of_stock_levels'.tr,
                style: TextStyle(
                  color: primaryColor.withOpacity(0.6),
                  fontSize: 14,
                ),
              ),
              const SizedBox(height: 16),

              // Total items
              Container(
                decoration: BoxDecoration(
                  color: primaryColor.withOpacity(0.05),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: primaryColor.withOpacity(0.1),
                    width: 1,
                  ),
                ),
                child: ListTile(
                  leading: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: primaryColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(
                      Icons.inventory_2,
                      color: primaryColor,
                      size: 20,
                    ),
                  ),
                  title: Text(
                    'total_items'.tr,
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      color: primaryColor.withOpacity(0.9),
                    ),
                  ),
                  subtitle: Text(
                    '$totalItems ${'items_in_stock'.tr}',
                    style: TextStyle(
                      color: primaryColor.withOpacity(0.6),
                    ),
                  ),
                ),
              ),

              if (lowStockItems > 0) ...[
                const SizedBox(height: 12),
                Container(
                  decoration: BoxDecoration(
                    color: Colors.orange.withOpacity(0.05),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: Colors.orange.withOpacity(0.1),
                      width: 1,
                    ),
                  ),
                  child: ListTile(
                    leading: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.orange.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Icon(
                        Icons.warning,
                        color: Colors.orange,
                        size: 20,
                      ),
                    ),
                    title: Text(
                      'low_stock_alert'.tr,
                      style: const TextStyle(
                        fontWeight: FontWeight.w600,
                        color: Colors.orange,
                      ),
                    ),
                    subtitle: Text(
                      '$lowStockItems ${'items_need_attention'.tr}',
                      style: TextStyle(
                        color: Colors.orange.withOpacity(0.7),
                      ),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildInventoryList() {
    const primaryColor = Color(0xFF3F51B5); // AppBar color

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: primaryColor.withOpacity(0.1),
            width: 1,
          ),
          boxShadow: [
            BoxShadow(
              color: primaryColor.withOpacity(0.1),
              spreadRadius: 1,
              blurRadius: 6,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: primaryColor,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(
                      Icons.inventory,
                      color: Colors.white,
                      size: 16,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Text(
                    'inventory_items'.tr,
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: primaryColor,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                'all_products_in_stock'.tr,
                style: TextStyle(
                  color: primaryColor.withOpacity(0.6),
                  fontSize: 14,
                ),
              ),
              const SizedBox(height: 16),
              ...controller.inventoryList.asMap().entries.map((entry) {
                final index = entry.key;
                final item = entry.value;
                return Column(
                  children: [
                    _buildInventoryCard(item),
                    if (index < controller.inventoryList.length - 1)
                      Divider(
                        color: primaryColor.withOpacity(0.1),
                        height: 1,
                      ),
                  ],
                );
              }).toList(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildInventoryCard(InventoryDisplayItem item) {
    const primaryColor = Color(0xFF3F51B5); // AppBar color

    final quantity = double.tryParse(item.batch.quantity) ?? 0;
    final isLowStock = quantity < 10;
    final statusColor = isLowStock ? Colors.orange : Colors.green;
    final statusIcon = isLowStock ? Icons.warning : Icons.check_circle;

    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 0, vertical: 8),
      onTap: () => _showInventoryDetails(item),
      leading: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: statusColor.withOpacity(0.1),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: statusColor.withOpacity(0.2),
            width: 1,
          ),
        ),
        child: Icon(
          statusIcon,
          color: statusColor,
          size: 20,
        ),
      ),
      title: Text(
        item.productVariant.variantName,
        style: TextStyle(
          fontWeight: FontWeight.w600,
          color: primaryColor.withOpacity(0.9),
          fontSize: 16,
        ),
      ),
      subtitle: Text(
        _buildItemSubtitle(item, quantity),
        style: TextStyle(
          color: primaryColor.withOpacity(0.6),
          fontSize: 14,
        ),
      ),
      trailing: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: statusColor.withOpacity(0.1),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: statusColor.withOpacity(0.2),
            width: 1,
          ),
        ),
        child: Text(
          '${quantity.toStringAsFixed(0)}',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            color: statusColor,
          ),
        ),
      ),
    );
  }

  String _buildItemSubtitle(InventoryDisplayItem item, double quantity) {
    final List<String> subtitleParts = [];

    if (item.productVariant.baseUnitName != null) {
      subtitleParts.add('${item.productVariant.baseUnitName}');
    }

    if (item.batch.productionDate != null) {
      final formattedDate = DateFormat('MMM dd, yyyy').format(item.batch.productionDate!);
      subtitleParts.add('📅 $formattedDate');
    }

    if (quantity < 10) {
      subtitleParts.add('⚠️ Low Stock');
    }

    return subtitleParts.join(' • ');
  }

  void _showInventoryDetails(InventoryDisplayItem item) {
    final quantity = double.tryParse(item.batch.quantity) ?? 0;
    final formattedDate = item.batch.productionDate != null ? DateFormat('yyyy-MM-dd').format(item.batch.productionDate!) : 'not_specified'.tr;

    Get.dialog(
      AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Get.theme.primaryColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(
                Icons.inventory_2_rounded,
                color: Get.theme.primaryColor,
                size: 24,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                item.productVariant.variantName,
                style: Get.textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ],
        ),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildDetailRow('product_name'.tr, item.productVariant.productsName ?? 'Unknown'),
              _buildDetailRow('variant_name'.tr, item.productVariant.variantName),
              _buildDetailRow('quantity'.tr, '${quantity.toStringAsFixed(0)}'),
              if (item.productVariant.baseUnitName != null) _buildDetailRow('unit'.tr, item.productVariant.baseUnitName!),
              _buildDetailRow('production_date'.tr, formattedDate),
              _buildDetailRow('batch_id'.tr, item.batch.inventoryId),
              if (item.batch.packagingTypeName.isNotEmpty) _buildDetailRow('packaging_type'.tr, item.batch.packagingTypeName),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => UltraSafeNavigation.back(Get.context),
            child: Text('close'.tr),
          ),
        ],
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(
              label,
              style: TextStyle(
                fontWeight: FontWeight.w600,
                color: Colors.grey.shade600,
              ),
            ),
          ),
          const SizedBox(width: 8),
          Text(
            ':',
            style: TextStyle(color: Colors.grey.shade600),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
