// lib/modules/payments/screens/add_payment_screen.dart
import 'package:flutter/material.dart';
import '/shared_widgets/ultra_safe_navigation.dart';
import 'package:get/get.dart';
import '/shared_widgets/app_notifier.dart';
import '/data/models/client.dart';
import '/data/models/safe.dart';
import '/modules/payments/controllers/payments_controller.dart';
import '/modules/shared/controllers/global_data_controller.dart';
import '/shared_widgets/searchable_dropdown.dart';
import '/core/utils/formatting.dart';
import '/core/utils/safe_colors.dart';

class AddPaymentScreen extends StatefulWidget {
  final int? preSelectedClientId;
  final int? visitId;

  const AddPaymentScreen({
    super.key,
    this.preSelectedClientId,
    this.visitId,
  });

  @override
  State<AddPaymentScreen> createState() => _AddPaymentScreenState();
}

class _AddPaymentScreenState extends State<AddPaymentScreen> {
  final _formKey = GlobalKey<FormState>();
  final PaymentsController controller = Get.find<PaymentsController>();

  // Form controllers
  final TextEditingController _amountController = TextEditingController();
  final TextEditingController _transactionIdController = TextEditingController();
  final TextEditingController _notesController = TextEditingController();

  // Selected values
  DropdownOption<Client>? selectedClientOption;
  DropdownOption<Safe>? selectedSafeOption;
  // Note: Safe is automatically assigned to representative's own safe

  @override
  void initState() {
    super.initState();
    _loadDataIfNeeded();

    if (widget.preSelectedClientId != null) {
      _setupClientPreselection();
    }
  }

  void _loadDataIfNeeded() {
    final globalDataController = Get.find<GlobalDataController>();
    if (globalDataController.clients.isEmpty) {
      globalDataController.loadClients();
    }
    if (globalDataController.safes.isEmpty) {
      globalDataController.loadSafes();
    }
    if (globalDataController.paymentMethods.isEmpty) {
      globalDataController.loadPaymentMethods();
    }
  }

  void _setupClientPreselection() {
    _tryPreSelectClient();
    final globalDataController = Get.find<GlobalDataController>();
    ever(globalDataController.clients, (clients) {
      if (clients.isNotEmpty && selectedClientOption == null && widget.preSelectedClientId != null) {
        _tryPreSelectClient();
      }
    });
  }

  void _tryPreSelectClient() {
    if (widget.preSelectedClientId != null && selectedClientOption == null && controller.clients.isNotEmpty) {
      final client = controller.clients.firstWhereOrNull(
        (client) => client.id == widget.preSelectedClientId,
      );

      if (client != null) {
        setState(() {
          selectedClientOption = DropdownOption<Client>(
            value: client,
            label: client.companyName,
          );
        });
      } else {
        Future.delayed(const Duration(milliseconds: 100), () {
          AppNotifier.warning('client_not_found_warning'.tr, title: 'client_not_found'.tr);
        });
      }
    }
  }

  @override
  void dispose() {
    _amountController.dispose();
    _transactionIdController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('add_payment'.tr),
        centerTitle: true,
      ),
      body: Obx(() {
        if (controller.isLoading.value) {
          return const Center(child: CircularProgressIndicator());
        }

        return SingleChildScrollView(
          padding: const EdgeInsets.all(16.0),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Client Selection
                Text('select_client'.tr, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w500)),
                const SizedBox(height: 8),
                Obx(() => SearchableDropdown<Client>(
                      options: controller.clients
                          .map((client) => DropdownOption<Client>(
                                value: client,
                                label: client.companyName,
                              ))
                          .toList(),
                      value: selectedClientOption,
                      onChanged: (option) {
                        setState(() {
                          selectedClientOption = option;
                        });
                      },
                      hintText: controller.clients.isEmpty ? 'loading_clients'.tr : 'search_clients'.tr,
                      labelText: 'select_client'.tr,
                      searchPlaceholder: 'search_clients'.tr,
                      validator: (option) => option == null ? 'please_select_client'.tr : null,
                    )),
                const SizedBox(height: 16),
                // Safe Selection
                Text('safe'.tr, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w500)),
                const SizedBox(height: 8),
                Obx(() {
                  final safes = controller.availableSafes;
                  WidgetsBinding.instance.addPostFrameCallback((_) {
                    if (!mounted) return;
                    final currentSelection = selectedSafeOption?.value;
                    final hasSelection = currentSelection != null && safes.any((safe) => safe.id == currentSelection.id);

                    if (currentSelection != null && !hasSelection) {
                      setState(() {
                        selectedSafeOption = null;
                      });
                    } else if (currentSelection == null && safes.length == 1) {
                      final onlySafe = safes.first;
                      setState(() {
                        selectedSafeOption = DropdownOption<Safe>(
                          value: onlySafe,
                          label: _safeOptionLabel(onlySafe),
                        );
                      });
                    }
                  });
                  return SearchableDropdown<Safe>(
                    options: safes
                        .map(
                          (safe) => DropdownOption<Safe>(
                            value: safe,
                            label: _safeOptionLabel(safe),
                          ),
                        )
                        .toList(),
                    value: selectedSafeOption,
                    onChanged: (option) {
                      setState(() {
                        selectedSafeOption = option;
                      });
                    },
                    hintText: safes.isEmpty ? 'loading_safes'.tr : 'search_safes'.tr,
                    labelText: 'select_safe'.tr,
                    searchPlaceholder: 'search_safes'.tr,
                    validator: (option) => option == null ? 'please_select_safe'.tr : null,
                    enabled: safes.isNotEmpty,
                    // Add colored backgrounds for safes
                    itemBackgroundColor: (option) => SafeColors.getLightShade(option.value.color),
                    itemTextColor: (option) => SafeColors.getTextColor(option.value.color),
                    itemBorderColor: (option) => SafeColors.getBorderColor(option.value.color),
                  );
                }),
                const SizedBox(height: 16),
                if (selectedSafeOption != null) _buildSafeDetailsCard(selectedSafeOption!.value),
                if (selectedSafeOption != null) const SizedBox(height: 16),

                // Amount Field
                Text('amount'.tr, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w500)),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _amountController,
                  keyboardType: TextInputType.number,
                  validator: (value) {
                    if (value == null || value.isEmpty) return 'please_enter_amount'.tr;
                    if (double.tryParse(value) == null || double.parse(value) <= 0) return 'please_enter_valid_amount'.tr;
                    return null;
                  },
                  decoration: InputDecoration(
                    hintText: 'enter_amount'.tr,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  ),
                ),
                const SizedBox(height: 16),

                // Transaction ID (Optional)
                Text('transaction_id_optional'.tr, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w500)),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _transactionIdController,
                  decoration: InputDecoration(
                    hintText: 'enter_transaction_id'.tr,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  ),
                ),
                const SizedBox(height: 16),

                // Notes (Optional)
                Text('notes_optional'.tr, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w500)),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _notesController,
                  maxLines: 3,
                  decoration: InputDecoration(
                    hintText: 'enter_notes'.tr,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  ),
                ),
                const SizedBox(height: 32),

                // Save Button
                SizedBox(
                  width: double.infinity,
                  child: Obx(() => ElevatedButton(
                        onPressed: controller.isLoading.value ? null : _savePayment,
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        child: controller.isLoading.value ? const CircularProgressIndicator(color: Colors.white) : Text('add_payment'.tr, style: const TextStyle(fontSize: 16)),
                      )),
                ),
              ],
            ),
          ),
        );
      }),
    );
  }

  String _safeOptionLabel(Safe safe) {
    final methodName = safe.paymentMethodName?.trim();
    if (methodName == null || methodName.isEmpty) {
      return safe.name;
    }
    return '${safe.name} ($methodName)';
  }

  Widget _buildSafeDetailsCard(Safe safe) {
    final methodName = safe.paymentMethodName?.trim();
    final methodDisplay = methodName == null || methodName.isEmpty ? '-' : methodName;
    final textColor = SafeColors.getTextColor(safe.color);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: SafeColors.createDecoration(
        colorName: safe.color,
        borderRadius: 8,
        borderWidth: 2,
        useLightBackground: false,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 24,
                height: 24,
                decoration: BoxDecoration(
                  color: SafeColors.getBackgroundColor(safe.color),
                  borderRadius: BorderRadius.circular(4),
                  border: Border.all(color: SafeColors.getBorderColor(safe.color), width: 1),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  safe.name,
                  style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15, color: textColor),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Icon(Icons.credit_card, size: 18, color: textColor),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  '${'payment_method'.tr}: $methodDisplay',
                  style: TextStyle(fontSize: 14, color: textColor),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              Icon(Icons.account_balance_wallet_outlined, size: 18, color: textColor),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  '${'amount'.tr}: ${safe.formattedBalance}',
                  style: TextStyle(fontSize: 14, color: textColor),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildConfirmationRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            flex: 4,
            child: Text(
              label,
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            flex: 6,
            child: Text(
              value.isEmpty ? '-' : value,
              textAlign: TextAlign.end,
            ),
          ),
        ],
      ),
    );
  }

  Future<bool> _showConfirmationDialog() async {
    final clientName = selectedClientOption?.value.companyName ?? '';
    final safeName = selectedSafeOption?.value.name ?? '';
    final methodName = selectedSafeOption?.value.paymentMethodName ?? '';
    final amountValue = double.tryParse(_amountController.text) ?? 0.0;
    final amountText = Formatting.amount(amountValue);

    final result = await showDialog<bool>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          title: Text('confirm'.tr),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'confirm_add_payment_message'.trParams({'amount': amountText, 'client': clientName}),
              ),
              const SizedBox(height: 12),
              const Divider(),
              _buildConfirmationRow('client'.tr, clientName),
              _buildConfirmationRow('safe'.tr, safeName),
              _buildConfirmationRow('payment_method'.tr, methodName),
              _buildConfirmationRow('amount'.tr, amountText),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(false),
              child: Text('cancel'.tr),
            ),
            ElevatedButton(
              onPressed: () => Navigator.of(dialogContext).pop(true),
              child: Text('confirm'.tr),
            ),
          ],
        );
      },
    );

    return result ?? false;
  }

  Future<void> _savePayment() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    if (selectedSafeOption == null) {
      AppNotifier.warning('please_select_safe'.tr);
      return;
    }

    final confirmed = await _showConfirmationDialog();
    if (!confirmed) {
      return;
    }

    final selectedSafe = selectedSafeOption!.value;
    if (selectedSafe.paymentMethodId == null) {
      AppNotifier.error('safe_missing_payment_method'.tr);
      return;
    }
    final newPayment = await controller.addPayment(
      clientId: selectedClientOption!.value.id,
      safeId: selectedSafe.id,
      amount: double.parse(_amountController.text),
      transactionId: _transactionIdController.text.isEmpty ? null : _transactionIdController.text,
      notes: _notesController.text.isEmpty ? null : _notesController.text,
      visitId: widget.visitId,
    );

    if (newPayment != null) {
      AppNotifier.success('payment_added_successfully'.tr);
      // MODIFIED: Replaced Get.back with your custom UltraSafeNavigation.back
      // This is safer and avoids the GetX internal error.
      UltraSafeNavigation.back(context, newPayment);
    }
  }
}
