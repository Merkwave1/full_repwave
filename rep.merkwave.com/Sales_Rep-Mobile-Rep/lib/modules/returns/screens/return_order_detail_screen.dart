// lib/modules/returns/screens/return_order_detail_screen.dart
// lib/modules/returns/screens/return_order_detail_screen.dart
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '/core/utils/formatting.dart';
import '/data/models/sales_return.dart';
import '/data/models/sales_return_item.dart';
import '/modules/auth/controllers/auth_controller.dart';
import '/modules/returns/controllers/return_order_detail_controller.dart';
import '/services/thermal_printer_service.dart';
import '/shared_widgets/app_notifier.dart';
import '/shared_widgets/custom_app_bar.dart';
import '/shared_widgets/loading_indicator.dart';

class ReturnOrderDetailScreen extends GetView<ReturnOrderDetailController> {
  ReturnOrderDetailScreen({super.key});

  final GlobalKey _returnReceiptKey = GlobalKey();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: CustomAppBar(
        title: 'sales_return_details'.tr,
      ),
      body: Obx(() {
        if (controller.isLoading.value) {
          return LoadingIndicator(message: 'loading_details'.tr);
        }

        if (controller.errorMessage.isNotEmpty) {
          return Center(
            child: Text(
              controller.errorMessage.value,
              style: Get.textTheme.titleMedium?.copyWith(color: Colors.red),
              textAlign: TextAlign.center,
            ),
          );
        }

        final salesReturn = controller.salesReturn.value;
        if (salesReturn == null) {
          return Center(
            child: Text(
              'sales_return_not_found'.tr,
              style: Get.textTheme.titleMedium,
            ),
          );
        }

        return Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(vertical: 16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    RepaintBoundary(
                      key: _returnReceiptKey,
                      child: _buildReturnReceiptLayout(context, salesReturn),
                    ),
                    // Status editor hidden for printing
                    // const SizedBox(height: 16),
                    // _buildStatusEditorCard(),
                  ],
                ),
              ),
            ),
            _buildBottomBar(context),
          ],
        );
      }),
    );
  }

  Widget _buildReturnReceiptLayout(BuildContext context, SalesReturn salesReturn) {
    final items = salesReturn.items;
    final hasTax = salesReturn.hasTaxItems;
    return Container(
      width: double.infinity,
      color: Colors.white,
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _buildReceiptHeader(),
          const SizedBox(height: 24),
          _buildReceiptInfoSection(salesReturn),
          const SizedBox(height: 20),
          const Divider(color: Colors.black, thickness: 2),
          const SizedBox(height: 16),
          _buildReturnItemsTable(context, items),
          const SizedBox(height: 16),
          const Divider(color: Colors.black, thickness: 2),
          const SizedBox(height: 12),
          _buildTotalsSection(salesReturn, hasTax),
          if ((salesReturn.reason ?? '').trim().isNotEmpty) ...[
            const SizedBox(height: 16),
            _buildNotesBlock('reason'.tr, salesReturn.reason!.trim()),
          ],
          if ((salesReturn.notes ?? '').trim().isNotEmpty) ...[
            const SizedBox(height: 16),
            _buildNotesBlock('notes'.tr, salesReturn.notes!.trim()),
          ],
        ],
      ),
    );
  }

  Widget _buildReceiptHeader() {
    return Container(
      padding: const EdgeInsets.only(bottom: 20),
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: Colors.black, width: 2)),
      ),
      child: Column(
        children: [
          _buildCompanyLogo(),
          const SizedBox(height: 16),
          _buildCompanyName(),
          const SizedBox(height: 8),
          Text(
            _receiptTitle(),
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: Colors.black,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildReceiptInfoSection(SalesReturn salesReturn) {
    final linkedOrder =
        salesReturn.salesOrderId != null ? '#${salesReturn.salesOrderId}${salesReturn.salesOrderTotalAmount != null && salesReturn.salesOrderTotalAmount!.isNotEmpty ? ' - ${_formatOptionalAmount(salesReturn.salesOrderTotalAmount)}' : ''}' : null;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _buildReceiptInfoRow('return_id'.tr, '#${salesReturn.returnsId}'),
        _buildReceiptInfoRow('date'.tr, _formatDate(salesReturn.returnsDate)),
        _buildReceiptInfoRow('status'.tr, _localizedStatusLabel(salesReturn.status).toUpperCase()),
        if (salesReturn.createdByUserName?.isNotEmpty == true) _buildReceiptInfoRow('created_by'.tr, salesReturn.createdByUserName!),
        if (salesReturn.clientCompanyName?.isNotEmpty == true) _buildReceiptInfoRow('client'.tr, salesReturn.clientCompanyName!),
        if (linkedOrder != null) _buildReceiptInfoRow('linked_sales_order'.tr, linkedOrder),
        if (salesReturn.createdAt != null) _buildReceiptInfoRow('created_at'.tr, _formatDate(salesReturn.createdAt)),
        if (salesReturn.updatedAt != null) _buildReceiptInfoRow('updated_at'.tr, _formatDate(salesReturn.updatedAt)),
      ],
    );
  }

  Widget _buildReceiptInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Expanded(
            flex: 2,
            child: Text(
              '$label:',
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: Colors.black,
              ),
            ),
          ),
          Expanded(
            flex: 3,
            child: Text(
              value,
              style: const TextStyle(
                fontSize: 14,
                color: Colors.black,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildReturnItemsTable(BuildContext context, List<SalesReturnItem> items) {
    if (items.isEmpty) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 24),
        child: Text(
          'no_items_in_return'.tr,
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: Colors.black54,
          ),
          textAlign: TextAlign.center,
        ),
      );
    }

    const headerStyle = TextStyle(
      fontSize: 10,
      fontWeight: FontWeight.bold,
      color: Colors.black,
      letterSpacing: 0.2,
    );

    const bodyStyle = TextStyle(
      fontSize: 10,
      color: Colors.black,
      height: 1.3,
      fontWeight: FontWeight.w900,
    );

    TableRow buildHeaderRow() {
      return TableRow(
        decoration: BoxDecoration(
          color: Colors.grey.shade200,
          border: Border.all(color: Colors.black, width: 1.5),
        ),
        children: [
          _buildTableHeaderCell('item_name'.tr, headerStyle, TextAlign.start),
          _buildTableHeaderCell('qty_column'.tr, headerStyle, TextAlign.center),
          _buildTableHeaderCell('price_column'.tr, headerStyle, TextAlign.center),
          _buildTableHeaderCell('ضريبة', headerStyle, TextAlign.center),
          _buildTableHeaderCell('total_column'.tr, headerStyle, TextAlign.end),
        ],
      );
    }

    TableRow buildBodyRow(SalesReturnItem item) {
      return TableRow(
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border(
            left: BorderSide(color: Colors.black.withOpacity(0.3), width: 0.5),
            right: BorderSide(color: Colors.black.withOpacity(0.3), width: 0.5),
            bottom: BorderSide(color: Colors.black.withOpacity(0.3), width: 0.5),
          ),
        ),
        children: [
          _buildTableBodyCellWithSubtitle(
            _getItemName(item),
            _getPackagingName(item),
            bodyStyle,
            TextAlign.start,
          ),
          _buildTableBodyCell(_formatQuantity(item.quantity), bodyStyle, TextAlign.center),
          _buildTableBodyCell(_formatQuantity(item.unitPrice), bodyStyle, TextAlign.center),
          _buildTableBodyCell(
            item.taxRate != null && item.taxRate! > 0 ? _formatTaxRate(item.taxRate!) : '-',
            bodyStyle,
            TextAlign.center,
          ),
          _buildTableBodyCell(
            _formatAmount(item.totalPriceWithTax),
            bodyStyle.copyWith(fontWeight: FontWeight.w900),
            TextAlign.end,
          ),
        ],
      );
    }

    return Container(
      decoration: BoxDecoration(
        border: Border.all(color: Colors.black, width: 1.5),
        borderRadius: BorderRadius.circular(8),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(8),
        child: Table(
          columnWidths: const {
            0: FlexColumnWidth(2.5), // الصنف (مع التعبئة)
            1: FlexColumnWidth(.8), // الكمية
            2: FlexColumnWidth(1.1), // السعر
            3: FlexColumnWidth(0.8), // ضريبة
            4: FlexColumnWidth(1.4), // الإجمالي
          },
          defaultVerticalAlignment: TableCellVerticalAlignment.middle,
          border: TableBorder(
            horizontalInside: BorderSide(color: Colors.black.withOpacity(0.3), width: 0.5),
            verticalInside: BorderSide(color: Colors.black.withOpacity(0.3), width: 0.5),
          ),
          children: [
            buildHeaderRow(),
            ...items.map(buildBodyRow),
          ],
        ),
      ),
    );
  }

  Widget _buildTableHeaderCell(String text, TextStyle style, TextAlign align) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
      child: Text(
        text,
        style: style,
        textAlign: align,
      ),
    );
  }

  Widget _buildTableBodyCellWithSubtitle(String text, String subtitle, TextStyle style, TextAlign align) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 6),
      child: Column(
        crossAxisAlignment: align == TextAlign.start ? CrossAxisAlignment.start : CrossAxisAlignment.center,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            text,
            style: style,
            textAlign: align,
          ),
          if (subtitle.isNotEmpty)
            Text(
              subtitle,
              style: style.copyWith(
                fontSize: 9,
                color: Colors.black54,
                fontWeight: FontWeight.w900,
              ),
              textAlign: align,
            ),
        ],
      ),
    );
  }

  Widget _buildTableBodyCell(String text, TextStyle style, TextAlign align) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 6),
      child: Text(
        text,
        style: style,
        textAlign: align,
        maxLines: 2,
        overflow: TextOverflow.ellipsis,
      ),
    );
  }

  String _getItemName(SalesReturnItem item) {
    if (item.variantName != null && item.variantName!.trim().isNotEmpty) {
      return item.variantName!.trim();
    }
    if (item.packagingTypeName != null && item.packagingTypeName!.trim().isNotEmpty) {
      return item.packagingTypeName!.trim();
    }
    return _translateOrDefault('unknown_product', 'منتج غير معروف');
  }

  String _getPackagingName(SalesReturnItem item) {
    if (item.packagingTypeName != null && item.packagingTypeName!.trim().isNotEmpty) {
      // Only show packaging as subtitle when we already have a distinct item name
      if (item.variantName != null && item.variantName!.trim().isNotEmpty) {
        return item.packagingTypeName!.trim();
      }
    }
    return '';
  }

  Widget _buildTotalsSection(SalesReturn salesReturn, bool hasTax) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (hasTax) _buildTotalsRow('subtotal'.tr, _formatAmount(salesReturn.subtotalAmount)),
        if (hasTax) _buildTotalsRow('tax_amount'.tr, _formatAmount(salesReturn.totalTaxAmount)),
        _buildTotalsRow(
          'total_amount'.tr,
          _formatAmount(hasTax ? salesReturn.totalAmountWithTax : salesReturn.totalAmount),
          highlight: true,
        ),
      ],
    );
  }

  Widget _buildTotalsRow(String label, String value, {bool highlight = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Expanded(
            child: Text(
              '$label:',
              style: TextStyle(
                fontSize: highlight ? 16 : 14,
                fontWeight: highlight ? FontWeight.bold : FontWeight.w600,
                color: Colors.black,
              ),
            ),
          ),
          Text(
            value,
            style: TextStyle(
              fontSize: highlight ? 16 : 14,
              fontWeight: highlight ? FontWeight.bold : FontWeight.w600,
              color: Colors.black,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNotesBlock(String title, String value) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        border: Border.all(color: Colors.black.withOpacity(0.6)),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '$title:',
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.bold,
              color: Colors.black,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: const TextStyle(fontSize: 13, color: Colors.black),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusEditorCard() {
    return Obx(() {
      final salesReturn = controller.salesReturn.value;
      if (salesReturn == null) {
        return const SizedBox.shrink();
      }

      final options = controller.getAvailableStatusOptions();
      if (options.isEmpty) {
        return const SizedBox.shrink();
      }

      final theme = Get.theme;
      final currentStatus = salesReturn.status;
      final bool isEditable = options.length > 1;

      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: theme.cardColor,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: theme.dividerColor.withOpacity(0.3)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 12,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'status'.tr,
              style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 8),
            if (controller.isUpdatingStatus.value)
              const Center(child: CircularProgressIndicator.adaptive())
            else if (!isEditable)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  color: theme.colorScheme.surfaceVariant.withOpacity(0.4),
                ),
                child: Text(
                  _localizedStatusLabel(currentStatus),
                  style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
                ),
              )
            else
              DropdownButtonFormField<String>(
                value: currentStatus,
                decoration: InputDecoration(
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                ),
                isExpanded: true,
                items: options
                    .map(
                      (status) => DropdownMenuItem(
                        value: status,
                        child: Text(_localizedStatusLabel(status)),
                      ),
                    )
                    .toList(),
                onChanged: (newStatus) {
                  if (newStatus != null && newStatus != currentStatus) {
                    controller.updateReturnStatus(newStatus);
                  }
                },
              ),
            const SizedBox(height: 8),
            Text(
              _statusHelpMessage(),
              style: theme.textTheme.bodySmall?.copyWith(color: theme.hintColor),
            ),
          ],
        ),
      );
    });
  }

  Widget _buildBottomBar(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 10,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: SafeArea(
        child: SizedBox(
          width: double.infinity,
          height: 56,
          child: ElevatedButton.icon(
            onPressed: _printReturnReceipt,
            icon: const Icon(Icons.print, size: 24),
            label: Text(
              'print'.tr,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
            ),
            style: ElevatedButton.styleFrom(
              backgroundColor: Get.theme.primaryColor,
              foregroundColor: Colors.white,
              elevation: 4,
              shadowColor: Get.theme.primaryColor.withOpacity(0.4),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _printReturnReceipt() async {
    final salesReturn = controller.salesReturn.value;
    if (salesReturn == null) {
      AppNotifier.error(_translateOrDefault('sales_return_print_no_data', 'No return data available to print.'));
      return;
    }

    if (!Get.isRegistered<ThermalPrinterService>()) {
      AppNotifier.error(_translateOrDefault('sales_return_print_service_missing', 'Thermal printer service is not configured.'));
      return;
    }

    try {
      final printer = Get.find<ThermalPrinterService>();
      await printer.printWidget(
        widgetKey: _returnReceiptKey,
        successMessage: _translateOrDefault('sales_return_print_success', 'Sales return receipt sent to printer.'),
        errorPrefix: _translateOrDefault('sales_return_print_error', 'Failed to print sales return receipt'),
      );
    } catch (e) {
      AppNotifier.error('${_translateOrDefault('sales_return_print_start_failed', 'Failed to start printing')}: $e');
    }
  }

  Widget _buildCompanyLogo() {
    return Obx(() {
      try {
        final authController = Get.find<AuthController>();
        if (authController.companyLogo.value.isNotEmpty) {
          return Container(
            width: 100,
            height: 100,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.black, width: 1),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: Image.network(
                authController.companyLogo.value,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) {
                  return const Icon(
                    Icons.business,
                    size: 50,
                    color: Colors.black,
                  );
                },
              ),
            ),
          );
        }
      } catch (_) {
        // Auth controller not available
      }
      return const Icon(
        Icons.business,
        size: 50,
        color: Colors.black,
      );
    });
  }

  Widget _buildCompanyName() {
    return Obx(() {
      try {
        final authController = Get.find<AuthController>();
        final companyName = authController.companyName.value.isNotEmpty ? authController.companyName.value : 'Your Company Name';
        return Text(
          companyName,
          style: const TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            color: Colors.black,
          ),
          textAlign: TextAlign.center,
        );
      } catch (_) {
        return const Text(
          'Your Company Name',
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            color: Colors.black,
          ),
          textAlign: TextAlign.center,
        );
      }
    });
  }

  String _receiptTitle() {
    return _translateOrDefault('sales_return_receipt_title', 'sales_return_details'.tr);
  }

  String _statusHelpMessage() {
    return _translateOrDefault('return_status_help', 'You can update the return status if needed.');
  }

  String _formatDate(DateTime? date) {
    if (date == null) {
      return 'not_available'.tr;
    }
    return date.toLocal().toString().split(' ').first;
  }

  String _formatAmount(double value) => Formatting.amount(value);

  String _formatOptionalAmount(String? amount) {
    if (amount == null || amount.isEmpty) {
      return 'not_available'.tr;
    }
    final parsed = double.tryParse(amount);
    return parsed != null ? Formatting.amount(parsed) : amount;
  }

  String _translateOrDefault(String key, String fallback) {
    final translated = key.tr;
    return translated == key ? fallback : translated;
  }

  String _localizedStatusLabel(String status) {
    final key = status.toLowerCase();
    final translated = key.tr;
    return translated == key ? status : translated;
  }

  String _formatQuantity(double quantity) {
    // Remove .00 if it's a whole number
    if (quantity == quantity.truncate()) {
      return quantity.truncate().toString();
    }
    return quantity.toStringAsFixed(2);
  }

  String _formatTaxRate(double taxRate) {
    // Show tax rate as percentage without .00 for whole numbers
    if (taxRate == taxRate.truncate()) {
      return '${taxRate.truncate()}%';
    }
    return '${taxRate.toStringAsFixed(1)}%';
  }
}
