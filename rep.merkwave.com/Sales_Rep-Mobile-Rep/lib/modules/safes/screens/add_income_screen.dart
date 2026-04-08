// lib/modules/safes/screens/add_income_screen.dart
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'dart:io';
import '../controllers/add_income_controller.dart';
import '/core/utils/formatting.dart';
import '/shared_widgets/formatted_amount_field.dart';
import '/shared_widgets/safe_navigation.dart';

class AddIncomeScreen extends GetView<AddIncomeController> {
  const AddIncomeScreen({super.key});

  Future<void> _confirmAndSubmit(BuildContext context) async {
    final formState = controller.formKey.currentState;
    if (formState == null) return;

    if (!formState.validate()) {
      return;
    }

    if (controller.selectedSafeId.value == null) {
      SafeNavigation.showSnackbar(
        title: 'warning'.tr,
        message: 'يرجى اختيار الخزنة',
        backgroundColor: Colors.orange,
        colorText: Colors.white,
      );
      return;
    }

    final amountValue = Formatting.parseAmount(controller.amountController.text);
    if (amountValue == null || amountValue <= 0) {
      return;
    }

    String? safeName;
    for (final safe in controller.availableSafes) {
      if (safe.id == controller.selectedSafeId.value) {
        safeName = safe.name;
        break;
      }
    }

    final formattedAmount = Formatting.formatNumber(amountValue);
    final currency = Formatting.currencySymbol();
    final buffer = StringBuffer('هل تريد تأكيد إضافة الإيراد بقيمة $formattedAmount $currency');
    if (safeName != null && safeName.isNotEmpty) {
      buffer.write(' إلى $safeName');
    }
    buffer.write('؟');

    final confirmed = await SafeNavigation.showConfirmationDialog(
      context: context,
      title: 'تأكيد العملية',
      message: buffer.toString(),
      confirmText: 'confirm'.tr,
      cancelText: 'cancel'.tr,
      icon: Icons.check_circle_outline,
    );

    if (confirmed) {
      await controller.submitIncome();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('إضافة إيراد'),
        centerTitle: true,
        actions: [
          Obx(() => IconButton(
                icon: controller.isLoading.value
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                        ),
                      )
                    : const Icon(Icons.check),
                onPressed: controller.isLoading.value ? null : () => _confirmAndSubmit(context),
              )),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: controller.formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Safe Selection Card
              Card(
                elevation: 2,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'اختر الخزنة',
                        style: Get.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Obx(() => DropdownButtonFormField<int>(
                            isExpanded: true,
                            isDense: true,
                            value: controller.selectedSafeId.value,
                            decoration: InputDecoration(
                              hintText: 'اختر الخزنة',
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(8),
                              ),
                              prefixIcon: const Icon(Icons.account_balance_wallet),
                            ),
                            items: controller.availableSafes.map((safe) {
                              return DropdownMenuItem<int>(
                                value: safe.id,
                                child: Text(
                                  safe.name,
                                  overflow: TextOverflow.ellipsis,
                                  maxLines: 1,
                                ),
                              );
                            }).toList(),
                            onChanged: (value) {
                              controller.selectedSafeId.value = value;
                            },
                            validator: (value) {
                              if (value == null) {
                                return 'يرجى اختيار الخزنة';
                              }
                              return null;
                            },
                          )),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Account Selection Card
              Card(
                elevation: 2,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'اختر الحساب',
                        style: Get.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Obx(() => DropdownButtonFormField<int>(
                            isExpanded: true,
                            isDense: true,
                            value: controller.selectedAccountId.value,
                            decoration: InputDecoration(
                              hintText: 'اختر الحساب',
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(8),
                              ),
                              prefixIcon: const Icon(Icons.account_tree),
                            ),
                            items: controller.incomeAccounts.map((account) {
                              return DropdownMenuItem<int>(
                                value: account.id,
                                child: Text(
                                  '${account.code} - ${account.name}',
                                  overflow: TextOverflow.ellipsis,
                                  maxLines: 1,
                                ),
                              );
                            }).toList(),
                            onChanged: (value) {
                              controller.selectedAccountId.value = value;
                            },
                            validator: (value) {
                              if (value == null) {
                                return 'يرجى اختيار الحساب';
                              }
                              return null;
                            },
                          )),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Amount Card
              Card(
                elevation: 2,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'المبلغ',
                        style: Get.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 12),
                      FormattedAmountField(
                        controller: controller.amountController,
                        hintText: 'أدخل المبلغ',
                        prefixIcon: const Icon(Icons.monetization_on),
                        validator: (value) {
                          final amount = Formatting.parseAmount(value);
                          if (amount == null || amount <= 0) {
                            return 'يرجى إدخال مبلغ صحيح';
                          }
                          return null;
                        },
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Description Card
              Card(
                elevation: 2,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'الوصف',
                        style: Get.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: controller.descriptionController,
                        maxLines: 3,
                        decoration: InputDecoration(
                          hintText: 'وصف الإيراد (اختياري)',
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                          prefixIcon: const Icon(Icons.description),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Receipt Photo Card
              Card(
                elevation: 2,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'صورة الإيصال',
                        style: Get.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Obx(() {
                        if (controller.selectedImage.value != null) {
                          return Column(
                            children: [
                              Container(
                                width: double.infinity,
                                height: 200,
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: Colors.grey.shade300),
                                ),
                                child: ClipRRect(
                                  borderRadius: BorderRadius.circular(8),
                                  child: Image.file(
                                    File(controller.selectedImage.value!.path),
                                    fit: BoxFit.cover,
                                  ),
                                ),
                              ),
                              const SizedBox(height: 12),
                              Row(
                                children: [
                                  Expanded(
                                    child: OutlinedButton.icon(
                                      icon: const Icon(Icons.camera_alt),
                                      label: const Text('تغيير الصورة'),
                                      onPressed: () => controller.pickImageFromCamera(),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  OutlinedButton.icon(
                                    icon: const Icon(Icons.delete),
                                    label: const Text('حذف'),
                                    onPressed: () => controller.removeImage(),
                                    style: OutlinedButton.styleFrom(
                                      foregroundColor: Colors.red,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          );
                        } else {
                          return Container(
                            width: double.infinity,
                            height: 120,
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(
                                color: Colors.grey.shade300,
                                style: BorderStyle.solid,
                              ),
                              color: Colors.grey.shade50,
                            ),
                            child: InkWell(
                              onTap: () => controller.pickImageFromCamera(),
                              borderRadius: BorderRadius.circular(8),
                              child: const Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(
                                    Icons.camera_alt,
                                    size: 48,
                                    color: Colors.grey,
                                  ),
                                  SizedBox(height: 8),
                                  Text(
                                    'التقط صورة الإيصال',
                                    style: TextStyle(
                                      color: Colors.grey,
                                      fontSize: 16,
                                    ),
                                  ),
                                  SizedBox(height: 4),
                                  Text(
                                    'اضغط لفتح الكاميرا',
                                    style: TextStyle(
                                      color: Colors.grey,
                                      fontSize: 12,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        }
                      }),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),

              // Submit Button
              SizedBox(
                width: double.infinity,
                height: 50,
                child: Obx(() => ElevatedButton(
                      onPressed: controller.isLoading.value ? null : () => _confirmAndSubmit(context),
                      style: ElevatedButton.styleFrom(
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                        backgroundColor: Colors.green,
                      ),
                      child: controller.isLoading.value
                          ? const CircularProgressIndicator(color: Colors.white)
                          : const Text(
                              'إضافة الإيراد',
                              style: TextStyle(fontSize: 18, color: Colors.white),
                            ),
                    )),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
