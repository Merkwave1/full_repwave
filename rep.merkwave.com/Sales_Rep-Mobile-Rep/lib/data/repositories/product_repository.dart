// lib/data/repositories/product_repository.dart
import 'package:get/get.dart';
import '/data/datasources/product_remote_datasource.dart';
import '/data/models/product_lookup.dart'; // Import all product models
import '/data/models/warehouse_product_variant.dart'; // Import warehouse product model
import '/services/data_cache_service.dart';

class ProductRepository {
  final ProductRemoteDataSource _remoteDataSource;

  ProductRepository({required ProductRemoteDataSource remoteDataSource}) : _remoteDataSource = remoteDataSource;

  // Changed return type to List<ProductVariant>
  Future<List<ProductVariant>> getAllProducts({bool forceRefresh = false}) async {
    if (!forceRefresh && Get.isRegistered<DataCacheService>()) {
      final cached = DataCacheService.instance.getCachedProducts();
      if (cached.isNotEmpty) {
        return cached.map((json) => ProductVariant.fromJson(Map<String, dynamic>.from(json as Map))).toList();
      }
    }

    final variants = await _remoteDataSource.getAllProducts();

    if (Get.isRegistered<DataCacheService>()) {
      final cachePayload = variants.map((variant) => variant.toJson()).toList();
      await DataCacheService.instance.cacheProducts(cachePayload);
    }

    return variants;
  }

  Future<List<ProductCategory>> getProductCategories({bool forceRefresh = false}) async {
    if (!forceRefresh && Get.isRegistered<DataCacheService>()) {
      final cached = DataCacheService.instance.getCachedProductCategories();
      if (cached.isNotEmpty) {
        return cached.map((json) => ProductCategory.fromJson(Map<String, dynamic>.from(json as Map))).toList();
      }
    }

    final categories = await _remoteDataSource.fetchAllCategories();

    if (Get.isRegistered<DataCacheService>()) {
      final payload = categories.map((category) => category.toJson()).toList();
      await DataCacheService.instance.cacheProductCategories(payload);
    }

    return categories;
  }

  Future<List<BaseUnit>> getBaseUnits() async {
    return await _remoteDataSource.fetchAllBaseUnits();
  }

  Future<List<PackagingType>> getPackagingTypes({bool forceRefresh = false}) async {
    if (!forceRefresh && Get.isRegistered<DataCacheService>()) {
      final cached = DataCacheService.instance.getCachedPackagingTypes();
      if (cached.isNotEmpty) {
        return cached.map((json) => PackagingType.fromJson(Map<String, dynamic>.from(json as Map))).toList();
      }
    }

    final packagingTypes = await _remoteDataSource.fetchAllPackagingTypes();

    if (Get.isRegistered<DataCacheService>()) {
      final payload = packagingTypes.map((type) => type.toJson()).toList();
      await DataCacheService.instance.cachePackagingTypes(payload);
    }

    return packagingTypes;
  }

  Future<List<PreferredPackaging>> getPreferredPackaging(int productId) async {
    return await _remoteDataSource.fetchPreferredPackaging(productId);
  }

  // NEW: Method to get all product attributes with values
  Future<List<ProductAttribute>> getProductAttributes() async {
    return await _remoteDataSource.fetchAllProductAttributesWithValues();
  }

  // NEW: Method to get products available in a specific warehouse
  Future<List<WarehouseProductVariant>> getAvailableProductsInWarehouse(
    int warehouseId, {
    String? searchTerm,
    bool forceRefresh = false,
  }) async {
    try {
      final normalizedSearch = searchTerm?.trim();
      DataCacheService? cacheService;
      if (Get.isRegistered<DataCacheService>()) {
        cacheService = DataCacheService.instance;
      }

      if (!forceRefresh && cacheService != null) {
        final cached = cacheService.getCachedWarehouseProducts(warehouseId);
        if (cached.isNotEmpty) {
          final variants = cached.map((json) => WarehouseProductVariant.fromJson(Map<String, dynamic>.from(json as Map))).toList();
          if (normalizedSearch?.isNotEmpty ?? false) {
            return _filterWarehouseVariants(variants, normalizedSearch!);
          }
          return variants;
        }
      }

      final variants = await _remoteDataSource.getAvailableProductsInWarehouse(
        warehouseId,
        searchTerm: normalizedSearch,
      );

      if (cacheService != null) {
        await cacheService.cacheWarehouseProducts(
          warehouseId,
          variants.map((variant) => variant.toJson()).toList(),
        );
      }

      if (normalizedSearch?.isNotEmpty ?? false) {
        return _filterWarehouseVariants(variants, normalizedSearch!);
      }

      return variants;
    } catch (e) {
      print('ProductRepository: Failed to get warehouse products: $e');
      rethrow;
    }
  }

  List<WarehouseProductVariant> _filterWarehouseVariants(List<WarehouseProductVariant> variants, String search) {
    final lower = search.toLowerCase();
    return variants
        .where(
          (variant) =>
              variant.productsName.toLowerCase().contains(lower) ||
              (variant.variantName?.toLowerCase().contains(lower) ?? false) ||
              (variant.variantSku?.toLowerCase().contains(lower) ?? false) ||
              (variant.variantBarcode?.toLowerCase().contains(lower) ?? false),
        )
        .toList();
  }

  // NEW: Get products only (no variants) - for interested products feature
  Future<List<SimpleProduct>> getProductsOnly({String? searchTerm, int? clientId}) async {
    return await _remoteDataSource.getProductsOnly(searchTerm: searchTerm, clientId: clientId);
  }
}
