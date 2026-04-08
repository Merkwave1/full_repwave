// lib/modules/sales_orders/screens/sales_orders_screen.dart
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '/core/utils/formatting.dart';
import '/shared_widgets/ultra_safe_navigation.dart';
import '/core/routes/app_routes.dart'; // For navigation routes
import '/data/models/sales_order.dart'; // Import the SalesOrder model
import '/modules/sales_orders/controllers/sales_orders_controller.dart'; // Import the SalesOrdersController
import '/shared_widgets/custom_app_bar.dart'; // Reusable AppBar
import '/shared_widgets/loading_indicator.dart'; // Reusable LoadingIndicator

class SalesOrdersScreen extends GetView<SalesOrdersController> {
  const SalesOrdersScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: CustomAppBar(
        title: 'sales_orders'.tr, // Localized title for Sales Orders
        actions: [
          // Refresh Icon
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => controller.refreshIfNeeded(force: true),
          ),
          // Search Icon
          IconButton(
            icon: const Icon(Icons.search),
            onPressed: () {
              // Show search bar or navigate to search screen
              _showSearchBar(context);
            },
          ),
          // Filter Icon
          IconButton(
            icon: const Icon(Icons.filter_list),
            onPressed: () {
              _showSalesOrderFilterBottomSheet(context);
            },
          ),
        ],
      ),
      body: Obx(
        () {
          // Show loading indicator for initial fetch
          if (controller.isLoading.value && controller.salesOrders.isEmpty) {
            return LoadingIndicator(message: 'loading_sales_orders'.tr);
          }

          final visible = controller.visibleOrders;

          // Show a message if no sales orders are found after loading
          if (visible.isEmpty && !controller.isLoading.value) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.receipt_long, size: 64, color: Colors.grey),
                  const SizedBox(height: 16),
                  Text(
                    'no_sales_orders_found'.tr, // Localized message
                    style: Get.textTheme.titleMedium,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'tap_add_button_to_create_order'.tr, // Add this to your translations
                    style: Get.textTheme.bodyMedium?.copyWith(color: Colors.grey),
                    textAlign: TextAlign.center,
                  ),
                  if (controller.errorMessage.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.all(12),
                      margin: const EdgeInsets.symmetric(horizontal: 20),
                      decoration: BoxDecoration(
                        color: Colors.red.shade50,
                        border: Border.all(color: Colors.red.shade200),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Column(
                        children: [
                          Text(
                            '${'error_details'.tr}:',
                            style: Get.textTheme.titleSmall?.copyWith(color: Colors.red.shade700),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            controller.errorMessage.value,
                            style: Get.textTheme.bodySmall?.copyWith(color: Colors.red.shade600),
                            textAlign: TextAlign.center,
                          ),
                        ],
                      ),
                    ),
                  ],
                  const SizedBox(height: 16),
                  ElevatedButton.icon(
                    onPressed: () => controller.refreshIfNeeded(force: true),
                    icon: const Icon(Icons.refresh),
                    label: Text('refresh'.tr),
                  ),
                ],
              ),
            );
          }

          // Display the list of sales orders
          final List<SalesOrder> dataSource = controller.isSearching ? visible : controller.salesOrders;
          final bool showSearchBanner = controller.isSearching;
          final bool showLoadMoreIndicator = !controller.isSearching && controller.isLoadMoreLoading.value;
          final int totalItems = dataSource.length + (showSearchBanner ? 1 : 0) + (showLoadMoreIndicator ? 1 : 0);

          return RefreshIndicator(
            onRefresh: () => controller.refreshIfNeeded(force: true),
            displacement: 60,
            color: Get.theme.colorScheme.primary,
            child: ListView.builder(
              controller: controller.scrollController, // Attach scroll controller
              physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
              padding: const EdgeInsets.fromLTRB(12, 12, 12, 96),
              itemCount: totalItems,
              itemBuilder: (context, index) {
                if (showSearchBanner && index == 0) {
                  return _buildSearchBanner(context);
                }

                final int bannerOffset = showSearchBanner ? 1 : 0;
                final int dataIndex = index - bannerOffset;

                if (dataIndex >= 0 && dataIndex < dataSource.length) {
                  final SalesOrder order = dataSource[dataIndex];
                  return _buildOrderCard(context, order);
                }

                if (showLoadMoreIndicator) {
                  return const Padding(
                    padding: EdgeInsets.symmetric(vertical: 20.0),
                    child: Center(child: CircularProgressIndicator.adaptive()),
                  );
                }

                return const SizedBox.shrink();
              },
            ),
          );
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        heroTag: 'sales_orders_fab',
        onPressed: () async {
          // Changed to async
          // Navigate to Add New Sales Order Screen and wait for result
          final result = await Get.toNamed(AppRoutes.addEditSalesOrder);
          await controller.refreshIfNeeded(force: result == true);
        },
        icon: const Icon(Icons.add),
        label: Text('add_new_order'.tr), // Localized label
      ),
    );
  }

  Widget _buildSearchBanner(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: theme.colorScheme.primary.withOpacity(0.08),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: theme.colorScheme.primary.withOpacity(0.2)),
      ),
      child: Row(
        children: [
          Icon(Icons.search, color: theme.colorScheme.primary),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              'search_active'.tr,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.primary,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          TextButton.icon(
            onPressed: () => controller.onSearchChanged(''),
            icon: const Icon(Icons.clear),
            label: Text('clear'.tr),
          ),
        ],
      ),
    );
  }

  Widget _buildOrderCard(BuildContext context, SalesOrder order) {
    final theme = Theme.of(context);
    final Color statusColor = _getStatusColor(order.status);
    final bool isNeutralStatus = statusColor == Colors.grey;
    final Color headerTextColor = isNeutralStatus ? theme.colorScheme.onSurface : (statusColor.computeLuminance() < 0.45 ? Colors.white : theme.colorScheme.onPrimary);
    final String localizedStatus = _localizedStatus(order.status);
    final bool hasDeliveryStatus = order.deliveryStatus != null && order.deliveryStatus!.isNotEmpty;

    final Color gradientStart = isNeutralStatus ? theme.colorScheme.primary.withOpacity(0.22) : statusColor.withOpacity(0.92);
    final Color gradientEnd = isNeutralStatus ? theme.colorScheme.primary.withOpacity(0.16) : statusColor.withOpacity(0.7);
    final Color chipColor = isNeutralStatus ? theme.colorScheme.primary : statusColor;

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
      decoration: BoxDecoration(
        color: theme.cardColor,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: theme.dividerColor.withOpacity(0.15)),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 12, offset: const Offset(0, 6)),
        ],
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: () async {
          final result = await Get.toNamed(
            AppRoutes.salesOrderDetail,
            arguments: {
              'salesOrderId': order.salesOrderId,
              'forceSalesOrderView': true,
            },
          );
          await controller.refreshIfNeeded(force: result == true);
        },
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [gradientStart, gradientEnd],
                  begin: Alignment.topRight,
                  end: Alignment.bottomLeft,
                ),
                borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
              ),
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${'order_id'.tr}: ${order.salesOrderId}',
                          style: theme.textTheme.titleMedium?.copyWith(
                            color: headerTextColor,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _formatDate(order.orderDate),
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: headerTextColor.withOpacity(0.9),
                          ),
                        ),
                      ],
                    ),
                  ),
                  _buildStatusChip(localizedStatus, chipColor),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(18, 16, 18, 18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(Icons.storefront_outlined, color: theme.colorScheme.primary, size: 20),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          order.clientCompanyName ?? 'not_available'.tr,
                          style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      Expanded(
                        child: _buildInfoTile(
                          context,
                          icon: Icons.account_balance_wallet_outlined,
                          label: 'total_amount'.tr,
                          value: Formatting.amount(order.totalAmount),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _buildInfoTile(
                          context,
                          icon: Icons.receipt_long_outlined,
                          label: 'status'.tr,
                          value: localizedStatus,
                          valueColor: chipColor,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: _buildInfoTile(
                          context,
                          icon: Icons.calendar_today_outlined,
                          label: 'order_date'.tr,
                          value: _formatDate(order.orderDate),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _buildInfoTile(
                          context,
                          icon: Icons.local_shipping_outlined,
                          label: 'delivery_status'.tr,
                          value: hasDeliveryStatus ? _localizedDeliveryStatus(order.deliveryStatus) : 'not_available'.tr,
                          valueColor: hasDeliveryStatus ? _getDeliveryStatusColor(order.deliveryStatus) : null,
                        ),
                      ),
                    ],
                  ),
                  if (order.notes != null && order.notes!.trim().isNotEmpty) ...[
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: theme.colorScheme.primaryContainer.withOpacity(0.25),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(Icons.notes, size: 18, color: theme.colorScheme.primary),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              order.notes!,
                              style: theme.textTheme.bodySmall,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusChip(String statusText, Color statusColor) {
    final bool darkBackground = statusColor.computeLuminance() < 0.5;
    final Color background = darkBackground ? Colors.white.withOpacity(0.18) : statusColor.withOpacity(0.18);
    final Color textColor = darkBackground ? Colors.white : statusColor.withOpacity(0.8);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(30),
        border: Border.all(color: Colors.white.withOpacity(0.2)),
      ),
      child: Text(
        statusText,
        style: TextStyle(color: textColor, fontWeight: FontWeight.w600, fontSize: 12),
      ),
    );
  }

  Widget _buildInfoTile(BuildContext context, {required IconData icon, required String label, required String value, Color? valueColor}) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest.withOpacity(0.25),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 18, color: theme.colorScheme.primary),
              const SizedBox(width: 6),
              Text(
                label,
                style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w600,
              color: valueColor ?? theme.colorScheme.onSurface,
            ),
          ),
        ],
      ),
    );
  }

  Color _getDeliveryStatusColor(String? status) {
    if (status == null) return Colors.blueGrey;
    final normalized = status.toLowerCase();
    if (normalized.contains('not')) {
      return Colors.deepOrange;
    }
    if (normalized.contains('partial')) {
      return Colors.amber.shade700;
    }
    if (normalized.contains('deliver')) {
      return Colors.green;
    }
    return Colors.blueGrey;
  }

  String _localizedDeliveryStatus(String? status) {
    if (status == null || status.isEmpty) return 'not_available'.tr;
    switch (status) {
      case 'Delivered':
        return 'delivery_status_delivered'.tr;
      case 'Not_Delivered':
        return 'delivery_status_not_delivered'.tr;
      case 'Partial':
      case 'Partially_Delivered':
        return 'delivery_status_partial'.tr;
      default:
        final key = status.toLowerCase();
        final translated = key.tr;
        return translated == key ? status : translated;
    }
  }

  // Helper function to determine status color
  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'approved':
        return Colors.blue;
      case 'delivered':
      case 'invoiced':
        return Colors.green;
      case 'pending':
      case 'shipped':
      case 'in transit':
        return Colors.orange;
      case 'cancelled':
        return Colors.red;
      case 'draft':
      default:
        return Colors.grey;
    }
  }

  String _localizedStatus(String status) {
    final key = status.toLowerCase();
    final translated = key.tr;
    return translated == key ? status : translated;
  }

  String _formatDate(DateTime? date) {
    if (date == null) return 'not_available'.tr;
    return date.toLocal().toString().split(' ').first;
  }

  // Method to show search bar as a dialog or another overlay
  void _showSearchBar(BuildContext context) {
    final textController = TextEditingController(text: controller.searchQuery.value);
    Get.dialog(
      AlertDialog(
        title: Text('search_sales_orders'.tr),
        content: TextField(
          controller: textController,
          decoration: InputDecoration(
            hintText: '${'search_by_client_name'.tr} / #123',
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            suffixIcon: IconButton(
              icon: const Icon(Icons.clear),
              onPressed: () {
                controller.onSearchChanged(''); // Clear search
                UltraSafeNavigation.back(context); // Close dialog
              },
            ),
          ),
          onSubmitted: (value) {
            controller.onSearchChanged(value);
            UltraSafeNavigation.back(context); // Close dialog after search
          },
          onChanged: (value) {
            // Optional: Live search as user types (consider debouncing in controller)
            // controller.onSearchChanged(value);
          },
        ),
        actions: [
          TextButton(
            onPressed: () => UltraSafeNavigation.back(context),
            child: Text('cancel'.tr),
          ),
          ElevatedButton(
            onPressed: () {
              // Search is handled by onSubmitted, but if user just types and clicks "Search"
              controller.onSearchChanged(textController.text);
              UltraSafeNavigation.back(context);
            },
            child: Text('search'.tr),
          ),
        ],
      ),
    );
  }

  // Custom filter bottom sheet styled similar to client filters
  void _showSalesOrderFilterBottomSheet(BuildContext context) {
    Get.bottomSheet(
      SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'active_filters'.tr,
              style: Get.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            Obx(() {
              final chips = <Widget>[];
              final clientId = controller.selectedClientFilter.value;
              final status = controller.currentStatusFilter.value;
              final deliveryStatus = controller.deliveryStatusFilter.value;
              final dateFrom = controller.dateFromFilter.value;
              final dateTo = controller.dateToFilter.value;

              if (clientId != null) {
                chips.add(_buildActiveFilterChip(
                  '${'client'.tr}: ${_getClientLabel(clientId)}',
                  () => controller.submitFilters(
                    status: status,
                    clientId: null,
                    deliveryStatus: deliveryStatus,
                    dateFrom: dateFrom,
                    dateTo: dateTo,
                  ),
                ));
              }
              if (status.isNotEmpty) {
                chips.add(_buildActiveFilterChip(
                  '${'status'.tr}: ${_localizedStatus(status)}',
                  () => controller.submitFilters(
                    status: '',
                    clientId: clientId,
                    deliveryStatus: deliveryStatus,
                    dateFrom: dateFrom,
                    dateTo: dateTo,
                  ),
                ));
              }
              if (deliveryStatus.isNotEmpty) {
                chips.add(_buildActiveFilterChip(
                  '${'delivery_status'.tr}: ${_localizedDeliveryStatus(deliveryStatus)}',
                  () => controller.submitFilters(
                    status: status,
                    clientId: clientId,
                    deliveryStatus: '',
                    dateFrom: dateFrom,
                    dateTo: dateTo,
                  ),
                ));
              }
              if (dateFrom != null || dateTo != null) {
                chips.add(_buildActiveFilterChip(
                  '${'date_range'.tr}: ${_formatFilterDateRange(dateFrom, dateTo)}',
                  () => controller.submitFilters(
                    status: status,
                    clientId: clientId,
                    deliveryStatus: deliveryStatus,
                    dateFrom: null,
                    dateTo: null,
                  ),
                ));
              }

              if (chips.isEmpty) {
                return Text('no_filters_applied'.tr);
              }
              return Wrap(
                spacing: 8,
                runSpacing: 8,
                children: chips,
              );
            }),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () {
                  Get.bottomSheet(
                    _buildFilterCategorySelectionSheet(context),
                    backgroundColor: Get.theme.canvasColor,
                    shape: const RoundedRectangleBorder(
                      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
                    ),
                    isScrollControlled: true,
                  );
                },
                icon: const Icon(Icons.add),
                label: Text('add_filter'.tr),
              ),
            ),
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: () {
                  controller.resetFilters();
                  UltraSafeNavigation.back(context);
                },
                child: Text('clear_all_filters'.tr),
              ),
            ),
            const SizedBox(height: 10),
            Center(
              child: ElevatedButton(
                onPressed: () => UltraSafeNavigation.back(context),
                child: Text('close'.tr),
              ),
            ),
          ],
        ),
      ),
      backgroundColor: Get.theme.canvasColor,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      isScrollControlled: true,
    );
  }

  Widget _buildActiveFilterChip(String label, VoidCallback onRemove) {
    final theme = Get.theme;
    return Chip(
      label: Text(
        label,
        style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.primary),
      ),
      deleteIcon: Icon(Icons.cancel, size: 18, color: theme.colorScheme.primary),
      onDeleted: onRemove,
      backgroundColor: theme.colorScheme.primary.withOpacity(0.12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
    );
  }

  Widget _buildFilterCategorySelectionSheet(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'select_filter_category'.tr,
            style: Get.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),
          ListTile(
            leading: const Icon(Icons.check_circle_outline),
            title: Text('status'.tr),
            onTap: () {
              UltraSafeNavigation.back(context);
              _showStatusFilterSheet(context);
            },
          ),
          ListTile(
            leading: const Icon(Icons.storefront_outlined),
            title: Text('client'.tr),
            onTap: () {
              UltraSafeNavigation.back(context);
              _showClientFilterSheet(context);
            },
          ),
          ListTile(
            leading: const Icon(Icons.local_shipping_outlined),
            title: Text('delivery_status'.tr),
            onTap: () {
              UltraSafeNavigation.back(context);
              _showDeliveryStatusFilterSheet(context);
            },
          ),
          ListTile(
            leading: const Icon(Icons.calendar_month_outlined),
            title: Text('date_range'.tr),
            onTap: () {
              UltraSafeNavigation.back(context);
              _showDateRangeFilterSheet(context);
            },
          ),
        ],
      ),
    );
  }

  void _showStatusFilterSheet(BuildContext context) {
    const statusValues = [
      '',
      'Draft',
      'Pending',
      'Approved',
      'Invoiced',
      'Cancelled',
    ];

    Get.bottomSheet(
      Container(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'filter_by_status'.tr,
              style: Get.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            Obx(() => Wrap(
                  spacing: 10,
                  runSpacing: 10,
                  children: statusValues.map((value) {
                    final isSelected = controller.currentStatusFilter.value == value;
                    final label = value.isEmpty ? 'all'.tr : _localizedStatus(value);
                    return _buildChoiceChip(
                      label: label,
                      isSelected: isSelected,
                      onSelected: () {
                        controller.submitFilters(
                          status: value,
                          clientId: controller.selectedClientFilter.value,
                          deliveryStatus: controller.deliveryStatusFilter.value,
                          dateFrom: controller.dateFromFilter.value,
                          dateTo: controller.dateToFilter.value,
                        );
                        UltraSafeNavigation.back(context);
                      },
                    );
                  }).toList(),
                )),
            const SizedBox(height: 20),
            Center(
              child: ElevatedButton(
                onPressed: () => UltraSafeNavigation.back(context),
                child: Text('done'.tr),
              ),
            ),
          ],
        ),
      ),
      backgroundColor: Get.theme.canvasColor,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      isScrollControlled: true,
    );
  }

  void _showDeliveryStatusFilterSheet(BuildContext context) {
    const deliveryStatusValues = [
      '',
      'Delivered',
      'Not_Delivered',
      'Partially_Delivered',
    ];

    Get.bottomSheet(
      Container(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'delivery_status'.tr,
              style: Get.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            Obx(() => Wrap(
                  spacing: 10,
                  runSpacing: 10,
                  children: deliveryStatusValues.map((value) {
                    final isSelected = controller.deliveryStatusFilter.value == value;
                    final label = value.isEmpty ? 'all'.tr : _localizedDeliveryStatus(value);
                    return _buildChoiceChip(
                      label: label,
                      isSelected: isSelected,
                      onSelected: () {
                        controller.submitFilters(
                          status: controller.currentStatusFilter.value,
                          clientId: controller.selectedClientFilter.value,
                          deliveryStatus: value,
                          dateFrom: controller.dateFromFilter.value,
                          dateTo: controller.dateToFilter.value,
                        );
                        UltraSafeNavigation.back(context);
                      },
                    );
                  }).toList(),
                )),
            const SizedBox(height: 20),
            Center(
              child: ElevatedButton(
                onPressed: () => UltraSafeNavigation.back(context),
                child: Text('done'.tr),
              ),
            ),
          ],
        ),
      ),
      backgroundColor: Get.theme.canvasColor,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      isScrollControlled: true,
    );
  }

  void _showClientFilterSheet(BuildContext context) {
    final clients = controller.clients;
    final textController = TextEditingController();

    Get.bottomSheet(
      StatefulBuilder(
        builder: (context, setState) {
          final query = textController.text.toLowerCase();
          final filteredClients = query.isEmpty ? clients : clients.where((client) => client.companyName.toLowerCase().contains(query)).toList();

          return SafeArea(
            child: AnimatedPadding(
              padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
              duration: const Duration(milliseconds: 200),
              curve: Curves.easeOut,
              child: Container(
                padding: const EdgeInsets.all(20),
                constraints: BoxConstraints(maxHeight: Get.height * 0.75),
                child: Column(
                  mainAxisSize: MainAxisSize.max,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'client'.tr,
                      style: Get.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: textController,
                      decoration: InputDecoration(
                        prefixIcon: const Icon(Icons.search),
                        hintText: 'search_by_client_name'.tr,
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      onChanged: (_) => setState(() {}),
                    ),
                    const SizedBox(height: 16),
                    Expanded(
                      child: Scrollbar(
                        child: ListView.separated(
                          shrinkWrap: true,
                          physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
                          itemCount: filteredClients.length + 1,
                          separatorBuilder: (_, __) => const Divider(height: 1),
                          itemBuilder: (context, index) {
                            if (index == 0) {
                              final isSelected = controller.selectedClientFilter.value == null;
                              return ListTile(
                                leading: const Icon(Icons.clear),
                                title: Text('all'.tr),
                                trailing: isSelected ? const Icon(Icons.check) : null,
                                onTap: () {
                                  controller.submitFilters(
                                    status: controller.currentStatusFilter.value,
                                    clientId: null,
                                    deliveryStatus: controller.deliveryStatusFilter.value,
                                    dateFrom: controller.dateFromFilter.value,
                                    dateTo: controller.dateToFilter.value,
                                  );
                                  UltraSafeNavigation.back(context);
                                },
                              );
                            }

                            final client = filteredClients[index - 1];
                            final isSelected = controller.selectedClientFilter.value == client.id;
                            return ListTile(
                              leading: const Icon(Icons.storefront_outlined),
                              title: Text(client.companyName),
                              trailing: isSelected ? const Icon(Icons.check) : null,
                              onTap: () {
                                controller.submitFilters(
                                  status: controller.currentStatusFilter.value,
                                  clientId: client.id,
                                  deliveryStatus: controller.deliveryStatusFilter.value,
                                  dateFrom: controller.dateFromFilter.value,
                                  dateTo: controller.dateToFilter.value,
                                );
                                UltraSafeNavigation.back(context);
                              },
                            );
                          },
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
      backgroundColor: Get.theme.canvasColor,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      isScrollControlled: true,
    );
  }

  void _showDateRangeFilterSheet(BuildContext context) {
    DateTime? tempFrom = controller.dateFromFilter.value;
    DateTime? tempTo = controller.dateToFilter.value;

    Get.bottomSheet(
      StatefulBuilder(
        builder: (context, setState) {
          Future<void> pickDate({required bool isFrom}) async {
            final initialDate = isFrom ? (tempFrom ?? DateTime.now()) : (tempTo ?? DateTime.now());
            final picked = await showDatePicker(
              context: context,
              initialDate: initialDate,
              firstDate: DateTime(2000),
              lastDate: DateTime(2100),
            );
            if (picked != null) {
              setState(() {
                final normalized = DateTime(picked.year, picked.month, picked.day);
                if (isFrom) {
                  tempFrom = normalized;
                } else {
                  tempTo = normalized;
                }
              });
            }
          }

          return Container(
            padding: const EdgeInsets.all(20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'date_range'.tr,
                  style: Get.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: _buildDatePickerField(
                        label: 'date_from'.tr,
                        value: tempFrom,
                        onTap: () => pickDate(isFrom: true),
                        onClear: tempFrom != null
                            ? () => setState(() {
                                  tempFrom = null;
                                })
                            : null,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _buildDatePickerField(
                        label: 'date_to'.tr,
                        value: tempTo,
                        onTap: () => pickDate(isFrom: false),
                        onClear: tempTo != null
                            ? () => setState(() {
                                  tempTo = null;
                                })
                            : null,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () {
                          setState(() {
                            tempFrom = null;
                            tempTo = null;
                          });
                          controller.submitFilters(
                            status: controller.currentStatusFilter.value,
                            clientId: controller.selectedClientFilter.value,
                            deliveryStatus: controller.deliveryStatusFilter.value,
                            dateFrom: null,
                            dateTo: null,
                          );
                          UltraSafeNavigation.back(context);
                        },
                        child: Text('clear'.tr),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: () {
                          DateTime? from = tempFrom;
                          DateTime? to = tempTo;
                          if (from != null && to != null && from.isAfter(to)) {
                            final swap = from;
                            from = to;
                            to = swap;
                          }
                          controller.submitFilters(
                            status: controller.currentStatusFilter.value,
                            clientId: controller.selectedClientFilter.value,
                            deliveryStatus: controller.deliveryStatusFilter.value,
                            dateFrom: from,
                            dateTo: to,
                          );
                          UltraSafeNavigation.back(context);
                        },
                        child: Text('apply'.tr),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          );
        },
      ),
      backgroundColor: Get.theme.canvasColor,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      isScrollControlled: true,
    );
  }

  Widget _buildChoiceChip({required String label, required bool isSelected, required VoidCallback onSelected}) {
    final theme = Get.theme;
    return ChoiceChip(
      label: Text(label),
      selected: isSelected,
      onSelected: (_) => onSelected(),
      labelStyle: theme.textTheme.bodyMedium?.copyWith(
        color: isSelected ? theme.colorScheme.primary : theme.colorScheme.onSurface,
        fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
      ),
      selectedColor: theme.colorScheme.primary.withOpacity(0.16),
      backgroundColor: theme.colorScheme.surfaceContainerHighest.withOpacity(0.2),
      shape: StadiumBorder(
        side: BorderSide(
          color: isSelected ? theme.colorScheme.primary : theme.dividerColor.withOpacity(0.4),
        ),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
    );
  }

  Widget _buildDatePickerField({
    required String label,
    required DateTime? value,
    required VoidCallback onTap,
    VoidCallback? onClear,
  }) {
    final theme = Get.theme;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: InputDecorator(
        decoration: InputDecoration(
          labelText: label,
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
          suffixIcon: value != null
              ? IconButton(
                  icon: const Icon(Icons.clear),
                  onPressed: () {
                    onClear?.call();
                  },
                )
              : const Icon(Icons.calendar_today_outlined),
        ),
        child: Text(
          value != null ? _formatSimpleDate(value) : 'select_date'.tr,
          style: theme.textTheme.bodyMedium,
        ),
      ),
    );
  }

  String _formatFilterDateRange(DateTime? from, DateTime? to) {
    final fromStr = from != null ? _formatSimpleDate(from) : '—';
    final toStr = to != null ? _formatSimpleDate(to) : '—';
    return '$fromStr → $toStr';
  }

  String _formatSimpleDate(DateTime date) {
    return DateTime(date.year, date.month, date.day).toLocal().toString().split(' ').first;
  }

  String _getClientLabel(int clientId) {
    for (final client in controller.clients) {
      if (client.id == clientId) {
        return client.companyName;
      }
    }
    return '#$clientId';
  }
}
