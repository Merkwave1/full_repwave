// lib/data/datasources/product_remote_datasource.dart
import '/services/api_service.dart';
import '/core/app_constants.dart'; // Assuming AppConstants has the API endpoint
import '/data/models/product_lookup.dart'; // Import product models
import '/data/models/warehouse_product_variant.dart'; // Import warehouse product model
import '/modules/auth/controllers/auth_controller.dart'; // Import auth controller
import 'package:get/get.dart'; // For Get.find

class ProductRemoteDataSource {
  final ApiService apiService;

  ProductRemoteDataSource({required this.apiService});

  // Changed return type to List<ProductVariant>
  Future<List<ProductVariant>> getAllProducts() async {
    final response = await apiService.get(AppConstants.apiProductsGroupedEndpoint);

    if (response['status'] == 'success' && response['data'] is Map && (response['data'] as Map).containsKey('products')) {
      final List<dynamic> productsJson = response['data']['products'] as List<dynamic>;
      final List<ProductVariant> variants = <ProductVariant>[];

      for (final dynamic product in productsJson) {
        if (product is! Map<String, dynamic>) {
          continue;
        }

        final Map<String, dynamic> productMap = Map<String, dynamic>.from(product);
        final List<dynamic> variantsJson = (productMap['variants'] as List<dynamic>? ?? <dynamic>[]);
        final List<dynamic> preferredPackaging = (productMap['preferred_packaging'] as List<dynamic>? ?? <dynamic>[]);

        // Remove nested collections from the base map so they don't get merged unintentionally
        productMap.remove('variants');
        productMap.remove('preferred_packaging');

        for (final dynamic variant in variantsJson) {
          if (variant is! Map<String, dynamic>) {
            continue;
          }

          final Map<String, dynamic> merged = <String, dynamic>{
            ...productMap,
            ...variant,
          };

          // Ensure preferred packaging is available on each variant to match previous API output
          merged.putIfAbsent('preferred_packaging', () => preferredPackaging);

          variants.add(ProductVariant.fromJson(merged));
        }
      }

      return variants;
    }

    throw Exception('Failed to load products: ${response['message'] ?? 'Unknown error'}');
  }

  Future<List<ProductCategory>> fetchAllCategories() async {
    final response = await apiService.get(AppConstants.apiCategoriesAllEndpoint);
    if (response['status'] == 'success' && response['data'] is List) {
      return (response['data'] as List).map((json) => ProductCategory.fromJson(json as Map<String, dynamic>)).toList();
    } else {
      throw Exception(response['message'] ?? 'Failed to fetch categories.');
    }
  }

  Future<List<BaseUnit>> fetchAllBaseUnits() async {
    final response = await apiService.get(AppConstants.apiBaseUnitsAllEndpoint);
    if (response['status'] == 'success' && response['data'] is List) {
      return (response['data'] as List).map((json) => BaseUnit.fromJson(json as Map<String, dynamic>)).toList();
    } else {
      throw Exception(response['message'] ?? 'Failed to fetch base units.');
    }
  }

  Future<List<PackagingType>> fetchAllPackagingTypes() async {
    final response = await apiService.get(AppConstants.apiPackagingTypesAllEndpoint);
    if (response['status'] == 'success' && response['data'] is List) {
      return (response['data'] as List).map((json) => PackagingType.fromJson(json as Map<String, dynamic>)).toList();
    } else {
      throw Exception(response['message'] ?? 'Failed to fetch packaging types.');
    }
  }

  // ADDED: Method to fetch preferred packaging types for a specific product.
  Future<List<PreferredPackaging>> fetchPreferredPackaging(int productId) async {
    final response = await apiService.get(
      AppConstants.apiPreferredPackagingEndpoint,
      queryParameters: {
        'product_id': productId.toString(),
      },
    );
    // Assuming 'data' is a direct list here for now, but if it's nested like the new products endpoint,
    // you'd need to adjust this (e.g., response['data']['preferred_packaging'] as List)
    if (response['status'] == 'success' && response['data'] is List) {
      return (response['data'] as List).map((json) => PreferredPackaging.fromJson(json as Map<String, dynamic>)).toList();
    } else {
      throw Exception(response['message'] ?? 'Failed to fetch preferred packaging.');
    }
  }

  // NEW: Method to fetch product attributes with their values
  Future<List<ProductAttribute>> fetchAllProductAttributesWithValues() async {
    final response = await apiService.get(AppConstants.apiProductAttributesAllEndpoint);
    // print('Get All Product Attributes API Response: ${jsonEncode(response)}');
    if (response['status'] == 'success' && response['data'] is List) {
      return (response['data'] as List).map((json) => ProductAttribute.fromJson(json as Map<String, dynamic>)).toList();
    } else {
      throw Exception('Failed to fetch product attributes: ${response['message'] ?? 'Unknown error'}');
    }
  }

  // NEW: Method to fetch products available in a specific warehouse
  Future<List<WarehouseProductVariant>> getAvailableProductsInWarehouse(int warehouseId, {String? searchTerm}) async {
    // Get user UUID from auth controller
    final authController = Get.find<AuthController>();
    final userUuid = authController.currentUser.value?.uuid;

    if (userUuid == null) {
      throw Exception('User not authenticated - UUID not available');
    }

    final queryParameters = <String, String>{
      'warehouse_id': warehouseId.toString(),
    };

    if (searchTerm != null && searchTerm.isNotEmpty) {
      queryParameters['search'] = searchTerm;
    }

    // print('WAREHOUSE API DATASOURCE: Calling endpoint: $queryParameters');
    final response = await apiService.get(
      AppConstants.apiProductsWarehouseEndpoint,
      queryParameters: queryParameters,
    );
    // print('WAREHOUSE API DATASOURCE: Response received: ${jsonEncode(response)}');

    if (response['status'] == 'success' && response['data'] is Map && response['data'].containsKey('available_variants')) {
      final List<dynamic> variantListJson = response['data']['available_variants'] as List<dynamic>;
      print('WAREHOUSE API DATASOURCE: Found ${variantListJson.length} available variants');

      return variantListJson.map((json) => WarehouseProductVariant.fromJson(json as Map<String, dynamic>)).toList();
    } else {
      print('WAREHOUSE API DATASOURCE: Error - ${response['message'] ?? 'Unknown error'}');
      throw Exception('Failed to load warehouse products: ${response['message'] ?? 'Unknown error'}');
    }
  }

  // NEW: Get products only (no variants) - for interested products feature
  Future<List<SimpleProduct>> getProductsOnly({String? searchTerm, int? clientId}) async {
    final queryParameters = <String, String>{};
    if (searchTerm != null && searchTerm.isNotEmpty) {
      queryParameters['search'] = searchTerm;
    }
    if (clientId != null) {
      queryParameters['client_id'] = clientId.toString();
    }

    final response = await apiService.get(
      AppConstants.apiProductsOnlyEndpoint,
      queryParameters: queryParameters,
    );

    if (response['status'] == 'success' && response['data'] is Map && response['data'].containsKey('products')) {
      final List<dynamic> productsJson = response['data']['products'] as List<dynamic>;
      return productsJson.map((json) => SimpleProduct.fromJson(json as Map<String, dynamic>)).toList();
    }

    throw Exception('Failed to load products: ${response['message'] ?? 'Unknown error'}');
  }
}
