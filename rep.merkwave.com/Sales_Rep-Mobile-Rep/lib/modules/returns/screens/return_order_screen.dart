// lib/modules/returns/screens/return_order_screen.dart
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '/shared_widgets/ultra_safe_navigation.dart';
import '/core/routes/app_routes.dart';
import '/data/models/sales_return.dart';
import '/modules/returns/controllers/returns_controller.dart';
import '/core/utils/formatting.dart';
import '/shared_widgets/custom_app_bar.dart';
import '/shared_widgets/loading_indicator.dart';

class ReturnOrderScreen extends GetView<ReturnsController> {
  const ReturnOrderScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: CustomAppBar(
        title: 'sales_returns'.tr,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => controller.refreshIfNeeded(force: true),
          ),
          IconButton(
            icon: const Icon(Icons.search),
            onPressed: () => _showSearchBar(context),
          ),
          IconButton(
            icon: const Icon(Icons.filter_list),
            onPressed: () => _showReturnFilterBottomSheet(context),
          ),
        ],
      ),
      body: Obx(() {
        if (controller.isLoading.value && controller.returns.isEmpty) {
          return LoadingIndicator(message: 'loading_returns'.tr);
        }

        final visible = controller.visibleReturns;

        if (visible.isEmpty && !controller.isLoading.value) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.assignment_return, size: 64, color: Colors.grey),
                const SizedBox(height: 16),
                Text(
                  'no_returns_found'.tr,
                  style: Get.textTheme.titleMedium,
                ),
                const SizedBox(height: 8),
                Text(
                  _emptyStateSubtitle(),
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

        final bool showSearchBanner = controller.isSearching;
        final bool showLoadMoreIndicator = !controller.isSearching && controller.isLoadMoreLoading.value;
        final int totalItems = visible.length + (showSearchBanner ? 1 : 0) + (showLoadMoreIndicator ? 1 : 0);

        return RefreshIndicator(
          onRefresh: () => controller.refreshIfNeeded(force: true),
          displacement: 60,
          color: theme.colorScheme.primary,
          child: ListView.builder(
            controller: controller.scrollController,
            physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
            padding: const EdgeInsets.fromLTRB(12, 12, 12, 96),
            itemCount: totalItems,
            itemBuilder: (context, index) {
              if (showSearchBanner && index == 0) {
                return _buildSearchBanner(context);
              }

              final int bannerOffset = showSearchBanner ? 1 : 0;
              final int dataIndex = index - bannerOffset;

              if (dataIndex >= 0 && dataIndex < visible.length) {
                final SalesReturn salesReturn = visible[dataIndex];
                return _buildReturnCard(context, salesReturn);
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
      }),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          final result = await Get.toNamed(AppRoutes.addEditReturn);
          if (result == true) {
            await controller.refreshIfNeeded(force: true);
          }
        },
        icon: const Icon(Icons.add),
        label: Text('add_new_return'.tr),
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

  Widget _buildReturnCard(BuildContext context, SalesReturn salesReturn) {
    final theme = Theme.of(context);
    final Color statusColor = _getStatusColor(salesReturn.status);
    final bool isNeutralStatus = statusColor == Colors.grey;
    final Color gradientStart = isNeutralStatus ? theme.colorScheme.primary.withOpacity(0.22) : statusColor.withOpacity(0.92);
    final Color gradientEnd = isNeutralStatus ? theme.colorScheme.primary.withOpacity(0.16) : statusColor.withOpacity(0.7);
    final Color chipColor = isNeutralStatus ? theme.colorScheme.primary : statusColor;
    final Color headerTextColor = isNeutralStatus ? theme.colorScheme.onSurface : (statusColor.computeLuminance() < 0.45 ? Colors.white : theme.colorScheme.onPrimary);
    final String localizedStatus = _localizedStatus(salesReturn.status);

    final bool hasTax = salesReturn.hasTaxItems;
    final String totalAmount = hasTax ? Formatting.amount(salesReturn.totalAmountWithTax) : Formatting.amount(salesReturn.totalAmount);
    final String subtotal = Formatting.amount(salesReturn.subtotalAmount);
    final String taxAmount = Formatting.amount(salesReturn.totalTaxAmount);

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
          final result = await Get.toNamed(AppRoutes.returnOrderDetail, arguments: salesReturn.returnsId);
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
                          '${'return_id'.tr}: ${salesReturn.returnsId}',
                          style: theme.textTheme.titleMedium?.copyWith(
                            color: headerTextColor,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _formatDate(salesReturn.returnsDate),
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
                          salesReturn.clientCompanyName ?? 'not_available'.tr,
                          style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
                        ),
                      ),
                    ],
                  ),
                  if (salesReturn.salesOrderId != null) ...[
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Icon(Icons.receipt_outlined, size: 18, color: theme.colorScheme.secondary),
                        const SizedBox(width: 6),
                        Text(
                          '${'linked_sales_order'.tr}: #${salesReturn.salesOrderId}',
                          style: theme.textTheme.bodySmall,
                        ),
                      ],
                    ),
                  ],
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      Expanded(
                        child: _buildInfoTile(
                          context,
                          icon: Icons.account_balance_wallet_outlined,
                          label: 'total_amount'.tr,
                          value: totalAmount,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _buildInfoTile(
                          context,
                          icon: Icons.verified_outlined,
                          label: 'status'.tr,
                          value: localizedStatus,
                          valueColor: chipColor,
                        ),
                      ),
                    ],
                  ),
                  if (hasTax) ...[
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: _buildInfoTile(
                            context,
                            icon: Icons.grid_view_outlined,
                            label: 'subtotal'.tr,
                            value: subtotal,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _buildInfoTile(
                            context,
                            icon: Icons.request_quote_outlined,
                            label: 'tax_amount'.tr,
                            value: taxAmount,
                            valueColor: Colors.orange.shade700,
                          ),
                        ),
                      ],
                    ),
                  ],
                  if ((salesReturn.reason ?? '').trim().isNotEmpty) ...[
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: theme.colorScheme.secondaryContainer.withOpacity(0.25),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(Icons.undo, size: 18, color: theme.colorScheme.secondary),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              salesReturn.reason!,
                              style: theme.textTheme.bodySmall,
                              maxLines: 3,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                  if ((salesReturn.notes ?? '').trim().isNotEmpty) ...[
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
                              salesReturn.notes!,
                              style: theme.textTheme.bodySmall,
                              maxLines: 3,
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
    final Color textColor = darkBackground ? Colors.white : statusColor.withOpacity(0.85);

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

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'approved':
        return Colors.blue;
      case 'processed':
        return Colors.green;
      case 'pending':
        return Colors.orange;
      case 'rejected':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  String _localizedStatus(String status) {
    final key = status.toLowerCase();
    final translated = key.tr;
    return translated == key ? status : translated;
  }

  String _formatDate(DateTime date) {
    return date.toLocal().toString().split(' ').first;
  }

  void _showSearchBar(BuildContext context) {
    final textController = TextEditingController(text: controller.searchQuery.value);
    Get.dialog(
      AlertDialog(
        title: Text('search_returns'.tr),
        content: TextField(
          controller: textController,
          decoration: InputDecoration(
            hintText: '${'search_by_client_name'.tr} / #123',
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            suffixIcon: IconButton(
              icon: const Icon(Icons.clear),
              onPressed: () {
                controller.onSearchChanged('');
                UltraSafeNavigation.back(context);
              },
            ),
          ),
          onSubmitted: (value) {
            controller.onSearchChanged(value);
            UltraSafeNavigation.back(context);
          },
        ),
        actions: [
          TextButton(
            onPressed: () => UltraSafeNavigation.back(context),
            child: Text('cancel'.tr),
          ),
          ElevatedButton(
            onPressed: () {
              controller.onSearchChanged(textController.text);
              UltraSafeNavigation.back(context);
            },
            child: Text('search'.tr),
          ),
        ],
      ),
    );
  }

  void _showReturnFilterBottomSheet(BuildContext context) {
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
              final status = controller.currentStatusFilter.value;
              final dateFrom = controller.dateFromFilter.value;
              final dateTo = controller.dateToFilter.value;

              if (status.isNotEmpty) {
                chips.add(_buildActiveFilterChip(
                  '${'status'.tr}: ${_localizedStatus(status)}',
                  () => controller.applyFilters(
                    status: '',
                    dateFrom: dateFrom,
                    dateTo: dateTo,
                    search: controller.searchQuery.value,
                  ),
                ));
              }

              if (dateFrom != null || dateTo != null) {
                chips.add(_buildActiveFilterChip(
                  '${'date_range'.tr}: ${_formatFilterDateRange(dateFrom, dateTo)}',
                  () => controller.applyFilters(
                    status: status,
                    dateFrom: null,
                    dateTo: null,
                    search: controller.searchQuery.value,
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
                  controller.clearFilters();
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
    const statuses = [
      '',
      'Pending',
      'Approved',
      'Processed',
      'Rejected',
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
                  children: statuses.map((value) {
                    final isSelected = controller.currentStatusFilter.value == value;
                    final label = value.isEmpty ? 'all'.tr : _localizedStatus(value);
                    return _buildChoiceChip(
                      label,
                      isSelected,
                      () {
                        controller.applyFilters(
                          status: value,
                          dateFrom: controller.dateFromFilter.value,
                          dateTo: controller.dateToFilter.value,
                          search: controller.searchQuery.value,
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
                          controller.applyFilters(
                            status: controller.currentStatusFilter.value,
                            dateFrom: null,
                            dateTo: null,
                            search: controller.searchQuery.value,
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
                          controller.applyFilters(
                            status: controller.currentStatusFilter.value,
                            dateFrom: from,
                            dateTo: to,
                            search: controller.searchQuery.value,
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

  Widget _buildDatePickerField({required String label, DateTime? value, required VoidCallback onTap, VoidCallback? onClear}) {
    final theme = Get.theme;
    return InkWell(
      onTap: onTap,
      child: InputDecorator(
        decoration: InputDecoration(
          labelText: label,
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
          suffixIcon: value != null
              ? IconButton(
                  icon: const Icon(Icons.clear),
                  onPressed: onClear,
                )
              : null,
        ),
        child: Text(value != null ? _formatDate(value) : 'select_date'.tr, style: theme.textTheme.bodyMedium?.copyWith(color: value != null ? theme.colorScheme.onSurface : theme.colorScheme.onSurfaceVariant)),
      ),
    );
  }

  Widget _buildChoiceChip(String label, bool isSelected, VoidCallback onSelected) {
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

  String _emptyStateSubtitle() {
    const fallbackKey = 'tap_add_button_to_create_return';
    final resolved = fallbackKey.tr;
    if (resolved == fallbackKey) {
      return 'tap_add_button_to_create_order'.tr;
    }
    return resolved;
  }

  String _formatFilterDateRange(DateTime? from, DateTime? to) {
    if (from == null && to == null) {
      return 'all'.tr;
    }
    if (from != null && to != null) {
      return '${_formatDate(from)} → ${_formatDate(to)}';
    }
    if (from != null) {
      return '${'from'.tr} ${_formatDate(from)}';
    }
    return '${'to'.tr} ${_formatDate(to!)}';
  }
}
