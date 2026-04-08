// lib/modules/sales_orders/screens/sales_order_detail_screen.dart
import 'package:flutter/material.dart';
import '/shared_widgets/ultra_safe_navigation.dart';
import 'package:get/get.dart';
import '/modules/sales_orders/controllers/sales_order_detail_controller.dart';
import '/data/models/sales_order.dart';
import '/data/models/sales_order_item.dart';
import '/data/models/sales_delivery_item.dart';
import '/modules/auth/controllers/auth_controller.dart';
import '/services/thermal_printer_service.dart';
import '/modules/deliveries/screens/pending_deliveries_screen.dart' show FulfillDeliveryScreen; // For quick deliver
import '/data/repositories/sales_delivery_repository.dart';
import '/data/datasources/sales_delivery_remote_datasource.dart';
import '/services/api_service.dart';
import '/shared_widgets/custom_app_bar.dart';
import '/shared_widgets/loading_indicator.dart';
import '/core/routes/app_routes.dart'; // Import AppRoutes for navigation
import '/shared_widgets/app_notifier.dart';
import '/core/utils/formatting.dart';

class SalesOrderDetailScreen extends GetView<SalesOrderDetailController> {
  SalesOrderDetailScreen({super.key});

  // Key to capture the sales order widget as an image
  final GlobalKey _salesOrderKey = GlobalKey();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(kToolbarHeight),
        child: Obx(() {
          final salesOrder = controller.salesOrder.value;
          final bool useInvoiceLayout = controller.shouldDisplayInvoiceLayout(salesOrder);
          final List<Widget>? actions = (salesOrder != null && salesOrder.status == 'Draft')
              ? [
                  IconButton(
                    icon: const Icon(Icons.edit, color: Colors.white),
                    onPressed: () async {
                      final result = await Get.toNamed(
                        AppRoutes.addEditSalesOrder,
                        arguments: salesOrder,
                      );
                      if (result == true) {
                        controller.fetchSalesOrderDetail(salesOrder.salesOrderId);
                      }
                    },
                    tooltip: 'edit'.tr,
                  ),
                ]
              : null;

          return CustomAppBar(
            title: (useInvoiceLayout ? 'invoice_details' : 'sales_order_details').tr,
            actions: actions,
          );
        }),
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

        final salesOrder = controller.salesOrder.value;
        if (salesOrder == null) {
          return Center(
            child: Text(
              'sales_order_not_found'.tr,
              style: Get.textTheme.titleMedium,
            ),
          );
        }

        final bool useInvoiceLayout = controller.shouldDisplayInvoiceLayout(salesOrder);
        final bool isQuoteView = controller.forceSalesOrderLayout.value;

        return Column(
          children: [
            // Main sales order display - Thermal Receipt Style
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(vertical: 16.0),
                child: RepaintBoundary(
                  key: _salesOrderKey,
                  child: _buildInvoiceStyleLayout(context, salesOrder, useInvoiceLayout, isQuoteView),
                ),
              ),
            ),
            // Delivery Progress (if deliveryStatus exists)
            if (salesOrder.status == 'Invoiced' && salesOrder.deliveryStatus != null) _buildDeliveryProgressSection(salesOrder, context),
            // Removed expandable delivery history (سجل عمليات التسليم) - history available via button below

            // UPDATED: Status Action Buttons + Print Button at Bottom
            _buildBottomActionBar(salesOrder, context, useInvoiceLayout),
          ],
        );
      }),
    );
  }

  /// Build the main thermal receipt style layout
  Widget _buildInvoiceStyleLayout(BuildContext context, SalesOrder salesOrder, bool useInvoiceLayout, bool isQuoteView) {
    final items = salesOrder.items;
    final bool hasTax = (salesOrder.taxAmount > 0) || items.any((item) => (item.taxRate ?? 0) > 0);

    return Container(
      width: double.infinity,
      color: Colors.white,
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _buildReceiptHeader(useInvoiceLayout, isQuoteView),
          const SizedBox(height: 24),
          _buildSalesOrderInfoSection(salesOrder, useInvoiceLayout, isQuoteView),
          const SizedBox(height: 20),
          const Divider(color: Colors.black, thickness: 2),
          const SizedBox(height: 16),
          _buildClientInfoSection(salesOrder),
          const SizedBox(height: 16),
          const Divider(color: Colors.black, thickness: 2),
          const SizedBox(height: 16),
          _buildSalesOrderItemsTable(items, useInvoiceLayout),
          const SizedBox(height: 16),
          const Divider(color: Colors.black, thickness: 2),
          const SizedBox(height: 12),
          _buildSalesOrderTotalsSection(salesOrder, hasTax),
          if (_hasValidNotes(salesOrder.notes)) ...[
            const SizedBox(height: 16),
            _buildNotesBlock('notes'.tr, salesOrder.notes!.trim()),
          ],
        ],
      ),
    );
  }

  Widget _buildReceiptHeader(bool useInvoiceLayout, bool isQuoteView) {
    final String titleKey = useInvoiceLayout ? 'invoice_receipt_title' : (isQuoteView ? 'sales_quote_receipt_title' : 'sales_order_receipt_title');

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
            titleKey.tr,
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

  Widget _buildSalesOrderInfoSection(SalesOrder salesOrder, bool useInvoiceLayout, bool isQuoteView) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Swap label text when order is invoiced to show invoice numbering
        _buildInfoRow(
          (useInvoiceLayout ? 'invoice_no'.tr : 'order_number'.tr),
          '#${salesOrder.salesOrderId}',
        ),
        _buildInfoRow('date'.tr, _formatDate(salesOrder.orderDate)),
        if (!isQuoteView) _buildInfoRow('status'.tr, _getTranslatedStatus(salesOrder.status).toUpperCase()),
        // Status action buttons moved to bottom bar
        if (salesOrder.status == 'Invoiced' && salesOrder.deliveryStatus != null) _buildInfoRow('delivery_status'.tr, _formatDeliveryStatus(salesOrder.deliveryStatus)),
        if (salesOrder.warehouseName?.isNotEmpty == true) _buildInfoRow('warehouse'.tr, salesOrder.warehouseName!),
        if (salesOrder.representativeName?.isNotEmpty == true) _buildInfoRow('representative'.tr, salesOrder.representativeName!),
        if (salesOrder.createdAt != null) _buildInfoRow('created_at'.tr, _formatDate(salesOrder.createdAt)),
        if (salesOrder.updatedAt != null) _buildInfoRow('updated_at'.tr, _formatDate(salesOrder.updatedAt)),
      ],
    );
  }

  // NEW: Bottom Action Bar with Status Buttons and Print Button
  Widget _buildBottomActionBar(SalesOrder salesOrder, BuildContext context, bool useInvoiceLayout) {
    return Obx(() {
      final isUpdating = controller.isUpdatingStatus.value;
      final availableStatuses = controller.getAvailableStatusOptions().where((status) => status.toLowerCase() != salesOrder.status.toLowerCase()).toList();

      final bool hasStatusActions = availableStatuses.isNotEmpty;

      return Container(
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.08),
              blurRadius: 12,
              offset: const Offset(0, -4),
            ),
          ],
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Status Action Buttons (if available)
                if (hasStatusActions) ...[
                  Row(
                    children: availableStatuses.map((status) {
                      final normalized = status.toLowerCase();
                      final isPending = normalized == 'pending';
                      final isCancelled = normalized == 'cancelled';
                      final label = _getTranslatedStatusAction(status);

                      Color backgroundColor;
                      Color foregroundColor;
                      Color borderColor;
                      IconData icon;

                      if (isPending) {
                        backgroundColor = Colors.orange.shade50;
                        foregroundColor = Colors.orange.shade700;
                        borderColor = Colors.orange.shade300;
                        icon = Icons.schedule;
                      } else if (isCancelled) {
                        backgroundColor = Colors.red.shade50;
                        foregroundColor = Colors.red.shade700;
                        borderColor = Colors.red.shade300;
                        icon = Icons.cancel_outlined;
                      } else {
                        backgroundColor = Get.theme.primaryColor.withOpacity(0.1);
                        foregroundColor = Get.theme.primaryColor;
                        borderColor = Get.theme.primaryColor.withOpacity(0.3);
                        icon = Icons.check_circle_outline;
                      }

                      return Expanded(
                        child: Padding(
                          padding: EdgeInsets.only(
                            right: availableStatuses.last == status ? 0 : 8,
                          ),
                          child: OutlinedButton.icon(
                            onPressed: isUpdating ? null : () => _onChangeStatusTapped(status),
                            icon: Icon(icon, size: 20),
                            label: Text(
                              label,
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            style: OutlinedButton.styleFrom(
                              backgroundColor: backgroundColor,
                              foregroundColor: foregroundColor,
                              side: BorderSide(color: borderColor, width: 1.5),
                              padding: const EdgeInsets.symmetric(
                                horizontal: 16,
                                vertical: 14,
                              ),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                  if (isUpdating) ...[
                    const SizedBox(height: 8),
                    const LinearProgressIndicator(minHeight: 3),
                  ],
                  const SizedBox(height: 12),
                ],

                // Print Button
                SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: ElevatedButton.icon(
                    onPressed: () async {
                      await _printThermal(isInvoice: useInvoiceLayout);
                    },
                    icon: const Icon(Icons.print, size: 22),
                    label: Text(
                      useInvoiceLayout ? 'print_invoice'.tr : 'print'.tr,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Get.theme.primaryColor,
                      foregroundColor: Colors.white,
                      elevation: 2,
                      shadowColor: Get.theme.primaryColor.withOpacity(0.3),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    });
  }

  Widget _buildClientInfoSection(SalesOrder salesOrder) {
    final rows = <Widget>[
      _buildInfoRow('bill_to'.tr, salesOrder.clientCompanyName ?? 'not_available'.tr),
    ];

    if (salesOrder.clientAddress?.trim().isNotEmpty == true) {
      rows.add(_buildInfoRow('address'.tr, salesOrder.clientAddress!.trim()));
    }
    if (salesOrder.clientCity?.trim().isNotEmpty == true) {
      rows.add(_buildInfoRow('city'.tr, salesOrder.clientCity!.trim()));
    }
    if (salesOrder.clientContactPhone1?.trim().isNotEmpty == true) {
      rows.add(_buildInfoRow('phone'.tr, salesOrder.clientContactPhone1!.trim()));
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.black.withOpacity(0.4)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 8,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: rows,
      ),
    );
  }

  Widget _buildSalesOrderItemsTable(List<SalesOrderItem> items, bool isInvoice) {
    if (items.isEmpty) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 24),
        child: Text(
          (isInvoice ? 'no_items_in_invoice'.tr : 'no_items_in_order'.tr),
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
      fontSize: 11,
      fontWeight: FontWeight.w900,
      color: Colors.black,
      // letterSpacing: 0.2,
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

    TableRow buildBodyRow(SalesOrderItem item) {
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
            _getOrderItemName(item),
            _getOrderPackagingName(item),
            bodyStyle,
            TextAlign.start,
          ),
          _buildTableBodyCell(_formatOrderQuantity(item.quantity), bodyStyle, TextAlign.center),
          _buildTableBodyCell(_formatOrderQuantity(item.unitPrice), bodyStyle, TextAlign.center),
          _buildTableBodyCell(
            _formatOrderTaxRate(item.taxRate),
            bodyStyle,
            TextAlign.center,
          ),
          _buildTableBodyCell(
            Formatting.amount(item.totalAmount),
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
            0: FlexColumnWidth(2.5),
            1: FlexColumnWidth(.8),
            2: FlexColumnWidth(1.0),
            3: FlexColumnWidth(0.8),
            4: FlexColumnWidth(1.4),
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
                fontSize: 8,
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

  String _getOrderItemName(SalesOrderItem item) {
    if (item.variantName != null && item.variantName!.trim().isNotEmpty) {
      return item.variantName!.trim();
    }
    if (item.packagingTypeName != null && item.packagingTypeName!.trim().isNotEmpty) {
      return item.packagingTypeName!.trim();
    }
    return _translateOrDefault('unknown_product', 'منتج غير معروف');
  }

  String _getOrderPackagingName(SalesOrderItem item) {
    if (item.packagingTypeName != null && item.packagingTypeName!.trim().isNotEmpty) {
      if (item.variantName != null && item.variantName!.trim().isNotEmpty) {
        return item.packagingTypeName!.trim();
      }
    }
    return '';
  }

  Widget _buildSalesOrderTotalsSection(SalesOrder salesOrder, bool hasTax) {
    final double itemsDiscount = (salesOrder.discountAmount - salesOrder.orderDiscountAmount).clamp(0.0, double.infinity);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _buildTotalsRow('subtotal'.tr, Formatting.amount(salesOrder.subtotal)),
        if (hasTax) _buildTotalsRow('tax_amount'.tr, Formatting.amount(salesOrder.taxAmount)),
        if (itemsDiscount > 0) _buildTotalsRow('${'discount'.tr} (${'items'.tr})', Formatting.amount(itemsDiscount)),
        if (salesOrder.orderDiscountAmount > 0) _buildTotalsRow('${'discount'.tr} (${'order'.tr})', Formatting.amount(salesOrder.orderDiscountAmount)),
        if (salesOrder.discountAmount > 0 && itemsDiscount > 0 && salesOrder.orderDiscountAmount > 0) _buildTotalsRow('${'discount'.tr} (${'total'.tr})', Formatting.amount(salesOrder.discountAmount)),
        _buildTotalsRow('total_amount'.tr, Formatting.amount(salesOrder.totalAmount), highlight: true),
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

  Widget _buildInfoRow(String label, String value) {
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

  bool _hasValidNotes(String? notes) {
    if (notes == null) {
      return false;
    }
    final trimmed = notes.trim();
    if (trimmed.isEmpty) {
      return false;
    }
    if (trimmed.toLowerCase() == 'null') {
      return false;
    }
    return true;
  }

  String _formatOrderQuantity(double quantity) {
    if (quantity == quantity.truncate()) {
      return quantity.truncate().toString();
    }
    return quantity.toStringAsFixed(2);
  }

  String _formatOrderTaxRate(double? taxRate) {
    if (taxRate == null || taxRate == 0) {
      return '-';
    }
    if (taxRate == taxRate.truncate()) {
      return '${taxRate.truncate()}%';
    }
    return '${taxRate.toStringAsFixed(1)}%';
  }

  String _translateOrDefault(String key, String fallback) {
    final translated = key.tr;
    return translated == key ? fallback : translated;
  }

  /// Build company logo widget
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
      } catch (e) {
        // Auth controller not found, use default logo
      }
      return const Icon(
        Icons.business,
        size: 50,
        color: Colors.black,
      );
    });
  }

  // Removed bilingual dropdown translator; delivery status now shown as static Arabic label only.

  /// Build company name widget
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
      } catch (e) {
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

  Widget _buildDeliveryProgressSection(SalesOrder salesOrder, BuildContext context) {
    // Compute delivered vs total from items if fields available
    double total = 0;
    double delivered = 0;
    for (final item in salesOrder.items) {
      total += item.quantity;
      delivered += (item.deliveredQuantity ?? 0);
    }
    final remaining = (total - delivered).clamp(0, total);
    final progress = total > 0 ? (delivered / total) : 0;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: Colors.grey.shade300)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('progress_delivery'.tr, style: TextStyle(fontWeight: FontWeight.bold)),
              Text('${delivered.toStringAsFixed(2)} / ${total.toStringAsFixed(2)}'),
            ],
          ),
          const SizedBox(height: 8),
          LinearProgressIndicator(
            value: progress.toDouble(),
            minHeight: 8,
            backgroundColor: Colors.grey.shade200,
          ),
          const SizedBox(height: 4),
          Text('${'remaining'.tr}: ${remaining.toStringAsFixed(2)}', style: const TextStyle(fontSize: 12)),
          const SizedBox(height: 8),
          Row(children: [
            Expanded(
              child: ElevatedButton.icon(
                onPressed: () async {
                  // Show loading while fetching
                  Get.dialog(const Center(child: CircularProgressIndicator()), barrierDismissible: false);
                  await controller.loadFulfillmentHistory();
                  if (Get.isRegistered<GetMaterialController>() && Get.isDialogOpen == true) Navigator.of(context).pop();
                  Get.dialog(AlertDialog(
                    title: Text('delivery_history_title'.tr),
                    content: SizedBox(
                      width: double.maxFinite,
                      child: Obx(() {
                        final list = controller.deliveriesHistory;
                        if (controller.isLoadingHistory.value) {
                          return const Center(child: CircularProgressIndicator());
                        }
                        if (list.isEmpty) {
                          return Text('delivery_history_empty'.tr);
                        }
                        return ListView.builder(
                          shrinkWrap: true,
                          itemCount: list.length,
                          itemBuilder: (c, i) {
                            final d = list[i];
                            return ListTile(
                              dense: true,
                              leading: const Icon(Icons.local_shipping),
                              title: Text('delivery_number'.trParams({'id': d.deliveryId.toString()})),
                              subtitle: Text(d.deliveryDate.toLocal().toString().split(' ').first),
                              onTap: () async {
                                try {
                                  final repo = Get.find<SalesDeliveryRepository>();
                                  Get.dialog(const Center(child: CircularProgressIndicator()), barrierDismissible: false);
                                  final detail = await repo.getDeliveryDetail(d.deliveryId);
                                  if (Get.isRegistered<GetMaterialController>() && Get.isDialogOpen == true) Navigator.of(context).pop();
                                  Get.dialog(AlertDialog(
                                    title: Text('delivery_details_title'.trParams({'id': detail.deliveryId.toString()})),
                                    content: SizedBox(
                                      width: double.maxFinite,
                                      child: detail.items.isEmpty
                                          ? Text('delivery_details_no_items'.tr)
                                          : ListView.builder(
                                              shrinkWrap: true,
                                              itemCount: detail.items.length,
                                              itemBuilder: (c2, j) {
                                                final it = detail.items[j];
                                                final deliveredQty = it.quantityDelivered.toStringAsFixed(2);
                                                return ListTile(
                                                  dense: true,
                                                  leading: const Icon(Icons.inventory_2),
                                                  title: Text(_resolveDeliveryItemName(salesOrder, it)),
                                                  subtitle: Column(
                                                    crossAxisAlignment: CrossAxisAlignment.start,
                                                    children: [Text('${'quantity'.tr}: $deliveredQty'), if (it.batchDate != null) Text('${'production_date'.tr}: ${it.batchDate!.toLocal().toString().split(' ').first}')],
                                                  ),
                                                );
                                              },
                                            ),
                                    ),
                                    actions: [TextButton(onPressed: () => UltraSafeNavigation.back(context), child: Text('close'.tr))],
                                  ));
                                } catch (e) {
                                  if (Get.isRegistered<GetMaterialController>() && Get.isDialogOpen == true) Navigator.of(context).pop();
                                  AppNotifier.error('delivery_details_load_failed'.tr, title: 'error'.tr);
                                }
                              },
                            );
                          },
                        );
                      }),
                    ),
                    actions: [TextButton(onPressed: () => UltraSafeNavigation.back(context), child: Text('close'.tr))],
                  ));
                },
                icon: const Icon(Icons.history),
                label: Text('delivery_history'.tr),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(backgroundColor: Colors.orange.shade700),
                onPressed: remaining <= 0
                    ? null
                    : () async {
                        // Ensure repository for deliveries is registered
                        if (!Get.isRegistered<SalesDeliveryRepository>()) {
                          final api = Get.find<ApiService>();
                          Get.put(SalesDeliveryRepository(remote: SalesDeliveryRemoteDataSource(apiService: api)));
                        }
                        // Try to reuse the enriched pending order data from deliveries module for exact same screen
                        final repo = Get.find<SalesDeliveryRepository>();
                        Map<String, dynamic>? enriched;
                        try {
                          enriched = await repo.getPendingOrderById(salesOrder.salesOrderId);
                          if (enriched != null) {
                            print('DEBUG: Found enriched order data with ${enriched['items']?.length ?? 0} items');
                          } else {
                            print('DEBUG: Order ${salesOrder.salesOrderId} not found in pending orders, using fallback');
                          }
                        } catch (e) {
                          print('DEBUG: Error fetching pending order: $e');
                          enriched = null;
                        }

                        final Map<String, dynamic> orderMap = enriched ??
                            {
                              'sales_orders_id': salesOrder.salesOrderId,
                              'clients_company_name': salesOrder.clientCompanyName,
                              'sales_orders_warehouse_id': salesOrder.warehouseId ?? 0,
                              'sales_orders_delivery_status': (salesOrder.deliveryStatus?.isEmpty ?? true) ? 'Not_Delivered' : salesOrder.deliveryStatus,
                              'total_pending_quantity': remaining,
                              'items': salesOrder.items
                                  .map((i) => {
                                        'sales_order_items_id': i.salesOrderItemId,
                                        'variant_name': i.variantName ?? 'item'.tr,
                                        'quantity_pending': (i.pendingQuantity ?? (i.quantity - (i.deliveredQuantity ?? 0))).clamp(0, i.quantity),
                                        'available_quantity': 0,
                                        'packaging_type_name': i.packagingTypeName,
                                        'packaging_types_name': i.packagingTypeName,
                                        'packaging_types_units_per_package': null,
                                        'batches': [],
                                      })
                                  .toList(),
                            };

                        final result = await Get.to(() => const FulfillDeliveryScreen(), arguments: orderMap);
                        if (result != null) {
                          controller.fetchSalesOrderDetail(salesOrder.salesOrderId);
                          controller.loadFulfillmentHistory();
                        }
                      },
                icon: const Icon(Icons.local_shipping),
                label: Text('quick_delivery'.tr),
              ),
            ),
          ]),
        ],
      ),
    );
  }

  /// Thermal Printing method using ThermalPrinterService
  Future<void> _printThermal({required bool isInvoice}) async {
    final salesOrder = controller.salesOrder.value;
    if (salesOrder == null) {
      Get.snackbar('error'.tr, (isInvoice ? 'invoice_print_no_data' : 'sales_order_print_no_data').tr, snackPosition: SnackPosition.BOTTOM);
      return;
    }

    final thermalPrinterService = Get.find<ThermalPrinterService>();
    await thermalPrinterService.printWidget(
      widgetKey: _salesOrderKey,
      successMessage: (isInvoice ? 'invoice_print_success' : 'sales_order_print_success').tr,
      errorPrefix: (isInvoice ? 'invoice_print_failed' : 'sales_order_print_failed').tr,
    );
  }

  Future<void> _onChangeStatusTapped(String newStatus) async {
    final salesOrder = controller.salesOrder.value;
    if (salesOrder == null) return;

    final translatedStatus = _getTranslatedStatus(newStatus);
    final currentStatus = _getTranslatedStatus(salesOrder.status);

    final confirmed = await Get.dialog<bool>(
      AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        title: Row(
          children: [
            Icon(
              Icons.swap_horiz_rounded,
              color: Get.theme.primaryColor,
              size: 28,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                'confirm_status_change'.tr,
                style: const TextStyle(fontSize: 18),
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'change_order_status_confirmation'.tr,
              style: Get.textTheme.bodyMedium,
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.grey.shade100,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          'current_status'.tr,
                          style: TextStyle(
                            color: Colors.grey.shade600,
                            fontSize: 12,
                          ),
                        ),
                      ),
                      Text(
                        currentStatus,
                        style: TextStyle(
                          fontWeight: FontWeight.w600,
                          color: Colors.grey.shade800,
                        ),
                      ),
                    ],
                  ),
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 8),
                    child: Icon(Icons.arrow_downward, size: 20),
                  ),
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          'new_status'.tr,
                          style: TextStyle(
                            color: Colors.grey.shade600,
                            fontSize: 12,
                          ),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: Get.theme.primaryColor.withOpacity(0.15),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          translatedStatus,
                          style: TextStyle(
                            fontWeight: FontWeight.w700,
                            color: Get.theme.primaryColor,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Get.back(result: false),
            child: Text(
              'cancel'.tr,
              style: TextStyle(color: Colors.grey.shade600),
            ),
          ),
          ElevatedButton(
            onPressed: () => Get.back(result: true),
            style: ElevatedButton.styleFrom(
              backgroundColor: Get.theme.primaryColor,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(
                horizontal: 24,
                vertical: 12,
              ),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
            child: Text('confirm'.tr),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      await controller.updateSalesOrderStatus(newStatus);
    }
  }

  /// Get translated status
  String _getTranslatedStatus(String status) {
    final statusKey = status.toLowerCase();
    // Check if the translation key exists, fallback to original status if not
    final translated = statusKey.tr;
    return translated == statusKey ? status : translated;
  }

  String _getTranslatedStatusAction(String status) {
    final statusKey = 'action_${status.toLowerCase()}';
    // Check if the translation key exists, fallback to translated status if not
    final translated = statusKey.tr;
    return translated == statusKey ? _getTranslatedStatus(status) : translated;
  }

  String _formatDate(DateTime? date) {
    if (date == null) return 'not_available'.tr;
    return date.toLocal().toString().split(' ').first;
  }

  String _formatDeliveryStatus(String? status) {
    if (status == null) return 'not_available'.tr;
    final normalized = status.replaceAll('_', ' ').toLowerCase();
    switch (normalized) {
      case 'delivered':
        return 'delivery_status_delivered'.tr;
      case 'partial':
      case 'partially delivered':
        return 'delivery_status_partial'.tr;
      case 'not delivered':
      case 'pending':
        return 'delivery_status_not_delivered'.tr;
      default:
        final translated = normalized.tr;
        return translated == normalized ? status : translated;
    }
  }

  String _resolveDeliveryItemName(SalesOrder salesOrder, SalesDeliveryItem deliveryItem) {
    for (final SalesOrderItem orderItem in salesOrder.items) {
      if (orderItem.salesOrderItemId == deliveryItem.salesOrderItemId) {
        return orderItem.variantName ?? orderItem.productVariant?.variantName ?? orderItem.productVariant?.productsName ?? 'not_available'.tr;
      }
    }
    return 'not_available'.tr;
  }

  String _formatAmount(double? value) => value == null ? 'not_available'.tr : Formatting.amount(value);
}
