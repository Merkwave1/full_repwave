// lib/modules/home/screens/home_screen.dart
import 'dart:async';

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';
import '/data/models/attendance.dart';
import '/data/models/safe.dart';
import '/data/repositories/safe_repository.dart';
import '/modules/home/controllers/home_controller.dart';
import '/core/routes/app_routes.dart';
import '/shared_widgets/safe_navigation.dart';
import '/shared_widgets/formatted_amount_field.dart';
import '/modules/auth/controllers/auth_controller.dart';
import '/modules/shared/controllers/global_data_controller.dart';
import '/modules/attendance/controllers/attendance_controller.dart';
import '/core/utils/formatting.dart';

class HomeScreen extends GetView<HomeController> {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    const primaryColor = Color(0xFF3F51B5); // Primary brand color

    return WillPopScope(
        onWillPop: () async {
          // Show exit confirmation dialog
          final shouldExit = await SafeNavigation.showExitConfirmation(context);
          return shouldExit;
        },
        child: Scaffold(
          backgroundColor: primaryColor.withOpacity(0.04),
          body: _buildNormalHomeScreen(context, primaryColor),
          floatingActionButton: _buildComprehensiveAttendanceButton(),
          floatingActionButtonLocation: FloatingActionButtonLocation.centerFloat,
        ));
  }

  Widget _buildNormalHomeScreen(BuildContext context, Color primaryColor) {
    final auth = Get.find<AuthController>();
    final isStoreKeeper = auth.currentUser.value?.isStoreKeeper ?? false;
    final isCash = auth.currentUser.value?.isCash ?? false;
    final global = GlobalDataController.instance;
    return RefreshIndicator(
      color: primaryColor,
      onRefresh: () async {
        controller.refreshData();
        // Also refresh safes to update balances after transfers/expenses/income
        await global.loadSafes(forceRefresh: true);
      },
      child: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(child: const SizedBox(height: 8)),
          // Header with gradient & summary (rep name + safes)
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      primaryColor.withOpacity(0.9),
                      primaryColor.withOpacity(0.65),
                    ],
                  ),
                  borderRadius: BorderRadius.circular(22),
                  boxShadow: [
                    BoxShadow(
                      color: primaryColor.withOpacity(0.35),
                      blurRadius: 18,
                      offset: const Offset(0, 10),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.15),
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: const Icon(Icons.account_circle_rounded, color: Colors.white, size: 26),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Obx(() {
                            final repName = auth.currentUser.value?.name ?? '';
                            if (!isStoreKeeper && !isCash) {
                              return Text(
                                repName.isNotEmpty ? repName : '—',
                                style: const TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                ),
                              );
                            }

                            final global = GlobalDataController.instance;
                            
                            if (isCash) {
                              // Cash user - show all their assigned safes balance
                              final totalBalance = global.safes.fold<double>(0.0, (sum, s) => sum + s.currentBalance);
                              return Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    repName.isNotEmpty ? repName : '—',
                                    style: const TextStyle(
                                      fontSize: 20,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.white,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    '${'cash_total_balance'.tr}: ${Formatting.amount(totalBalance)}',
                                    style: TextStyle(
                                      fontSize: 14,
                                      color: Colors.white.withOpacity(0.9),
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    'cash_management'.tr,
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: Colors.white.withOpacity(0.8),
                                    ),
                                  ),
                                ],
                              );
                            }
                            
                            // Store keeper
                            final storeSafes = global.safes.where((s) => s.type == 'store_keeper').toList();
                            final storeBalance = storeSafes.fold<double>(0.0, (sum, s) => sum + s.currentBalance);

                            return Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  repName.isNotEmpty ? repName : '—',
                                  style: const TextStyle(
                                    fontSize: 20,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.white,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  '${'safe_balance'.tr}: ${Formatting.amount(storeBalance)}',
                                  style: TextStyle(
                                    fontSize: 14,
                                    color: Colors.white.withOpacity(0.9),
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  'store_focus_description'.tr,
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: Colors.white.withOpacity(0.8),
                                  ),
                                ),
                              ],
                            );
                          }),
                        ),
                      ],
                    ),
                    // Removed top summary tiles (today visits, quick actions) per request
                  ],
                ),
              ),
            ),
          ),

          // Quick actions grid title
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Row(
                children: [
                  Text(
                    (isCash ? 'cash_management'.tr : (isStoreKeeper ? 'store_focus_heading'.tr : 'frequently_used_actions'.tr)),
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: primaryColor.withOpacity(0.85),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Container(
                      height: 1,
                      color: primaryColor.withOpacity(0.12),
                    ),
                  ),
                ],
              ),
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
            sliver: SliverGrid(
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                mainAxisSpacing: 12,
                crossAxisSpacing: 12,
                // Tune aspect ratio for shorter cards
                childAspectRatio: 1.5,
              ),
              delegate: SliverChildListDelegate(_buildQuickActionCards(primaryColor, isStoreKeeper, isCash)),
            ),
          ),
        ],
      ),
    );
  }

  List<_ActionItem> _quickActions(Color primaryColor, bool isStoreKeeper, bool isCash) {
    if (isCash) {
      return [
        _ActionItem(
          icon: Icons.account_balance_wallet_outlined,
          title: 'safes'.tr,
          subtitle: 'manage_assigned_safes'.tr,
          onTap: () => Get.toNamed(AppRoutes.safes),
          color: primaryColor,
        ),
        _ActionItem(
          icon: Icons.payments_rounded,
          title: 'payments'.tr,
          subtitle: 'collect_client_payments'.tr,
          onTap: () => Get.toNamed(AppRoutes.payments),
          color: primaryColor,
        ),
        _ActionItem(
          icon: Icons.swap_horiz_rounded,
          title: 'transfers'.tr,
          subtitle: 'transfer_between_safes'.tr,
          onTap: () => _openCashTransferDialog(Get.context!, primaryColor),
          color: primaryColor,
        ),
        _ActionItem(
          icon: Icons.trending_down_rounded,
          title: 'add_expense'.tr,
          subtitle: 'record_expense_transaction'.tr,
          onTap: () => Get.toNamed(AppRoutes.addExpense),
          color: primaryColor,
        ),
        _ActionItem(
          icon: Icons.trending_up_rounded,
          title: 'add_income'.tr,
          subtitle: 'record_income_transaction'.tr,
          onTap: () => Get.toNamed(AppRoutes.addIncome),
          color: primaryColor,
        ),
      ];
    }

    if (isStoreKeeper) {
      return [
        _ActionItem(
          icon: Icons.local_shipping_outlined,
          title: 'deliveries'.tr,
          subtitle: 'pending_deliveries_list'.tr,
          onTap: () => Get.toNamed(AppRoutes.deliveries),
          color: primaryColor,
        ),
        _ActionItem(
          icon: Icons.payments_rounded,
          title: 'payments'.tr,
          subtitle: 'manage_client_payments'.tr,
          onTap: () => Get.toNamed(AppRoutes.payments),
          color: primaryColor,
        ),
        _ActionItem(
          icon: Icons.account_balance_wallet_outlined,
          title: 'safes'.tr,
          subtitle: 'safe_balance'.tr,
          onTap: () => Get.toNamed(AppRoutes.safes),
          color: primaryColor,
        ),
      ];
    }

    return [
      _ActionItem(
        icon: Icons.calendar_month_rounded,
        title: 'visits_calendar'.tr,
        subtitle: 'view_scheduled_visits'.tr,
        onTap: () => Get.toNamed(AppRoutes.visitsCalendar),
        color: primaryColor,
      ),
      _ActionItem(
        icon: Icons.add_shopping_cart,
        title: 'sales_orders'.tr,
        subtitle: 'manage_sales_orders'.tr,
        onTap: () => Get.toNamed(AppRoutes.salesOrders),
        color: primaryColor,
      ),
      _ActionItem(
        icon: Icons.inventory_2_rounded,
        title: 'deliveries'.tr,
        subtitle: 'pending_partial_deliveries'.tr,
        onTap: () => Get.toNamed(AppRoutes.deliveries),
        color: primaryColor,
      ),
      _ActionItem(
        icon: Icons.payments_rounded,
        title: 'payments'.tr,
        subtitle: 'manage_client_payments'.tr,
        onTap: () => Get.toNamed(AppRoutes.payments),
        color: primaryColor,
      ),
      _ActionItem(
        icon: Icons.person_add,
        title: 'add_new_client'.tr,
        subtitle: 'register_new_client'.tr,
        onTap: () => Get.toNamed(AppRoutes.addEditClient),
        color: primaryColor,
      ),
      _ActionItem(
        icon: Icons.assignment_return_rounded,
        title: 'sales_returns'.tr,
        subtitle: 'manage_return_orders'.tr,
        onTap: () => Get.toNamed(AppRoutes.returns),
        color: primaryColor,
      ),
    ];
  }

  List<Widget> _buildQuickActionCards(Color primaryColor, bool isStoreKeeper, bool isCash) {
    return _quickActions(primaryColor, isStoreKeeper, isCash).map((a) => _QuickActionCard(item: a)).toList();
  }

  // ============================================================================
  // CASH TRANSFER DIALOG
  // ============================================================================

  void _openCashTransferDialog(BuildContext context, Color primaryColor) async {
    // Get safes from GlobalDataController
    final global = GlobalDataController.instance;
    final safes = global.safes.toList();
    
    if (safes.isEmpty) {
      SafeNavigation.showSnackbar(
        title: 'warning'.tr,
        message: 'no_safes_available'.tr,
        backgroundColor: Colors.orange,
        colorText: Colors.white,
      );
      return;
    }
    
    if (safes.length < 2) {
      SafeNavigation.showSnackbar(
        title: 'warning'.tr,
        message: 'need_at_least_two_safes'.tr,
        backgroundColor: Colors.orange,
        colorText: Colors.white,
      );
      return;
    }

    Safe? sourceSafe = safes.first;
    Safe? destinationSafe = safes.length > 1 ? safes[1] : null;
    final amountController = TextEditingController();
    final notesController = TextEditingController();
    final formKey = GlobalKey<FormState>();
    final ImagePicker picker = ImagePicker();
    XFile? selectedImage;
    bool isSubmitting = false;

    SafeNavigation.bottomSheet(
      StatefulBuilder(
        builder: (sheetContext, setState) {
          final bottomInset = MediaQuery.of(sheetContext).viewInsets.bottom;
          final theme = Theme.of(sheetContext);
          final isDark = theme.brightness == Brightness.dark;
          
          // Filter destination safes (exclude source safe)
          final availableDestinations = safes.where((s) => s.id != sourceSafe?.id).toList();
          if (destinationSafe != null && destinationSafe!.id == sourceSafe?.id) {
            destinationSafe = availableDestinations.isNotEmpty ? availableDestinations.first : null;
          }

          Future<void> pickImage(ImageSource source) async {
            try {
              final XFile? image = await picker.pickImage(
                source: source,
                imageQuality: 80,
                maxWidth: 1080,
                maxHeight: 1080,
              );
              if (image != null) {
                setState(() => selectedImage = image);
              }
            } catch (e) {
              SafeNavigation.showSnackbar(
                title: 'error'.tr,
                message: e.toString(),
                backgroundColor: Colors.red,
                colorText: Colors.white,
              );
            }
          }

          Future<void> submitTransfer() async {
            if (!formKey.currentState!.validate()) return;
            if (sourceSafe == null || destinationSafe == null) {
              SafeNavigation.showSnackbar(
                title: 'error'.tr,
                message: 'select_source_and_destination'.tr,
                backgroundColor: Colors.red,
                colorText: Colors.white,
              );
              return;
            }

            final amount = Formatting.parseAmount(amountController.text);
            if (amount == null || amount <= 0) {
              SafeNavigation.showSnackbar(
                title: 'error'.tr,
                message: 'enter_valid_amount'.tr,
                backgroundColor: Colors.red,
                colorText: Colors.white,
              );
              return;
            }

            setState(() => isSubmitting = true);

            try {
              final safeRepository = Get.find<SafeRepository>();
              final status = await safeRepository.requestSafeTransfer(
                sourceSafeId: sourceSafe!.id,
                destinationSafeId: destinationSafe!.id,
                amount: amount,
                notes: notesController.text,
                amountText: amountController.text,
                receiptImage: selectedImage,
              );

              Get.back(); // Close bottom sheet
              SafeNavigation.showSnackbar(
                title: 'success'.tr,
                message: status == 'approved' ? 'transfer_approved'.tr : 'transfer_request_sent'.tr,
                backgroundColor: Colors.green,
                colorText: Colors.white,
              );

              // Refresh safes data
              await global.loadSafes();
            } catch (e) {
              SafeNavigation.showSnackbar(
                title: 'error'.tr,
                message: e.toString(),
                backgroundColor: Colors.red,
                colorText: Colors.white,
              );
            } finally {
              setState(() => isSubmitting = false);
            }
          }

          return Container(
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
            ),
            child: SingleChildScrollView(
              padding: EdgeInsets.fromLTRB(20, 20, 20, 20 + bottomInset),
              child: Form(
                key: formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Header
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: primaryColor.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Icon(Icons.swap_horiz_rounded, color: primaryColor, size: 24),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'transfer_between_safes'.tr,
                              style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
                            ),
                            Text(
                              'select_source_destination_amount'.tr,
                              style: theme.textTheme.bodySmall?.copyWith(color: Colors.grey),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // Source Safe
                  Text('source_safe'.tr, style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
                  const SizedBox(height: 8),
                  DropdownButtonFormField<Safe>(
                    value: sourceSafe,
                    isExpanded: true,
                    decoration: InputDecoration(
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      prefixIcon: const Icon(Icons.account_balance_wallet_outlined),
                    ),
                    items: safes.map((safe) => DropdownMenuItem<Safe>(
                      value: safe,
                      child: Text('${safe.name} (${Formatting.amount(safe.currentBalance)})', overflow: TextOverflow.ellipsis),
                    )).toList(),
                    onChanged: (value) => setState(() => sourceSafe = value),
                    validator: (value) => value == null ? 'required'.tr : null,
                  ),
                  const SizedBox(height: 16),

                  // Destination Safe
                  Text('destination_safe'.tr, style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
                  const SizedBox(height: 8),
                  DropdownButtonFormField<Safe>(
                    value: destinationSafe,
                    isExpanded: true,
                    decoration: InputDecoration(
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      prefixIcon: const Icon(Icons.account_balance_wallet),
                    ),
                    items: availableDestinations.map((safe) => DropdownMenuItem<Safe>(
                      value: safe,
                      child: Text('${safe.name} (${Formatting.amount(safe.currentBalance)})', overflow: TextOverflow.ellipsis),
                    )).toList(),
                    onChanged: (value) => setState(() => destinationSafe = value),
                    validator: (value) => value == null ? 'required'.tr : null,
                  ),
                  const SizedBox(height: 16),

                  // Amount
                  Text('amount'.tr, style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
                  const SizedBox(height: 8),
                  FormattedAmountField(
                    controller: amountController,
                    hintText: 'enter_amount'.tr,
                    prefixIcon: const Icon(Icons.monetization_on),
                    validator: (value) {
                      final amount = Formatting.parseAmount(value);
                      if (amount == null || amount <= 0) return 'enter_valid_amount'.tr;
                      if (sourceSafe != null && amount > sourceSafe!.currentBalance) {
                        return 'insufficient_balance'.tr;
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),

                  // Notes
                  Text('notes'.tr, style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
                  const SizedBox(height: 8),
                  TextFormField(
                    controller: notesController,
                    maxLines: 2,
                    decoration: InputDecoration(
                      hintText: 'optional_notes'.tr,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      prefixIcon: const Icon(Icons.notes),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Receipt Image
                  Text('receipt_image'.tr, style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
                  const SizedBox(height: 8),
                  if (selectedImage != null) ...[
                    ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: Image.file(File(selectedImage!.path), height: 150, width: double.infinity, fit: BoxFit.cover),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () => pickImage(ImageSource.camera),
                            icon: const Icon(Icons.camera_alt, size: 18),
                            label: Text('change'.tr),
                          ),
                        ),
                        const SizedBox(width: 8),
                        OutlinedButton.icon(
                          onPressed: () => setState(() => selectedImage = null),
                          icon: const Icon(Icons.delete, size: 18),
                          label: Text('remove'.tr),
                          style: OutlinedButton.styleFrom(foregroundColor: Colors.red),
                        ),
                      ],
                    ),
                  ] else
                    InkWell(
                      onTap: () => pickImage(ImageSource.camera),
                      borderRadius: BorderRadius.circular(12),
                      child: Container(
                        height: 100,
                        width: double.infinity,
                        decoration: BoxDecoration(
                          border: Border.all(color: Colors.grey.shade300),
                          borderRadius: BorderRadius.circular(12),
                          color: Colors.grey.shade50,
                        ),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.camera_alt, size: 32, color: Colors.grey.shade400),
                            const SizedBox(height: 8),
                            Text('tap_to_capture'.tr, style: TextStyle(color: Colors.grey.shade600)),
                          ],
                        ),
                      ),
                    ),
                  const SizedBox(height: 24),

                  // Submit Button
                  SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: ElevatedButton(
                      onPressed: isSubmitting ? null : submitTransfer,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: primaryColor,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: isSubmitting
                          ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                          : Text('submit_transfer'.tr, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
                    ),
                  ),
                ],
              ),
            ),
          ),  // Close Container
          );
        },
      ),
      isScrollControlled: true,
    );
  }

  // ============================================================================
  // COMPREHENSIVE ATTENDANCE FLOATING BUTTON
  // ============================================================================

  Widget _buildComprehensiveAttendanceButton() {
    if (!Get.isRegistered<AttendanceController>()) {
      Get.put<AttendanceController>(AttendanceController(), permanent: true);
    }

    return GetBuilder<AttendanceController>(
      id: 'attendance_button',
      builder: (attendanceController) {
        final status = attendanceController.currentStatus.value;
        final attendanceStatus = status?.attendance?.attendanceStatus ?? 'NotStarted';
        final formattedTime = attendanceController.formattedDuration.value;

        return _AttendanceFloatingButton(
          status: attendanceStatus,
          formattedTime: formattedTime,
          controller: attendanceController,
        );
      },
    );
  }
} // ============================================================================
// HELPER CLASSES
// ============================================================================

class _ActionItem {
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;
  final Color color;

  _ActionItem({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
    required this.color,
  });
}

class _QuickActionCard extends StatelessWidget {
  final _ActionItem item;
  const _QuickActionCard({required this.item});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: item.onTap,
        child: Ink(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                item.color.withOpacity(0.9),
                item.color.withOpacity(0.6),
              ],
            ),
            boxShadow: [
              BoxShadow(
                color: item.color.withOpacity(0.25),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Icon(item.icon, color: Colors.white, size: 22),
                ),
                const SizedBox(height: 8),
                Text(
                  item.title,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                    height: 1.2,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                Text(
                  item.subtitle,
                  style: TextStyle(
                    fontSize: 10.5,
                    color: Colors.white.withOpacity(0.85),
                    height: 1.2,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ============================================================================
// COMPREHENSIVE ATTENDANCE FLOATING BUTTON
// ============================================================================

class _AttendanceFloatingButton extends StatelessWidget {
  final String status;
  final String formattedTime;
  final AttendanceController controller;

  const _AttendanceFloatingButton({
    required this.status,
    required this.formattedTime,
    required this.controller,
  });

  @override
  Widget build(BuildContext context) {
    // Debug: Print when the button rebuilds
    // print('🔄 FloatingButton rebuild: status=$status, time=$formattedTime');

    // Get status details
    Color buttonColor;
    IconData buttonIcon;
    String buttonText;
    bool showTimer;

    switch (status) {
      case 'ClockedIn':
        buttonColor = const Color(0xFF2196F3); // Blue - Working
        buttonIcon = Icons.work_outline_rounded;
        buttonText = 'working'.tr;
        showTimer = true;
        break;
      case 'Paused':
        buttonColor = const Color(0xFFFF9800); // Orange - On break
        buttonIcon = Icons.pause_circle_outline_rounded;
        buttonText = 'on_break'.tr;
        showTimer = true;
        break;
      case 'ClockedOut':
        buttonColor = const Color(0xFF9E9E9E); // Grey - Day ended
        buttonIcon = Icons.check_circle_outline_rounded;
        buttonText = 'day_ended'.tr;
        showTimer = false;
        break;
      default:
        buttonColor = const Color(0xFF4CAF50); // Green - Ready to start
        buttonIcon = Icons.play_circle_outline_rounded;
        buttonText = 'start_work'.tr;
        showTimer = false;
    }

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Main Action Button
          Expanded(
            child: GestureDetector(
              onTap: () => _showAttendanceBottomSheet(context),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                decoration: BoxDecoration(
                  color: buttonColor,
                  borderRadius: BorderRadius.circular(30),
                  boxShadow: [
                    BoxShadow(
                      color: buttonColor.withOpacity(0.4),
                      blurRadius: 12,
                      offset: const Offset(0, 6),
                    ),
                  ],
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    // Icon
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.2),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        buttonIcon,
                        color: Colors.white,
                        size: 20,
                      ),
                    ),
                    const SizedBox(width: 12),
                    // Text and Timer
                    Expanded(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            buttonText,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          if (showTimer)
                            Text(
                              formattedTime,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 12,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                        ],
                      ),
                    ),
                    // Arrow
                    const Icon(
                      Icons.arrow_forward_ios_rounded,
                      color: Colors.white,
                      size: 16,
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _showAttendanceBottomSheet(BuildContext context) {
    Get.bottomSheet(
      _AttendanceBottomSheet(controller: controller),
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
    );
  }
}

// ============================================================================
// ATTENDANCE BOTTOM SHEET
// ============================================================================

class _AttendanceBottomSheet extends StatefulWidget {
  final AttendanceController controller;

  const _AttendanceBottomSheet({required this.controller});

  @override
  State<_AttendanceBottomSheet> createState() => _AttendanceBottomSheetState();
}

class _AttendanceBottomSheetState extends State<_AttendanceBottomSheet> {
  AttendanceController get controller => widget.controller;

  Timer? _uiRefreshTimer;
  Worker? _statusWorker;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      controller.formattedDuration.refresh();
      _syncTimerWithStatus();
      setState(() {});
    });
    _statusWorker = ever<AttendanceStatus?>(controller.currentStatus, (_) {
      if (!mounted) return;
      _syncTimerWithStatus();
      WidgetsBinding.instance.addPostFrameCallback((__) {
        if (mounted) {
          setState(() {});
        }
      });
    });
  }

  void _syncTimerWithStatus() {
    final status = controller.currentStatus.value?.attendance?.attendanceStatus ?? 'NotStarted';
    final shouldTick = status == 'ClockedIn' || status == 'Paused';
    if (shouldTick) {
      _startUiRefreshTimer();
    } else {
      _stopUiRefreshTimer();
    }
  }

  void _startUiRefreshTimer() {
    _uiRefreshTimer ??= Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      setState(() {});
    });
  }

  void _stopUiRefreshTimer() {
    _uiRefreshTimer?.cancel();
    _uiRefreshTimer = null;
  }

  @override
  void dispose() {
    _statusWorker?.dispose();
    _stopUiRefreshTimer();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final status = controller.currentStatus.value;
    final attendanceStatus = status?.attendance?.attendanceStatus ?? 'NotStarted';
    final formattedTime = controller.formattedDuration.value;

    return Container(
      margin: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 20,
            offset: const Offset(0, -5),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Header
          Container(
            padding: const EdgeInsets.all(20),
            decoration: const BoxDecoration(
              color: Color(0xFF3F51B5),
              borderRadius: BorderRadius.only(
                topLeft: Radius.circular(20),
                topRight: Radius.circular(20),
              ),
            ),
            child: Row(
              children: [
                const Icon(Icons.access_time, color: Colors.white, size: 24),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'attendance_control'.tr,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                IconButton(
                  onPressed: () => Get.back(),
                  icon: const Icon(Icons.close, color: Colors.white),
                ),
              ],
            ),
          ),

          // Content
          Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              children: [
                _buildStatusDisplay(attendanceStatus, formattedTime),
                const SizedBox(height: 24),
                _buildActionButtons(context, controller, attendanceStatus),
                const SizedBox(height: 20),
                _buildTodayDetails(status),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusDisplay(String attendanceStatus, String formattedTime) {
    Color statusColor;
    IconData statusIcon;
    String statusText;

    switch (attendanceStatus) {
      case 'ClockedIn':
        statusColor = const Color(0xFF2196F3);
        statusIcon = Icons.work_outline_rounded;
        statusText = 'Currently Working';
        break;
      case 'Paused':
        statusColor = const Color(0xFFFF9800);
        statusIcon = Icons.pause_circle_outline_rounded;
        statusText = 'On Break';
        break;
      case 'ClockedOut':
        statusColor = const Color(0xFF9E9E9E);
        statusIcon = Icons.check_circle_outline_rounded;
        statusText = 'Day Ended';
        break;
      default:
        statusColor = const Color(0xFF4CAF50);
        statusIcon = Icons.play_circle_outline_rounded;
        statusText = 'Ready to Start';
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: statusColor.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: statusColor.withOpacity(0.3)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: statusColor,
              shape: BoxShape.circle,
            ),
            child: Icon(statusIcon, color: Colors.white, size: 24),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  statusText,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: statusColor,
                  ),
                ),
                if (attendanceStatus == 'ClockedIn' || attendanceStatus == 'Paused')
                  Text(
                    formattedTime,
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: statusColor,
                      fontFamily: 'monospace',
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionButtons(BuildContext context, AttendanceController controller, String attendanceStatus) {
    return Column(
      children: [
        Row(
          children: [
            // Start/Resume Button
            if (attendanceStatus == 'NotStarted' || attendanceStatus == 'Paused')
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: () {
                    Get.back();
                    if (attendanceStatus == 'NotStarted') {
                      controller.startWork();
                    } else {
                      controller.resumeWork();
                    }
                  },
                  icon: Icon(attendanceStatus == 'NotStarted' ? Icons.play_arrow : Icons.play_arrow),
                  label: Text(attendanceStatus == 'NotStarted' ? 'start_work'.tr : 'resume_work'.tr),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF4CAF50),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                ),
              ),

            // Pause Button
            if (attendanceStatus == 'ClockedIn') ...[
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: () {
                    Get.back();
                    _showPauseDialog(context, controller);
                  },
                  icon: const Icon(Icons.pause),
                  label: Text('pause_work'.tr),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFFF9800),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: () {
                    Get.back();
                    controller.showEndWorkDialog();
                  },
                  icon: const Icon(Icons.stop),
                  label: Text('end_work'.tr),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFE53E3E),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                ),
              ),
            ],

            // End Work Button (for paused state)
            if (attendanceStatus == 'Paused') ...[
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: () {
                    Get.back();
                    controller.showEndWorkDialog();
                  },
                  icon: const Icon(Icons.stop),
                  label: Text('end_work'.tr),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFE53E3E),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                ),
              ),
            ],
          ],
        ),
      ],
    );
  }

  Widget _buildTodayDetails(dynamic status) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFF5F5F5),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            "Today's Summary",
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: Color(0xFF333333),
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _buildDetailItem(
                  'Start Time',
                  status?.attendance?.shiftStartTime != null ? _formatTime(status?.attendance?.shiftStartTime) : 'Not started',
                  Icons.schedule,
                ),
              ),
              Expanded(
                child: _buildDetailItem(
                  'End Time',
                  status?.attendance?.shiftEndTime != null ? _formatTime(status?.attendance?.shiftEndTime) : 'Not ended',
                  Icons.schedule_outlined,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: _buildDetailItem(
                  'Total Work',
                  status?.attendance?.totalWorkDurationFormatted ?? '00:00:00',
                  Icons.timer,
                ),
              ),
              Expanded(
                child: _buildDetailItem(
                  'Breaks',
                  '${status?.breakLogs?.length ?? 0} breaks',
                  Icons.coffee,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildDetailItem(String label, String value, IconData icon) {
    return Column(
      children: [
        Icon(icon, color: const Color(0xFF666666), size: 20),
        const SizedBox(height: 4),
        Text(
          label,
          style: const TextStyle(
            fontSize: 12,
            color: Color(0xFF666666),
          ),
        ),
        Text(
          value,
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: Color(0xFF333333),
          ),
        ),
      ],
    );
  }

  String _formatTime(String? timeString) {
    if (timeString == null) return 'N/A';
    try {
      final dateTime = DateTime.parse(timeString);
      return '${dateTime.hour.toString().padLeft(2, '0')}:${dateTime.minute.toString().padLeft(2, '0')}';
    } catch (e) {
      return 'Invalid';
    }
  }

  void _showPauseDialog(BuildContext context, AttendanceController controller) {
    final reasonController = TextEditingController();

    Get.dialog(
      AlertDialog(
        title: Text('pause_work'.tr),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('why_pausing_work'.tr),
            const SizedBox(height: 16),
            TextField(
              controller: reasonController,
              decoration: InputDecoration(
                labelText: 'reason_optional'.tr,
                border: const OutlineInputBorder(),
                hintText: 'break_reason_hint'.tr,
              ),
              maxLines: 2,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Get.back(),
            child: Text('cancel'.tr),
          ),
          ElevatedButton(
            onPressed: () {
              Get.back();
              // Set the reason in controller and call pauseWork
              controller.breakReasonController.text = reasonController.text;
              controller.pauseWork();
            },
            child: Text('pause'.tr),
          ),
        ],
      ),
    );
  }
}
