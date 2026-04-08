// lib/modules/invoices/controllers/invoice_detail_controller.dart
import 'package:get/get.dart';
import '/data/models/sales_invoice.dart';
import '/data/repositories/sales_invoice_repository.dart';
import '/data/repositories/sales_order_repository.dart';
import '/data/models/sales_order.dart';

class InvoiceDetailController extends GetxController {
  final SalesInvoiceRepository _salesInvoiceRepository;
  final SalesOrderRepository? _salesOrderRepository;

  InvoiceDetailController({required SalesInvoiceRepository salesInvoiceRepository, SalesOrderRepository? salesOrderRepository})
      : _salesInvoiceRepository = salesInvoiceRepository,
        _salesOrderRepository = salesOrderRepository;

  final Rx<SalesInvoice?> salesInvoice = Rx<SalesInvoice?>(null);
  final Rx<SalesOrder?> linkedSalesOrder = Rx<SalesOrder?>(null);
  final RxBool isLoading = true.obs;
  final RxString errorMessage = ''.obs;

  late final int _invoiceId;

  @override
  void onInit() {
    super.onInit();
    // Safely retrieve the invoice ID from the navigation arguments.
    _handleArguments();
  }

  /// Safely extracts the invoice ID from the arguments and initiates fetching.
  void _handleArguments() {
    try {
      if (Get.arguments != null && Get.arguments is int) {
        _invoiceId = Get.arguments as int;
        fetchInvoiceDetails();
      } else {
        // If no ID is provided, set an error state.
        errorMessage.value = 'Invoice ID was not provided.';
        isLoading.value = false;
        Get.snackbar(
          'Error',
          'Cannot load invoice details without an ID.',
          snackPosition: SnackPosition.BOTTOM,
          backgroundColor: Get.theme.colorScheme.error,
          colorText: Get.theme.colorScheme.onError,
        );
      }
    } catch (e, stack) {
      errorMessage.value = 'An unexpected error occurred during initialization.';
      isLoading.value = false;
      print('InvoiceDetailController Init Error: $e');
      print('Stack trace: $stack');
      Get.snackbar(
        'Initialization Error',
        errorMessage.value,
        snackPosition: SnackPosition.BOTTOM,
        backgroundColor: Get.theme.colorScheme.error,
        colorText: Get.theme.colorScheme.onError,
      );
    }
  }

  /// Fetches the details for the given invoice ID from the repository.
  Future<void> fetchInvoiceDetails() async {
    try {
      isLoading.value = true;
      errorMessage.value = '';
      // Try fetching via the SalesInvoice API first.
      try {
        final fetchedInvoice = await _salesInvoiceRepository.getSalesInvoiceById(_invoiceId);
        salesInvoice.value = fetchedInvoice;

        // If invoice references a sales order, fetch and prefer the SalesOrder details
        final int? linkedOrderId = fetchedInvoice.salesOrderId;
        if (linkedOrderId != null && _salesOrderRepository != null) {
          try {
            final SalesOrder so = await _salesOrderRepository.getSalesOrderById(linkedOrderId);
            linkedSalesOrder.value = so;
          } catch (e) {
            print('Warning: failed to fetch linked sales order: $e');
          }
        }
        return;
      } catch (invoiceFetchError) {
        // If invoice fetch fails (e.g., Sales Invoice not found), fall back to SalesOrder API
        print('Invoice fetch failed for id=$_invoiceId, will attempt SalesOrder API. Error: $invoiceFetchError');
      }

      // Fallback: try fetching a SalesOrder with the same id and show it instead
      if (_salesOrderRepository != null) {
        try {
          final SalesOrder so = await _salesOrderRepository.getSalesOrderById(_invoiceId);
          linkedSalesOrder.value = so;
          return;
        } catch (soError) {
          print('SalesOrder fetch failed for id=$_invoiceId: $soError');
          // let the outer catch report an error
        }
      } else {
        print('No SalesOrderRepository available to fallback to for id=$_invoiceId');
      }
    } catch (e, stack) {
      errorMessage.value = 'Failed to load invoice details.';
      print('InvoiceDetailController Fetch Error: $e');
      print('Stack trace: $stack');
      Get.snackbar(
        'Error',
        errorMessage.value,
        snackPosition: SnackPosition.BOTTOM,
        backgroundColor: Get.theme.colorScheme.error,
        colorText: Get.theme.colorScheme.onError,
      );
    } finally {
      isLoading.value = false;
    }
  }
}
