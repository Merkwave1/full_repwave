// lib/modules/profile/screens/profile_deliveries_screen.dart
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '/data/repositories/sales_delivery_repository.dart';
import '/data/datasources/sales_delivery_remote_datasource.dart';
import '/services/api_service.dart';
import '/modules/deliveries/controllers/pending_deliveries_controller.dart';
import '/modules/deliveries/screens/pending_deliveries_screen.dart' show FulfillDeliveryScreen; // Reuse fulfill screen
import '/shared_widgets/custom_app_bar.dart';

class ProfileDeliveriesScreen extends StatefulWidget {
  const ProfileDeliveriesScreen({super.key});
  @override
  State<ProfileDeliveriesScreen> createState() => _ProfileDeliveriesScreenState();
}

class _ProfileDeliveriesScreenState extends State<ProfileDeliveriesScreen> {
  late final SalesDeliveryRepository repo;
  late final PendingDeliveriesController pendingController;
  final RxBool showOnlyIncomplete = true.obs;
  final RxBool isRefreshing = false.obs;

  @override
  void initState() {
    super.initState();
    if (!Get.isRegistered<SalesDeliveryRepository>()) {
      final api = Get.find<ApiService>();
      Get.put(SalesDeliveryRepository(remote: SalesDeliveryRemoteDataSource(apiService: api)));
    }
    repo = Get.find<SalesDeliveryRepository>();
    pendingController = Get.put(PendingDeliveriesController(repository: repo), tag: 'profileDeliveries');
    pendingController.loadPending();
  }

  Future<void> _refresh() async {
    isRefreshing.value = true;
    await pendingController.loadPending();
    isRefreshing.value = false;
  }

  @override
  void dispose() {
    if (Get.isRegistered<PendingDeliveriesController>(tag: 'profileDeliveries')) {
      Get.delete<PendingDeliveriesController>(tag: 'profileDeliveries');
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: CustomAppBar(
        title: 'pending_deliveries_list'.tr,
        actions: [
          Obx(() => Container(
                margin: const EdgeInsets.only(right: 8),
                child: IconButton(
                  tooltip: showOnlyIncomplete.value ? 'show_all'.tr : 'show_incomplete'.tr,
                  icon: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(
                      showOnlyIncomplete.value ? Icons.filter_alt : Icons.filter_alt_off,
                      color: Colors.white,
                      size: 20,
                    ),
                  ),
                  onPressed: () => showOnlyIncomplete.value = !showOnlyIncomplete.value,
                ),
              )),
        ],
      ),
      body: Column(
        children: [
          // Header stats section
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Get.theme.primaryColor,
                  Get.theme.primaryColor.withOpacity(0.8),
                ],
              ),
            ),
            child: Obx(() {
              final totalOrders = pendingController.pendingOrders.length;
              return Row(
                children: [
                  Expanded(
                    child: _buildStatCard(
                      icon: Icons.assignment,
                      title: 'total_orders'.tr,
                      value: totalOrders.toString(),
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: _buildStatCard(
                      icon: Icons.pending_actions,
                      title: 'pending_deliveries'.tr,
                      value: totalOrders.toString(),
                      color: Colors.white,
                    ),
                  ),
                ],
              );
            }),
          ),

          // Filter section
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.grey.shade50,
              border: Border(
                bottom: BorderSide(
                  color: Colors.grey.shade200,
                  width: 1,
                ),
              ),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.tune,
                  color: Get.theme.primaryColor,
                  size: 20,
                ),
                const SizedBox(width: 8),
                Text(
                  'filter_options'.tr,
                  style: Get.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: Get.theme.primaryColor,
                  ),
                ),
                const Spacer(),
                Obx(() => Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: showOnlyIncomplete.value ? Get.theme.primaryColor.withOpacity(0.1) : Colors.grey.shade200,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: showOnlyIncomplete.value ? Get.theme.primaryColor : Colors.grey.shade400,
                          width: 1,
                        ),
                      ),
                      child: Text(
                        showOnlyIncomplete.value ? 'incomplete_only'.tr : 'show_all'.tr,
                        style: Get.textTheme.bodySmall?.copyWith(
                          color: showOnlyIncomplete.value ? Get.theme.primaryColor : Colors.grey.shade600,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    )),
              ],
            ),
          ),

          // Orders list
          Expanded(
            child: Obx(() {
              if (pendingController.isLoading.value && pendingController.pendingOrders.isEmpty) {
                return Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      CircularProgressIndicator(
                        valueColor: AlwaysStoppedAnimation<Color>(Get.theme.primaryColor),
                        strokeWidth: 3,
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'loading_deliveries'.tr,
                        style: Get.textTheme.bodyLarge?.copyWith(
                          color: Colors.grey.shade600,
                        ),
                      ),
                    ],
                  ),
                );
              }

              final orders = showOnlyIncomplete.value ? pendingController.pendingOrders : pendingController.pendingOrders; // (Could include completed later)

              if (orders.isEmpty) {
                return RefreshIndicator(
                  onRefresh: _refresh,
                  child: ListView(
                    children: [
                      Container(
                        height: 300,
                        padding: const EdgeInsets.all(40),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Container(
                              padding: const EdgeInsets.all(24),
                              decoration: BoxDecoration(
                                color: Colors.grey.shade100,
                                shape: BoxShape.circle,
                              ),
                              child: Icon(
                                Icons.local_shipping_outlined,
                                size: 48,
                                color: Colors.grey.shade400,
                              ),
                            ),
                            const SizedBox(height: 24),
                            Text(
                              'no_pending_deliveries'.tr,
                              style: Get.textTheme.titleLarge?.copyWith(
                                fontWeight: FontWeight.bold,
                                color: Colors.grey.shade600,
                              ),
                              textAlign: TextAlign.center,
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'all_deliveries_completed'.tr,
                              style: Get.textTheme.bodyMedium?.copyWith(
                                color: Colors.grey.shade500,
                              ),
                              textAlign: TextAlign.center,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                );
              }

              return RefreshIndicator(
                onRefresh: _refresh,
                child: ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: orders.length,
                  itemBuilder: (ctx, i) {
                    final order = orders[i];
                    return _buildOrderCard(order, i);
                  },
                ),
              );
            }),
          ),
        ],
      ),
      floatingActionButton: Obx(() => isRefreshing.value
          ? FloatingActionButton(
              heroTag: 'profile_deliveries_refresh_busy_fab',
              onPressed: null,
              backgroundColor: Get.theme.primaryColor.withOpacity(0.6),
              child: const CircularProgressIndicator(
                color: Colors.white,
                strokeWidth: 3,
              ),
            )
          : FloatingActionButton(
              heroTag: 'profile_deliveries_refresh_fab',
              onPressed: _refresh,
              backgroundColor: Get.theme.primaryColor,
              child: const Icon(Icons.refresh, color: Colors.white),
            )),
    );
  }

  Widget _buildStatCard({
    required IconData icon,
    required String title,
    required String value,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: color.withOpacity(0.3),
          width: 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: color, size: 20),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  title,
                  style: Get.textTheme.bodySmall?.copyWith(
                    color: color,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: Get.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOrderCard(Map<String, dynamic> order, int index) {
    final client = order['clients_company_name'] ?? 'client'.tr;
    final orderId = order['sales_orders_id']?.toString() ?? '';
    final pendingQty = order['total_pending_quantity']?.toString() ?? '0';
    final deliveryStatus = order['sales_orders_delivery_status'] ?? 'pending'.tr;
    final warehouseName = order['warehouse_name'] ?? '';
    final canDeliverAll = order['can_deliver_all'] == true;
    final items = order['items'] as List<dynamic>? ?? [];

    // Calculate availability status based on total quantities
    String availabilityText;
    Color availabilityColor;
    if (items.isEmpty) {
      availabilityText = 'غير متاح';
      availabilityColor = Colors.red;
    } else {
      // Calculate total pending and total available
      double totalPendingQty = 0;
      double totalAvailableQty = 0;

      for (var item in items) {
        final pendingQty = (item['quantity_pending'] ?? 0.0) as num;
        final availableQty = (item['available_quantity'] ?? 0.0) as num;
        totalPendingQty += pendingQty.toDouble();
        totalAvailableQty += availableQty.toDouble();
      }

      if (totalAvailableQty >= totalPendingQty && totalPendingQty > 0) {
        // Can deliver everything
        availabilityText = 'متاح';
        availabilityColor = Colors.green;
      } else if (totalAvailableQty > 0 && totalAvailableQty < totalPendingQty) {
        // Can deliver partial
        availabilityText = 'متاح تسليم جزئى';
        availabilityColor = Colors.orange;
      } else {
        // Nothing available
        availabilityText = 'غير متاح';
        availabilityColor = Colors.red;
      }
    }

    // Determine status color
    Color statusColor;
    IconData statusIcon;
    switch (deliveryStatus.toLowerCase()) {
      case 'completed':
      case 'delivered':
        statusColor = Colors.green;
        statusIcon = Icons.check_circle;
        break;
      case 'partially_delivered':
        statusColor = Colors.orange;
        statusIcon = Icons.hourglass_bottom;
        break;
      case 'pending':
      default:
        statusColor = Colors.blue;
        statusIcon = Icons.pending;
        break;
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withOpacity(0.1),
            spreadRadius: 1,
            blurRadius: 8,
            offset: const Offset(0, 4),
          ),
        ],
        border: Border.all(
          color: Get.theme.primaryColor.withOpacity(0.1),
          width: 1,
        ),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: () async {
            final result = await Get.to(() => const FulfillDeliveryScreen(), arguments: order);
            // Refresh the deliveries list after delivery is completed
            if (result != null) {
              _refresh();
            }
          },
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header row
                Row(
                  children: [
                    // Warehouse name circle
                    Container(
                      width: 56,
                      height: 56,
                      decoration: BoxDecoration(
                        color: Get.theme.primaryColor.withOpacity(0.1),
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: Get.theme.primaryColor.withOpacity(0.3),
                          width: 2,
                        ),
                      ),
                      child: Center(
                        child: Padding(
                          padding: const EdgeInsets.all(4),
                          child: Text(
                            warehouseName.isNotEmpty ? warehouseName : 'مخزن',
                            textAlign: TextAlign.center,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: Get.textTheme.bodySmall?.copyWith(
                              fontWeight: FontWeight.bold,
                              color: Get.theme.primaryColor,
                              fontSize: 10,
                              height: 1.1,
                            ),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '${'order'.tr} #$orderId',
                            style: Get.textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.bold,
                              color: Get.theme.primaryColor,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            client,
                            style: Get.textTheme.bodyMedium?.copyWith(
                              color: Colors.grey.shade600,
                            ),
                          ),
                          if (warehouseName.isNotEmpty) ...[
                            const SizedBox(height: 2),
                            Text(
                              warehouseName,
                              style: Get.textTheme.bodySmall?.copyWith(
                                color: Colors.grey.shade500,
                                fontSize: 11,
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                    Icon(
                      Icons.chevron_right,
                      color: Colors.grey.shade400,
                      size: 24,
                    ),
                  ],
                ),

                const SizedBox(height: 16),

                // Info row with 3 items
                Row(
                  children: [
                    Expanded(
                      child: _buildInfoItem(
                        icon: Icons.inventory,
                        label: 'pending_qty'.tr,
                        value: pendingQty,
                        color: Colors.orange,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _buildInfoItem(
                        icon: Icons.check_circle_outline,
                        label: 'availability'.tr,
                        value: availabilityText,
                        color: availabilityColor,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _buildInfoItem(
                        icon: statusIcon,
                        label: 'status'.tr,
                        value: deliveryStatus,
                        color: statusColor,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildInfoItem({
    required IconData icon,
    required String label,
    required String value,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withOpacity(0.05),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: color.withOpacity(0.2),
          width: 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 16, color: color),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  label,
                  style: Get.textTheme.bodySmall?.copyWith(
                    color: color,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: Get.textTheme.bodyMedium?.copyWith(
              fontWeight: FontWeight.bold,
              color: Colors.grey.shade800,
            ),
          ),
        ],
      ),
    );
  }
}
