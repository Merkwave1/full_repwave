// lib/modules/invoices/screens/invoice_detail_screen.dart
import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import 'package:get/get.dart';
import '/modules/invoices/controllers/invoice_detail_controller.dart';
import '/modules/auth/controllers/auth_controller.dart';
import '/services/thermal_printer_service.dart';
import '/shared_widgets/custom_app_bar.dart';
import '/shared_widgets/loading_indicator.dart';
import '/core/utils/formatting.dart';
import '/data/models/sales_invoice.dart';
import '/core/routes/app_routes.dart';

class InvoiceDetailScreen extends StatefulWidget {
  const InvoiceDetailScreen({super.key});

  @override
  State<InvoiceDetailScreen> createState() => _InvoiceDetailScreenState();
}

class _InvoiceDetailScreenState extends State<InvoiceDetailScreen> {
  late final InvoiceDetailController controller;
  late final AuthController authController;
  final GlobalKey _invoiceKey = GlobalKey();

  @override
  void initState() {
    super.initState();
    controller = Get.find<InvoiceDetailController>();
    authController = Get.find<AuthController>();
    // If a linked sales order is found, navigate to sales order detail screen once.
    ever(controller.linkedSalesOrder, (value) {
      if (value != null) {
        // navigate to sales order detail route using the linked sales order id
        final id = (value as dynamic).salesOrderId;
        if (id != null) {
          // Use a post frame callback to avoid navigation during build
          SchedulerBinding.instance.addPostFrameCallback((_) {
            Get.offNamed(
              AppRoutes.salesOrderDetail,
              arguments: {
                'salesOrderId': id,
                'forceInvoiceView': true,
              },
            );
          });
        }
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: CustomAppBar(title: 'invoice_details'.tr),
      body: Obx(() {
        if (controller.isLoading.value) {
          return LoadingIndicator(message: 'loading_details'.tr);
        }

        if (controller.errorMessage.isNotEmpty) {
          return Center(
            child: Text(
              controller.errorMessage.value,
              style: Get.textTheme.titleMedium?.copyWith(color: Colors.red),
            ),
          );
        }

        final SalesInvoice? salesInvoice = controller.salesInvoice.value;
        if (salesInvoice == null) {
          return Center(child: Text('invoice_not_found'.tr));
        }

        // If linkedSalesOrder exists, the controller will navigate away. Show a loading placeholder.
        if (controller.linkedSalesOrder.value != null) {
          return Center(child: LoadingIndicator(message: 'redirecting_to_order'.tr));
        }

        return Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16.0),
                child: RepaintBoundary(
                  key: _invoiceKey,
                  child: _buildInvoiceThermalLayout(salesInvoice),
                ),
              ),
            ),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(color: Colors.white, boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 10, offset: const Offset(0, -2))]),
              child: SafeArea(
                child: SizedBox(
                  width: double.infinity,
                  height: 56,
                  child: ElevatedButton.icon(
                    onPressed: () async => await _printThermal(),
                    icon: const Icon(Icons.print, size: 24),
                    label: Text('print_invoice'.tr),
                  ),
                ),
              ),
            ),
          ],
        );
      }),
    );
  }

  Widget _buildInvoiceThermalLayout(SalesInvoice salesInvoice) {
    return Container(
      width: double.infinity,
      color: Colors.white,
      padding: const EdgeInsets.all(20.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // Header
          Container(
            padding: const EdgeInsets.only(bottom: 20),
            decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: Colors.black, width: 2))),
            child: Column(
              children: [
                if (authController.companyLogo.value.isNotEmpty)
                  Container(
                    width: 100,
                    height: 100,
                    margin: const EdgeInsets.only(bottom: 16),
                    decoration: BoxDecoration(borderRadius: BorderRadius.circular(8), border: Border.all(color: Colors.black, width: 1)),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: Image.network(
                        authController.companyLogo.value,
                        fit: BoxFit.cover,
                        errorBuilder: (context, error, stackTrace) => const Icon(Icons.business, size: 50, color: Colors.black),
                      ),
                    ),
                  ),
                Text(
                  authController.companyName.value.isNotEmpty ? authController.companyName.value : 'Your Company Name',
                  style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.black),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                Text('invoice_receipt_title'.tr, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: Colors.black), textAlign: TextAlign.center),
              ],
            ),
          ),
          const SizedBox(height: 24),
          _buildThermalInfoSection(salesInvoice),
          const SizedBox(height: 20),
          const Divider(color: Colors.black, thickness: 1),
          const SizedBox(height: 20),
          Text('${'bill_to'.tr}:', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.black)),
          const SizedBox(height: 8),
          Text(salesInvoice.clientCompanyName ?? 'not_available'.tr, style: const TextStyle(fontSize: 14, color: Colors.black), textAlign: TextAlign.center),
          const SizedBox(height: 20),
          const Divider(color: Colors.black, thickness: 1),
          const SizedBox(height: 16),
          Row(children: [
            Expanded(flex: 3, child: Text('item_column'.tr, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold))),
            Expanded(child: Text('qty_column'.tr, textAlign: TextAlign.center)),
            Expanded(child: Text('price_column'.tr, textAlign: TextAlign.right)),
            Expanded(child: Text('total_column'.tr, textAlign: TextAlign.right))
          ]),
          const SizedBox(height: 8),
          const Divider(color: Colors.black, thickness: 1),
          const SizedBox(height: 8),
          // Items
          Builder(builder: (context) {
            final itemWidgets = salesInvoice.items.map<Widget>((item) {
              return Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(flex: 3, child: Text(item.description, style: const TextStyle(fontSize: 12, color: Colors.black))),
                    Expanded(child: Text(item.quantity.toString(), textAlign: TextAlign.center)),
                    Expanded(child: Text(Formatting.amount(item.unitPrice), textAlign: TextAlign.right)),
                    Expanded(child: Text(Formatting.amount(item.totalPrice), textAlign: TextAlign.right)),
                  ],
                ),
              );
            }).toList();

            if (itemWidgets.isNotEmpty) {
              return Column(children: itemWidgets);
            }

            return Padding(padding: const EdgeInsets.symmetric(vertical: 20), child: Text('no_items_in_invoice'.tr, style: const TextStyle(fontSize: 14, color: Colors.black54, fontStyle: FontStyle.italic), textAlign: TextAlign.center));
          }),
          const SizedBox(height: 16),
          const Divider(color: Colors.black, thickness: 1),
          const SizedBox(height: 16),
          _buildThermalTotalsSection(salesInvoice),
          const SizedBox(height: 24),
          const Divider(color: Colors.black, thickness: 2),
          const SizedBox(height: 16),
          Text('thank_you_for_your_business'.tr, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Colors.black), textAlign: TextAlign.center),
          const SizedBox(height: 16),
        ],
      ),
    );
  }

  // If needed, sales order layout is built below. (See helpers)

  // Helper method to build thermal info section
  Widget _buildThermalInfoSection(dynamic salesInvoice) {
    return Column(
      children: [
        _buildThermalRow('${'invoice_no'.tr}:', salesInvoice.invoiceNumber),
        _buildThermalRow('${'date'.tr}:', salesInvoice.issueDate.toLocal().toString().split(' ')[0]),
        _buildThermalRow('${'due_date'.tr}:', salesInvoice.dueDate.toLocal().toString().split(' ')[0]),
        _buildThermalRow('${'status'.tr}:', salesInvoice.status.toUpperCase()),
        if (salesInvoice.notes != null && salesInvoice.notes!.isNotEmpty) _buildThermalRow('${'notes'.tr}:', salesInvoice.notes!),
      ],
    );
  }

  // Helper method to build thermal totals section
  Widget _buildThermalTotalsSection(dynamic salesInvoice) {
    return Column(
      children: [
        // Show tax breakdown if tax amount exists
        if (salesInvoice.taxAmount > 0) ...[
          _buildThermalRow('${'subtotal'.tr}:', Formatting.amount(salesInvoice.subtotal)),
          _buildThermalRow('${'tax_amount'.tr}:', Formatting.amount(salesInvoice.taxAmount)),
          _buildThermalRow('${'total_amount'.tr}:', Formatting.amount(salesInvoice.totalAmount), isTotal: true),
        ] else
          _buildThermalRow('${'total_amount'.tr}:', Formatting.amount(salesInvoice.totalAmount), isTotal: true),
        _buildThermalRow('${'amount_paid'.tr}:', Formatting.amount(salesInvoice.amountPaid)),
        _buildThermalRow('${'balance'.tr}:', Formatting.amount(salesInvoice.totalAmount - salesInvoice.amountPaid)),
      ],
    );
  }

  // Helper method to build thermal receipt rows
  Widget _buildThermalRow(String label, String value, {bool isTotal = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: isTotal ? 16 : 14,
              fontWeight: isTotal ? FontWeight.bold : FontWeight.normal,
              color: Colors.black,
            ),
          ),
          Text(
            value,
            style: TextStyle(
              fontSize: isTotal ? 16 : 14,
              fontWeight: isTotal ? FontWeight.bold : FontWeight.normal,
              color: Colors.black,
            ),
          ),
        ],
      ),
    );
  }

  // Thermal Printing method using ThermalPrinterService
  Future<void> _printThermal() async {
    final invoice = controller.salesInvoice.value;
    if (invoice == null) {
      Get.snackbar('error'.tr, 'invoice_print_no_data'.tr, snackPosition: SnackPosition.BOTTOM);
      return;
    }

    final thermalPrinterService = Get.find<ThermalPrinterService>();
    await thermalPrinterService.printWidget(
      widgetKey: _invoiceKey,
      successMessage: 'invoice_print_success'.tr,
      errorPrefix: 'invoice_print_failed'.tr,
    );
  }
}
