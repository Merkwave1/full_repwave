import 'dart:ui' as ui show TextDirection;

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import '/core/utils/formatting.dart';
import '/modules/account_statement/controllers/account_statement_controller.dart';

class AccountStatementScreen extends GetView<AccountStatementController> {
  const AccountStatementScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final dateFmt = DateFormat('yyyy-MM-dd');
    return Scaffold(
      appBar: AppBar(
        title: Text('account_statement'.tr),
        actions: [
          IconButton(
            tooltip: 'share_pdf'.tr,
            icon: const Icon(Icons.picture_as_pdf),
            onPressed: () async => controller.shareAsPdf(),
          ),
          IconButton(
            tooltip: 'refresh'.tr,
            icon: const Icon(Icons.refresh),
            onPressed: () => controller.loadStatement(),
          ),
        ],
      ),
      body: Obx(() {
        if (controller.isLoading.value) {
          return const Center(child: CircularProgressIndicator());
        }
        if (controller.errorMessage.value.isNotEmpty) {
          return Center(child: Text(controller.errorMessage.value, style: const TextStyle(color: Colors.red)));
        }

        final rows = controller.rowsWithBalanceDesc;
        final closingBalance = rows.isNotEmpty ? rows.last.balance : 0.0;
        return RefreshIndicator(
          onRefresh: controller.loadStatement,
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Wrap(
                spacing: 8,
                runSpacing: 8,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  OutlinedButton.icon(
                    icon: const Icon(Icons.date_range),
                    label: Text(controller.dateFrom.value == null ? 'date_from'.tr : dateFmt.format(controller.dateFrom.value!)),
                    onPressed: () async {
                      final now = DateTime.now();
                      final picked = await showDatePicker(
                        context: context,
                        firstDate: DateTime(now.year - 5),
                        lastDate: DateTime(now.year + 1),
                        initialDate: controller.dateFrom.value ?? now,
                      );
                      if (picked != null) controller.setDateFrom(picked);
                    },
                  ),
                  OutlinedButton.icon(
                    icon: const Icon(Icons.date_range),
                    label: Text(controller.dateTo.value == null ? 'date_to'.tr : dateFmt.format(controller.dateTo.value!)),
                    onPressed: () async {
                      final now = DateTime.now();
                      final picked = await showDatePicker(
                        context: context,
                        firstDate: DateTime(now.year - 5),
                        lastDate: DateTime(now.year + 1),
                        initialDate: controller.dateTo.value ?? now,
                      );
                      if (picked != null) controller.setDateTo(picked);
                    },
                  ),
                  if (controller.dateFrom.value != null || controller.dateTo.value != null)
                    TextButton(
                      onPressed: () {
                        controller.setDateFrom(null);
                        controller.setDateTo(null);
                      },
                      child: Text('clear'.tr),
                    ),
                ],
              ),
              const SizedBox(height: 12),
              LayoutBuilder(
                builder: (context, constraints) {
                  final entries = [
                    '${'debit'.tr}: ${Formatting.amount(controller.totalDebit)}',
                    '${'credit'.tr}: ${Formatting.amount(controller.totalCredit)}',
                    '${'net'.tr}: ${Formatting.amount(closingBalance)}',
                  ];
                  final textDirection = Directionality.of(context);
                  final isRtl = textDirection == ui.TextDirection.rtl;
                  final textAlign = TextAlign.start;
                  final textStyle = Theme.of(context).textTheme.bodyMedium;

                  if (constraints.maxWidth < 360) {
                    return Column(
                      crossAxisAlignment: isRtl ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                      children: entries
                          .map((e) => Padding(
                                padding: const EdgeInsets.only(bottom: 4),
                                child: Text(
                                  e,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  textDirection: textDirection,
                                  textAlign: textAlign,
                                  style: textStyle,
                                ),
                              ))
                          .toList(),
                    );
                  }

                  return Row(
                    children: [
                      Expanded(
                        child: Text(
                          entries[0],
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          textDirection: textDirection,
                          textAlign: textAlign,
                          style: textStyle,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          entries[1],
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          textDirection: textDirection,
                          textAlign: textAlign,
                          style: textStyle,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          entries[2],
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          textDirection: textDirection,
                          textAlign: textAlign,
                          style: textStyle,
                        ),
                      ),
                    ],
                  );
                },
              ),
              const Divider(height: 24),
              if (rows.isEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 32.0),
                  child: Center(
                    child: Text(
                      'no_account_statement_rows'.tr,
                      style: Theme.of(context).textTheme.bodyLarge?.copyWith(color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6)),
                      textAlign: TextAlign.center,
                    ),
                  ),
                ),
              ...rows.map((row) {
                final isDebit = row.row.type == 'order' ? true : row.row.amount > 0;
                final debitText = isDebit ? row.row.amount.toStringAsFixed(2) : '';
                final creditText = !isDebit ? (-row.row.amount).toStringAsFixed(2) : '';
                IconData icon;
                Color? color;
                switch (row.row.type) {
                  case 'order':
                    icon = Icons.receipt_long;
                    color = Colors.blue;
                    break;
                  case 'return':
                    icon = Icons.undo;
                    color = Colors.orange;
                    break;
                  case 'payment':
                    icon = Icons.payments;
                    color = Colors.green;
                    break;
                  default:
                    icon = Icons.receipt;
                    color = Colors.grey;
                    break;
                }
                return ListTile(
                  leading: CircleAvatar(backgroundColor: color.withOpacity(0.15), child: Icon(icon, color: color)),
                  title: Text('${_label(row.row.type)}  #${row.row.id}'),
                  subtitle: Text(row.row.date?.toLocal().toString().split('.')[0] ?? 'not_available'.tr),
                  trailing: SizedBox(
                    width: 140,
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        if (row.row.status?.isNotEmpty == true)
                          Text(
                            row.row.status!,
                            style: const TextStyle(fontSize: 10),
                            overflow: TextOverflow.ellipsis,
                            maxLines: 1,
                          ),
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            SizedBox(
                              width: 55,
                              child: Text(
                                debitText,
                                textAlign: TextAlign.end,
                                style: const TextStyle(color: Colors.red, fontSize: 11),
                              ),
                            ),
                            const SizedBox(width: 3),
                            SizedBox(
                              width: 55,
                              child: Text(
                                creditText,
                                textAlign: TextAlign.end,
                                style: const TextStyle(color: Colors.green, fontSize: 11),
                              ),
                            ),
                          ],
                        ),
                        Text(
                          '${'balance'.tr}: ${Formatting.amount(row.balance)}',
                          style: const TextStyle(fontSize: 10),
                        ),
                      ],
                    ),
                  ),
                );
              }),
            ],
          ),
        );
      }),
    );
  }

  String _label(String type) {
    switch (type) {
      case 'order':
        return 'statement_type_order'.tr;
      case 'return':
        return 'statement_type_return'.tr;
      case 'payment':
        return 'statement_type_payment'.tr;
      case 'refund':
        return 'statement_type_refund'.tr;
      default:
        return type.capitalizeFirst ?? type;
    }
  }
}
