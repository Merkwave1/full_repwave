// lib/data/datasources/sales_invoice_remote_datasource.dart
import 'dart:convert';
import 'package:http/http.dart' as http;
import '/core/app_constants.dart';
import '/data/models/sales_invoice.dart';

class SalesInvoiceRemoteDataSource {
  String get _baseUrl => '${AppConstants.apiBaseUrl()}/sales_invoices';

  Future<List<SalesInvoice>> getAllSalesInvoices({
    String? status,
    String? dateFrom,
    String? dateTo,
    String? search,
    int? page,
    int? limit,
  }) async {
    final Map<String, String> queryParams = {};
    if (status != null && status.isNotEmpty) queryParams['status'] = status;
    if (dateFrom != null && dateFrom.isNotEmpty) queryParams['date_from'] = dateFrom;
    if (dateTo != null && dateTo.isNotEmpty) queryParams['date_to'] = dateTo;
    if (search != null && search.isNotEmpty) queryParams['search'] = search;
    if (page != null) queryParams['page'] = page.toString();
    if (limit != null) queryParams['limit'] = limit.toString();

    final uri = Uri.parse('$_baseUrl/get.php').replace(queryParameters: queryParams);
    print('API GET Request URL: $uri');

    final response = await http.get(uri);

    if (response.statusCode == 200) {
      final Map<String, dynamic> jsonResponse = json.decode(response.body);
      if (jsonResponse['status'] == 'success') {
        final List<dynamic> data = jsonResponse['data']['data']; // Note the nested 'data' key
        return data.map((json) => SalesInvoice.fromJson(json as Map<String, dynamic>)).toList();
      } else {
        throw Exception('Error fetching sales invoices: ${jsonResponse['message']}');
      }
    } else {
      throw Exception('Failed to fetch sales invoices. Status code: ${response.statusCode}');
    }
  }

  Future<SalesInvoice> getSalesInvoiceById(int id) async {
    final uri = Uri.parse('$_baseUrl/get.php?id=$id');
    print('API GET Request URL: $uri');

    final response = await http.get(uri);

    if (response.statusCode == 200) {
      final Map<String, dynamic> jsonResponse = json.decode(response.body);
      if (jsonResponse['status'] == 'success') {
        return SalesInvoice.fromJson(jsonResponse['data'] as Map<String, dynamic>);
      } else {
        throw Exception('Error fetching sales invoice details: ${jsonResponse['message']}');
      }
    } else {
      throw Exception('Failed to fetch sales invoice details. Status code: ${response.statusCode}');
    }
  }

  Future<SalesInvoice> createSalesInvoice(SalesInvoice salesInvoice) async {
    final uri = Uri.parse('$_baseUrl/add.php');
    print('API POST Request URL: $uri');
    print('SalesInvoice data to send: ${salesInvoice.toJson()}');

    final Map<String, String> body = {
      'sales_invoice_client_id': salesInvoice.clientId.toString(),
      'sales_invoice_number': salesInvoice.invoiceNumber,
      'sales_invoice_issue_date': salesInvoice.issueDate.toIso8601String().split('T')[0],
      'sales_invoice_due_date': salesInvoice.dueDate.toIso8601String().split('T')[0],
      'sales_invoice_subtotal': salesInvoice.subtotal.toString(),
      'sales_invoice_discount_amount': salesInvoice.discountAmount.toString(),
      'sales_invoice_tax_amount': salesInvoice.taxAmount.toString(),
      'sales_invoice_total_amount': salesInvoice.totalAmount.toString(),
      'sales_invoice_amount_paid': salesInvoice.amountPaid.toString(),
      'sales_invoice_status': salesInvoice.status,
      'sales_invoice_notes': salesInvoice.notes ?? '',
      'items': json.encode(salesInvoice.items.map((item) => item.toJson()).toList()),
    };

    if (salesInvoice.salesOrderId != null) {
      body['sales_invoice_sales_order_id'] = salesInvoice.salesOrderId.toString();
    }

    final response = await http.post(
      uri,
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      body: body,
      encoding: Encoding.getByName('utf-8'),
    );

    print('response.body ${response.body}');

    if (response.statusCode == 200) {
      final Map<String, dynamic> jsonResponse = json.decode(response.body);
      if (jsonResponse['status'] == 'success') {
        return SalesInvoice.fromJson(jsonResponse['data'] as Map<String, dynamic>);
      } else {
        throw Exception('Error creating sales invoice: ${jsonResponse['message']}');
      }
    } else {
      throw Exception('Failed to create sales invoice. Status code: ${response.statusCode}');
    }
  }

  // You might want an updateSalesInvoice method here if needed
  // Future<SalesInvoice> updateSalesInvoice(SalesInvoice salesInvoice) async { ... }
}
