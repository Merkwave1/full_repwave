// lib/modules/products/controllers/products_data_controller.dart
import 'package:get/get.dart';
import '/data/models/product_lookup.dart'; // Import all product-related models
import '/data/repositories/product_repository.dart'; // Import ProductRepository
import 'dart:developer';

class ProductsDataController extends GetxController {
  final ProductRepository _productRepository;

  // Changed allProducts to RxList<ProductVariant>
  final RxList<ProductVariant> allProducts = <ProductVariant>[].obs;
  final RxList<ProductCategory> productCategories = <ProductCategory>[].obs;
  final RxList<ProductAttribute> productAttributes = <ProductAttribute>[].obs; // Updated to ProductAttribute
  final RxList<PackagingType> packagingTypes = <PackagingType>[].obs;
  final RxList<BaseUnit> baseUnits = <BaseUnit>[].obs; // Assuming you might fetch these too

  final RxBool isLoadingProductsData = true.obs;
  final RxString productsDataErrorMessage = ''.obs;

  ProductsDataController({required ProductRepository productRepository}) : _productRepository = productRepository;

  @override
  void onInit() {
    super.onInit();
    // Don't automatically fetch data on init - wait for explicit call
    // This prevents data fetching before authentication
  }

  void initializeAndFetchData() {
    fetchAllProductsData();
  }

  Future<void> fetchAllProductsData() async {
    isLoadingProductsData.value = true;
    productsDataErrorMessage.value = '';
    try {
      log("products_data_controller Called");

      // Fetch all data concurrently
      final results = await Future.wait([
        _productRepository.getAllProducts(), // This now returns List<ProductVariant>
        _productRepository.getProductCategories(),
        _productRepository.getProductAttributes(),
        _productRepository.getPackagingTypes(),
        _productRepository.getBaseUnits(),
      ]);

      // Assign results to the correct RxList types
      allProducts.assignAll(results[0] as List<ProductVariant>); // Cast to ProductVariant
      productCategories.assignAll(results[1] as List<ProductCategory>);
      productAttributes.assignAll(results[2] as List<ProductAttribute>);
      packagingTypes.assignAll(results[3] as List<PackagingType>);
      baseUnits.assignAll(results[4] as List<BaseUnit>);

      // print("############################################################");
      // print("Products fetched successfully. Count: ${allProducts.length}");
      // print(allProducts); // This should now print a list of ProductVariant objects
      // print("############################################################");
      // You can add more complex data processing or grouping here if needed
      // e.g., creating a map for quick lookup of categories by ID.
    } catch (e) {
      productsDataErrorMessage.value = 'Failed to load product data: ${e.toString()}';
      print('Error fetching all product data: $e');
    } finally {
      isLoadingProductsData.value = false;
    }
  }

  // Helper methods to get specific lookup data by ID (optional, but useful)
  // Note: These helpers might need adjustment if you want to search through ProductVariant attributes.
  ProductCategory? getCategoryById(int id) => productCategories.firstWhereOrNull((cat) => cat.categoriesId == id);
  PackagingType? getPackagingTypeById(int id) => packagingTypes.firstWhereOrNull((pkg) => pkg.packagingTypesId == id);
  BaseUnit? getBaseUnitById(int id) => baseUnits.firstWhereOrNull((unit) => unit.baseUnitsId == id);
  ProductAttribute? getAttributeById(int id) => productAttributes.firstWhereOrNull((attr) => attr.attributeId == id);

  // You can add more helper getters or methods here to provide filtered/grouped data
}
