// lib/modules/safes/screens/safe_detail_screen.dart
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../controllers/safe_detail_controller.dart';
import '/core/utils/formatting.dart';

class SafeDetailScreen extends GetView<SafeDetailController> {
  const SafeDetailScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Obx(() => Text(controller.safe.value?.name ?? 'تفاصيل الخزنة')),
        centerTitle: true,
        actions: [
          // Search Icon
          IconButton(
            icon: const Icon(Icons.search),
            onPressed: () => _showSearchDialog(context),
          ),
          // Filter Icon
          IconButton(
            icon: const Icon(Icons.filter_list),
            onPressed: () => _showFilterDialog(context),
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => controller.refreshSafeDetail(),
          ),
        ],
      ),
      body: Obx(() {
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
                  onPressed: () => controller.refreshSafeDetail(),
                  child: const Text('إعادة المحاولة'),
                ),
              ],
            ),
          );
        }

        final safe = controller.safe.value;
        if (safe == null) {
          return const Center(
            child: Text('لم يتم العثور على الخزنة'),
          );
        }

        return RefreshIndicator(
          onRefresh: () => controller.refreshSafeDetail(),
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Safe Info Card
                Card(
                  elevation: 4,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(20.0),
                    child: Column(
                      children: [
                        Row(
                          children: [
                            Container(
                              width: 64,
                              height: 64,
                              decoration: BoxDecoration(
                                color: safe.type == 'rep' ? Colors.blue.withOpacity(0.1) : Colors.green.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(32),
                              ),
                              child: Icon(
                                safe.type == 'rep' ? Icons.person_outline : Icons.business_outlined,
                                color: safe.type == 'rep' ? Colors.blue : Colors.green,
                                size: 32,
                              ),
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    safe.name,
                                    style: Get.textTheme.titleLarge?.copyWith(
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    safe.type == 'rep' ? 'خزنة الممثل' : 'خزنة الشركة',
                                    style: Get.textTheme.bodyMedium?.copyWith(
                                      color: Colors.grey.shade600,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    safe.formattedBalance,
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
                        if (safe.notes != null && safe.notes!.isNotEmpty) ...[
                          const SizedBox(height: 16),
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.grey.shade100,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              safe.notes!,
                              style: Get.textTheme.bodyMedium,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 24),

                // Analytics Cards
                Row(
                  children: [
                    Expanded(
                      child: _buildAnalyticsCard(
                        'إجمالي الإيداع',
                        Formatting.amount(controller.totalCredits),
                        Icons.arrow_downward,
                        Colors.green,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _buildAnalyticsCard(
                        'إجمالي السحب',
                        Formatting.amount(controller.totalDebits),
                        Icons.arrow_upward,
                        Colors.red,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: _buildAnalyticsCard(
                        'عدد المعاملات',
                        controller.totalTransactions.toString(),
                        Icons.receipt_long,
                        Colors.blue,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _buildAnalyticsCard(
                        'آخر معاملة',
                        controller.daysSinceLastTransaction > 0 ? '${controller.daysSinceLastTransaction} يوم' : 'اليوم',
                        Icons.schedule,
                        Colors.orange,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),

                // Transactions Section
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'المعاملات',
                      style: Get.textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    // Pagination info
                    Obx(() => controller.totalItems.value > 0
                        ? Text(
                            'عرض ${controller.transactions.length} من ${controller.totalItems.value}',
                            style: Get.textTheme.bodySmall?.copyWith(
                              color: Colors.grey.shade600,
                            ),
                          )
                        : const SizedBox()),
                  ],
                ),
                const SizedBox(height: 8),

                // Active filters chips
                Obx(() {
                  final hasFilters = controller.searchQuery.value.isNotEmpty || controller.selectedTransactionType.value != null || controller.selectedPaymentMethod.value != null || controller.selectedStatus.value != null;

                  if (!hasFilters) return const SizedBox.shrink();

                  return Column(
                    children: [
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          if (controller.searchQuery.value.isNotEmpty)
                            _buildFilterChip(
                              'بحث: ${controller.searchQuery.value}',
                              () {
                                controller.searchQuery.value = '';
                                controller.applyFilters();
                              },
                            ),
                          if (controller.selectedTransactionType.value != null)
                            _buildFilterChip(
                              controller.selectedTransactionType.value == 'credit' ? 'إيداع' : 'سحب',
                              () {
                                controller.selectedTransactionType.value = null;
                                controller.selectedFilter.value = 'all';
                                controller.applyFilters();
                              },
                            ),
                          if (controller.selectedPaymentMethod.value != null)
                            _buildFilterChip(
                              controller.selectedPaymentMethod.value!.name,
                              () {
                                controller.selectedPaymentMethod.value = null;
                                controller.applyFilters();
                              },
                            ),
                          if (controller.selectedStatus.value != null)
                            _buildFilterChip(
                              controller.selectedStatus.value == 'approved'
                                  ? 'مقبول'
                                  : controller.selectedStatus.value == 'pending'
                                      ? 'معلق'
                                      : 'مرفوض',
                              () {
                                controller.selectedStatus.value = null;
                                controller.applyFilters();
                              },
                            ),
                        ],
                      ),
                      const SizedBox(height: 16),
                    ],
                  );
                }),

                // Transactions List
                if (controller.filteredTransactions.isEmpty)
                  const Center(
                    child: Padding(
                      padding: EdgeInsets.all(32.0),
                      child: Column(
                        children: [
                          Icon(
                            Icons.receipt_long_outlined,
                            size: 64,
                            color: Colors.grey,
                          ),
                          SizedBox(height: 16),
                          Text(
                            'لا توجد معاملات',
                            style: TextStyle(fontSize: 18, color: Colors.grey),
                          ),
                        ],
                      ),
                    ),
                  )
                else ...[
                  ...controller.filteredTransactions.map((transaction) => _buildTransactionCard(transaction)),

                  // Load more indicator
                  Obx(() {
                    if (controller.isLoadingMore.value) {
                      return const Padding(
                        padding: EdgeInsets.all(16.0),
                        child: Center(child: CircularProgressIndicator()),
                      );
                    }
                    if (controller.hasMore.value) {
                      return Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Center(
                          child: ElevatedButton(
                            onPressed: () => controller.loadMore(),
                            child: const Text('تحميل المزيد'),
                          ),
                        ),
                      );
                    }
                    if (controller.transactions.isNotEmpty) {
                      return Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Center(
                          child: Text(
                            'لا توجد معاملات أخرى',
                            style: TextStyle(color: Colors.grey.shade600),
                          ),
                        ),
                      );
                    }
                    return const SizedBox.shrink();
                  }),
                ],
              ],
            ),
          ),
        );
      }),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          Get.toNamed('/add_expense');
        },
        icon: const Icon(Icons.add),
        label: const Text('إضافة مصروف'),
        backgroundColor: Colors.red.shade600,
      ),
    );
  }

  Widget _buildAnalyticsCard(String title, String value, IconData icon, Color color) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            Icon(icon, color: color, size: 28),
            const SizedBox(height: 8),
            Text(
              value,
              style: Get.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
                color: color,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 4),
            Text(
              title,
              style: Get.textTheme.bodySmall?.copyWith(
                color: Colors.grey.shade600,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTransactionCard(transaction) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      elevation: 1,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        leading: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            // For pending/rejected show neutral gray, otherwise color by credit/debit
            color: _isApproved(transaction) ? (transaction.isCredit ? Colors.green.withOpacity(0.1) : Colors.red.withOpacity(0.1)) : Colors.grey.withOpacity(0.1),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Icon(
            // For non-approved, use status icon; otherwise + or - icon
            !_isApproved(transaction) ? (_isPending(transaction) ? Icons.hourglass_top : (_isRejected(transaction) ? Icons.block : Icons.help_outline)) : (transaction.isCredit ? Icons.add : Icons.remove),
            color: _isApproved(transaction) ? (transaction.isCredit ? Colors.green : Colors.red) : Colors.grey,
            size: 20,
          ),
        ),
        title: Row(
          children: [
            Expanded(
              child: Text(
                transaction.formattedAmount,
                style: Get.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                  // Neutral color for non-approved
                  color: _isApproved(transaction) ? (transaction.isCredit ? Colors.green : Colors.red) : Colors.grey.shade800,
                ),
              ),
            ),
            // Transaction ID chip
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: Colors.blue.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.blue.withOpacity(0.3)),
              ),
              child: Text(
                '#${transaction.id}',
                style: Get.textTheme.bodySmall?.copyWith(
                  color: Colors.blue,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              transaction.arabicTransactionType,
              style: Get.textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              transaction.formattedDate,
              style: Get.textTheme.bodySmall?.copyWith(
                color: Colors.grey.shade600,
              ),
            ),
            // Status badge
            if (transaction.status != null && transaction.status!.toString().isNotEmpty) ...[
              const SizedBox(height: 6),
              _buildStatusChip(transaction.status!.toString()),
            ],
            if (transaction.description != null && transaction.description!.isNotEmpty) ...[
              const SizedBox(height: 2),
              Text(
                transaction.description!,
                style: Get.textTheme.bodySmall?.copyWith(
                  color: Colors.grey.shade700,
                  fontWeight: FontWeight.w500,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],
            if (transaction.notes != null && transaction.notes!.isNotEmpty) ...[
              const SizedBox(height: 2),
              Text(
                'ملاحظات: ${transaction.notes!}',
                style: Get.textTheme.bodySmall?.copyWith(
                  color: Colors.grey.shade600,
                  fontStyle: FontStyle.italic,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ],
        ),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              // For non-approved, indicate not counted
              _isApproved(transaction) ? 'الرصيد' : 'غير محسوب',
              style: Get.textTheme.bodySmall?.copyWith(
                color: Colors.grey.shade600,
              ),
            ),
            if (_isApproved(transaction))
              Text(
                transaction.formattedBalance,
                style: Get.textTheme.bodySmall?.copyWith(
                  fontWeight: FontWeight.w600,
                  color: Get.theme.primaryColor,
                ),
              )
            else
              Text(
                '--',
                style: Get.textTheme.bodySmall?.copyWith(
                  fontWeight: FontWeight.w600,
                  color: Colors.grey,
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusChip(String rawStatus) {
    final s = rawStatus.toLowerCase().replaceAll(' ', '_');
    Color bg;
    Color fg;
    String key;

    if (s.contains('pending')) {
      bg = Colors.orange.withOpacity(0.1);
      fg = Colors.orange;
      key = 'pending';
    } else if (s.contains('reject')) {
      bg = Colors.red.withOpacity(0.1);
      fg = Colors.red;
      key = 'rejected';
    } else if (s.contains('approve')) {
      bg = Colors.green.withOpacity(0.1);
      fg = Colors.green;
      key = 'approved';
    } else {
      bg = Colors.grey.withOpacity(0.1);
      fg = Colors.grey;
      key = 'status_unknown';
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: fg.withOpacity(0.25)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            key == 'approved'
                ? Icons.verified
                : key == 'rejected'
                    ? Icons.block
                    : key == 'pending'
                        ? Icons.hourglass_top
                        : Icons.help_outline,
            size: 14,
            color: fg,
          ),
          const SizedBox(width: 6),
          Text(
            key.tr,
            style: Get.textTheme.bodySmall?.copyWith(
              color: fg,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  bool _isApproved(dynamic t) {
    final s = (t.status?.toString().toLowerCase() ?? 'approved');
    if (s.contains('approve')) return true;
    if (s.contains('reject')) return false;
    if (s.contains('pending')) return false;
    return s == 'approved';
  }

  bool _isPending(dynamic t) {
    final s = (t.status?.toString().toLowerCase() ?? 'approved');
    return s.contains('pending');
  }

  bool _isRejected(dynamic t) {
    final s = (t.status?.toString().toLowerCase() ?? 'approved');
    return s.contains('reject');
  }

  Widget _buildFilterChip(String label, VoidCallback onDeleted) {
    return Chip(
      label: Text(label),
      deleteIcon: const Icon(Icons.close, size: 18),
      onDeleted: onDeleted,
      backgroundColor: Get.theme.primaryColor.withOpacity(0.1),
      labelStyle: TextStyle(
        color: Get.theme.primaryColor,
        fontWeight: FontWeight.w500,
      ),
    );
  }

  void _showSearchDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('بحث في المعاملات'),
        content: TextField(
          autofocus: true,
          decoration: const InputDecoration(
            hintText: 'ابحث بالمبلغ، الوصف، المرجع...',
            prefixIcon: Icon(Icons.search),
          ),
          onSubmitted: (value) {
            controller.onSearchChanged(value);
            Navigator.pop(context);
          },
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('إلغاء'),
          ),
          ElevatedButton(
            onPressed: () {
              controller.onSearchChanged('');
              Navigator.pop(context);
            },
            child: const Text('مسح البحث'),
          ),
        ],
      ),
    );
  }

  void _showFilterDialog(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.7,
        maxChildSize: 0.9,
        minChildSize: 0.5,
        expand: false,
        builder: (context, scrollController) => SingleChildScrollView(
          controller: scrollController,
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'تصفية المعاملات',
                    style: Get.textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  TextButton(
                    onPressed: () {
                      controller.clearFilters();
                      Navigator.pop(context);
                    },
                    child: const Text('مسح الكل'),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Transaction Type Filter
              const Text(
                'نوع المعاملة',
                style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16),
              ),
              const SizedBox(height: 8),
              Obx(() => Wrap(
                    spacing: 8,
                    children: [
                      ChoiceChip(
                        label: const Text('الكل'),
                        selected: controller.selectedTransactionType.value == null,
                        onSelected: (selected) {
                          if (selected) {
                            controller.selectedTransactionType.value = null;
                            controller.selectedFilter.value = 'all';
                          }
                        },
                      ),
                      ChoiceChip(
                        label: const Text('إيداع'),
                        selected: controller.selectedTransactionType.value == 'credit',
                        onSelected: (selected) {
                          controller.selectedTransactionType.value = selected ? 'credit' : null;
                          controller.selectedFilter.value = selected ? 'credit' : 'all';
                        },
                      ),
                      ChoiceChip(
                        label: const Text('سحب'),
                        selected: controller.selectedTransactionType.value == 'debit',
                        onSelected: (selected) {
                          controller.selectedTransactionType.value = selected ? 'debit' : null;
                          controller.selectedFilter.value = selected ? 'debit' : 'all';
                        },
                      ),
                    ],
                  )),
              const SizedBox(height: 16),

              // Payment Method Filter
              const Text(
                'طريقة الدفع',
                style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16),
              ),
              const SizedBox(height: 8),
              Obx(() => Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      ChoiceChip(
                        label: const Text('الكل'),
                        selected: controller.selectedPaymentMethod.value == null,
                        onSelected: (selected) {
                          if (selected) controller.selectedPaymentMethod.value = null;
                        },
                      ),
                      ...controller.paymentMethods.map((method) => ChoiceChip(
                            label: Text(method.name),
                            selected: controller.selectedPaymentMethod.value?.id == method.id,
                            onSelected: (selected) {
                              controller.selectedPaymentMethod.value = selected ? method : null;
                            },
                          )),
                    ],
                  )),
              const SizedBox(height: 16),

              // Status Filter
              const Text(
                'الحالة',
                style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16),
              ),
              const SizedBox(height: 8),
              Obx(() => Wrap(
                    spacing: 8,
                    children: [
                      ChoiceChip(
                        label: const Text('الكل'),
                        selected: controller.selectedStatus.value == null,
                        onSelected: (selected) {
                          if (selected) controller.selectedStatus.value = null;
                        },
                      ),
                      ChoiceChip(
                        label: const Text('مقبول'),
                        selected: controller.selectedStatus.value == 'approved',
                        onSelected: (selected) {
                          controller.selectedStatus.value = selected ? 'approved' : null;
                        },
                      ),
                      ChoiceChip(
                        label: const Text('معلق'),
                        selected: controller.selectedStatus.value == 'pending',
                        onSelected: (selected) {
                          controller.selectedStatus.value = selected ? 'pending' : null;
                        },
                      ),
                      ChoiceChip(
                        label: const Text('مرفوض'),
                        selected: controller.selectedStatus.value == 'rejected',
                        onSelected: (selected) {
                          controller.selectedStatus.value = selected ? 'rejected' : null;
                        },
                      ),
                    ],
                  )),
              const SizedBox(height: 24),

              // Apply button
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    controller.applyFilters();
                    Navigator.pop(context);
                  },
                  child: const Text('تطبيق'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
