// lib/modules/dashboard/screens/dashboard_screen.dart
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '/core/routes/app_routes.dart';
import '/data/models/client.dart';
import '/data/models/payment.dart';
import '/modules/clients/controllers/clients_controller.dart';
import '/modules/dashboard/controllers/dashboard_controller.dart';
import '/modules/deliveries/controllers/pending_deliveries_controller.dart';
import '/modules/home/controllers/home_controller.dart';
import '/modules/notifications/controllers/notification_controller.dart';
import '/modules/payments/controllers/payments_controller.dart';
import '/modules/safes/controllers/safes_controller.dart';
import '/modules/shared/controllers/global_data_controller.dart';
import '/modules/visits/controllers/visits_controller.dart';
import '/modules/warehouse/controllers/warehouse_controller.dart';
import '/shared_widgets/app_filter_bottom_sheet.dart';
import '/shared_widgets/safe_navigation.dart';
import '/shared_widgets/unified_app_bar.dart';
import '/shared_widgets/unified_bottom_nav.dart';
import '/shared_widgets/ultra_safe_navigation.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  late final DashboardController _dashboardController;
  late final NotificationController _notificationController;

  @override
  void initState() {
    super.initState();
    _dashboardController = Get.find<DashboardController>();
    _notificationController = Get.find<NotificationController>();

    WidgetsBinding.instance.addPostFrameCallback((_) {
      final dynamic argument = Get.arguments;
      if (argument is int && argument != 0) {
        _dashboardController.onItemTapped(argument);
      } else if (argument is Map && argument.containsKey('index')) {
        final index = argument['index'] as int;
        _dashboardController.onItemTapped(index);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return WillPopScope(
      onWillPop: () async => SafeNavigation.showExitConfirmation(context),
      child: Obx(() {
        final currentIndex = _dashboardController.selectedIndex.value;
        final actions = _actionsForIndex(currentIndex);

        return Scaffold(
          backgroundColor: Theme.of(context).scaffoldBackgroundColor,
          appBar: UnifiedAppBar(
            title: _dashboardController.titleForIndex(currentIndex).tr,
            subtitle: _dashboardController.subtitleKey.tr,
            actions: actions,
          ),
          body: PageView(
            controller: _dashboardController.pageController,
            physics: const NeverScrollableScrollPhysics(),
            onPageChanged: _dashboardController.onPageChanged,
            children: _dashboardController.pages,
          ),
          bottomNavigationBar: UnifiedBottomNav(
            currentIndex: currentIndex,
            onTap: _dashboardController.onItemTapped,
            items: _buildNavItems(),
          ),
        );
      }),
    );
  }

  List<UnifiedNavItem> _buildNavItems() {
    final unreadCount = _notificationController.unreadCount.value;
    return _dashboardController.tabConfigs.asMap().entries.map((entry) {
      final config = entry.value;
      final showBadge = config.labelKey == 'profile';
      return UnifiedNavItem(
        icon: config.icon,
        activeIcon: config.activeIcon,
        label: config.labelKey.tr,
        badgeCount: showBadge && unreadCount > 0 ? unreadCount : null,
      );
    }).toList();
  }

  List<Widget>? _actionsForIndex(int index) {
    // Cash role actions
    if (_dashboardController.isCash) {
      switch (index) {
        case 0: // Home
          return [
            _buildRefreshAction(),
            _buildNotificationAction(),
          ];
        case 1: // Payments
          final paymentsController = Get.isRegistered<PaymentsController>() ? Get.find<PaymentsController>() : null;
          return [
            IconButton(
              icon: const Icon(Icons.refresh),
              onPressed: paymentsController == null ? null : () => paymentsController.refreshData(),
              tooltip: 'refresh'.tr,
            ),
            IconButton(
              icon: const Icon(Icons.search),
              onPressed: paymentsController == null ? null : () => _showPaymentsSearchDialog(paymentsController),
              tooltip: 'search'.tr,
            ),
            IconButton(
              icon: const Icon(Icons.filter_list),
              onPressed: paymentsController == null ? null : () => _showPaymentsFilterBottomSheet(paymentsController),
              tooltip: 'filters'.tr,
            ),
          ];
        case 2: // Safes
          final safesController = Get.isRegistered<SafesController>() ? Get.find<SafesController>() : null;
          return [
            IconButton(
              icon: const Icon(Icons.refresh),
              onPressed: safesController == null ? null : () => safesController.refreshSafes(),
              tooltip: 'refresh'.tr,
            ),
          ];
        case 3: // Profile
          return [
            _buildNotificationAction(),
          ];
        default:
          return null;
      }
    }
    
    // Store keeper role actions
    if (_dashboardController.isStoreKeeper) {
      switch (index) {
        case 0:
          return [
            _buildRefreshAction(),
            _buildNotificationAction(),
          ];
        case 1:
          final pendingController = Get.isRegistered<PendingDeliveriesController>() ? Get.find<PendingDeliveriesController>() : null;
          return [
            IconButton(
              icon: const Icon(Icons.refresh),
              onPressed: pendingController == null ? null : () => pendingController.loadPending(),
              tooltip: 'refresh'.tr,
            ),
            IconButton(
              icon: const Icon(Icons.search),
              onPressed: pendingController == null ? null : () => _showDeliveriesSearchDialog(pendingController),
              tooltip: 'search'.tr,
            ),
            IconButton(
              icon: const Icon(Icons.filter_list),
              onPressed: pendingController == null ? null : () => _showDeliveriesFilterBottomSheet(pendingController),
              tooltip: 'filters'.tr,
            ),
          ];
        case 2:
          final paymentsController = Get.isRegistered<PaymentsController>() ? Get.find<PaymentsController>() : null;
          return [
            IconButton(
              icon: const Icon(Icons.refresh),
              onPressed: paymentsController == null ? null : () => paymentsController.refreshData(),
              tooltip: 'refresh'.tr,
            ),
            IconButton(
              icon: const Icon(Icons.search),
              onPressed: paymentsController == null ? null : () => _showPaymentsSearchDialog(paymentsController),
              tooltip: 'search'.tr,
            ),
            IconButton(
              icon: const Icon(Icons.filter_list),
              onPressed: paymentsController == null ? null : () => _showPaymentsFilterBottomSheet(paymentsController),
              tooltip: 'filters'.tr,
            ),
          ];
        case 3:
          final safesController = Get.isRegistered<SafesController>() ? Get.find<SafesController>() : null;
          return [
            IconButton(
              icon: const Icon(Icons.refresh),
              onPressed: safesController == null ? null : () => safesController.refreshSafes(),
              tooltip: 'refresh'.tr,
            ),
          ];
        case 4:
          return [
            _buildNotificationAction(),
          ];
        default:
          return null;
      }
    }

    switch (index) {
      case 0:
        return [
          _buildRefreshAction(),
          _buildNotificationAction(),
        ];
      case 1:
        return [
          Obx(() {
            final clientsController = Get.isRegistered<ClientsController>() ? Get.find<ClientsController>() : null;
            final isRefreshing = clientsController?.isLoading.value ?? false;
            return IconButton(
              icon: isRefreshing
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                      ),
                    )
                  : const Icon(Icons.refresh),
              onPressed: isRefreshing
                  ? null
                  : () {
                      if (clientsController != null) {
                        clientsController.refreshClients();
                        Get.snackbar(
                          'refreshing'.tr,
                          'refreshing_clients_data'.tr,
                          snackPosition: SnackPosition.BOTTOM,
                          backgroundColor: Get.theme.primaryColor.withOpacity(0.8),
                          colorText: Colors.white,
                          duration: const Duration(seconds: 2),
                        );
                      }
                    },
              tooltip: isRefreshing ? 'refreshing'.tr : 'refresh'.tr,
            );
          }),
          IconButton(
            icon: const Icon(Icons.filter_list),
            onPressed: () {
              Get.bottomSheet(
                const AppFilterBottomSheet(),
                backgroundColor: Get.theme.canvasColor,
                shape: const RoundedRectangleBorder(
                  borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
                ),
                isScrollControlled: true,
              );
            },
            tooltip: 'filter'.tr,
          ),
        ];
      case 2:
        return [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              if (Get.isRegistered<WarehouseController>()) {
                Get.find<WarehouseController>().fetchWarehouses();
              }
            },
            tooltip: 'refresh'.tr,
          ),
        ];
      case 3:
        final visitsController = Get.isRegistered<VisitsController>() ? Get.find<VisitsController>() : null;
        return [
          IconButton(
            icon: const Icon(Icons.location_on),
            onPressed: () async {
              if (visitsController == null) return;
              final position = await visitsController.getCurrentLocation();
              if (position != null) {
                Get.snackbar(
                  'location_test'.tr,
                  'Location: ${position.latitude}, ${position.longitude}',
                  snackPosition: SnackPosition.BOTTOM,
                  backgroundColor: Colors.green,
                  colorText: Colors.white,
                );
              }
            },
            tooltip: 'location_test'.tr,
          ),
          IconButton(
            icon: const Icon(Icons.filter_list),
            onPressed: () {
              if (visitsController == null) return;
              _showVisitsFilterDialog(visitsController);
            },
            tooltip: 'filter_visits'.tr,
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => visitsController?.refreshVisits(),
            tooltip: 'refresh'.tr,
          ),
        ];
      case 4:
        return [
          _buildNotificationAction(),
        ];
      default:
        return null;
    }
  }

  Widget _buildNotificationAction() {
    final unreadCount = _notificationController.unreadCount.value;
    return Stack(
      clipBehavior: Clip.none,
      children: [
        IconButton(
          icon: const Icon(Icons.notifications),
          onPressed: () => Get.toNamed(AppRoutes.notifications),
          tooltip: 'notifications'.tr,
        ),
        if (unreadCount > 0)
          Positioned(
            right: 4,
            top: 4,
            child: Container(
              padding: const EdgeInsets.all(2),
              decoration: const BoxDecoration(
                color: Colors.red,
                shape: BoxShape.circle,
              ),
              constraints: const BoxConstraints(minWidth: 18, minHeight: 18),
              child: Center(
                child: Text(
                  unreadCount > 99 ? '99+' : unreadCount.toString(),
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildRefreshAction() {
    return IconButton(
      icon: const Icon(Icons.refresh),
      onPressed: () async {
        // Refresh safes and home data
        final global = Get.find<GlobalDataController>();
        await global.loadSafes(forceRefresh: true);
        
        // Also refresh home controller if available
        if (Get.isRegistered<HomeController>()) {
          Get.find<HomeController>().refreshData();
        }
        
        Get.snackbar(
          'refresh'.tr,
          'data_refreshed'.tr,
          snackPosition: SnackPosition.BOTTOM,
          backgroundColor: Get.theme.primaryColor.withOpacity(0.8),
          colorText: Colors.white,
          duration: const Duration(seconds: 2),
        );
      },
      tooltip: 'refresh'.tr,
    );
  }

  void _showVisitsFilterDialog(VisitsController controller) {
    showDialog(
      context: Get.context!,
      builder: (context) => AlertDialog(
        title: Text('filter_visits'.tr),
        content: SizedBox(
          width: double.maxFinite,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Obx(() {
                final options = const [
                  ['All', 'all'],
                  ['Started', 'started'],
                  ['Completed', 'completed'],
                  ['Cancelled', 'cancelled'],
                ];
                return DropdownButtonFormField<String>(
                  value: controller.selectedStatus.value,
                  decoration: InputDecoration(
                    labelText: 'status'.tr,
                    border: const OutlineInputBorder(),
                  ),
                  items: options
                      .map((pair) => DropdownMenuItem(
                            value: pair[0],
                            child: Text(pair[1].tr),
                          ))
                      .toList(),
                  onChanged: (value) => controller.selectedStatus.value = value ?? 'All',
                );
              }),
              const SizedBox(height: 16),
              Obx(() => DropdownButtonFormField<Client>(
                    value: controller.selectedClient.value,
                    decoration: InputDecoration(
                      labelText: 'client'.tr,
                      border: const OutlineInputBorder(),
                    ),
                    items: [
                      DropdownMenuItem<Client>(
                        value: null,
                        child: Text('all_clients'.tr),
                      ),
                      ...controller.clients.map((client) => DropdownMenuItem(
                            value: client,
                            child: SizedBox(
                              width: 200,
                              child: Text(
                                client.companyName,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ))
                    ],
                    onChanged: (value) => controller.selectedClient.value = value,
                  )),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () {
              controller.clearFilters();
              UltraSafeNavigation.back(context);
            },
            child: Text('clear'.tr),
          ),
          ElevatedButton(
            onPressed: () {
              controller.applyFilters();
              UltraSafeNavigation.back(context);
            },
            child: Text('apply'.tr),
          ),
        ],
      ),
    );
  }

  void _showPaymentsSearchDialog(PaymentsController controller) {
    final textController = TextEditingController(text: controller.searchQuery.value);
    UltraSafeNavigation.dialog(
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
                UltraSafeNavigation.back(Get.context!);
              },
            ),
          ),
          textInputAction: TextInputAction.search,
          onSubmitted: (value) {
            controller.onSearchChanged(value);
            UltraSafeNavigation.back(Get.context!);
          },
        ),
        actions: [
          TextButton(
            onPressed: () => UltraSafeNavigation.back(Get.context!),
            child: Text('cancel'.tr),
          ),
          ElevatedButton(
            onPressed: () {
              controller.onSearchChanged(textController.text);
              UltraSafeNavigation.back(Get.context!);
            },
            child: Text('search'.tr),
          ),
        ],
      ),
    );
  }

  void _showPaymentsFilterBottomSheet(PaymentsController controller) {
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
                    final chips = <Widget>[];
                    final client = controller.selectedClient.value;
                    final method = controller.selectedPaymentMethod.value;

                    if (client != null) {
                      chips.add(
                        _buildPaymentActiveFilterChip(
                          '${'client'.tr}: ${client.companyName}',
                          () {
                            controller.selectedClient.value = null;
                            controller.applyFilters();
                          },
                        ),
                      );
                    }

                    if (method != null) {
                      chips.add(
                        _buildPaymentActiveFilterChip(
                          '${'payment_method'.tr}: ${method.name}',
                          () {
                            controller.selectedPaymentMethod.value = null;
                            controller.applyFilters();
                          },
                        ),
                      );
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
                        SafeNavigation.bottomSheet(
                          _buildPaymentFilterCategorySelectionSheet(controller),
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

  Widget _buildPaymentFilterCategorySelectionSheet(PaymentsController controller) {
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
                leading: const Icon(Icons.storefront_outlined),
                title: Text('client'.tr),
                onTap: () {
                  SafeNavigation.back(sheetContext);
                  _showPaymentClientFilterSheet(controller);
                },
              ),
              ListTile(
                leading: const Icon(Icons.credit_card),
                title: Text('payment_method'.tr),
                onTap: () {
                  SafeNavigation.back(sheetContext);
                  _showPaymentMethodFilterSheet(controller);
                },
              ),
            ],
          ),
        );
      },
    );
  }

  void _showPaymentClientFilterSheet(PaymentsController controller) {
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
                    'filter_by_client'.tr,
                    style: Get.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: searchController,
                    decoration: InputDecoration(
                      hintText: 'search_clients'.tr,
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
                                'no_results'.tr,
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
                                  title: Text('all_clients'.tr),
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
                          child: Text('clear'.tr),
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

  void _showPaymentMethodFilterSheet(PaymentsController controller) {
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
                    'filter_by_payment_method'.tr,
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
                            title: Text('all_methods'.tr),
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
                          child: Text('clear'.tr),
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

  Widget _buildPaymentActiveFilterChip(String label, VoidCallback onRemove) {
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

  // Deliveries Search & Filter Methods
  void _showDeliveriesSearchDialog(PendingDeliveriesController controller) {
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
                SafeNavigation.back(Get.context!);
              },
            ),
          ),
          textInputAction: TextInputAction.search,
          onSubmitted: (value) {
            controller.onSearchChanged(value);
            SafeNavigation.back(Get.context!);
          },
        ),
        actions: [
          TextButton(
            onPressed: () => SafeNavigation.back(Get.context!),
            child: Text('cancel'.tr),
          ),
          ElevatedButton(
            onPressed: () {
              controller.onSearchChanged(textController.text);
              SafeNavigation.back(Get.context!);
            },
            child: Text('search'.tr),
          ),
        ],
      ),
    );
  }

  void _showDeliveriesFilterBottomSheet(PendingDeliveriesController controller) {
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
                    final chips = <Widget>[];
                    final status = controller.statusFilter.value;
                    final warehouse = controller.warehouseFilter.value;
                    final client = controller.clientFilter.value;

                    if (status.isNotEmpty) {
                      chips.add(
                        _buildDeliveryActiveFilterChip(
                          '${'status'.tr}: ${_deliveryStatusLabel(status)}',
                          () {
                            controller.applyStatusFilter('');
                          },
                        ),
                      );
                    }

                    if (warehouse.isNotEmpty) {
                      chips.add(
                        _buildDeliveryActiveFilterChip(
                          '${'warehouse'.tr}: $warehouse',
                          () {
                            controller.applyWarehouseFilter('');
                          },
                        ),
                      );
                    }

                    if (client.isNotEmpty) {
                      chips.add(
                        _buildDeliveryActiveFilterChip(
                          '${'client'.tr}: $client',
                          () {
                            controller.applyClientFilter('');
                          },
                        ),
                      );
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
                        SafeNavigation.bottomSheet(
                          _buildDeliveryFilterCategorySelectionSheet(controller),
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

  Widget _buildDeliveryFilterCategorySelectionSheet(PendingDeliveriesController controller) {
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
                  _showDeliveryStatusFilterSheet(controller);
                },
              ),
              ListTile(
                leading: const Icon(Icons.warehouse_outlined),
                title: Text('warehouse'.tr),
                onTap: () {
                  SafeNavigation.back(sheetContext);
                  _showDeliveryWarehouseFilterSheet(controller);
                },
              ),
              ListTile(
                leading: const Icon(Icons.storefront_outlined),
                title: Text('client'.tr),
                onTap: () {
                  SafeNavigation.back(sheetContext);
                  _showDeliveryClientFilterSheet(controller);
                },
              ),
            ],
          ),
        );
      },
    );
  }

  void _showDeliveryStatusFilterSheet(PendingDeliveriesController controller) {
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
                      _buildDeliveryFilterChoiceChip(
                        label: 'all'.tr,
                        isSelected: tempStatus.isEmpty,
                        onSelected: () => setModalState(() => tempStatus = ''),
                      ),
                      ...statuses.map(
                        (status) => _buildDeliveryFilterChoiceChip(
                          label: _deliveryStatusLabel(status),
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

  Widget _buildDeliveryActiveFilterChip(String label, VoidCallback onRemove) {
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

  Widget _buildDeliveryFilterChoiceChip({
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

  String _deliveryStatusLabel(String normalized) {
    if (normalized.isEmpty) {
      return 'all'.tr;
    }
    final translation = normalized.tr;
    if (translation == normalized) {
      return normalized.split('_').map((word) => word.isEmpty ? '' : word[0].toUpperCase() + word.substring(1)).join(' ');
    }
    return translation;
  }

  void _showDeliveryWarehouseFilterSheet(PendingDeliveriesController controller) {
    final warehouses = controller.availableWarehouses;
    String tempWarehouse = controller.warehouseFilter.value;

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
                    'filter_by_warehouse'.tr,
                    style: Get.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 16),
                  ConstrainedBox(
                    constraints: const BoxConstraints(maxHeight: 320),
                    child: ListView.builder(
                      shrinkWrap: true,
                      itemCount: warehouses.length + 1,
                      itemBuilder: (ctx, index) {
                        if (index == 0) {
                          return RadioListTile<String>(
                            title: Text('all_warehouses'.tr),
                            value: '',
                            groupValue: tempWarehouse,
                            onChanged: (value) => setModalState(() => tempWarehouse = value ?? ''),
                          );
                        }
                        final warehouse = warehouses[index - 1];
                        return RadioListTile<String>(
                          title: Text(warehouse),
                          value: warehouse,
                          groupValue: tempWarehouse,
                          onChanged: (value) => setModalState(() => tempWarehouse = value ?? ''),
                        );
                      },
                    ),
                  ),
                  const SizedBox(height: 20),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () => setModalState(() => tempWarehouse = ''),
                          child: Text('clear'.tr),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: ElevatedButton(
                          onPressed: () {
                            controller.applyWarehouseFilter(tempWarehouse);
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

  void _showDeliveryClientFilterSheet(PendingDeliveriesController controller) {
    final clients = controller.availableClients;
    String tempClient = controller.clientFilter.value;
    final searchController = TextEditingController();

    SafeNavigation.bottomSheet(
      StatefulBuilder(
        builder: (sheetContext, setModalState) {
          final query = searchController.text.trim().toLowerCase();
          final filteredClients = query.isEmpty ? clients : clients.where((client) => client.toLowerCase().contains(query)).toList();

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
                    'filter_by_client'.tr,
                    style: Get.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: searchController,
                    decoration: InputDecoration(
                      hintText: 'search_clients'.tr,
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
                                'no_results'.tr,
                                style: Get.textTheme.bodyMedium?.copyWith(color: Colors.grey),
                              ),
                            ),
                          )
                        : ListView.builder(
                            shrinkWrap: true,
                            itemCount: filteredClients.length + 1,
                            itemBuilder: (ctx, index) {
                              if (index == 0) {
                                return RadioListTile<String>(
                                  title: Text('all_clients'.tr),
                                  value: '',
                                  groupValue: tempClient,
                                  onChanged: (value) => setModalState(() => tempClient = value ?? ''),
                                );
                              }
                              final client = filteredClients[index - 1];
                              return RadioListTile<String>(
                                title: Text(client),
                                value: client,
                                groupValue: tempClient,
                                onChanged: (value) => setModalState(() => tempClient = value ?? ''),
                              );
                            },
                          ),
                  ),
                  const SizedBox(height: 20),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () => setModalState(() => tempClient = ''),
                          child: Text('clear'.tr),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: ElevatedButton(
                          onPressed: () {
                            controller.applyClientFilter(tempClient);
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
}
