// lib/data/repositories/sales_invoice_repository.dart
import '/data/datasources/sales_invoice_remote_datasource.dart';
import '/data/models/sales_invoice.dart';

class SalesInvoiceRepository {
  final SalesInvoiceRemoteDataSource remoteDataSource;

  SalesInvoiceRepository({required this.remoteDataSource});

  Future<List<SalesInvoice>> getAllSalesInvoices({
    String? status,
    String? dateFrom,
    String? dateTo,
    String? search,
    int? page,
    int? limit,
  }) async {
    try {
      return await remoteDataSource.getAllSalesInvoices(
        status: status,
        dateFrom: dateFrom,
        dateTo: dateTo,
        search: search,
        page: page,
        limit: limit,
      );
    } catch (e) {
      throw Exception('Error fetching sales invoices: ${e.toString()}');
    }
  }

  Future<SalesInvoice> getSalesInvoiceById(int id) async {
    try {
      return await remoteDataSource.getSalesInvoiceById(id);
    } catch (e) {
      throw Exception('Error fetching sales invoice details: ${e.toString()}');
    }
  }

  Future<SalesInvoice> createSalesInvoice(SalesInvoice salesInvoice) async {
    try {
      return await remoteDataSource.createSalesInvoice(salesInvoice);
    } catch (e) {
      throw Exception('Error creating sales invoice: ${e.toString()}');
    }
  }

  /// Convenience method: create invoice then mark linked sales order as Invoiced.
  /// Requires a [SalesOrderRepository] passed in (not injected here to avoid breaking existing bindings).
  Future<SalesInvoice> createInvoiceAndMarkOrder({
    required SalesInvoice salesInvoice,
    dynamic salesOrderRepository, // Expecting SalesOrderRepository but kept dynamic to decouple
  }) async {
    final created = await createSalesInvoice(salesInvoice);
    try {
      if (created.salesOrderId != null && salesOrderRepository != null) {
        final order = await salesOrderRepository.getSalesOrderById(created.salesOrderId);
        final updated = order.copyWith(status: 'Invoiced');
        await salesOrderRepository.updateSalesOrder(updated);
      }
    } catch (e) {
      // Log but don't fail the invoice creation flow
      print('Failed to mark order ${created.salesOrderId} as Invoiced: $e');
    }
    return created;
  }

  // You might want an updateSalesInvoice method here if needed
  // Future<SalesInvoice> updateSalesInvoice(SalesInvoice salesInvoice) async { ... }
}
