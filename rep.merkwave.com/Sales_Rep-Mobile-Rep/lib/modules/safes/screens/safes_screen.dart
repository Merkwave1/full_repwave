// lib/modules/safes/screens/safes_screen.dart
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:image_picker/image_picker.dart';
import '../controllers/safes_controller.dart';
import '/core/utils/formatting.dart';
import '/data/models/safe.dart';
import '/shared_widgets/formatted_amount_field.dart';
import '/shared_widgets/safe_navigation.dart';

class SafesScreen extends GetView<SafesController> {
  final bool showAppBar;

  const SafesScreen({super.key, this.showAppBar = true});

  @override
  Widget build(BuildContext context) {
    // Build the reactive content first. When this screen is embedded in the
    // Dashboard the outer UnifiedAppBar will be used, so we only return the
    // content. When navigated directly to this page we return a Scaffold with
    // its own AppBar and FAB.
    final Widget content = Obx(() {
      if (controller.isLoading.value) {
        return const Center(child: CircularProgressIndicator());
      }

      if (controller.errorMessage.value.isNotEmpty) {
        return Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.error_outline,
                size: 64,
                color: Colors.red.shade400,
              ),
              const SizedBox(height: 16),
              Text(
                'خطأ في تحميل البيانات',
                style: Get.textTheme.headlineSmall,
              ),
              const SizedBox(height: 8),
              Text(
                controller.errorMessage.value,
                style: Get.textTheme.bodyMedium,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => controller.refreshSafes(),
                child: const Text('إعادة المحاولة'),
              ),
            ],
          ),
        );
      }

      if (controller.safes.isEmpty) {
        return const Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.account_balance_wallet_outlined,
                size: 64,
                color: Colors.grey,
              ),
              SizedBox(height: 16),
              Text(
                'لا توجد خزائن',
                style: TextStyle(fontSize: 18, color: Colors.grey),
              ),
            ],
          ),
        );
      }

      final isStoreKeeper = controller.isStoreKeeper;
      final isCash = controller.isCash;
      final mySafes = isCash 
          ? controller.assignedSafes 
          : (isStoreKeeper ? controller.storeKeeperSafes : controller.repSafes);
      final mySafesBalance = mySafes.fold(0.0, (sum, safe) => sum + safe.currentBalance);
      final mainSafes = controller.mainSafes;

      return RefreshIndicator(
        onRefresh: () => controller.refreshSafes(),
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Summary Card - Same design for both roles
              Card(
                elevation: 4,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(20.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(
                            Icons.account_balance,
                            color: Get.theme.primaryColor,
                            size: 32,
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  isCash 
                                      ? 'cash_total_balance'.tr 
                                      : (isStoreKeeper ? 'store_keeper_total_balance'.tr : 'rep_total_balance'.tr),
                                  style: Get.textTheme.titleMedium?.copyWith(
                                    color: Colors.grey.shade700,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  Formatting.amount(mySafesBalance),
                                  style: Get.textTheme.headlineMedium?.copyWith(
                                    fontWeight: FontWeight.bold,
                                    color: Get.theme.primaryColor,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      // Show only safes count - main safes balance is hidden for all mobile users
                      Row(
                        children: [
                          Expanded(
                            child: _buildSummaryItem(
                              isCash 
                                  ? 'assigned_safes_count'.tr 
                                  : (isStoreKeeper ? 'store_keeper_safes_count'.tr : 'rep_safes_count'.tr),
                              mySafes.length.toString(),
                              Icons.account_balance_wallet,
                              Colors.blue,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),

              // Safes List
              Text(
                'قائمة الخزائن',
                style: Get.textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 16),

              // Split safes into categories based on role
              Builder(builder: (sectionContext) {
                final List<Widget> sections = [];

                if (isCash) {
                  // Cash user - show all assigned safes
                  final assignedSafes = controller.assignedSafes;
                  if (assignedSafes.isNotEmpty) {
                    sections.add(Text(
                      'assigned_safes_section'.tr,
                      style: Get.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                        color: Colors.purple.shade700,
                      ),
                    ));
                    sections.add(const SizedBox(height: 8));
                    sections.addAll(assignedSafes.map((safe) => _buildSafeCard(sectionContext, safe)));
                  }
                } else if (isStoreKeeper) {
                  final storeSafes = controller.storeKeeperSafes;
                  final mainSafes = controller.mainSafes;

                  if (storeSafes.isNotEmpty) {
                    sections.add(Text(
                      'store_keeper_safes_section'.tr,
                      style: Get.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                        color: Colors.blue.shade700,
                      ),
                    ));
                    sections.add(const SizedBox(height: 8));
                    sections.addAll(storeSafes.map((safe) => _buildSafeCard(sectionContext, safe)));
                    sections.add(const SizedBox(height: 12));
                  }

                  if (mainSafes.isNotEmpty) {
                    if (storeSafes.isNotEmpty) {
                      sections.add(const Padding(
                        padding: EdgeInsets.symmetric(vertical: 8.0),
                        child: Divider(thickness: 1.2),
                      ));
                    }
                    sections.add(Text(
                      'main_safes_section'.tr,
                      style: Get.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                        color: Colors.green.shade700,
                      ),
                    ));
                    sections.add(const SizedBox(height: 8));
                    sections.addAll(
                      mainSafes.map(
                        (safe) => _buildSafeCard(
                          sectionContext,
                          safe,
                          showTransferActions: true,
                          hideBalance: true,
                          disableDetails: true,
                        ),
                      ),
                    );
                  }
                } else {
                  // For representatives - show their safes + main safes (for transfers)
                  final repSafes = controller.repSafes;
                  final mainSafes = controller.mainSafes;

                  if (repSafes.isNotEmpty) {
                    sections.add(Text(
                      'rep_safes_section'.tr,
                      style: Get.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                        color: Colors.blue.shade700,
                      ),
                    ));
                    sections.add(const SizedBox(height: 8));
                    sections.addAll(repSafes.map((safe) => _buildSafeCard(sectionContext, safe)));
                    sections.add(const SizedBox(height: 12));
                  }

                  // Show main safes for transfer purposes, but hide balance
                  if (mainSafes.isNotEmpty) {
                    if (repSafes.isNotEmpty) {
                      sections.add(const Padding(
                        padding: EdgeInsets.symmetric(vertical: 8.0),
                        child: Divider(thickness: 1.2),
                      ));
                    }
                    sections.add(Text(
                      'main_safes_section'.tr,
                      style: Get.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                        color: Colors.green.shade700,
                      ),
                    ));
                    sections.add(const SizedBox(height: 8));
                    sections.addAll(
                      mainSafes.map(
                        (safe) => _buildSafeCard(
                          sectionContext,
                          safe,
                          showTransferActions: true,
                          hideBalance: true,
                          disableDetails: true,
                        ),
                      ),
                    );
                  }
                }

                return Column(children: sections);
              }),
            ],
          ),
        ),
      );
    });

    if (showAppBar) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('الخزائن'),
          centerTitle: true,
          actions: [
            IconButton(
              icon: const Icon(Icons.refresh),
              onPressed: () => controller.refreshSafes(),
            ),
          ],
        ),
        body: content,
        floatingActionButton: FloatingActionButton.extended(
          heroTag: 'safes_add_expense_fab',
          onPressed: () {
            Get.toNamed('/add_expense');
          },
          icon: const Icon(Icons.add),
          label: const Text('إضافة مصروف'),
          backgroundColor: Colors.red.shade600,
        ),
      );
    }

    return content;
  }

  Widget _buildSummaryItem(String title, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        children: [
          Icon(icon, color: color, size: 24),
          const SizedBox(height: 8),
          Text(
            value,
            style: Get.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            title,
            style: Get.textTheme.bodySmall?.copyWith(
              color: color.withOpacity(0.8),
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildSafeCard(
    BuildContext context,
    Safe safe, {
    bool showTransferActions = false,
    bool hideBalance = false,
    bool disableDetails = false,
  }) {
    // Check if user has their own safes to enable transfer actions
    final mySafes = controller.isStoreKeeper ? controller.storeKeeperSafes : controller.repSafes;
    final hasTransferActions = showTransferActions && mySafes.isNotEmpty;
    final iconColor = _safeColorForType(safe.type);
    final bgColor = iconColor.withOpacity(0.1);
    final iconData = _safeIconForType(safe.type);
    final String secondaryLine = _safeTypeLabel(safe);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: disableDetails
            ? null
            : () {
                Get.toNamed('/safe_detail', arguments: safe.id);
              },
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          safe.name,
                          style: Get.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 4),
                        if (!hideBalance) ...[
                          Text(
                            safe.formattedBalance,
                            style: Get.textTheme.titleSmall?.copyWith(
                              color: Get.theme.primaryColor,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 2),
                        ],
                        Text(
                          secondaryLine,
                          style: Get.textTheme.bodySmall?.copyWith(
                            color: Colors.grey.shade600,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        // Payment method information
                        if (safe.paymentMethodName != null) ...[
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              Icon(
                                Icons.payment,
                                size: 14,
                                color: Colors.grey.shade600,
                              ),
                              const SizedBox(width: 4),
                              Expanded(
                                child: Text(
                                  safe.paymentMethodName!,
                                  style: Get.textTheme.bodySmall?.copyWith(
                                    color: Colors.grey.shade600,
                                    fontWeight: FontWeight.w500,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                        ],
                        if (safe.notes != null && safe.notes!.isNotEmpty) ...[
                          const SizedBox(height: 4),
                          Text(
                            safe.notes!,
                            style: Get.textTheme.bodySmall?.copyWith(
                              color: Colors.grey.shade600,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: bgColor,
                      borderRadius: BorderRadius.circular(24),
                    ),
                    child: Icon(
                      iconData,
                      color: iconColor,
                      size: 24,
                    ),
                  ),
                ],
              ),
              if (hasTransferActions) ...[
                const SizedBox(height: 16),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    FilledButton.icon(
                      icon: const Icon(Icons.arrow_back_ios_new, size: 18),
                      label: const Text('إرسال'),
                      style: FilledButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        textStyle: Get.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
                      ),
                      onPressed: () => _openTransferSheet(
                        context,
                        isRequestingFunds: false,
                        mainSafe: safe,
                      ),
                    ),
                    const SizedBox(height: 8),
                    OutlinedButton.icon(
                      icon: const Icon(Icons.arrow_back_ios_new, size: 18),
                      label: const Text('طلب'),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        textStyle: Get.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
                      ),
                      onPressed: () => _openTransferSheet(
                        context,
                        isRequestingFunds: true,
                        mainSafe: safe,
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  IconData _safeIconForType(String type) {
    switch (type) {
      case 'rep':
        return Icons.person_outline;
      case 'store_keeper':
        return Icons.storefront;
      case 'company':
        return Icons.account_balance;
      default:
        return Icons.business_outlined;
    }
  }

  Color _safeColorForType(String type) {
    switch (type) {
      case 'rep':
        return Colors.blue;
      case 'store_keeper':
        return Colors.teal;
      case 'company':
        return Colors.green;
      default:
        return Get.theme.primaryColor;
    }
  }

  String _safeTypeLabel(Safe safe) {
    switch (safe.type) {
      case 'rep':
        return 'rep_safe_label'.tr;
      case 'store_keeper':
        return 'store_keeper_safe_label'.tr;
      case 'company':
        return 'main_safe_label'.tr;
      default:
        return 'safes'.tr;
    }
  }

  void _openTransferSheet(BuildContext context, {required bool isRequestingFunds, required Safe mainSafe}) {
    // Get user's own safes based on role
    final mySafes = controller.isStoreKeeper ? controller.storeKeeperSafes : controller.repSafes;

    if (mySafes.isEmpty) {
      SafeNavigation.showSnackbar(
        title: 'warning'.tr,
        message: controller.isStoreKeeper ? 'no_store_safes_available'.tr : 'no_rep_safes_available'.tr,
        backgroundColor: Colors.orange,
        colorText: Colors.white,
      );
      return;
    }

    Safe selectedMySafe = mySafes.first;
    final amountController = TextEditingController();
    final notesController = TextEditingController();
    final formKey = GlobalKey<FormState>();
    final ImagePicker picker = ImagePicker();
    XFile? selectedImage;

    SafeNavigation.bottomSheet(
      StatefulBuilder(
        builder: (sheetContext, setState) {
          final bottomInset = MediaQuery.of(sheetContext).viewInsets.bottom;
          final theme = Theme.of(sheetContext);

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

          return SingleChildScrollView(
            padding: EdgeInsets.fromLTRB(20, 20, 20, 20 + bottomInset),
            child: Form(
              key: formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    isRequestingFunds ? 'request_from_main_safe'.tr : 'send_to_main_safe'.tr,
                    style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'main_safe_with_name'.trParams({'name': mainSafe.name}),
                    style: theme.textTheme.bodyMedium?.copyWith(color: Colors.grey.shade600),
                  ),
                  const SizedBox(height: 16),
                  if (mySafes.length > 1)
                    DropdownButtonFormField<Safe>(
                      value: selectedMySafe,
                      decoration: InputDecoration(
                        labelText: controller.isStoreKeeper ? 'select_store_safe'.tr : 'select_rep_safe'.tr,
                        border: const OutlineInputBorder(),
                      ),
                      items: mySafes
                          .map(
                            (safe) => DropdownMenuItem(
                              value: safe,
                              child: Text(safe.name),
                            ),
                          )
                          .toList(),
                      onChanged: (value) {
                        if (value != null) {
                          setState(() => selectedMySafe = value);
                        }
                      },
                    )
                  else
                    Text(
                      selectedMySafe.name,
                      style: theme.textTheme.bodyMedium,
                    ),
                  const SizedBox(height: 16),
                  FormattedAmountField(
                    controller: amountController,
                    labelText: 'amount'.tr,
                    validator: (value) {
                      final parsed = Formatting.parseAmount(value);
                      if (parsed == null || parsed <= 0) {
                        return 'please_enter_valid_amount'.tr;
                      }
                      if (!isRequestingFunds && parsed > selectedMySafe.currentBalance) {
                        return 'balance_not_enough'.tr;
                      }
                      if (isRequestingFunds && parsed > mainSafe.currentBalance) {
                        return 'main_safe_balance_not_enough'.tr;
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: notesController,
                    maxLines: 3,
                    decoration: InputDecoration(
                      labelText: 'notes_optional'.tr,
                      border: const OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'إرفاق صورة (اختياري)',
                    style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 12),
                  if (selectedImage != null) ...[
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: Image.file(
                        File(selectedImage!.path),
                        width: double.infinity,
                        height: 180,
                        fit: BoxFit.cover,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            icon: const Icon(Icons.camera_alt),
                            label: const Text('إعادة الالتقاط'),
                            onPressed: () => pickImage(ImageSource.camera),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: OutlinedButton.icon(
                            icon: const Icon(Icons.photo_library_outlined),
                            label: const Text('من المعرض'),
                            onPressed: () => pickImage(ImageSource.gallery),
                          ),
                        ),
                        const SizedBox(width: 8),
                        IconButton(
                          icon: const Icon(Icons.delete_outline, color: Colors.red),
                          tooltip: 'حذف',
                          onPressed: () => setState(() => selectedImage = null),
                        ),
                      ],
                    ),
                  ] else ...[
                    Container(
                      width: double.infinity,
                      height: 140,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.grey.shade300),
                        color: Colors.grey.shade50,
                      ),
                      child: InkWell(
                        borderRadius: BorderRadius.circular(8),
                        onTap: () => pickImage(ImageSource.camera),
                        child: const Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.camera_alt, size: 40, color: Colors.grey),
                            SizedBox(height: 8),
                            Text('التقط صورة للإيصال'),
                            SizedBox(height: 4),
                            Text('اضغط لفتح الكاميرا', style: TextStyle(fontSize: 12, color: Colors.grey)),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            icon: const Icon(Icons.camera_alt_outlined),
                            label: const Text('الكاميرا'),
                            onPressed: () => pickImage(ImageSource.camera),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: OutlinedButton.icon(
                            icon: const Icon(Icons.photo_library_outlined),
                            label: const Text('المعرض'),
                            onPressed: () => pickImage(ImageSource.gallery),
                          ),
                        ),
                      ],
                    ),
                  ],
                  const SizedBox(height: 20),
                  SizedBox(
                    width: double.infinity,
                    child: Obx(() {
                      final isSubmitting = controller.isSubmittingTransfer.value;
                      return ElevatedButton.icon(
                        icon: isSubmitting
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                              )
                            : Icon(isRequestingFunds ? Icons.call_received : Icons.call_made),
                        label: Text(isRequestingFunds ? 'submit_receive_request'.tr : 'submit_send_request'.tr),
                        onPressed: isSubmitting
                            ? null
                            : () async {
                                if (!formKey.currentState!.validate()) return;

                                final sanitizedAmountText = Formatting.sanitizeAmount(amountController.text);
                                final amount = Formatting.parseAmount(amountController.text);

                                if (sanitizedAmountText.isEmpty || amount == null || amount <= 0) {
                                  SafeNavigation.showSnackbar(
                                    title: 'warning'.tr,
                                    message: 'please_enter_valid_amount'.tr,
                                    backgroundColor: Colors.orange,
                                    colorText: Colors.white,
                                  );
                                  return;
                                }

                                final notes = notesController.text.trim().isEmpty ? null : notesController.text.trim();
                                final sourceSafe = isRequestingFunds ? mainSafe : selectedMySafe;
                                final destinationSafe = isRequestingFunds ? selectedMySafe : mainSafe;
                                final formattedAmount = Formatting.formatNumber(amount);
                                final currency = Formatting.currencySymbol();
                                final message =
                                    isRequestingFunds ? 'هل تريد طلب مبلغ $formattedAmount $currency من ${mainSafe.name} إلى ${selectedMySafe.name}؟' : 'هل تريد إرسال مبلغ $formattedAmount $currency من ${selectedMySafe.name} إلى ${mainSafe.name}؟';

                                final confirmed = await SafeNavigation.showConfirmationDialog(
                                  context: sheetContext,
                                  title: 'تأكيد العملية',
                                  message: message,
                                  confirmText: 'confirm'.tr,
                                  cancelText: 'cancel'.tr,
                                  icon: isRequestingFunds ? Icons.call_received : Icons.call_made,
                                );

                                if (!confirmed) return;

                                try {
                                  final status = await controller.requestSafeTransfer(
                                    sourceSafeId: sourceSafe.id,
                                    destinationSafeId: destinationSafe.id,
                                    amount: amount,
                                    amountText: sanitizedAmountText,
                                    notes: notes,
                                    receiptImage: selectedImage,
                                  );
                                  SafeNavigation.showSnackbar(
                                    title: 'success'.tr,
                                    message: status == 'approved' ? 'transfer_approved'.tr : 'transfer_request_sent'.tr,
                                    backgroundColor: Colors.green,
                                    colorText: Colors.white,
                                  );
                                  SafeNavigation.back(sheetContext);
                                } catch (e) {
                                  SafeNavigation.showSnackbar(
                                    title: 'error'.tr,
                                    message: e.toString(),
                                    backgroundColor: Colors.red,
                                    colorText: Colors.white,
                                  );
                                }
                              },
                      );
                    }),
                  ),
                ],
              ),
            ),
          );
        },
      ),
      backgroundColor: Get.theme.scaffoldBackgroundColor,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      isScrollControlled: true,
    );
  }
}
