// lib/modules/profile/screens/profile_screen.dart
import 'package:flutter/material.dart';
import '/shared_widgets/ultra_safe_navigation.dart';
import 'package:get/get.dart';
import '/modules/auth/controllers/auth_controller.dart';
import '/modules/profile/controllers/profile_controller.dart';
import '/modules/notifications/controllers/notification_controller.dart';
import '/modules/dashboard/controllers/dashboard_controller.dart';
import '/shared_widgets/unified_card.dart';
import '../../../core/routes/app_routes.dart';

class ProfileScreen extends GetView<ProfileController> {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final AuthController authController = Get.find<AuthController>();
    final NotificationController notificationController = Get.find<NotificationController>();
    final bool isStoreKeeper = authController.currentUser.value?.role == 'store_keeper';

    return Scaffold(
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // User Profile Info Section
            Padding(
              padding: const EdgeInsets.all(16),
              child: UnifiedCard(
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 40,
                      backgroundColor: Get.theme.primaryColor.withOpacity(0.1),
                      child: Icon(Icons.person, size: 40, color: Get.theme.primaryColor),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Obx(() => Text(
                                authController.currentUser.value?.name ?? 'guest'.tr,
                                style: Get.textTheme.headlineSmall?.copyWith(
                                  fontWeight: FontWeight.bold,
                                  color: Get.theme.primaryColor,
                                ),
                              )),
                          const SizedBox(height: 4),
                          Obx(() => Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: Get.theme.primaryColor.withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  authController.currentUser.value?.role ?? 'no_role'.tr,
                                  style: Get.textTheme.bodySmall?.copyWith(
                                    color: Get.theme.primaryColor,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              )),
                          const SizedBox(height: 8),
                          Obx(() => Text(
                                authController.currentUser.value?.email ?? 'no_email'.tr,
                                style: Get.textTheme.bodySmall?.copyWith(color: Colors.grey.shade600),
                              )),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Business Operations Section
            UnifiedSectionHeader(
              title: 'business_operations'.tr,
            ),

            _buildMenuItems([
              if (!isStoreKeeper)
                _MenuItem(
                  icon: Icons.shopping_cart_outlined,
                  title: 'sales_orders'.tr,
                  subtitle: 'manage_sales_orders'.tr,
                  onTap: () => Get.toNamed(AppRoutes.salesOrders),
                ),
              if (!isStoreKeeper)
                _MenuItem(
                  icon: Icons.assignment_return_outlined,
                  title: 'return_orders'.tr,
                  subtitle: 'manage_return_orders'.tr,
                  onTap: () => Get.toNamed(AppRoutes.returns),
                ),
              if (!isStoreKeeper)
                _MenuItem(
                  icon: Icons.receipt_long_outlined,
                  title: 'invoices'.tr,
                  subtitle: 'view_manage_invoices'.tr,
                  onTap: () => Get.toNamed(AppRoutes.invoices),
                ),
              _MenuItem(
                icon: Icons.payment_outlined,
                title: 'payments'.tr,
                subtitle: 'manage_client_payments'.tr,
                onTap: () => Get.toNamed(AppRoutes.payments),
              ),
              _MenuItem(
                icon: Icons.account_balance_wallet_outlined,
                title: 'safes'.tr,
                subtitle: 'view_safes_balances_transactions'.tr,
                onTap: () => Get.toNamed('/safes'),
              ),
              _MenuItem(
                icon: Icons.local_shipping,
                title: 'deliveries'.tr,
                subtitle: 'pending_partial_deliveries'.tr,
                onTap: () {
                  if (isStoreKeeper) {
                    if (Get.isRegistered<DashboardController>()) {
                      final dashboardController = Get.find<DashboardController>();
                      dashboardController.onItemTapped(1);
                    }
                  } else {
                    Get.toNamed(AppRoutes.deliveries);
                  }
                },
              ),
            ]),

            // Application Features Section
            UnifiedSectionHeader(
              title: 'app_features'.tr,
            ),

            _buildMenuItems([
              if (!isStoreKeeper)
                _MenuItem(
                  icon: Icons.calendar_today,
                  title: 'visits_calendar'.tr,
                  subtitle: 'view_daily_visits_and_plans'.tr,
                  onTap: () => Get.toNamed(AppRoutes.visitsCalendar),
                ),
              _MenuItem(
                icon: Icons.notifications,
                title: 'notifications'.tr,
                subtitle: 'view_app_notifications'.tr,
                trailing: Obx(() {
                  if (notificationController.unreadCount.value > 0) {
                    return Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.red,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        notificationController.unreadCount.value.toString(),
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    );
                  }
                  return const Icon(Icons.arrow_forward_ios, size: 16);
                }),
                onTap: () => Get.toNamed('/notifications'),
              ),
              _MenuItem(
                icon: Icons.settings,
                title: 'settings'.tr,
                subtitle: 'app_preferences_and_configuration'.tr,
                onTap: () => Get.toNamed(AppRoutes.settings),
              ),
            ]),

            // Account Actions Section
            UnifiedSectionHeader(
              title: 'account_actions'.tr,
            ),

            _buildMenuItems([
              _MenuItem(
                icon: Icons.logout,
                title: 'logout'.tr,
                subtitle: 'sign_out_of_account'.tr,
                iconColor: Colors.red,
                titleColor: Colors.red,
                onTap: () {
                  Get.defaultDialog(
                    title: 'logout_confirmation_title'.tr,
                    middleText: 'logout_confirmation_message'.tr,
                    textConfirm: 'yes'.tr,
                    textCancel: 'no'.tr,
                    confirmTextColor: Colors.white,
                    cancelTextColor: Colors.black,
                    buttonColor: Colors.red,
                    onConfirm: () {
                      UltraSafeNavigation.back(context);
                      authController.logout();
                    },
                    onCancel: () => UltraSafeNavigation.back(context),
                  );
                },
              ),
            ]),

            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _buildMenuItems(List<_MenuItem> items) {
    return Column(
      children: items
          .map((item) => Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                child: UnifiedListItem(
                  leading: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: (item.iconColor ?? Get.theme.primaryColor).withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(
                      item.icon,
                      color: item.iconColor ?? Get.theme.primaryColor,
                      size: 20,
                    ),
                  ),
                  title: item.title,
                  subtitle: item.subtitle,
                  trailing: item.trailing ?? const Icon(Icons.arrow_forward_ios, size: 16),
                  onTap: item.onTap,
                ),
              ))
          .toList(),
    );
  }
}

class _MenuItem {
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;
  final Color? iconColor;
  final Color? titleColor;
  final Widget? trailing;

  _MenuItem({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
    this.iconColor,
    this.titleColor,
    this.trailing,
  });
}
