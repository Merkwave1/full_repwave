// lib/modules/dashboard/controllers/dashboard_controller.dart
import 'package:get/get.dart';
import 'package:flutter/material.dart';
import '/modules/home/screens/home_screen.dart';
import '/modules/clients/screens/clients_screen.dart';
import '/modules/warehouse/screens/warehouse_screen.dart'; // Changed from inventory
import '/modules/visits/screens/visits_screen.dart';
import '/modules/profile/screens/profile_screen.dart';
import '/modules/deliveries/screens/pending_deliveries_screen.dart';
import '/modules/safes/screens/safes_screen.dart';
import '/modules/payments/screens/payments_screen.dart';
import '/modules/auth/controllers/auth_controller.dart';
import '/shared_widgets/ultra_safe_navigation.dart';
import '/shared_widgets/safe_navigation.dart';

class DashboardTabConfig {
  final IconData icon;
  final IconData activeIcon;
  final String labelKey;
  const DashboardTabConfig({required this.icon, required this.activeIcon, required this.labelKey});
}

class DashboardController extends GetxController {
  final selectedIndex = 0.obs;

  // Persistent, keyed pages to ensure stable identity across tab switches
  late final List<Widget> pages;
  late final PageController pageController;
  late final List<DashboardTabConfig> tabConfigs;
  late final List<String> _titleKeys;
  late final bool _isStoreKeeper;
  late final bool _isCash;

  bool get isStoreKeeper => _isStoreKeeper;
  bool get isCash => _isCash;
  String titleForIndex(int index) {
    if (_titleKeys.isEmpty) return 'home';
    final safeIndex = index.clamp(0, _titleKeys.length - 1);
    return _titleKeys[safeIndex];
  }

  String get subtitleKey => isCash ? 'cash_dashboard' : (isStoreKeeper ? 'store_dashboard' : 'representative_dashboard');

  @override
  void onInit() {
    super.onInit();
    final auth = Get.find<AuthController>();
    final user = auth.currentUser.value;
    _isStoreKeeper = user?.isStoreKeeper ?? false;
    _isCash = user?.isCash ?? false;

    if (_isCash) {
      // Cash role - focused on safes, payments, and transactions
      tabConfigs = const [
        DashboardTabConfig(icon: Icons.home_outlined, activeIcon: Icons.home, labelKey: 'cash_home'),
        DashboardTabConfig(icon: Icons.payments_outlined, activeIcon: Icons.payments, labelKey: 'payments'),
        DashboardTabConfig(icon: Icons.account_balance_wallet_outlined, activeIcon: Icons.account_balance_wallet, labelKey: 'safes'),
        DashboardTabConfig(icon: Icons.person_outline, activeIcon: Icons.person, labelKey: 'profile'),
      ];

      pages = <Widget>[
        const HomeScreen(key: PageStorageKey('cash_tab_home')),
        const PaymentsScreen(key: PageStorageKey('cash_tab_payments'), showAppBar: false),
        const SafesScreen(key: PageStorageKey('cash_tab_safes'), showAppBar: false),
        const ProfileScreen(key: PageStorageKey('cash_tab_profile')),
      ];

      _titleKeys = const ['cash_home', 'payments', 'safes', 'profile'];
    } else if (_isStoreKeeper) {
      tabConfigs = const [
        DashboardTabConfig(icon: Icons.home_outlined, activeIcon: Icons.home, labelKey: 'store_home'),
        DashboardTabConfig(icon: Icons.local_shipping_outlined, activeIcon: Icons.local_shipping, labelKey: 'deliveries'),
        DashboardTabConfig(icon: Icons.payments_outlined, activeIcon: Icons.payments, labelKey: 'payments'),
        DashboardTabConfig(icon: Icons.account_balance_wallet_outlined, activeIcon: Icons.account_balance_wallet, labelKey: 'safes'),
        DashboardTabConfig(icon: Icons.person_outline, activeIcon: Icons.person, labelKey: 'profile'),
      ];

      pages = <Widget>[
        const HomeScreen(key: PageStorageKey('store_tab_home')),
        const PendingDeliveriesScreen(key: PageStorageKey('store_tab_deliveries'), showAppBar: false),
        const PaymentsScreen(key: PageStorageKey('store_tab_payments'), showAppBar: false),
        const SafesScreen(key: PageStorageKey('store_tab_safes'), showAppBar: false),
        const ProfileScreen(key: PageStorageKey('store_tab_profile')),
      ];

      _titleKeys = const ['store_home', 'deliveries', 'payments', 'safes', 'profile'];
    } else {
      tabConfigs = const [
        DashboardTabConfig(icon: Icons.home_outlined, activeIcon: Icons.home, labelKey: 'home'),
        DashboardTabConfig(icon: Icons.people_outline, activeIcon: Icons.people, labelKey: 'clients'),
        DashboardTabConfig(icon: Icons.warehouse_outlined, activeIcon: Icons.warehouse, labelKey: 'inventory'),
        DashboardTabConfig(icon: Icons.calendar_today_outlined, activeIcon: Icons.calendar_today, labelKey: 'visits'),
        DashboardTabConfig(icon: Icons.person_outline, activeIcon: Icons.person, labelKey: 'profile'),
      ];

      // Build pages once with keys to maintain state and ensure proper switching
      pages = <Widget>[
        const HomeScreen(key: PageStorageKey('tab_home')),
        const ClientsScreen(key: PageStorageKey('tab_clients')),
        const WarehouseScreen(key: PageStorageKey('tab_warehouse')),
        const VisitsScreen(key: PageStorageKey('tab_visits')),
        const ProfileScreen(key: PageStorageKey('tab_profile')),
      ];

      _titleKeys = const ['home_dashboard', 'clients', 'inventory', 'visits', 'profile'];
    }

    // Initialize PageController with default page 0
    // The DashboardScreen will handle switching to the correct tab via arguments
    pageController = PageController(initialPage: 0);
    // debugPrint('[DashboardController] onInit - PageController initialized');
  }

  @override
  void onReady() {
    super.onReady();
    // debugPrint('[DashboardController] onReady called');
  }

  void onItemTapped(int index) {
    // debugPrint('[DashboardController] onItemTapped called with index: $index');
    final safeIndex = index.clamp(0, pages.length - 1);

    // Force close any GetX snackbars immediately to prevent blocking
    if (Get.isSnackbarOpen == true) {
      try {
        Get.closeAllSnackbars();
      } catch (_) {}
    }

    // Defensive cleanup: close keyboard and any lingering overlays/dialogs
    try {
      FocusManager.instance.primaryFocus?.unfocus();
    } catch (_) {}
    // Close any possible loading/dialog overlays that may remain after flows
    try {
      UltraSafeNavigation.closeDialog();
    } catch (_) {}
    try {
      SafeNavigation.closeSnackbars();
    } catch (_) {}
    // Removed: Get.arguments = null; (not valid)
    selectedIndex.value = safeIndex;

    // Immediately jump to the page, no delay
    if (pageController.hasClients) {
      try {
        pageController.jumpToPage(safeIndex);
        // debugPrint('[DashboardController] PageController jumped to: $safeIndex');
      } catch (e) {
        debugPrint('[DashboardController] Failed to jump page: $e');
      }
    }
    // debugPrint('[DashboardController] selectedIndex set to: ${selectedIndex.value}');
  }

  void onPageChanged(int index) {
    if (selectedIndex.value != index) {
      // debugPrint('[DashboardController] onPageChanged -> $index');
      selectedIndex.value = index;
    }
  }

  @override
  void onClose() {
    pageController.dispose();
    super.onClose();
  }
}
