// lib/core/routes/app_routes.dart
abstract class AppRoutes {
  static const String login = '/login';
  static const String dashboard = '/dashboard';
  static const String home = '/home';
  static const String clients = '/clients';
  static const String clientDetail = '/client_detail';
  static const String addEditClient = '/add_edit_client';
  static const String products = '/products';
  static const String productDetail = '/product_detail';
  static const String salesOrders = '/sales_orders'; // Route for Sales Orders screen
  static const String salesOrderDetail = '/sales_order_detail'; // New route for Sales Order Detail screen
  static const String addEditSalesOrder = '/add_edit_sales_order'; // New route for Add/Edit Sales Order screen
  static const String addOrderItem = '/add_order_item'; // New route for adding a sales order item
  static const String quickAddOrderItems = '/quick_add_order_items'; // New route for bulk adding order items
  static const String inventory = '/inventory';
  static const String profile = '/profile';
  static const String profileDeliveries = '/profile/deliveries';
  static const String settings = '/settings';
  static const String notifications = '/notifications';
  static const String visits = '/visits';
  static const String visitsCalendar = '/visits_calendar';
  static const String visitsMap = '/visits_map';
  // Client financials
  static const String clientAccountStatement = '/client_account_statement';
  static const String clientDocuments = '/client_documents';
  static const String addDocument = '/add_document';
  static const String clientInterestedProducts = '/client_interested_products';
  static const String addInterestedProduct = '/add_interested_product';
  static const String warehouse = '/warehouse';
  static const String createTransfer = '/create_transfer';
  static const String warehouseInventory = '/warehouse_inventory';
  static const String invoices = '/invoices'; // New route for invoice list
  static const String invoiceDetail = '/invoice_detail'; // New route for invoice detail
  static const String returnOrder = '/return_order'; // Route for Return Order screen (renamed from 'returns' for clarity)
  static const String returns = '/returns'; // New route for returns list
  static const String returnOrderDetail = '/return_order_detail'; // New route for return order detail
  static const String addEditReturn = '/add_edit_return'; // New route for adding/editing sales returns
  static const String selectSalesOrderItemsForReturn = '/select_so_items_for_return'; // New route to select SO items for return
  static const String payments = '/payments'; // New route for payments
  static const String addEditPayment = '/add_edit_payment'; // New route for add/edit payment
  static const String deliveries = '/deliveries'; // New: pending deliveries list
  static const String safes = '/safes'; // New route for safes list
  static const String safeDetail = '/safe_detail'; // New route for safe detail
  static const String addExpense = '/add_expense'; // New route for adding expense
  static const String addIncome = '/add_income'; // New route for adding income
  static const String attendance = '/attendance'; // New route for attendance tracking
  // Add other routes as needed
}
