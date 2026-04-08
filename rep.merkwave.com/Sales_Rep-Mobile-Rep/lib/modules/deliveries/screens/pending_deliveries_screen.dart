// lib/modules/deliveries/screens/pending_deliveries_screen.dart
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '/modules/deliveries/controllers/pending_deliveries_controller.dart';
import '/modules/deliveries/controllers/fulfill_delivery_controller.dart';
import '/data/repositories/sales_delivery_repository.dart';
import '/data/datasources/sales_delivery_remote_datasource.dart';
import '/services/api_service.dart';
import '/shared_widgets/safe_navigation.dart';
import '/shared_widgets/custom_app_bar.dart';
import '/shared_widgets/loading_indicator.dart';

class PendingDeliveriesScreen extends StatelessWidget {
  final bool showAppBar;
  const PendingDeliveriesScreen({super.key, this.showAppBar = true});

  @override
  Widget build(BuildContext context) {
    if (!Get.isRegistered<SalesDeliveryRemoteDataSource>()) {
      final api = Get.find<ApiService>();
      Get.put<SalesDeliveryRemoteDataSource>(SalesDeliveryRemoteDataSource(apiService: api), permanent: true);
    }

    if (!Get.isRegistered<SalesDeliveryRepository>()) {
      Get.put<SalesDeliveryRepository>(SalesDeliveryRepository(remote: Get.find<SalesDeliveryRemoteDataSource>()), permanent: true);
    }

    if (!Get.isRegistered<PendingDeliveriesController>()) {
      Get.put<PendingDeliveriesController>(PendingDeliveriesController(repository: Get.find<SalesDeliveryRepository>()));
    }

    final controller = Get.find<PendingDeliveriesController>();

    return Scaffold(
      appBar: showAppBar
          ? CustomAppBar(
              title: 'pending_deliveries_list'.tr,
              actions: [
                IconButton(
                  icon: const Icon(Icons.refresh),
                  onPressed: controller.loadPending,
                  tooltip: 'refresh'.tr,
                ),
                IconButton(
                  icon: const Icon(Icons.search),
                  onPressed: () => _showSearchDialog(context, controller),
                  tooltip: 'search'.tr,
                ),
                IconButton(
                  icon: const Icon(Icons.filter_list),
                  onPressed: () => _showFilterBottomSheet(context, controller),
                  tooltip: 'filters'.tr,
                ),
              ],
            )
          : null,
      body: Obx(() {
        if (controller.isLoading.value && controller.pendingOrders.isEmpty) {
          return LoadingIndicator(message: 'loading'.tr);
        }

        if (controller.errorMessage.isNotEmpty && controller.pendingOrders.isEmpty) {
          return _buildErrorState(context, controller);
        }

        final theme = Theme.of(context);
        final visibleOrders = controller.visibleOrders;
        final bool showSearchBanner = controller.isSearching;
        final bool showEmptyState = visibleOrders.isEmpty && controller.errorMessage.isEmpty;
        final int computedTotal = visibleOrders.length + (showSearchBanner ? 1 : 0) + (showEmptyState ? 1 : 0);
        final placeholderLabel = 'tap_to_refresh'.tr;
        final placeholderText = placeholderLabel == 'tap_to_refresh' ? 'refresh'.tr : placeholderLabel;
        final bool hasPlaceholderOnly = computedTotal == 0;
        final int totalItems = hasPlaceholderOnly ? 1 : computedTotal;

        return Column(
          children: [
            if (controller.isLoading.value && controller.pendingOrders.isNotEmpty) _buildRefreshingBanner(context),
            if (controller.errorMessage.isNotEmpty && controller.pendingOrders.isNotEmpty) _buildInlineError(context, controller.errorMessage.value, controller),
            Expanded(
              child: RefreshIndicator(
                onRefresh: controller.loadPending,
                displacement: 60,
                color: theme.colorScheme.primary,
                child: ListView.builder(
                  physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
                  padding: const EdgeInsets.fromLTRB(12, 12, 12, 96),
                  itemCount: totalItems,
                  itemBuilder: (ctx, index) {
                    if (hasPlaceholderOnly) {
                      return SizedBox(
                        height: 160,
                        child: Center(
                          child: Text(
                            placeholderText,
                            style: theme.textTheme.bodyMedium?.copyWith(
                              color: Colors.grey.shade600,
                            ),
                          ),
                        ),
                      );
                    }

                    if (showSearchBanner && index == 0) {
                      return _buildSearchBanner(context, controller);
                    }

                    final int bannerOffset = showSearchBanner ? 1 : 0;
                    final bool isEmptyStateIndex = showEmptyState && index == visibleOrders.length + bannerOffset;

                    if (isEmptyStateIndex) {
                      return _buildEmptyState(context, controller);
                    }

                    final int dataIndex = index - bannerOffset;
                    final order = visibleOrders[dataIndex];
                    final client = (order['clients_company_name'] ?? 'client'.tr).toString();
                    final orderId = order['sales_orders_id']?.toString() ?? '';
                    final pendingQty = (order['total_pending_quantity'] ?? '0').toString();
                    String statusKey = (order['sales_orders_delivery_status'] ?? '').toString();
                    statusKey = statusKey.toLowerCase().replaceAll(' ', '_');
                    if (statusKey == 'not_delivered') {
                      statusKey = 'not_delivered';
                    }
                    final deliveryStatus = statusKey.tr;

                    return _buildOrderCard(
                      context: ctx,
                      order: order,
                      client: client,
                      orderId: orderId,
                      pendingQty: pendingQty,
                      deliveryStatus: deliveryStatus,
                      controller: controller,
                    );
                  },
                ),
              ),
            ),
          ],
        );
      }),
    );
  }

  Widget _buildRefreshingBanner(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
      decoration: BoxDecoration(
        color: theme.colorScheme.primary.withOpacity(0.08),
        border: Border(
          bottom: BorderSide(
            color: theme.colorScheme.primary.withOpacity(0.12),
          ),
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const SizedBox(
            width: 18,
            height: 18,
            child: CircularProgressIndicator(strokeWidth: 2),
          ),
          const SizedBox(width: 12),
          Text(
            'refreshing'.tr,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.primary,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInlineError(
    BuildContext context,
    String message,
    PendingDeliveriesController controller,
  ) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.fromLTRB(16, 12, 16, 4),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.red.shade50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.red.shade200),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.error_outline, color: Colors.red.shade400),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              message,
              style: Get.textTheme.bodySmall?.copyWith(
                color: Colors.red.shade600,
              ),
            ),
          ),
          TextButton.icon(
            onPressed: controller.loadPending,
            icon: const Icon(Icons.refresh, size: 18),
            label: Text('retry'.tr),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchBanner(BuildContext context, PendingDeliveriesController controller) {
    final theme = Theme.of(context);
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
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

  Widget _buildEmptyState(BuildContext context, PendingDeliveriesController controller) {
    if (controller.isSearching) {
      final noResultsKey = 'no_results_found'.tr;
      final message = noResultsKey == 'no_results_found' ? 'no_pending_deliveries'.tr : noResultsKey;
      return Container(
        margin: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.primary.withOpacity(0.05),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: Theme.of(context).colorScheme.primary.withOpacity(0.12),
          ),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.search_off, size: 56, color: Theme.of(context).colorScheme.primary),
            const SizedBox(height: 16),
            Text(
              message,
              style: Get.textTheme.titleMedium,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              controller.searchQuery.value,
              style: Get.textTheme.bodySmall?.copyWith(color: Colors.grey),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      );
    }

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Get.theme.primaryColor.withOpacity(0.05),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Get.theme.primaryColor.withOpacity(0.1)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.local_shipping_outlined,
            size: 64,
            color: Get.theme.primaryColor.withOpacity(0.5),
          ),
          const SizedBox(height: 16),
          Text(
            'no_pending_deliveries'.tr,
            style: Get.textTheme.titleLarge?.copyWith(
              color: Get.theme.primaryColor,
              fontWeight: FontWeight.bold,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          Text(
            'all_orders_delivered'.tr,
            style: Get.textTheme.bodyMedium?.copyWith(
              color: Colors.grey.shade600,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildErrorState(BuildContext context, PendingDeliveriesController controller) {
    final theme = Theme.of(context);
    final message = controller.errorMessage.value.isEmpty ? 'something_went_wrong'.tr : controller.errorMessage.value;

    return Center(
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 32),
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: Colors.red.shade50,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.red.shade200),
          boxShadow: [
            BoxShadow(
              color: Colors.red.shade100.withOpacity(0.3),
              blurRadius: 12,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Icon(
              Icons.warning_amber_rounded,
              size: 56,
              color: Colors.red.shade400,
            ),
            const SizedBox(height: 16),
            Text(
              message,
              style: theme.textTheme.titleMedium?.copyWith(
                color: Colors.red.shade600,
                fontWeight: FontWeight.w700,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 12),
            Text(
              'please_try_again'.tr,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: Colors.red.shade300,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 20),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                OutlinedButton.icon(
                  onPressed: controller.loadPending,
                  icon: const Icon(Icons.refresh),
                  label: Text('retry'.tr),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.red.shade500,
                    side: BorderSide(color: Colors.red.shade200),
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _showSearchDialog(
    BuildContext context,
    PendingDeliveriesController controller,
  ) {
    final textController = TextEditingController(text: controller.searchQuery.value);
    SafeNavigation.dialog(
      AlertDialog(
        title: Text('search'.tr),
        content: TextField(
          controller: textController,
          decoration: InputDecoration(
            hintText: '${'search_by_client_name'.tr} / #123',
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            suffixIcon: IconButton(
              icon: const Icon(Icons.clear),
              onPressed: () {
                controller.onSearchChanged('');
                SafeNavigation.back(context);
              },
            ),
          ),
          textInputAction: TextInputAction.search,
          onSubmitted: (value) {
            controller.onSearchChanged(value);
            SafeNavigation.back(context);
          },
        ),
        actions: [
          TextButton(
            onPressed: () => SafeNavigation.back(context),
            child: Text('cancel'.tr),
          ),
          ElevatedButton(
            onPressed: () {
              controller.onSearchChanged(textController.text);
              SafeNavigation.back(context);
            },
            child: Text('search'.tr),
          ),
        ],
      ),
    );
  }

  void _showFilterBottomSheet(
    BuildContext context,
    PendingDeliveriesController controller,
  ) {
    SafeNavigation.bottomSheet(
      Builder(
        builder: (sheetContext) {
          return SafeArea(
            child: SingleChildScrollView(
              padding: EdgeInsets.fromLTRB(
                20,
                20,
                20,
                MediaQuery.of(sheetContext).viewInsets.bottom + 24,
              ),
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
                    final status = controller.statusFilter.value;
                    if (status.isEmpty) {
                      return Text('no_filters_applied'.tr);
                    }
                    return Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        _buildActiveFilterChip(
                          '${'status'.tr}: ${_statusLabel(status)}',
                          () {
                            controller.applyStatusFilter('');
                          },
                        ),
                      ],
                    );
                  }),
                  const SizedBox(height: 20),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: () {
                        SafeNavigation.bottomSheet(
                          _buildFilterCategorySelectionSheet(context, controller),
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
                      onPressed: () async {
                        controller.clearFilters();
                        await controller.loadPending();
                        SafeNavigation.back(sheetContext);
                      },
                      child: Text('clear_all_filters'.tr),
                    ),
                  ),
                  const SizedBox(height: 10),
                  Center(
                    child: ElevatedButton(
                      onPressed: () => SafeNavigation.back(sheetContext),
                      child: Text('close'.tr),
                    ),
                  ),
                ],
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

  Widget _buildFilterCategorySelectionSheet(
    BuildContext context,
    PendingDeliveriesController controller,
  ) {
    return Builder(
      builder: (sheetContext) {
        return SingleChildScrollView(
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
                leading: const Icon(Icons.local_shipping_outlined),
                title: Text('status'.tr),
                onTap: () {
                  SafeNavigation.back(sheetContext);
                  _showStatusFilterSheet(context, controller);
                },
              ),
            ],
          ),
        );
      },
    );
  }

  void _showStatusFilterSheet(
    BuildContext context,
    PendingDeliveriesController controller,
  ) {
    final statuses = controller.availableStatuses;
    String tempStatus = controller.statusFilter.value;

    SafeNavigation.bottomSheet(
      StatefulBuilder(
        builder: (sheetContext, setModalState) {
          return SafeArea(
            child: SingleChildScrollView(
              padding: EdgeInsets.fromLTRB(
                20,
                20,
                20,
                MediaQuery.of(sheetContext).viewInsets.bottom + 24,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'filter_by_status'.tr,
                    style: Get.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 10,
                    runSpacing: 10,
                    children: [
                      _buildFilterChoiceChip(
                        label: 'all'.tr,
                        isSelected: tempStatus.isEmpty,
                        onSelected: () => setModalState(() => tempStatus = ''),
                      ),
                      ...statuses.map(
                        (status) => _buildFilterChoiceChip(
                          label: _statusLabel(status),
                          isSelected: tempStatus == status,
                          onSelected: () => setModalState(() => tempStatus = status),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () => setModalState(() => tempStatus = ''),
                          child: Text('clear'.tr),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: ElevatedButton(
                          onPressed: () {
                            controller.applyStatusFilter(tempStatus);
                            SafeNavigation.back(sheetContext);
                          },
                          child: Text('apply'.tr),
                        ),
                      ),
                    ],
                  ),
                ],
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

  Widget _buildFilterChoiceChip({
    required String label,
    required bool isSelected,
    required VoidCallback onSelected,
  }) {
    final theme = Get.theme;
    return ChoiceChip(
      label: Text(label),
      selected: isSelected,
      onSelected: (_) => onSelected(),
      selectedColor: theme.colorScheme.primary.withOpacity(0.22),
      backgroundColor: theme.colorScheme.primary.withOpacity(0.08),
      labelStyle: theme.textTheme.bodyMedium?.copyWith(
        color: isSelected ? theme.colorScheme.primary : theme.textTheme.bodyMedium?.color,
        fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
      ),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
    );
  }

  String _normalizeStatusValue(String value) {
    return value.trim().toLowerCase().replaceAll(' ', '_');
  }

  String _statusLabel(String normalized) {
    if (normalized.isEmpty) {
      return 'all'.tr;
    }
    final translation = normalized.tr;
    if (translation == normalized) {
      return normalized.split('_').map((word) => word.isEmpty ? '' : word[0].toUpperCase() + word.substring(1)).join(' ');
    }
    return translation;
  }

  Widget _buildOrderCard({
    required BuildContext context,
    required Map<String, dynamic> order,
    required String client,
    required String orderId,
    required String pendingQty,
    required String deliveryStatus,
    required PendingDeliveriesController controller,
  }) {
    final theme = Theme.of(context);
    final Color gradientStart = theme.colorScheme.primary.withOpacity(0.92);
    final Color gradientEnd = theme.colorScheme.primary.withOpacity(0.72);
    final Color headerTextColor = Colors.white;
    final Color statusColor = _getStatusColor(deliveryStatus);
    final String formattedDate = _formatDateValue(order['sales_orders_date'] ?? order['created_at']);
    final String? areaName = (order['areas_name'] ?? order['clients_area_name'])?.toString();
    final String pendingValue = pendingQty.isEmpty ? '0' : pendingQty;
    final String warehouseName = order['warehouse_name']?.toString() ?? '';

    // Calculate smart availability status based on total quantities
    final items = order['items'] as List<dynamic>? ?? [];
    Color smartAvailabilityColor;
    String smartAvailabilityText;
    double totalAvailableQty = 0;

    if (items.isEmpty) {
      smartAvailabilityColor = Colors.red;
      smartAvailabilityText = 'غير متاح';
    } else {
      // Calculate total pending and total available
      double totalPendingQty = 0;

      for (var item in items) {
        final itemPendingQty = (item['quantity_pending'] ?? 0.0) as num;
        final itemAvailableQty = (item['available_quantity'] ?? 0.0) as num;
        totalPendingQty += itemPendingQty.toDouble();
        totalAvailableQty += itemAvailableQty.toDouble();
      }

      if (totalAvailableQty >= totalPendingQty && totalPendingQty > 0) {
        // Can deliver everything
        smartAvailabilityColor = Colors.green;
        smartAvailabilityText = 'متاح';
      } else if (totalAvailableQty > 0 && totalAvailableQty < totalPendingQty) {
        // Can deliver partial
        smartAvailabilityColor = Colors.orange;
        smartAvailabilityText = 'متاح تسليم جزئى';
      } else {
        // Nothing available
        smartAvailabilityColor = Colors.red;
        smartAvailabilityText = 'غير متاح';
      }
    }

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
      decoration: BoxDecoration(
        color: theme.cardColor,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: theme.dividerColor.withOpacity(0.15)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 12,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(20),
        child: InkWell(
          borderRadius: BorderRadius.circular(20),
          onTap: () async {
            final result = await Get.to(() => const FulfillDeliveryScreen(), arguments: order);
            if (result != null) {
              await controller.loadPending();
            }
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
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    // Warehouse name rectangle
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.18),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: Colors.white.withOpacity(0.3),
                          width: 2,
                        ),
                      ),
                      child: Text(
                        warehouseName.isNotEmpty ? warehouseName : 'مخزن',
                        textAlign: TextAlign.center,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.bodyMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: headerTextColor,
                          fontSize: 13,
                        ),
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Text(
                        formattedDate,
                        style: theme.textTheme.bodyMedium?.copyWith(
                              color: headerTextColor,
                              fontWeight: FontWeight.w600,
                            ) ??
                            TextStyle(
                              color: headerTextColor,
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                            ),
                      ),
                    ),
                    _buildStatusChip(deliveryStatus, statusColor, headerTextColor),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(18, 16, 18, 18),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: _buildInfoTile(
                            context,
                            icon: Icons.pending_actions,
                            label: 'pending_qty'.tr,
                            value: pendingValue,
                            valueColor: Colors.orange,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _buildInfoTile(
                            context,
                            icon: Icons.storefront_outlined,
                            label: 'client'.tr,
                            value: client,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: _buildAvailabilityTileWithStatus(
                            context,
                            availableQty: totalAvailableQty,
                            statusText: smartAvailabilityText,
                            statusColor: smartAvailabilityColor,
                            theme: theme,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _buildInfoTile(
                            context,
                            icon: Icons.receipt_long_outlined,
                            label: 'order'.tr,
                            value: '#$orderId',
                            valueColor: theme.colorScheme.primary,
                          ),
                        ),
                      ],
                    ),
                    if (areaName != null && areaName.trim().isNotEmpty) ...[
                      const SizedBox(height: 14),
                      Row(
                        children: [
                          Icon(Icons.location_on_outlined, size: 16, color: Colors.grey.shade500),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              areaName,
                              style: theme.textTheme.bodySmall?.copyWith(color: Colors.grey.shade600),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildAvailabilityTileWithStatus(
    BuildContext context, {
    required double availableQty,
    required String statusText,
    required Color statusColor,
    required ThemeData theme,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: theme.cardColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: theme.dividerColor.withOpacity(0.12)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.inventory_2_outlined, size: 18, color: theme.colorScheme.primary),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  'available'.tr,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.primary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Text(
                _formatNumber(availableQty),
                style: theme.textTheme.bodyLarge?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: theme.textTheme.bodyMedium?.color ?? Colors.black87,
                    ) ??
                    TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 16,
                      color: theme.textTheme.bodyMedium?.color ?? Colors.black87,
                    ),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: statusColor.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: statusColor.withOpacity(0.5),
                    width: 1,
                  ),
                ),
                child: Text(
                  statusText,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: statusColor,
                    fontWeight: FontWeight.bold,
                    fontSize: 10,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildInfoTile(
    BuildContext context, {
    required IconData icon,
    required String label,
    required String value,
    Color? valueColor,
  }) {
    final theme = Theme.of(context);
    final Color resolvedValueColor = valueColor ?? theme.textTheme.bodyMedium?.color ?? Colors.black87;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: theme.cardColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: theme.dividerColor.withOpacity(0.12)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 18, color: theme.colorScheme.primary),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  label,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.primary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: theme.textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: resolvedValueColor,
                ) ??
                TextStyle(
                  fontWeight: FontWeight.w700,
                  color: resolvedValueColor,
                ),
          ),
        ],
      ),
    );
  }

  Widget _buildAvailabilityTile(
    BuildContext context, {
    required String value,
    bool? isAvailable,
  }) {
    final theme = Theme.of(context);
    final Color baseColor = (isAvailable ?? false) ? Colors.green : Colors.red;
    final Color background = (isAvailable == null) ? theme.cardColor : baseColor.withOpacity(0.08);
    final Color borderColor = (isAvailable == null) ? theme.dividerColor.withOpacity(0.12) : baseColor.withOpacity(0.2);

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.inventory_2_outlined, size: 18, color: theme.colorScheme.primary),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  'available'.tr,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.primary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: Text(
                  value,
                  style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                      ) ??
                      TextStyle(fontWeight: FontWeight.w700, color: theme.colorScheme.onSurface),
                ),
              ),
              if (isAvailable != null)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: baseColor.withOpacity(isAvailable ? 0.16 : 0.18),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    _availabilityStatusLabel(isAvailable),
                    style: theme.textTheme.labelMedium?.copyWith(
                          color: _darken(baseColor, 0.15),
                          fontWeight: FontWeight.w700,
                        ) ??
                        TextStyle(color: _darken(baseColor, 0.15), fontWeight: FontWeight.w700),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }

  num? _resolveAvailableQuantity(Map<String, dynamic> order) {
    final dynamic raw = order['available_quantity'] ?? order['available_stock'] ?? order['available_total'] ?? order['available_items'] ?? order['available'] ?? order['total_available'] ?? order['available_qty'];
    final num? direct = _tryParseNum(raw);
    if (direct != null) {
      return direct;
    }

    final items = order['items'];
    if (items is Iterable) {
      num total = 0;
      bool hasValue = false;
      for (final element in items) {
        if (element is Map<String, dynamic>) {
          final num? parsed = _tryParseNum(element['available_quantity']);
          if (parsed != null) {
            total += parsed;
            hasValue = true;
          }
        } else if (element is Map) {
          final num? parsed = _tryParseNum(element['available_quantity']);
          if (parsed != null) {
            total += parsed;
            hasValue = true;
          }
        }
      }
      if (hasValue) {
        return total;
      }
    }

    return null;
  }

  String _formatNumber(num value) {
    if (value == value.roundToDouble()) {
      return value.toInt().toString();
    }
    return value.toStringAsFixed(2);
  }

  String _availabilityStatusLabel(bool isAvailable) {
    final availableKey = 'available'.tr;
    final notAvailableKey = 'not_available'.tr;
    if (isAvailable) {
      return availableKey == 'available' ? 'متوفر' : availableKey;
    }
    return notAvailableKey == 'not_available' ? 'غير متوفر' : notAvailableKey;
  }

  Color _darken(Color color, [double amount = 0.1]) {
    final hsl = HSLColor.fromColor(color);
    final hslDark = hsl.withLightness((hsl.lightness - amount).clamp(0.0, 1.0));
    return hslDark.toColor();
  }

  num? _tryParseNum(dynamic value) {
    if (value == null) return null;
    if (value is num) return value;
    return num.tryParse(value.toString());
  }

  Widget _buildStatusChip(String status, Color statusColor, Color textOnGradient) {
    final Color chipBackground = Colors.white.withOpacity(0.16);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: chipBackground,
        borderRadius: BorderRadius.circular(30),
        border: Border.all(color: Colors.white.withOpacity(0.18)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.circle, size: 10, color: statusColor.withOpacity(0.9)),
          const SizedBox(width: 8),
          Text(
            status,
            style: TextStyle(
              color: textOnGradient,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'pending':
      case 'معلق':
        return Colors.orange;
      case 'partial':
      case 'جزئي':
        return Colors.blue;
      case 'delivered':
      case 'تم التسليم':
        return Colors.green;
      case 'not delivered':
      case 'لم يتم التسليم':
        return Colors.redAccent;
      default:
        return Colors.grey;
    }
  }
}

class FulfillDeliveryScreen extends StatelessWidget {
  const FulfillDeliveryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final repo = Get.find<SalesDeliveryRepository>();
    // Ensure a fresh controller each time to avoid reused state
    if (Get.isRegistered<FulfillDeliveryController>()) {
      Get.delete<FulfillDeliveryController>();
    }
    final controller = Get.put(FulfillDeliveryController(repository: repo));
    final order = controller.order ?? Get.arguments as Map<String, dynamic>;
    final client = order['clients_company_name'] ?? 'client'.tr;
    final orderId = order['sales_orders_id']?.toString() ?? '';
    final warehouseName = order['warehouse_name']?.toString() ?? '';

    return Scaffold(
      appBar: CustomAppBar(
        title: '${'fulfill_delivery_for_order'.tr} #$orderId',
      ),
      body: Obx(() {
        if (controller.errorMessage.isNotEmpty) {
          return Center(
            child: Container(
              margin: const EdgeInsets.all(24),
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.red.shade50,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.red.shade200),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.error_outline,
                    size: 48,
                    color: Colors.red.shade400,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    controller.errorMessage.value,
                    style: Get.textTheme.bodyLarge?.copyWith(
                      color: Colors.red.shade600,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          );
        }

        final formattedDate = _formatDateValue(order['sales_orders_date'] ?? order['created_at']);
        final headerDate = formattedDate == '-' ? '' : formattedDate;
        final totalItems = controller.itemInputs.length;

        return Column(
          children: [
            Expanded(
              child: ListView.builder(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 20),
                itemCount: totalItems + 1,
                itemBuilder: (ctx, index) {
                  if (index == 0) {
                    return _FulfillHeader(
                      orderId: orderId,
                      clientName: client,
                      orderDate: headerDate,
                      warehouseName: warehouseName,
                    );
                  }

                  final item = controller.itemInputs[index - 1];
                  final variant = item['variant_name'] ?? 'product'.tr;
                  final num maxPending = (item['max_pending'] ?? 0) as num;
                  final dynamic rawAvailable = item['available_quantity'] ?? 0;
                  final num availableNum = rawAvailable is num ? rawAvailable : num.tryParse(rawAvailable.toString()) ?? 0;
                  final bool disabled = availableNum <= 0;
                  final packaging = item['packaging_type_name'];
                  final factor = item['packaging_factor'];
                  // Prefer to show the packaging name and append the factor (e.g. "كرتونة 12 وحدات").
                  // If packaging contains a number in parentheses like "كرتونة (12)",
                  // extract that number and produce "كرتونة 12 وحدات".
                  String? packagingValue;
                  if (packaging != null) {
                    final pkgStr = packaging.toString().trim();
                    // If there's an explicit factor field, append it after the packaging name.
                    if (factor != null) {
                      packagingValue = '$pkgStr ${factor} ${'units'.tr}';
                    } else {
                      // Try to extract number inside parentheses from packaging name.
                      final match = RegExp(r"\((\d+)\)").firstMatch(pkgStr);
                      if (match != null && match.groupCount >= 1) {
                        final number = match.group(1);
                        // Remove the parentheses part from the name
                        final cleaned = pkgStr.replaceAll(RegExp(r"\s*\(\d+\)\s*"), '').trim();
                        if (cleaned.isEmpty) {
                          packagingValue = '${number} ${'units'.tr}';
                        } else {
                          packagingValue = '$cleaned ${number} ${'units'.tr}';
                        }
                      } else {
                        packagingValue = pkgStr;
                      }
                    }
                  } else if (factor != null) {
                    packagingValue = '${factor} ${'units'.tr}';
                  } else {
                    packagingValue = null;
                  }
                  final WidgetBuilder? batchesBuilder = (item['batches'] as List?)?.isNotEmpty == true ? (_) => _buildBatchesSection(controller, item, disabled) : null;

                  return Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: _SimpleDeliveryItemCard(
                      variantName: variant,
                      pendingValue: maxPending.toString(),
                      availableValue: availableNum.toString(),
                      isOutOfStock: disabled,
                      packagingValue: packagingValue,
                      quantitySection: _QuantitySelector(
                        controller: controller,
                        item: item,
                        maxPending: maxPending,
                        disabled: disabled,
                        batchesBuilder: batchesBuilder,
                      ),
                    ),
                  );
                },
              ),
            ),
            // Notes section at the bottom
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
              child: _NotesSection(controller: controller),
            ),
            SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 20),
                child: Obx(() => SizedBox(
                      width: double.infinity,
                      child: FilledButton.icon(
                        icon: controller.isSubmitting.value
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                              )
                            : const Icon(Icons.local_shipping_outlined),
                        label: Text(controller.isSubmitting.value ? 'processing'.tr : 'confirm_delivery'.tr),
                        onPressed: controller.isSubmitting.value
                            ? null
                            : () async {
                                final result = await controller.submit();
                                if (result != null) {
                                  SafeNavigation.closeDialog(context, result: result);
                                }
                              },
                        style: FilledButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                    )),
              ),
            ),
          ],
        );
      }),
    );
  }

  Widget _buildBatchesSection(
    FulfillDeliveryController controller,
    Map<String, dynamic> item,
    bool disabled,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Get.theme.primaryColor.withOpacity(0.05),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: Get.theme.primaryColor.withOpacity(0.2)),
          ),
          child: Row(
            children: [
              Icon(Icons.inventory, color: Get.theme.primaryColor, size: 16),
              const SizedBox(width: 8),
              Text(
                'batches'.tr,
                style: Get.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: Get.theme.primaryColor,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        ...((item['batches'] as List).cast<Map<String, dynamic>>().map((b) {
          final pd = b['production_date'] ?? '-';
          final qa = b['quantity_available'] ?? 0;
          final sel = b['selected'] ?? 0;

          return Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.grey.shade50,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.grey.shade200),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(Icons.date_range, size: 16, color: Colors.grey.shade600),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        '${'production_date'.tr}: $pd',
                        style: Get.textTheme.bodySmall?.copyWith(
                          fontWeight: FontWeight.w600,
                          color: Colors.grey.shade700,
                        ),
                      ),
                    ),
                    Text(
                      '${sel.toStringAsFixed(1)} / ${qa.toString()}',
                      style: Get.textTheme.bodySmall?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: Get.theme.primaryColor,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: Slider(
                        value: (sel as num).toDouble(),
                        min: 0,
                        max: (qa as num).toDouble(),
                        divisions: qa == 0 ? 1 : (qa).toInt(),
                        activeColor: disabled ? Colors.grey : Get.theme.primaryColor,
                        inactiveColor: disabled ? Colors.grey.shade300 : Get.theme.primaryColor.withOpacity(0.3),
                        onChanged: disabled ? null : (val) => controller.updateBatchSelection(item['sales_order_items_id'] as int, pd, val),
                      ),
                    ),
                    const SizedBox(width: 12),
                    SizedBox(
                      width: 70,
                      child: Obx(() {
                        final currentItem = controller.itemInputs.firstWhere(
                          (x) => x['sales_order_items_id'] == item['sales_order_items_id'],
                          orElse: () => item,
                        );
                        final currentBatch = (currentItem['batches'] as List).firstWhere(
                          (b) => b['production_date'] == pd,
                          orElse: () => b,
                        );
                        final currentSelected = currentBatch['selected'];

                        return TextFormField(
                          key: ValueKey('batch_${item['sales_order_items_id']}_${pd}_$currentSelected'),
                          initialValue: currentSelected.toString(),
                          keyboardType: const TextInputType.numberWithOptions(decimal: true),
                          decoration: InputDecoration(
                            isDense: true,
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                          ),
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: disabled ? Colors.grey : Get.theme.primaryColor,
                          ),
                          enabled: !disabled,
                          onChanged: (v) {
                            if (disabled) return;
                            final parsed = double.tryParse(v) ?? 0;
                            controller.updateBatchSelection(item['sales_order_items_id'] as int, pd, parsed);
                          },
                        );
                      }),
                    ),
                  ],
                ),
              ],
            ),
          );
        })),
      ],
    );
  }
}

class _FulfillHeader extends StatelessWidget {
  const _FulfillHeader({
    required this.orderId,
    required this.clientName,
    required this.orderDate,
    required this.warehouseName,
  });

  final String orderId;
  final String clientName;
  final String orderDate;
  final String warehouseName;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            theme.colorScheme.primary.withOpacity(0.08),
            theme.colorScheme.primary.withOpacity(0.03),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: theme.colorScheme.primary.withOpacity(0.2),
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        textDirection: TextDirection.rtl, // RTL for Arabic
        children: [
          // Right side (40%): Client name and warehouse below it
          Expanded(
            flex: 40,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                // Client name with icon
                Row(
                  children: [
                    Icon(
                      Icons.person_outline,
                      color: theme.colorScheme.primary,
                      size: 18,
                    ),
                    const SizedBox(width: 6),
                    Flexible(
                      child: Text(
                        clientName,
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: theme.colorScheme.onSurface,
                          fontSize: 14,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),

                // Warehouse name with icon (second line)
                Row(
                  children: [
                    Icon(
                      warehouseName.isNotEmpty ? Icons.warehouse_outlined : Icons.calendar_today_outlined,
                      color: theme.colorScheme.primary.withOpacity(0.8),
                      size: 16,
                    ),
                    const SizedBox(width: 6),
                    Flexible(
                      child: Text(
                        warehouseName.isNotEmpty ? warehouseName : orderDate,
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: theme.colorScheme.onSurface.withOpacity(0.65),
                          fontWeight: FontWeight.w500,
                          fontSize: 12,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          const SizedBox(width: 10),

          // Middle section (30%): Date info
          Expanded(
            flex: 30,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.center,
              mainAxisSize: MainAxisSize.min,
              children: [
                if (orderDate.isNotEmpty && warehouseName.isNotEmpty)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: theme.colorScheme.surface.withOpacity(0.5),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(
                        color: theme.dividerColor.withOpacity(0.2),
                      ),
                    ),
                    child: Text(
                      orderDate,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurface.withOpacity(0.6),
                        fontWeight: FontWeight.w500,
                        fontSize: 11,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
              ],
            ),
          ),

          const SizedBox(width: 10),

          // Left side (30%): Order ID badge - takes 2 lines height
          Expanded(
            flex: 30,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: theme.colorScheme.primary,
                borderRadius: BorderRadius.circular(12),
                boxShadow: [
                  BoxShadow(
                    color: theme.colorScheme.primary.withOpacity(0.3),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'طلب',
                    textAlign: TextAlign.center,
                    style: theme.textTheme.bodySmall?.copyWith(
                      fontWeight: FontWeight.w600,
                      color: Colors.white,
                      fontSize: 11,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '#$orderId',
                    textAlign: TextAlign.center,
                    style: theme.textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                      fontSize: 18,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _NotesSection extends StatelessWidget {
  const _NotesSection({required this.controller});

  final FulfillDeliveryController controller;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller.notesController,
      maxLines: 3,
      decoration: InputDecoration(
        labelText: 'ملاحظات (اختياري)',
        hintText: 'enter_delivery_notes'.tr,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
        prefixIcon: const Icon(Icons.note_add_outlined),
      ),
    );
  }
}

class _SimpleDeliveryItemCard extends StatelessWidget {
  const _SimpleDeliveryItemCard({
    required this.variantName,
    required this.pendingValue,
    required this.availableValue,
    required this.isOutOfStock,
    required this.quantitySection,
    this.packagingValue,
  });

  final String variantName;
  final String pendingValue;
  final String availableValue;
  final bool isOutOfStock;
  final String? packagingValue;
  final Widget quantitySection;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final Color accent = isOutOfStock ? Colors.red : theme.colorScheme.primary;

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: theme.dividerColor.withOpacity(0.15)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Compact header with variant name and badges
            Row(
              children: [
                Icon(Icons.inventory_2_outlined, color: accent, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    variantName,
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: accent,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),

            // Compact info badges
            Row(
              children: [
                if (packagingValue != null) ...[
                  Expanded(
                    child: _CompactBadge(
                      label: 'packaging'.tr,
                      value: packagingValue!,
                      color: Colors.grey,
                    ),
                  ),
                  const SizedBox(width: 6),
                ],
                Expanded(
                  child: _CompactBadge(
                    label: 'available'.tr,
                    value: availableValue,
                    color: isOutOfStock ? Colors.red : Colors.green,
                  ),
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: _CompactBadge(
                    label: 'pending_qty'.tr,
                    value: pendingValue,
                    color: Colors.orange,
                  ),
                ),
              ],
            ),

            if (isOutOfStock) ...[
              const SizedBox(height: 4),
              Text(
                'not_available_in_stock'.tr,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: Colors.red.shade600,
                  fontWeight: FontWeight.w600,
                  fontSize: 11,
                ),
              ),
            ],

            const SizedBox(height: 8),
            quantitySection,
          ],
        ),
      ),
    );
  }
}

class _QuantitySelector extends StatefulWidget {
  const _QuantitySelector({
    required this.controller,
    required this.item,
    required this.maxPending,
    required this.disabled,
    this.batchesBuilder,
  });

  final FulfillDeliveryController controller;
  final Map<String, dynamic> item;
  final num maxPending;
  final bool disabled;
  final WidgetBuilder? batchesBuilder;

  @override
  State<_QuantitySelector> createState() => _QuantitySelectorState();
}

class _QuantitySelectorState extends State<_QuantitySelector> {
  bool _showBatches = false;

  int get _itemId => widget.item['sales_order_items_id'] as int;

  num _currentQuantity() {
    final currentItem = widget.controller.itemInputs.firstWhere(
      (x) => x['sales_order_items_id'] == _itemId,
      orElse: () => widget.item,
    );
    return (currentItem['quantity'] as num?) ?? 0;
  }

  num _getAvailableQuantity() {
    final dynamic rawAvailable = widget.item['available_quantity'] ?? 0;
    return rawAvailable is num ? rawAvailable : num.tryParse(rawAvailable.toString()) ?? 0;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final num availableQty = _getAvailableQuantity();
    final double maxValue = availableQty.toDouble();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Compact quantity controls
        Row(
          children: [
            // Decrease button
            IconButton(
              onPressed: widget.disabled
                  ? null
                  : () {
                      final current = _currentQuantity().toDouble();
                      if (current > 0) {
                        widget.controller.updateQuantity(_itemId, current - 1);
                      }
                    },
              icon: const Icon(Icons.remove_circle),
              color: theme.colorScheme.primary,
              iconSize: 28,
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(),
            ),

            const SizedBox(width: 8),

            // Quantity display
            Expanded(
              child: Obx(() {
                final currentItem = widget.controller.itemInputs.firstWhere(
                  (x) => x['sales_order_items_id'] == _itemId,
                  orElse: () => widget.item,
                );
                final currentValue = (currentItem['quantity'] as num?) ?? 0;
                return Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.primary.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: theme.colorScheme.primary.withOpacity(0.3),
                    ),
                  ),
                  child: Text(
                    '$currentValue',
                    textAlign: TextAlign.center,
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: widget.disabled ? Colors.grey : theme.colorScheme.primary,
                    ),
                  ),
                );
              }),
            ),

            const SizedBox(width: 8),

            // Increase button
            IconButton(
              onPressed: widget.disabled
                  ? null
                  : () {
                      final current = _currentQuantity().toDouble();
                      if (current < maxValue) {
                        widget.controller.updateQuantity(_itemId, current + 1);
                      }
                    },
              icon: const Icon(Icons.add_circle),
              color: theme.colorScheme.primary,
              iconSize: 28,
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(),
            ),

            const SizedBox(width: 8),

            // Quick action: All
            if (!widget.disabled && maxValue > 0)
              OutlinedButton(
                onPressed: () => widget.controller.updateQuantity(_itemId, maxValue),
                style: OutlinedButton.styleFrom(
                  foregroundColor: theme.colorScheme.primary,
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  minimumSize: const Size(0, 0),
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
                child: Text('all'.tr, style: const TextStyle(fontSize: 11)),
              ),

            // Batches toggle
            if (widget.batchesBuilder != null)
              IconButton(
                onPressed: () {
                  setState(() => _showBatches = !_showBatches);
                },
                icon: Icon(_showBatches ? Icons.expand_less : Icons.expand_more),
                color: theme.colorScheme.primary,
                iconSize: 24,
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
              ),
          ],
        ),

        if (_showBatches && widget.batchesBuilder != null) ...[
          const SizedBox(height: 12),
          widget.batchesBuilder!(context),
        ],
      ],
    );
  }
}

class _CompactBadge extends StatelessWidget {
  const _CompactBadge({
    required this.label,
    required this.value,
    required this.color,
  });

  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: color.withOpacity(0.3), width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 9,
              color: color,
              fontWeight: FontWeight.w600,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          Text(
            value,
            style: TextStyle(
              fontSize: 12,
              color: color,
              fontWeight: FontWeight.bold,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}

class _QuickActionButton extends StatelessWidget {
  const _QuickActionButton({
    required this.label,
    required this.onPressed,
    required this.color,
  });

  final String label;
  final VoidCallback onPressed;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return OutlinedButton(
      onPressed: onPressed,
      style: OutlinedButton.styleFrom(
        foregroundColor: color,
        side: BorderSide(color: color),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
        ),
      ),
      child: Text(
        label,
        style: const TextStyle(
          fontWeight: FontWeight.bold,
          fontSize: 12,
        ),
      ),
    );
  }
}

class _Badge extends StatelessWidget {
  const _Badge({
    required this.label,
    required this.value,
    required this.color,
    this.labelStyle,
    this.valueStyle,
  });

  final String label;
  final String value;
  final Color color;
  final TextStyle? labelStyle;
  final TextStyle? valueStyle;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Text(
            label,
            textAlign: TextAlign.center,
            style: labelStyle ??
                theme.textTheme.bodySmall?.copyWith(
                  color: color,
                  fontWeight: FontWeight.w600,
                  fontSize: 12,
                ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 2),
          Text(
            value,
            textAlign: TextAlign.center,
            style: valueStyle ??
                theme.textTheme.labelLarge?.copyWith(
                  color: theme.colorScheme.onSurface,
                  fontWeight: FontWeight.w700,
                ),
            maxLines: 1,
            softWrap: false,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}

String _formatDateValue(dynamic rawValue) {
  if (rawValue == null) return '-';
  final String value = rawValue.toString();
  final DateTime? parsed = DateTime.tryParse(value);
  if (parsed != null) {
    return '${parsed.day.toString().padLeft(2, '0')}/${parsed.month.toString().padLeft(2, '0')}/${parsed.year}';
  }
  return value.isEmpty ? '-' : value;
}
