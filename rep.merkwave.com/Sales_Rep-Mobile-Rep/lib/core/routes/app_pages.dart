// lib/core/routes/app_pages.dart
import 'package:get/get.dart';
import '/core/routes/app_routes.dart';
import '/modules/auth/bindings/auth_binding.dart';
import '/modules/auth/screens/login_screen.dart';
import '/modules/client_documents/bindings/add_document_binding.dart';
import '/modules/client_documents/bindings/client_documents_binding.dart';
import '/modules/client_documents/screens/add_document_screen.dart';
import '/modules/client_documents/screens/client_documents_screen.dart';
import '/modules/client_interested_products/bindings/add_interested_product_binding.dart';
import '/modules/client_interested_products/bindings/client_interested_products_binding.dart';
import '/modules/client_interested_products/screens/add_interested_product_screen.dart';
import '/modules/client_interested_products/screens/client_interested_products_screen.dart';
import '/modules/clients/bindings/add_edit_client_binding.dart';
import '/modules/clients/bindings/client_detail_binding.dart';
import '/modules/clients/bindings/clients_binding.dart';
import '/modules/clients/screens/add_edit_client_screen.dart';
import '/modules/clients/screens/client_detail_screen.dart';
import '/modules/clients/screens/clients_screen.dart';
import '/modules/dashboard/bindings/dashboard_binding.dart';
import '/modules/dashboard/screens/dashboard_screen.dart';
import '/modules/home/bindings/home_binding.dart';
import '/modules/home/screens/home_screen.dart';
import '/modules/notifications/bindings/notification_binding.dart';
import '/modules/notifications/screens/notifications_screen.dart';
import '/modules/profile/bindings/profile_binding.dart';
import '/modules/profile/screens/profile_screen.dart';
import '/modules/profile/screens/profile_deliveries_screen.dart';
import '/modules/settings/bindings/settings_binding.dart';
import '/modules/settings/screens/settings_screen.dart';

import '/modules/warehouse/bindings/warehouse_binding.dart';
import '/modules/warehouse/screens/warehouse_screen.dart';
// New Imports for the Transfer feature
import '/modules/transfers/screens/create_transfer_screen.dart';
import '/modules/transfers/bindings/create_transfer_binding.dart';
import '/modules/warehouse_inventory/screens/warehouse_inventory_screen.dart';
import '/modules/warehouse_inventory/bindings/warehouse_inventory_binding.dart';

// Imports for Sales Orders, Invoices, Returns
import '/modules/sales_orders/bindings/sales_orders_binding.dart';
import '/modules/sales_orders/screens/sales_orders_screen.dart';
import '/modules/sales_orders/screens/sales_order_detail_screen.dart';
import '/modules/sales_orders/bindings/sales_order_detail_binding.dart';
import '/modules/sales_orders/screens/add_edit_sales_order_screen.dart';
import '/modules/sales_orders/bindings/add_edit_sales_order_binding.dart';
import '/modules/sales_orders/screens/add_order_item_screen.dart'; // New import
import '/modules/sales_orders/bindings/add_order_item_binding.dart'; // New import
import '/modules/sales_orders/screens/quick_add_order_items_screen.dart';
import '/modules/sales_orders/bindings/quick_add_order_items_binding.dart';

// New Imports for Invoice Bindings
import '/modules/invoices/bindings/invoices_binding.dart';
import '/modules/invoices/bindings/invoice_detail_binding.dart';
import '/modules/invoices/screens/invoice_screen.dart';
import '/modules/invoices/screens/invoice_detail_screen.dart';

// New Imports for Return Bindings
import '/modules/returns/bindings/returns_binding.dart';
import '/modules/returns/bindings/return_order_detail_binding.dart';
import '/modules/returns/bindings/add_edit_sales_return_binding.dart';
import '/modules/returns/screens/return_order_screen.dart';
import '/modules/returns/screens/return_order_detail_screen.dart';
import '/modules/returns/screens/add_edit_sales_return_screen.dart';
import '/modules/returns/screens/select_sales_order_items_for_return_screen.dart'; // New import
import '/modules/returns/bindings/select_sales_order_items_for_return_binding.dart'; // New import

// Visits imports
import '/modules/visits/screens/visits_screen.dart';
import '/modules/visits/bindings/visits_binding.dart';
import '/modules/visits/screens/visits_calendar_screen.dart';
import '/modules/visits/bindings/visits_calendar_binding.dart';
import '/modules/visits/screens/visits_map_screen.dart';
import '/modules/visits/bindings/visits_map_binding.dart';

// Payments imports
import '/modules/payments/screens/payments_screen.dart';
import '/modules/payments/screens/add_payment_screen.dart';
import '/modules/payments/bindings/payments_binding.dart';
// Deliveries (new)
import '/modules/deliveries/screens/pending_deliveries_screen.dart';

// Safes imports
import '/modules/safes/screens/safes_screen.dart';
import '/modules/safes/screens/safe_detail_screen.dart';
import '/modules/safes/screens/add_expense_screen.dart';
import '/modules/safes/screens/add_income_screen.dart';
import '/modules/safes/bindings/safes_binding.dart';
import '/modules/safes/bindings/safe_detail_binding.dart';
import '/modules/safes/bindings/add_expense_binding.dart';
import '/modules/safes/bindings/add_income_binding.dart';
// Account Statement imports
import '/modules/account_statement/bindings/account_statement_binding.dart';
import '/modules/account_statement/screens/account_statement_screen.dart';

// Attendance imports
import '/modules/attendance/screens/attendance_screen.dart';
import '/modules/attendance/bindings/attendance_binding.dart';

class AppPages {
  static final List<GetPage> routes = [
    GetPage(
      name: AppRoutes.login,
      page: () => const LoginScreen(),
      binding: AuthBinding(),
    ),
    GetPage(
      name: AppRoutes.dashboard,
      page: () => const DashboardScreen(),
      binding: DashboardBinding(),
    ),
    GetPage(
      name: AppRoutes.home,
      page: () => const HomeScreen(),
      binding: HomeBinding(),
    ),
    GetPage(
      name: AppRoutes.clients,
      page: () => const ClientsScreen(),
      binding: ClientsBinding(),
    ),
    GetPage(
      name: AppRoutes.clientDetail,
      page: () => const ClientDetailScreen(),
      binding: ClientDetailBinding(),
    ),
    GetPage(
      name: AppRoutes.addEditClient,
      page: () => const AddEditClientScreen(),
      binding: AddEditClientBinding(),
    ),
    GetPage(
      name: AppRoutes.profile,
      page: () => const ProfileScreen(),
      binding: ProfileBinding(),
    ),
    GetPage(
      name: AppRoutes.profileDeliveries,
      page: () => const ProfileDeliveriesScreen(),
      binding: ProfileBinding(),
    ),
    GetPage(
      name: AppRoutes.settings,
      page: () => const SettingsScreen(),
      binding: SettingsBinding(),
    ),
    GetPage(
      name: AppRoutes.notifications,
      page: () => const NotificationsScreen(),
      binding: NotificationBinding(),
    ),
    GetPage(
      name: AppRoutes.visits,
      page: () => const VisitsScreen(),
      binding: VisitsBinding(),
    ),
    GetPage(
      name: AppRoutes.visitsCalendar,
      page: () => const VisitsCalendarScreen(),
      binding: VisitsCalendarBinding(),
    ),
    GetPage(
      name: AppRoutes.visitsMap,
      page: () => const VisitsMapScreen(),
      binding: VisitsMapBinding(),
    ),

    GetPage(
      name: AppRoutes.clientDocuments,
      page: () => const ClientDocumentsScreen(),
      binding: ClientDocumentsBinding(),
    ),
    GetPage(
      name: AppRoutes.addDocument,
      page: () => const AddDocumentScreen(),
      binding: AddDocumentBinding(),
    ),
    GetPage(
      name: AppRoutes.clientInterestedProducts,
      page: () => const ClientInterestedProductsScreen(),
      binding: ClientInterestedProductsBinding(),
    ),
    GetPage(
      name: AppRoutes.addInterestedProduct,
      page: () => const AddInterestedProductScreen(),
      binding: AddInterestedProductBinding(),
    ),
    GetPage(
      name: AppRoutes.warehouse,
      page: () => const WarehouseScreen(),
      binding: WarehouseBinding(),
    ),
    GetPage(
      name: AppRoutes.createTransfer,
      page: () => const CreateTransferScreen(),
      binding: CreateTransferBinding(),
    ),
    GetPage(
      name: AppRoutes.warehouseInventory,
      page: () => const WarehouseInventoryScreen(),
      binding: WarehouseInventoryBinding(),
    ),
    // Routes for Sales Orders
    GetPage(
      name: AppRoutes.salesOrders,
      page: () => const SalesOrdersScreen(),
      binding: SalesOrdersBinding(),
    ),
    GetPage(
      name: AppRoutes.salesOrderDetail,
      page: () => SalesOrderDetailScreen(),
      binding: SalesOrderDetailBinding(),
    ),
    GetPage(
      name: AppRoutes.addEditSalesOrder,
      page: () => const AddEditSalesOrderScreen(),
      binding: AddEditSalesOrderBinding(),
    ),
    GetPage(
      name: AppRoutes.addOrderItem,
      page: () => const AddOrderItemScreen(),
      binding: AddOrderItemBinding(),
    ),
    GetPage(
      name: AppRoutes.quickAddOrderItems,
      page: () => const QuickAddOrderItemsScreen(),
      binding: QuickAddOrderItemsBinding(),
    ),
    // Routes for Invoices (now using dedicated bindings)
    GetPage(
      name: AppRoutes.invoices,
      page: () => const InvoiceScreen(),
      binding: InvoicesBinding(),
    ),
    GetPage(
      name: AppRoutes.invoiceDetail,
      page: () => const InvoiceDetailScreen(),
      binding: InvoiceDetailBinding(),
    ),
    // Routes for Returns (now using dedicated bindings)
    GetPage(
      name: AppRoutes.returns,
      page: () => const ReturnOrderScreen(),
      binding: ReturnsBinding(),
    ),
    GetPage(
      name: AppRoutes.returnOrderDetail,
      page: () => ReturnOrderDetailScreen(),
      binding: ReturnOrderDetailBinding(),
    ),
    GetPage(
      name: AppRoutes.addEditReturn,
      page: () => const AddEditSalesReturnScreen(),
      binding: AddEditSalesReturnBinding(),
    ),
    // New: Route for selecting sales order items for return (now using dedicated binding)
    GetPage(
      name: AppRoutes.selectSalesOrderItemsForReturn,
      page: () => const SelectSalesOrderItemsForReturnScreen(),
      binding: SelectSalesOrderItemsForReturnBinding(),
    ),
    // Routes for Payments
    GetPage(
      name: AppRoutes.payments,
      page: () => const PaymentsScreen(),
      binding: PaymentsBinding(),
    ),
    GetPage(
      name: AppRoutes.addEditPayment,
      page: () => const AddPaymentScreen(),
      binding: PaymentsBinding(),
    ),
    // Deliveries
    GetPage(
      name: AppRoutes.deliveries,
      page: () => const PendingDeliveriesScreen(),
      // Could create a dedicated binding later if needed
    ),
    // Safes routes
    GetPage(
      name: AppRoutes.safes,
      page: () => const SafesScreen(),
      binding: SafesBinding(),
    ),
    GetPage(
      name: AppRoutes.safeDetail,
      page: () => const SafeDetailScreen(),
      binding: SafeDetailBinding(),
    ),
    GetPage(
      name: AppRoutes.addExpense,
      page: () => const AddExpenseScreen(),
      binding: AddExpenseBinding(),
    ),
    GetPage(
      name: AppRoutes.addIncome,
      page: () => const AddIncomeScreen(),
      binding: AddIncomeBinding(),
    ),
    // Client Account Statement
    GetPage(
      name: AppRoutes.clientAccountStatement,
      page: () => const AccountStatementScreen(),
      binding: AccountStatementBinding(),
    ),
    // Attendance
    GetPage(
      name: AppRoutes.attendance,
      page: () => const AttendanceScreen(),
      binding: AttendanceBinding(),
    ),
  ];
}
