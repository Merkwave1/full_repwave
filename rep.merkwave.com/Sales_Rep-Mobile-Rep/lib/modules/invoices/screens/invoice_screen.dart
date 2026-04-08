// lib/modules/invoices/screens/invoice_screen.dart
import 'package:flutter/material.dart';
import '/shared_widgets/ultra_safe_navigation.dart';
import 'package:get/get.dart';
import '/core/routes/app_routes.dart'; // For navigation routes
import '/data/models/sales_invoice.dart'; // Import the SalesInvoice model
import '/modules/invoices/controllers/invoices_controller.dart'; // Import the InvoicesController
import '/shared_widgets/custom_app_bar.dart'; // Reusable AppBar
import '/shared_widgets/loading_indicator.dart'; // Reusable LoadingIndicator
import '/core/utils/formatting.dart';

class InvoiceScreen extends GetView<InvoicesController> {
  const InvoiceScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: CustomAppBar(
        title: 'invoices'.tr, // Localized title for Invoices
        actions: [
          // Refresh Icon (match Sales Orders)
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => controller.fetchInvoices(isInitialFetch: true),
          ),
          // Search Icon
          IconButton(
            icon: const Icon(Icons.search),
            onPressed: () {
              _showSearchBar(context);
            },
          ),
          // Filter Icon
          IconButton(
            icon: const Icon(Icons.filter_list),
            onPressed: () {
              _showInvoiceFilterBottomSheet(context);
            },
          ),
        ],
      ),
      body: Obx(
        () {
          // Show loading indicator for initial fetch
          if (controller.isLoading.value && controller.invoices.isEmpty) {
            return LoadingIndicator(message: 'loading_invoices'.tr);
          }

          // Show a message if no invoices are found after loading
          if (controller.invoices.isEmpty && !controller.isLoading.value) {
            return Center(
              child: Text(
                'no_invoices_found'.tr, // Localized message
                style: Get.textTheme.titleMedium,
              ),
            );
          }

          // Display the list of invoices
          final bool showSearchBanner = controller.searchQuery.value.trim().isNotEmpty;
          final bool showLoadMoreIndicator = controller.isLoadMoreLoading.value;
          final int totalItems = controller.invoices.length + (showSearchBanner ? 1 : 0) + (showLoadMoreIndicator ? 1 : 0);

          return RefreshIndicator(
            onRefresh: () => controller.fetchInvoices(isInitialFetch: true),
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

                if (dataIndex >= 0 && dataIndex < controller.invoices.length) {
                  final SalesInvoice invoice = controller.invoices[dataIndex];

                  // Mirror sales order card style for invoices list
                  final theme = Theme.of(context);
                  final Color statusColor = _getStatusColor(invoice.status);
                  final bool isNeutralStatus = statusColor == Colors.grey;
                  final Color headerTextColor = isNeutralStatus ? theme.colorScheme.onSurface : (statusColor.computeLuminance() < 0.45 ? Colors.white : theme.colorScheme.onPrimary);
                  final Color gradientStart = isNeutralStatus ? theme.colorScheme.primary.withOpacity(0.22) : statusColor.withOpacity(0.92);
                  final Color gradientEnd = isNeutralStatus ? theme.colorScheme.primary.withOpacity(0.16) : statusColor.withOpacity(0.7);

                  return Container(
                    margin: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
                    decoration: BoxDecoration(
                      color: theme.cardColor,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: theme.dividerColor.withOpacity(0.15)),
                      boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 12, offset: const Offset(0, 6))],
                    ),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(20),
                      onTap: () async {
                        final result = await Get.toNamed(AppRoutes.invoiceDetail, arguments: invoice.salesInvoiceId);
                        if (result == true) controller.fetchInvoices(isInitialFetch: true);
                      },
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Container(
                            decoration: BoxDecoration(
                              gradient: LinearGradient(colors: [gradientStart, gradientEnd], begin: Alignment.topRight, end: Alignment.bottomLeft),
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
                                        '${'invoice_no'.tr}: ${invoice.invoiceNumber}',
                                        style: theme.textTheme.titleMedium?.copyWith(color: headerTextColor, fontWeight: FontWeight.w700),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        invoice.issueDate.toLocal().toString().split(' ')[0],
                                        style: theme.textTheme.bodySmall?.copyWith(color: headerTextColor.withOpacity(0.9)),
                                      ),
                                    ],
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                  decoration: BoxDecoration(
                                    color: statusColor.withOpacity(statusColor.computeLuminance() < 0.5 ? 0.18 : 0.18),
                                    borderRadius: BorderRadius.circular(30),
                                    border: Border.all(color: Colors.white.withOpacity(0.2)),
                                  ),
                                  child: Text(
                                    invoice.status,
                                    style: TextStyle(color: headerTextColor, fontWeight: FontWeight.w600, fontSize: 12),
                                  ),
                                ),
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
                                        invoice.clientCompanyName ?? 'not_available'.tr,
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
                                        value: Formatting.amount(invoice.totalAmount),
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: _buildInfoTile(
                                        context,
                                        icon: Icons.receipt_long_outlined,
                                        label: 'status'.tr,
                                        value: invoice.status,
                                        valueColor: statusColor,
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
                                        label: 'issue_date'.tr,
                                        value: invoice.issueDate.toLocal().toString().split(' ')[0],
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: _buildInfoTile(
                                        context,
                                        icon: Icons.local_shipping_outlined,
                                        label: 'linked_order'.tr,
                                        value: invoice.salesOrderLinkId?.toString() ?? 'not_available'.tr,
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                }

                // Show load-more indicator at the end when applicable
                if (showLoadMoreIndicator && index == totalItems - 1) {
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
      // Floating action button for adding new invoices (if applicable)
      // For now, invoices are primarily created from sales orders, so this might not be needed.
      // floatingActionButton: FloatingActionButton.extended(
      //   onPressed: () {
      //     Get.toNamed(AppRoutes.addEditInvoice);
      //   },
      //   icon: const Icon(Icons.add),
      //   label: Text('add_new_invoice'.tr),
      // ),
    );
  }

  // Helper function to determine status color
  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'paid':
        return Colors.green;
      case 'partially paid':
        return Colors.orange;
      case 'overdue':
        return Colors.red;
      case 'cancelled':
        return Colors.grey;
      case 'sent':
      case 'draft':
      default:
        return Get.theme.colorScheme.primary; // Or a neutral color
    }
  }

  void _showSearchBar(BuildContext context) {
    Get.dialog(
      AlertDialog(
        title: Text('search_invoices'.tr),
        content: TextField(
          controller: TextEditingController(text: controller.searchQuery.value),
          decoration: InputDecoration(
            hintText: 'search_by_invoice_number_or_client'.tr,
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
          onChanged: (value) {
            // Optional: Live search
          },
        ),
        actions: [
          TextButton(
            onPressed: () => UltraSafeNavigation.back(context),
            child: Text('cancel'.tr),
          ),
          ElevatedButton(
            onPressed: () {
              controller.onSearchChanged(controller.searchQuery.value);
              UltraSafeNavigation.back(context);
            },
            child: Text('search'.tr),
          ),
        ],
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

  void _showInvoiceFilterBottomSheet(BuildContext context) {
    // Sales Orders-style filter bottom sheet: shows active chips and an Add Filter flow
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
              final dateFrom = controller.dateFromFilter.value;
              final dateTo = controller.dateToFilter.value;
              final clientId = controller.selectedClientFilter.value;

              if (clientId != null) {
                chips.add(_buildActiveFilterChip('${'client'.tr}: ${_getClientLabel(clientId)}', () => controller.applyFilters(status: controller.currentStatusFilter.value, dateFrom: dateFrom, dateTo: dateTo)));
              }
              if (dateFrom != null || dateTo != null) {
                chips.add(_buildActiveFilterChip('${'date_range'.tr}: ${_formatFilterDateRange(dateFrom, dateTo)}', () => controller.applyFilters(dateFrom: null, dateTo: null)));
              }

              if (chips.isEmpty) {
                return Text('no_filters_applied'.tr);
              }
              return Wrap(spacing: 8, runSpacing: 8, children: chips);
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

  // Active Filter Chip for displaying applied filters (same style as Sales Orders)
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
            leading: const Icon(Icons.storefront_outlined),
            title: Text('client'.tr),
            onTap: () {
              UltraSafeNavigation.back(context);
              _showClientFilterSheet(context);
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
                                  controller.applyFilters(clientId: null, dateFrom: controller.dateFromFilter.value, dateTo: controller.dateToFilter.value);
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
                                controller.applyFilters(clientId: client.id, dateFrom: controller.dateFromFilter.value, dateTo: controller.dateToFilter.value);
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
                          controller.applyFilters(dateFrom: null, dateTo: null);
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
                          controller.applyFilters(dateFrom: from, dateTo: to);
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

  Widget _buildDatePickerField({
    required String label,
    required DateTime? value,
    required VoidCallback onTap,
    VoidCallback? onClear,
  }) {
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

  Widget _buildInfoTile(BuildContext context, {required IconData icon, required String label, required String value, Color? valueColor}) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: theme.cardColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: theme.dividerColor.withOpacity(0.1)),
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
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: theme.textTheme.bodyMedium?.copyWith(
              fontWeight: FontWeight.w600,
              color: valueColor ?? theme.textTheme.bodyMedium?.color,
            ),
          ),
        ],
      ),
    );
  }
}
