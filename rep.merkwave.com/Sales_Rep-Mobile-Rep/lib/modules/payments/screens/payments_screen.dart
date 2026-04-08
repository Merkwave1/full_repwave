// lib/modules/payments/screens/payments_screen.dart
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '/data/models/client.dart';
import '/data/models/payment.dart';
import '/modules/auth/controllers/auth_controller.dart';
import '/modules/payments/controllers/payments_controller.dart';
import '/modules/payments/screens/add_payment_screen.dart';
import '/services/thermal_printer_service.dart';
import '/shared_widgets/custom_app_bar.dart';
import '/shared_widgets/loading_indicator.dart';
import '/shared_widgets/safe_navigation.dart';
import '/shared_widgets/ultra_safe_navigation.dart';

class PaymentsScreen extends StatelessWidget {
  final bool showAppBar;

  const PaymentsScreen({super.key, this.showAppBar = true});

  @override
  Widget build(BuildContext context) {
    final PaymentsController controller = Get.find<PaymentsController>();
    final theme = Theme.of(context);

    return Scaffold(
      appBar: showAppBar
          ? CustomAppBar(
              title: 'payments'.tr,
              actions: [
                IconButton(
                  icon: const Icon(Icons.refresh),
                  onPressed: () => controller.refreshData(),
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
        if (controller.isLoading.value && controller.payments.isEmpty) {
          return LoadingIndicator(message: 'loading'.tr);
        }

        if (controller.errorMessage.value.isNotEmpty && controller.payments.isEmpty) {
          return _buildErrorState(context, controller);
        }

        final visiblePayments = controller.visiblePayments;
        final bool showSearchBanner = controller.isSearching;
        final bool showEmptyState = visiblePayments.isEmpty && controller.errorMessage.value.isEmpty;
        final int computedTotal = visiblePayments.length + (showSearchBanner ? 1 : 0) + (showEmptyState ? 1 : 0);
        final bool hasPlaceholderOnly = computedTotal == 0;
        final int totalItems = hasPlaceholderOnly ? 1 : computedTotal;
        final placeholderLabel = 'tap_to_refresh'.tr;
        final placeholderText = placeholderLabel == 'tap_to_refresh' ? 'refresh'.tr : placeholderLabel;

        return Column(
          children: [
            if (controller.isLoading.value && controller.payments.isNotEmpty) _buildRefreshingBanner(context),
            if (controller.errorMessage.value.isNotEmpty && controller.payments.isNotEmpty) _buildInlineError(context, controller),
            Expanded(
              child: RefreshIndicator(
                onRefresh: controller.refreshData,
                displacement: 60,
                color: theme.colorScheme.primary,
                child: ListView.builder(
                  physics: const AlwaysScrollableScrollPhysics(
                    parent: BouncingScrollPhysics(),
                  ),
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
                    final bool isEmptyStateIndex = showEmptyState && index == visiblePayments.length + bannerOffset;
                    if (isEmptyStateIndex) {
                      return _buildEmptyState(context, controller);
                    }

                    final int dataIndex = index - bannerOffset;
                    final payment = visiblePayments[dataIndex];
                    return _buildPaymentCard(context, payment, controller);
                  },
                ),
              ),
            ),
          ],
        );
      }),
      floatingActionButton: FloatingActionButton.extended(
        heroTag: 'payments_add_fab',
        onPressed: () async {
          final navContext = Get.context ?? context;
          final newPayment = await Get.to(() => const AddPaymentScreen());
          if (newPayment is Payment) {
            _showPaymentDetailsDialog(navContext, newPayment, isNew: true);
          }
        },
        icon: const Icon(Icons.add),
        label: Text(_tr('add_payment', 'Add Payment')),
      ),
    );
  }

  Widget _buildErrorState(BuildContext context, PaymentsController controller) {
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
            Icon(Icons.error_outline, size: 48, color: Colors.red.shade400),
            const SizedBox(height: 16),
            Text(
              _tr('error', 'Error'),
              style: Get.textTheme.titleLarge?.copyWith(
                color: Colors.red.shade700,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              controller.errorMessage.value,
              style: Get.textTheme.bodyMedium?.copyWith(
                color: Colors.red.shade600,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: () => controller.refreshData(),
              icon: const Icon(Icons.refresh),
              label: Text(_tr('retry', 'Retry')),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.red.shade400,
                foregroundColor: Colors.white,
              ),
            ),
          ],
        ),
      ),
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
            _tr('refreshing', 'Refreshing...'),
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
    PaymentsController controller,
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
              controller.errorMessage.value,
              style: Get.textTheme.bodySmall?.copyWith(
                color: Colors.red.shade600,
              ),
            ),
          ),
          TextButton.icon(
            onPressed: () => controller.refreshData(),
            icon: const Icon(Icons.refresh, size: 18),
            label: Text(_tr('retry', 'Retry')),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchBanner(BuildContext context, PaymentsController controller) {
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
              _tr('search_active', 'Search applied'),
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.primary,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          TextButton.icon(
            onPressed: () => controller.onSearchChanged(''),
            icon: const Icon(Icons.clear),
            label: Text(_tr('clear', 'Clear')),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context, PaymentsController controller) {
    if (controller.isSearching) {
      final noResultsKey = _tr('no_results_found', 'No results found');
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
              noResultsKey,
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
            Icons.payment,
            size: 64,
            color: Get.theme.primaryColor.withOpacity(0.5),
          ),
          const SizedBox(height: 16),
          Text(
            _tr('no_payments_found', 'No payments found'),
            style: Get.textTheme.titleLarge?.copyWith(
              color: Get.theme.primaryColor,
              fontWeight: FontWeight.bold,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          Text(
            _tr('add_your_first_payment', 'Add your first payment'),
            style: Get.textTheme.bodyMedium?.copyWith(
              color: Colors.grey.shade600,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  void _showSearchDialog(
    BuildContext context,
    PaymentsController controller,
  ) {
    final textController = TextEditingController(text: controller.searchQuery.value);
    UltraSafeNavigation.dialog(
      AlertDialog(
        title: Text(_tr('search', 'Search')),
        content: TextField(
          controller: textController,
          decoration: InputDecoration(
            hintText: '${_tr('search_by_client_name', 'Search by client name')} / #123',
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            suffixIcon: IconButton(
              icon: const Icon(Icons.clear),
              onPressed: () {
                controller.onSearchChanged('');
                UltraSafeNavigation.back(context);
              },
            ),
          ),
          textInputAction: TextInputAction.search,
          onSubmitted: (value) {
            controller.onSearchChanged(value);
            UltraSafeNavigation.back(context);
          },
        ),
        actions: [
          TextButton(
            onPressed: () => UltraSafeNavigation.back(context),
            child: Text(_tr('cancel', 'Cancel')),
          ),
          ElevatedButton(
            onPressed: () {
              controller.onSearchChanged(textController.text);
              UltraSafeNavigation.back(context);
            },
            child: Text(_tr('search', 'Search')),
          ),
        ],
      ),
    );
  }

  void _showFilterBottomSheet(
    BuildContext context,
    PaymentsController controller,
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
                    _tr('active_filters', 'Active filters'),
                    style: Get.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 12),
                  Obx(() {
                    final chips = <Widget>[];
                    final client = controller.selectedClient.value;
                    final method = controller.selectedPaymentMethod.value;

                    if (client != null) {
                      chips.add(
                        _buildActiveFilterChip(
                          '${_tr('client', 'Client')}: ${client.companyName}',
                          () {
                            controller.selectedClient.value = null;
                            controller.applyFilters();
                          },
                        ),
                      );
                    }

                    if (method != null) {
                      chips.add(
                        _buildActiveFilterChip(
                          '${_tr('payment_method', 'Payment method')}: ${method.name}',
                          () {
                            controller.selectedPaymentMethod.value = null;
                            controller.applyFilters();
                          },
                        ),
                      );
                    }

                    if (chips.isEmpty) {
                      return Text(_tr('no_filters_applied', 'No filters applied'));
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
                      label: Text(_tr('add_filter', 'Add filter')),
                    ),
                  ),
                  const SizedBox(height: 10),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton(
                      onPressed: () {
                        controller.clearFilters();
                        SafeNavigation.back(sheetContext);
                      },
                      child: Text(_tr('clear_all_filters', 'Clear all filters')),
                    ),
                  ),
                  const SizedBox(height: 10),
                  Center(
                    child: ElevatedButton(
                      onPressed: () => SafeNavigation.back(sheetContext),
                      child: Text(_tr('close', 'Close')),
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
    PaymentsController controller,
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
                _tr('select_filter_category', 'Select filter category'),
                style: Get.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 12),
              ListTile(
                leading: const Icon(Icons.storefront_outlined),
                title: Text(_tr('client', 'Client')),
                onTap: () {
                  SafeNavigation.back(sheetContext);
                  _showClientFilterSheet(context, controller);
                },
              ),
              ListTile(
                leading: const Icon(Icons.credit_card),
                title: Text(_tr('payment_method', 'Payment method')),
                onTap: () {
                  SafeNavigation.back(sheetContext);
                  _showPaymentMethodFilterSheet(context, controller);
                },
              ),
            ],
          ),
        );
      },
    );
  }

  void _showClientFilterSheet(
    BuildContext context,
    PaymentsController controller,
  ) {
    final clients = controller.clients;
    Client? tempSelection = controller.selectedClient.value;
    final searchController = TextEditingController();

    SafeNavigation.bottomSheet(
      StatefulBuilder(
        builder: (sheetContext, setModalState) {
          final query = searchController.text.trim().toLowerCase();
          final filteredClients = query.isEmpty
              ? clients
              : clients
                  .where(
                    (client) => client.companyName.toLowerCase().contains(query),
                  )
                  .toList();

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
                    _tr('filter_by_client', 'Filter by client'),
                    style: Get.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: searchController,
                    decoration: InputDecoration(
                      hintText: _tr('search_clients', 'Search clients'),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      prefixIcon: const Icon(Icons.search),
                      suffixIcon: query.isEmpty
                          ? null
                          : IconButton(
                              icon: const Icon(Icons.clear),
                              onPressed: () {
                                searchController.clear();
                                setModalState(() {});
                              },
                            ),
                    ),
                    onChanged: (_) => setModalState(() {}),
                  ),
                  const SizedBox(height: 16),
                  ConstrainedBox(
                    constraints: const BoxConstraints(maxHeight: 320),
                    child: filteredClients.isEmpty
                        ? Center(
                            child: Padding(
                              padding: const EdgeInsets.symmetric(vertical: 24),
                              child: Text(
                                _tr('no_results', 'No results'),
                                style: Get.textTheme.bodyMedium?.copyWith(color: Colors.grey),
                              ),
                            ),
                          )
                        : ListView.builder(
                            shrinkWrap: true,
                            itemCount: filteredClients.length + 1,
                            itemBuilder: (ctx, index) {
                              if (index == 0) {
                                return RadioListTile<Client?>(
                                  title: Text(_tr('all_clients', 'All clients')),
                                  value: null,
                                  groupValue: tempSelection,
                                  onChanged: (value) => setModalState(() => tempSelection = value),
                                );
                              }
                              final client = filteredClients[index - 1];
                              return RadioListTile<Client?>(
                                title: Text(client.companyName),
                                value: client,
                                groupValue: tempSelection,
                                onChanged: (value) => setModalState(() => tempSelection = value),
                              );
                            },
                          ),
                  ),
                  const SizedBox(height: 20),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () => setModalState(() => tempSelection = null),
                          child: Text(_tr('clear', 'Clear')),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: ElevatedButton(
                          onPressed: () {
                            controller.selectedClient.value = tempSelection;
                            controller.applyFilters();
                            SafeNavigation.back(sheetContext);
                          },
                          child: Text(_tr('apply', 'Apply')),
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

  void _showPaymentMethodFilterSheet(
    BuildContext context,
    PaymentsController controller,
  ) {
    final methods = controller.paymentMethods;
    PaymentMethod? tempSelection = controller.selectedPaymentMethod.value;

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
                    _tr('filter_by_payment_method', 'Filter by payment method'),
                    style: Get.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 16),
                  ConstrainedBox(
                    constraints: const BoxConstraints(maxHeight: 320),
                    child: ListView.builder(
                      shrinkWrap: true,
                      itemCount: methods.length + 1,
                      itemBuilder: (ctx, index) {
                        if (index == 0) {
                          return RadioListTile<PaymentMethod?>(
                            title: Text(_tr('all_methods', 'All methods')),
                            value: null,
                            groupValue: tempSelection,
                            onChanged: (value) => setModalState(() => tempSelection = value),
                          );
                        }
                        final method = methods[index - 1];
                        return RadioListTile<PaymentMethod?>(
                          title: Text(method.name),
                          value: method,
                          groupValue: tempSelection,
                          onChanged: (value) => setModalState(() => tempSelection = value),
                        );
                      },
                    ),
                  ),
                  const SizedBox(height: 20),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () => setModalState(() => tempSelection = null),
                          child: Text(_tr('clear', 'Clear')),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: ElevatedButton(
                          onPressed: () {
                            controller.selectedPaymentMethod.value = tempSelection;
                            controller.applyFilters();
                            SafeNavigation.back(sheetContext);
                          },
                          child: Text(_tr('apply', 'Apply')),
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

  Widget _buildPaymentCard(
    BuildContext context,
    Payment payment,
    PaymentsController controller,
  ) {
    final theme = Theme.of(context);
    final Color gradientStart = theme.colorScheme.primary.withOpacity(0.92);
    final Color gradientEnd = theme.colorScheme.primary.withOpacity(0.72);
    final Color headerTextColor = Colors.white;
    final bool hasTransactionId = (payment.transactionId?.trim().isNotEmpty ?? false);
    final bool hasNotes = (payment.notes ?? '').trim().isNotEmpty;

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
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: () => _showPaymentDetailsDialog(context, payment),
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
                          '${_tr('receipt_no', 'Receipt')} #${payment.id}',
                          style: theme.textTheme.titleMedium?.copyWith(
                            color: headerTextColor,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          payment.formattedDateTime,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: headerTextColor.withOpacity(0.9),
                          ),
                        ),
                      ],
                    ),
                  ),
                  _buildAmountChip(context, payment.formattedAmount),
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
                          icon: Icons.payment_outlined,
                          label: _tr('payment_method', 'Payment method'),
                          value: payment.methodName,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _buildInfoTile(
                          context,
                          icon: Icons.person_pin_circle,
                          label: _tr('client', 'Client'),
                          value: payment.clientName,
                          valueColor: theme.colorScheme.primary,
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
                          icon: Icons.account_balance_wallet_outlined,
                          label: _tr('amount', 'Amount'),
                          value: payment.formattedAmount,
                          valueColor: theme.colorScheme.primary,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _buildInfoTile(
                          context,
                          icon: Icons.access_time,
                          label: _tr('date', 'Date'),
                          value: payment.formattedDate,
                        ),
                      ),
                    ],
                  ),
                  if (hasTransactionId) ...[
                    const SizedBox(height: 12),
                    _buildInfoTile(
                      context,
                      icon: Icons.receipt_long,
                      label: _tr('transaction_id', 'Transaction ID'),
                      value: payment.transactionId!,
                      valueColor: theme.colorScheme.secondary,
                    ),
                  ],
                  if (hasNotes) ...[
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: theme.colorScheme.primaryContainer.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(Icons.notes, size: 18, color: theme.colorScheme.primary),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              payment.notes!,
                              style: theme.textTheme.bodySmall,
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

  Widget _buildAmountChip(BuildContext context, String amount) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.92),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Text(
        amount,
        style: theme.textTheme.titleSmall?.copyWith(
          color: theme.colorScheme.primary,
          fontWeight: FontWeight.bold,
        ),
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
                  color: theme.colorScheme.primary,
                  fontWeight: FontWeight.w600,
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

  void _showPaymentDetailsDialog(BuildContext context, Payment payment, {bool isNew = false}) {
    final PaymentsController controller = Get.find<PaymentsController>();
    final GlobalKey printableKey = GlobalKey();

    String? safeName;
    try {
      final safe = controller.safes.firstWhere((s) => s.id == payment.safeId);
      safeName = safe.name;
    } catch (e) {
      debugPrint('Could not find safe with ID: ${payment.safeId}');
    }

    String? companyName;
    String? companyLogoUrl;
    String? representativeName;

    if (Get.isRegistered<AuthController>()) {
      final authController = Get.find<AuthController>();
      final resolvedName = authController.companyName.value.trim();
      final resolvedLogo = authController.companyLogo.value.trim();
      companyName = resolvedName.isNotEmpty ? resolvedName : null;
      companyLogoUrl = resolvedLogo.isNotEmpty ? resolvedLogo : null;
      representativeName = authController.currentUser.value?.name;
    }

    UltraSafeNavigation.dialog(
      Dialog(
        insetPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 24),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        child: LayoutBuilder(
          builder: (dialogContext, constraints) {
            final mediaWidth = MediaQuery.of(dialogContext).size.width - 16;
            final contentWidth = mediaWidth.clamp(320.0, 600.0);
            final printableContent = _buildPrintablePaymentReceipt(
              context: dialogContext,
              payment: payment,
              safeName: safeName,
              companyName: companyName ?? _tr('company_name_placeholder', 'Company Name'),
              companyLogoUrl: companyLogoUrl,
              representativeName: representativeName,
              maxWidth: contentWidth,
            );

            return ConstrainedBox(
              constraints: BoxConstraints(
                minWidth: contentWidth,
                maxWidth: contentWidth,
              ),
              child: IntrinsicHeight(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Container(
                      padding: const EdgeInsets.fromLTRB(20, 20, 20, 12),
                      decoration: BoxDecoration(
                        color: Theme.of(dialogContext).colorScheme.primary.withOpacity(0.06),
                        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            isNew ? _tr('payment_added_successfully', 'Payment added successfully') : _tr('payment_details', 'Payment details'),
                            style: Theme.of(dialogContext).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
                          ),
                          if (isNew)
                            Padding(
                              padding: const EdgeInsets.only(top: 6.0),
                              child: Text(
                                _tr('you_can_print_receipt', 'You can print the receipt or close this dialog.'),
                                style: Theme.of(dialogContext).textTheme.bodySmall?.copyWith(color: Colors.grey.shade700),
                              ),
                            ),
                        ],
                      ),
                    ),
                    Flexible(
                      child: SingleChildScrollView(
                        padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
                        child: RepaintBoundary(
                          key: printableKey,
                          child: printableContent,
                        ),
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
                      child: Row(
                        children: [
                          Expanded(
                            child: OutlinedButton.icon(
                              icon: const Icon(Icons.print),
                              label: Text(_tr('print', 'Print')),
                              onPressed: () {
                                ThermalPrinterService.to.printWidget(
                                  widgetKey: printableKey,
                                  successMessage: _tr('payment_print_success', 'Payment printed successfully'),
                                  errorPrefix: _tr('payment_print_failed', 'Payment print failed'),
                                );
                              },
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: ElevatedButton(
                              child: Text(_tr('close', 'Close')),
                              onPressed: () => UltraSafeNavigation.back(dialogContext),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _buildPrintablePaymentReceipt({
    required BuildContext context,
    required Payment payment,
    required String companyName,
    String? companyLogoUrl,
    String? representativeName,
    String? safeName,
    double? maxWidth,
  }) {
    final theme = Theme.of(context);
    final bool isRtl = Directionality.of(context) == TextDirection.rtl;
    final double targetWidth = maxWidth ?? MediaQuery.of(context).size.width;
    final labelStyle = theme.textTheme.bodyMedium?.copyWith(
          color: Colors.grey.shade800,
          fontWeight: FontWeight.w600,
        ) ??
        TextStyle(
          color: Colors.grey.shade800,
          fontSize: 14,
          fontWeight: FontWeight.w600,
        );
    final valueStyle = theme.textTheme.bodyMedium?.copyWith(
          color: Colors.black,
          fontWeight: FontWeight.w700,
        ) ??
        const TextStyle(
          color: Colors.black,
          fontSize: 14,
          fontWeight: FontWeight.w700,
        );

    final rows = <Widget>[
      _buildDetailRow(
        label: _tr('receipt_no', 'Receipt No.'),
        value: '#${payment.id}',
        labelStyle: labelStyle,
        valueStyle: valueStyle,
        isRtl: isRtl,
      ),
      _buildDetailRow(
        label: _tr('client', 'Client'),
        value: payment.clientName,
        labelStyle: labelStyle,
        valueStyle: valueStyle,
        isRtl: isRtl,
      ),
      if (representativeName != null && representativeName.trim().isNotEmpty)
        _buildDetailRow(
          label: _tr('representative', 'Representative'),
          value: representativeName.trim(),
          labelStyle: labelStyle,
          valueStyle: valueStyle,
          isRtl: isRtl,
        ),
      _buildDetailRow(
        label: _tr('payment_method', 'Payment method'),
        value: payment.methodName,
        labelStyle: labelStyle,
        valueStyle: valueStyle.copyWith(fontWeight: FontWeight.w600),
        isRtl: isRtl,
      ),
      _buildDetailRow(
        label: _tr('amount', 'Amount'),
        value: payment.formattedAmount,
        labelStyle: labelStyle,
        valueStyle: valueStyle.copyWith(color: theme.colorScheme.primary),
        isRtl: isRtl,
      ),
      _buildDetailRow(
        label: _tr('date', 'Date'),
        value: payment.formattedDateTime,
        labelStyle: labelStyle,
        valueStyle: valueStyle,
        isRtl: isRtl,
      ),
      if (payment.transactionId != null && payment.transactionId!.trim().isNotEmpty)
        _buildDetailRow(
          label: _tr('transaction_id', 'Transaction ID'),
          value: payment.transactionId!.trim(),
          labelStyle: labelStyle,
          valueStyle: valueStyle,
          isRtl: isRtl,
        ),
      if (safeName != null && safeName.trim().isNotEmpty)
        _buildDetailRow(
          label: _tr('safe', 'Safe'),
          value: safeName.trim(),
          labelStyle: labelStyle,
          valueStyle: valueStyle,
          isRtl: isRtl,
        ),
    ];

    return Container(
      width: targetWidth,
      padding: const EdgeInsets.fromLTRB(20, 22, 20, 22),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey.shade300, width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              _buildReceiptLogo(companyLogoUrl),
              const SizedBox(height: 12),
              Text(
                companyName,
                style: theme.textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w800,
                      color: theme.colorScheme.primary,
                      fontSize: 20,
                    ) ??
                    TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w800,
                      color: theme.colorScheme.primary,
                    ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 6),
              Text(
                _tr('payment_receipt', 'Payment receipt'),
                style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                      color: Colors.black87,
                    ) ??
                    const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: Colors.black87,
                    ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Divider(color: Colors.grey.shade400, thickness: 1),
          const SizedBox(height: 10),
          ...rows,
          const SizedBox(height: 10),
          Divider(color: Colors.grey.shade400, thickness: 1),
          if (payment.notes != null && payment.notes!.trim().isNotEmpty) ...[
            const SizedBox(height: 10),
            Text(
              _tr('notes', 'Notes'),
              style: theme.textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: theme.colorScheme.primary,
                  ) ??
                  TextStyle(
                    fontWeight: FontWeight.w700,
                    color: theme.colorScheme.primary,
                  ),
            ),
            const SizedBox(height: 4),
            Text(
              payment.notes!.trim(),
              style: theme.textTheme.bodyMedium,
              textAlign: isRtl ? TextAlign.right : TextAlign.left,
            ),
            const SizedBox(height: 10),
            Divider(color: Colors.grey.shade400, thickness: 1),
          ],
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _buildSignatureLine(
                  context,
                  _tr('customer_signature', 'Customer signature'),
                  isRtl,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildSignatureLine(
                  context,
                  _tr('representative_signature', 'Representative signature'),
                  isRtl,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildDetailRow({
    required String label,
    required String value,
    required TextStyle labelStyle,
    required TextStyle valueStyle,
    required bool isRtl,
  }) {
    final textAlign = isRtl ? TextAlign.right : TextAlign.left;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            flex: 4,
            child: Text(
              label,
              style: labelStyle,
              textAlign: isRtl ? TextAlign.right : TextAlign.left,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            flex: 5,
            child: Text(
              value,
              style: valueStyle,
              textAlign: textAlign,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildReceiptLogo(String? logoUrl) {
    const double size = 72;
    return ClipRRect(
      borderRadius: BorderRadius.circular(14),
      child: Container(
        width: size,
        height: size,
        color: Colors.grey.shade200,
        child: (logoUrl != null && logoUrl.isNotEmpty)
            ? Image.network(
                logoUrl,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) {
                  return Icon(Icons.business, size: 36, color: Colors.grey.shade600);
                },
              )
            : Icon(Icons.business, size: 36, color: Colors.grey.shade600),
      ),
    );
  }

  Widget _buildSignatureLine(BuildContext context, String label, bool isRtl) {
    final theme = Theme.of(context);
    final alignment = isRtl ? Alignment.centerRight : Alignment.centerLeft;
    return Column(
      crossAxisAlignment: isRtl ? CrossAxisAlignment.end : CrossAxisAlignment.start,
      children: [
        Align(
          alignment: alignment,
          child: Container(
            height: 1,
            width: double.infinity,
            color: Colors.grey.shade500,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          label,
          style: theme.textTheme.bodySmall?.copyWith(
                color: Colors.grey.shade700,
                fontWeight: FontWeight.w600,
              ) ??
              TextStyle(
                color: Colors.grey.shade700,
                fontWeight: FontWeight.w600,
              ),
          textAlign: isRtl ? TextAlign.right : TextAlign.left,
        ),
      ],
    );
  }

  String _tr(String key, String fallback) {
    final value = key.tr;
    return value == key ? fallback : value;
  }
}
