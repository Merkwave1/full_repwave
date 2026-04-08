// lib/core/app_constants.dart
import 'package:get_storage/get_storage.dart';

class AppConstants {
  static const String appName = 'Representative App';
  static const String appVersion = '1.0.0';

  // API Base URL (dynamic by company slug)
  static const String apiBaseUrlTemplate = 'https://your-domain.example/api/clients/{company}';
  static const String defaultCompanySlug = 'company';

  // Resolve the active API base URL using stored company slug
  static String apiBaseUrl() {
    try {
      final box = GetStorage();
      final String company = (box.read('company_slug') as String?)?.trim() ?? defaultCompanySlug;
      return apiBaseUrlTemplate.replaceFirst('{company}', company.isEmpty ? defaultCompanySlug : company);
    } catch (_) {
      return apiBaseUrlTemplate.replaceFirst('{company}', defaultCompanySlug);
    }
  }

  // Specific API Endpoints
  static const String apiLoginEndpoint = '/auth/login.php';
  static const String apiClientDetailEndpoint = '/clients/get_detail.php';
  static const String apiClientsAllEndpoint = '/clients/get_all.php';
  static const String apiClientAreaTagsEndpoint = '/client_area_tags/get_all.php';
  static const String apiClientIndustriesEndpoint = '/client_industries/get_all.php';
  static const String apiClientTypesEndpoint = '/client_types/get_all.php';
  static const String apiAddClientEndpoint = '/clients/add.php';
  static const String apiUpdateClientEndpoint = '/clients/update.php';
  static const String apiUpdateClientImageEndpoint = '/clients/update_image.php';
  static const String apiCountriesWithGovernoratesEndpoint = '/countries/get_all_with_governorates.php';
  static const String apiClientDocumentsAllEndpoint = '/client_documents/get_all.php';
  static const String apiClientDocumentsAddEndpoint = '/client_documents/add.php';
  static const String apiClientDocumentDetailEndpoint = '/client_documents/get_detail.php';
  static const String apiClientDocumentTypesEndpoint = '/client_document_types/get_all.php';
  static const String apiClientInterestedProductsEndpoint = '/client_interested_products/get_all.php';
  static const String apiClientInterestedProductsAddEndpoint = '/client_interested_products/add.php';
  static const String apiClientInterestedProductsDeleteEndpoint = '/client_interested_products/delete.php';
  static const String apiClientInterestedProductsUpdateEndpoint = '/client_interested_products/update.php';
  static const String apiWarehousesByRepEndpoint = '/warehouse/get_by_representative.php';
  static const String apiAddTransferEndpoint = '/transfers/add.php';
  // New: Transfer Requests (rep sends pending request without binding to inventory)
  static const String apiAddTransferRequestEndpoint = '/transfer_requests/add.php';
  static const String apiProductsAllEndpoint = '/product/get_products.php';
  // Grouped products (product -> variants -> attributes + preferred packaging)
  static const String apiProductsGroupedEndpoint = '/product/get_all.php';
  // Products only (no variants) - for interested products feature
  static const String apiProductsOnlyEndpoint = '/product/get_products_only.php';
  static const String apiProductsWarehouseEndpoint = '/product/get_available_in_warehouse.php';
  static const String apiCategoriesAllEndpoint = '/category/get_all.php';
  static const String apiBaseUnitsAllEndpoint = '/base_units/get_all.php';
  static const String apiPackagingTypesAllEndpoint = '/packaging_types/get_all.php';
  static const String apiInventoryAllEndpoint = '/inventory/get_all.php';
  static const String apiPreferredPackagingEndpoint = '/product/get_preferred_packaging.php';
  static const String apiProductAttributesAllEndpoint = '/product_attributes/get_all_with_values.php';
  static const String apiRepackInventoryEndpoint = '/inventory/repack.php';

  // Company Settings API Endpoint
  static const String apiCompanySettingsEndpoint = '/settings/get_all.php';

  // New API Endpoints for Sales Orders
  // CORRECTED: Changed from '/sales_orders/get_all.php' to '/sales_orders/get.php'
  static const String apiSalesOrdersAllEndpoint = '/sales_orders/get.php';
  static const String apiSalesOrdersDetailEndpoint = '/sales_orders/get.php';
  static const String apiAddSalesOrderEndpoint = '/sales_orders/add.php';
  static const String apiUpdateSalesOrderEndpoint = '/sales_orders/update.php';
  static const String apiDeleteSalesOrderEndpoint = '/sales_orders/delete.php';

  // Sales Deliveries (new)
  static const String apiSalesDeliveriesPendingOrdersEndpoint = '/sales_deliveries/get_pending_orders.php';
  static const String apiSalesDeliveriesAllEndpoint = '/sales_deliveries/get_all.php';
  static const String apiSalesDeliveriesDetailEndpoint = '/sales_deliveries/get_detail.php';
  static const String apiAddSalesDeliveryEndpoint = '/sales_deliveries/add.php';
  static const String apiUpdateSalesDeliveryEndpoint = '/sales_deliveries/update.php';

  // Other global constants
  static const int defaultPaginationLimit = 10;
  static const Duration defaultApiTimeout = Duration(seconds: 30);
}
