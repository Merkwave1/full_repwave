// lib/modules/sales_orders/controllers/quick_add_order_items_controller.dart
import 'package:collection/collection.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '/core/utils/formatting.dart';
import '/data/models/product_lookup.dart';
import '/data/models/sales_order_item.dart';
import '/data/models/warehouse_product_variant.dart';
import '/modules/sales_orders/controllers/add_edit_sales_order_controller.dart';
import '/modules/shared/controllers/global_data_controller.dart';

class QuickPackagingOption {
  QuickPackagingOption({
    required this.packaging,
    required this.conversionFactor,
    required this.fromInventory,
    this.availableQuantity,
    this.inventoryVariant,
  });

  final PackagingType packaging;
  final double conversionFactor;
  final bool fromInventory;
  final double? availableQuantity;
  final WarehouseProductVariant? inventoryVariant;

  int get packagingTypeId => packaging.packagingTypesId;
}

class QuickOrderCartItem {
  QuickOrderCartItem({
    required this.variant,
    required this.packaging,
    required this.conversionFactor,
    required this.baseUnitPrice,
    required double packagingUnitPrice,
    required bool hasTax,
    required double taxRate,
    required double initialQuantity,
    required this.isFromInventory,
    this.availableQuantity,
    this.inventoryVariant,
  })  : _unitPrice = _sanitizeNonNegative(packagingUnitPrice).obs,
        _hasTax = hasTax.obs,
        _taxRate = (hasTax ? _sanitizeNonNegative(taxRate) : 0.0).obs,
        initialUnitPrice = _sanitizeNonNegative(packagingUnitPrice),
        initialHasTax = hasTax,
        initialTaxRate = _sanitizeNonNegative(taxRate),
        quantity = _clampQuantity(initialQuantity, availableQuantity).obs,
        quantityController = TextEditingController(
          text: _formatQuantity(_clampQuantity(initialQuantity, availableQuantity)),
        );

  final ProductVariant variant;
  final PackagingType packaging;
  final double conversionFactor;
  final double baseUnitPrice;
  final RxDouble _unitPrice;
  final RxBool _hasTax;
  final RxDouble _taxRate;
  final double initialUnitPrice;
  final bool initialHasTax;
  final double initialTaxRate;
  final bool isFromInventory;
  final double? availableQuantity;
  final WarehouseProductVariant? inventoryVariant;
  final RxDouble quantity;
  final TextEditingController quantityController;

  double get packagingUnitPrice => _unitPrice.value;

  bool get hasTax => _hasTax.value;

  double get taxRate => _taxRate.value;

  static double _clampQuantity(double value, double? maxQuantity) {
    if (value <= 0) return 1;
    if (maxQuantity != null && maxQuantity > 0) {
      return value.clamp(1, maxQuantity);
    }
    return value;
  }

  static String _formatQuantity(double value) {
    if (value % 1 == 0) {
      return value.toStringAsFixed(0);
    }
    return value.toStringAsFixed(2);
  }

  static double _sanitizeNonNegative(double value) {
    if (!value.isFinite) return 0.0;
    return value < 0 ? 0.0 : value;
  }

  void setQuantity(double newValue) {
    final clamped = _clampQuantity(newValue, availableQuantity);
    quantity.value = clamped;
    final formatted = _formatQuantity(clamped);
    if (quantityController.text != formatted) {
      quantityController.text = formatted;
      quantityController.selection = TextSelection.fromPosition(
        TextPosition(offset: quantityController.text.length),
      );
    }
  }

  void increment() => setQuantity(quantity.value + 1);

  void decrement() => setQuantity(quantity.value - 1);

  double get subtotal => quantity.value * packagingUnitPrice;

  double get discount => 0.0;

  double get taxableAmount => (subtotal - discount).clamp(0.0, double.infinity);

  double get taxAmount => hasTax ? taxableAmount * (taxRate / 100) : 0.0;

  double get total => taxableAmount + taxAmount;

  void setUnitPrice(double newPrice) {
    if (!newPrice.isFinite) return;
    _unitPrice.value = _sanitizeNonNegative(newPrice);
  }

  void setTax({required bool enabled, double? rate}) {
    _hasTax.value = enabled;
    if (enabled) {
      if (rate != null && rate.isFinite) {
        _taxRate.value = _sanitizeNonNegative(rate);
      }
    } else {
      _taxRate.value = 0.0;
    }
  }

  void setTaxRate(double rate) => setTax(enabled: hasTax, rate: rate);

  void resetPricing() {
    _unitPrice.value = _sanitizeNonNegative(initialUnitPrice);
    _hasTax.value = initialHasTax;
    _taxRate.value = initialHasTax ? _sanitizeNonNegative(initialTaxRate) : 0.0;
  }

  SalesOrderItem toSalesOrderItem() {
    return SalesOrderItem(
      salesOrderItemId: 0,
      salesOrderId: 0,
      variantId: variant.variantId,
      packagingTypeId: packaging.packagingTypesId,
      quantity: quantity.value,
      unitPrice: packagingUnitPrice,
      subtotal: subtotal,
      discountAmount: discount,
      totalAmount: total,
      taxAmount: hasTax ? taxAmount : 0.0,
      taxRate: hasTax ? taxRate : null,
      hasTax: hasTax,
      notes: null,
      productVariant: variant,
      packagingType: packaging,
      variantName: variant.variantName,
      packagingTypeName: packaging.packagingTypesName,
      isFromRepInventory: isFromInventory,
      originalUnitPrice: baseUnitPrice > 0 ? baseUnitPrice : null,
      originalTaxRate: hasTax ? taxRate : null,
    );
  }

  void dispose() {
    quantityController.dispose();
  }
}

class QuickAddOrderItemsController extends GetxController {
  QuickAddOrderItemsController({required this.salesOrderController});

  final AddEditSalesOrderController salesOrderController;
  final GlobalDataController _globalData = GlobalDataController.instance;

  final RxBool isLoading = false.obs;
  final RxBool useInventoryMode = false.obs;
  final RxString searchQuery = ''.obs;
  final Rx<int?> selectedCategoryId = Rx<int?>(null);
  final RxList<QuickOrderCartItem> cartItems = <QuickOrderCartItem>[].obs;

  final RxList<WarehouseProductVariant> _inventoryVariants = <WarehouseProductVariant>[].obs;
  final RxList<ProductVariant> _catalogVariants = <ProductVariant>[].obs;
  final RxList<ProductCategory> _categories = <ProductCategory>[].obs;
  Map<int, PackagingType> _packagingTypesMap = {};

  final List<Worker> _workers = [];
  bool _modeExplicitlySet = false;

  bool get inventoryAvailable => _inventoryVariants.isNotEmpty;

  List<ProductCategory> get categories => _categories;

  @override
  void onInit() {
    super.onInit();
    _workers
      ..add(ever<List<WarehouseProductVariant>>(salesOrderController.repInventoryProducts, (_) => _syncInventorySource()))
      ..add(ever<List<WarehouseProductVariant>>(salesOrderController.warehouseProducts, (_) => _syncInventorySource()))
      ..add(ever<List<WarehouseProductVariant>>(_globalData.repInventory, (_) => _syncInventorySource()))
      ..add(ever<List<ProductVariant>>(_globalData.products, (_) => _syncCatalogVariants()))
      ..add(ever<List<ProductCategory>>(_globalData.productCategories, (_) => _syncCategories()))
      ..add(ever<List<PackagingType>>(_globalData.packagingTypes, (_) => _syncPackagingTypes()));
    _initialize();
  }

  Future<void> _initialize() async {
    isLoading.value = true;
    try {
      try {
        await _globalData.ensureCoreDataLoaded(includeSafes: false, includeRepInventory: true);
      } catch (_) {
        // Ignore – fall back to already cached data if ensureCoreDataLoaded throws.
      }

      _syncInventorySource();

      _syncCatalogVariants();

      if (_globalData.productCategories.isEmpty) {
        try {
          await _globalData.loadProductCategories();
        } catch (_) {}
      }
      _syncCategories();

      if (_globalData.packagingTypes.isEmpty) {
        try {
          await _globalData.loadPackagingTypes();
        } catch (_) {}
      }
      _syncPackagingTypes();

      if (!_modeExplicitlySet) {
        useInventoryMode.value = inventoryAvailable;
      }

      _attemptSeedCartFromExisting();
    } finally {
      isLoading.value = false;
    }
  }

  List<WarehouseProductVariant> get filteredInventoryVariants {
    final query = searchQuery.value.trim().toLowerCase();
    return _inventoryVariants.where((variant) {
      final matchesCategory = selectedCategoryId.value == null || variant.productsCategoryId == selectedCategoryId.value;
      final matchesSearch = query.isEmpty || variant.productsName.toLowerCase().contains(query) || (variant.variantName ?? '').toLowerCase().contains(query) || (variant.variantSku ?? '').toLowerCase().contains(query);
      return matchesCategory && matchesSearch;
    }).toList();
  }

  List<ProductVariant> get filteredCatalogVariants {
    final query = searchQuery.value.trim().toLowerCase();
    return _catalogVariants.where((variant) {
      final matchesCategory = selectedCategoryId.value == null || variant.productsCategoryId == selectedCategoryId.value;
      final matchesSearch = query.isEmpty || variant.variantName.toLowerCase().contains(query) || (variant.productsName ?? '').toLowerCase().contains(query) || (variant.variantSku ?? '').toLowerCase().contains(query);
      return matchesCategory && matchesSearch;
    }).toList();
  }

  void toggleMode(bool inventoryMode) {
    if (!inventoryMode && _catalogVariants.isEmpty) return;
    if (inventoryMode && _inventoryVariants.isEmpty) return;
    _modeExplicitlySet = true;
    useInventoryMode.value = inventoryMode;
  }

  List<QuickPackagingOption> packagingOptionsForVariant(
    ProductVariant variant, {
    WarehouseProductVariant? inventoryVariant,
  }) {
    final List<QuickPackagingOption> options = [];
    final seen = <int>{};

    if (inventoryVariant != null) {
      for (final available in inventoryVariant.availablePackaging) {
        if (available.packagingTypeId == null) continue;
        if (seen.contains(available.packagingTypeId)) continue;
        final packaging = _packagingTypesMap[available.packagingTypeId!] ??
            PackagingType(
              packagingTypesId: available.packagingTypeId!,
              packagingTypesName: available.packagingTypeName ?? 'units',
              packagingTypesDefaultConversionFactor: available.packagingFactor?.toString(),
              packagingTypesCompatibleBaseUnitId: available.compatibleBaseUnitId,
            );
        final conversionFactor = available.packagingFactor ?? _resolveConversionFactor(packaging);
        if (available.totalQuantity <= 0) continue;
        options.add(
          QuickPackagingOption(
            packaging: packaging,
            conversionFactor: conversionFactor,
            fromInventory: true,
            availableQuantity: available.totalQuantity,
            inventoryVariant: inventoryVariant,
          ),
        );
        seen.add(packaging.packagingTypesId);
      }
    } else {
      final preferred = variant.preferredPackaging;
      if (preferred.isNotEmpty) {
        for (final pref in preferred) {
          if (seen.contains(pref.packagingTypesId)) continue;
          final packaging = _packagingTypesMap[pref.packagingTypesId] ??
              PackagingType(
                packagingTypesId: pref.packagingTypesId,
                packagingTypesName: pref.packagingTypesName,
              );
          options.add(
            QuickPackagingOption(
              packaging: packaging,
              conversionFactor: _resolveConversionFactor(packaging),
              fromInventory: false,
            ),
          );
          seen.add(packaging.packagingTypesId);
        }
      } else {
        Iterable<PackagingType> sources = _packagingTypesMap.values;
        if (variant.productsUnitOfMeasureId != null) {
          sources = sources.where((pkg) => pkg.packagingTypesCompatibleBaseUnitId == variant.productsUnitOfMeasureId);
        }
        for (final packaging in sources) {
          if (seen.contains(packaging.packagingTypesId)) continue;
          options.add(
            QuickPackagingOption(
              packaging: packaging,
              conversionFactor: _resolveConversionFactor(packaging),
              fromInventory: false,
            ),
          );
          seen.add(packaging.packagingTypesId);
        }
      }
    }

    if (options.isEmpty) {
      final fallback = _packagingTypesMap.values.firstWhereOrNull((pkg) => pkg.packagingTypesCompatibleBaseUnitId == variant.productsUnitOfMeasureId) ?? _packagingTypesMap.values.firstOrNull;
      if (fallback != null) {
        options.add(
          QuickPackagingOption(
            packaging: fallback,
            conversionFactor: _resolveConversionFactor(fallback),
            fromInventory: inventoryVariant != null,
            availableQuantity: inventoryVariant?.availablePackaging.firstWhereOrNull((e) => e.packagingTypeId == fallback.packagingTypesId)?.totalQuantity,
            inventoryVariant: inventoryVariant,
          ),
        );
      }
    }

    return options;
  }

  double _resolveConversionFactor(PackagingType packaging) {
    final factorString = packaging.packagingTypesDefaultConversionFactor;
    if (factorString != null && factorString.trim().isNotEmpty) {
      final parsed = double.tryParse(factorString);
      if (parsed != null && parsed > 0) return parsed;
    }
    return 1.0;
  }

  double resolvePackagingUnitPrice(ProductVariant variant, QuickPackagingOption option) {
    final baseUnitPrice = _resolveBaseUnitPrice(variant, option.inventoryVariant);
    return baseUnitPrice * option.conversionFactor;
  }

  double _resolveBaseUnitPrice(ProductVariant variant, WarehouseProductVariant? inventoryVariant) {
    final fromVariant = variant.variantUnitPrice != null ? Formatting.parseAmount(variant.variantUnitPrice!) : null;
    if (fromVariant != null && fromVariant > 0) return fromVariant;

    final fromInventory = inventoryVariant?.variantUnitPrice;
    if (fromInventory != null && fromInventory > 0) return fromInventory;

    return 0.0;
  }

  bool _resolveHasTax(ProductVariant variant, WarehouseProductVariant? inventoryVariant) {
    if (variant.variantHasTax != null) return variant.variantHasTax!;
    if (inventoryVariant != null) {
      return inventoryVariant.variantHasTax == 1 || inventoryVariant.productsHasTax == 1;
    }
    return false;
  }

  double _resolveTaxRate(ProductVariant variant, WarehouseProductVariant? inventoryVariant) {
    if (variant.variantTaxRate != null) return variant.variantTaxRate!;
    if (inventoryVariant?.variantTaxRate != null) return inventoryVariant!.variantTaxRate!;
    if (inventoryVariant?.productsTaxRate != null) return inventoryVariant!.productsTaxRate!;
    return 0.0;
  }

  void addToCart({
    required ProductVariant variant,
    required QuickPackagingOption option,
    required double quantity,
  }) {
    final packaging = option.packaging;
    final existing = cartItems.firstWhereOrNull(
      (item) => item.variant.variantId == variant.variantId && item.packaging.packagingTypesId == packaging.packagingTypesId,
    );

    final double baseUnitPrice = _resolveBaseUnitPrice(variant, option.inventoryVariant);
    final double packagingUnitPrice = baseUnitPrice * (option.conversionFactor <= 0 ? 1 : option.conversionFactor);
    final bool hasTax = _resolveHasTax(variant, option.inventoryVariant);
    final double taxRate = hasTax ? _resolveTaxRate(variant, option.inventoryVariant) : 0.0;
    final double initialQty = option.availableQuantity != null ? QuickOrderCartItem._clampQuantity(quantity, option.availableQuantity) : (quantity <= 0 ? 1 : quantity);

    if (existing != null) {
      final double targetQty = existing.quantity.value + initialQty;
      existing.setQuantity(targetQty);
      cartItems.refresh();
      return;
    }

    final newItem = QuickOrderCartItem(
      variant: variant,
      packaging: packaging,
      conversionFactor: option.conversionFactor <= 0 ? 1 : option.conversionFactor,
      baseUnitPrice: baseUnitPrice,
      packagingUnitPrice: packagingUnitPrice,
      hasTax: hasTax,
      taxRate: taxRate,
      initialQuantity: initialQty,
      isFromInventory: option.fromInventory,
      availableQuantity: option.availableQuantity,
      inventoryVariant: option.inventoryVariant,
    );
    cartItems.add(newItem);
  }

  void removeItem(QuickOrderCartItem item) {
    cartItems.remove(item);
    item.dispose();
  }

  double get cartSubtotal => cartItems.fold(0.0, (sum, item) => sum + item.subtotal);

  double get cartTaxTotal => cartItems.fold(0.0, (sum, item) => sum + (item.hasTax ? item.taxAmount : 0.0));

  double get cartGrandTotal => cartSubtotal + cartTaxTotal;

  int get distinctItemCount => cartItems.length;

  double get totalQuantity => cartItems.fold(0.0, (sum, item) => sum + item.quantity.value);

  List<SalesOrderItem> buildSalesOrderItems() {
    return cartItems.map((item) => item.toSalesOrderItem()).toList();
  }

  @override
  void onClose() {
    for (final item in cartItems) {
      item.dispose();
    }
    for (final worker in _workers) {
      worker.dispose();
    }
    super.onClose();
  }

  void _syncInventorySource() {
    final repInventory = salesOrderController.repInventoryProducts;
    final globalInventory = _globalData.repInventory;
    final warehouseInventory = salesOrderController.warehouseProducts;

    final List<WarehouseProductVariant> source;
    if (repInventory.isNotEmpty) {
      source = repInventory;
    } else if (globalInventory.isNotEmpty) {
      source = globalInventory;
    } else {
      source = warehouseInventory;
    }

    _inventoryVariants.assignAll(source);

    if (!_modeExplicitlySet) {
      useInventoryMode.value = inventoryAvailable;
    } else if (useInventoryMode.value && !inventoryAvailable) {
      useInventoryMode.value = false;
    }

    _attemptSeedCartFromExisting();
  }

  void _syncCatalogVariants() {
    final productSource = _globalData.products.isNotEmpty ? _globalData.products : salesOrderController.products;
    if (productSource.isNotEmpty) {
      _catalogVariants.assignAll(productSource);
    }

    _attemptSeedCartFromExisting();
  }

  void _syncCategories() {
    if (_globalData.productCategories.isNotEmpty) {
      _categories.assignAll(_globalData.productCategories);
    }

    _attemptSeedCartFromExisting();
  }

  void _syncPackagingTypes() {
    if (_globalData.packagingTypes.isNotEmpty) {
      _packagingTypesMap = {
        for (final pkg in _globalData.packagingTypes) pkg.packagingTypesId: pkg,
      };
    }

    _attemptSeedCartFromExisting();
  }

  void _attemptSeedCartFromExisting() {
    if (cartItems.isNotEmpty) return;
    if (_packagingTypesMap.isEmpty) return;
    if (salesOrderController.orderItems.isEmpty) return;
    _importExistingOrderItems();
  }

  void _importExistingOrderItems() {
    final existing = salesOrderController.orderItems;
    if (existing.isEmpty) return;

    final seeded = <QuickOrderCartItem>[];

    for (final orderItem in existing) {
      final variant = _resolveVariantForOrderItem(orderItem);
      final packaging = _resolvePackagingForOrderItem(orderItem);
      if (variant == null || packaging == null) {
        continue;
      }

      final inventoryVariant = _inventoryVariants.firstWhereOrNull((v) => v.variantId == orderItem.variantId);
      final availableQuantity = inventoryVariant?.availablePackaging.firstWhereOrNull((pkg) => pkg.packagingTypeId == packaging.packagingTypesId)?.totalQuantity;
      final conversionFactor = _resolveConversionFactor(packaging);
      final sanitizedFactor = conversionFactor <= 0 ? 1.0 : conversionFactor;
      final hasTax = orderItem.hasTax ?? ((orderItem.taxAmount ?? 0) > 0.0);
      final taxRate = orderItem.taxRate ?? ((hasTax && orderItem.subtotal > 0) ? ((orderItem.taxAmount ?? 0) / orderItem.subtotal) * 100 : 0.0);
      final baseUnitPrice = orderItem.originalUnitPrice ?? (orderItem.unitPrice / sanitizedFactor);

      seeded.add(
        QuickOrderCartItem(
          variant: variant,
          packaging: packaging,
          conversionFactor: sanitizedFactor,
          baseUnitPrice: baseUnitPrice.isFinite ? baseUnitPrice : orderItem.unitPrice,
          packagingUnitPrice: orderItem.unitPrice,
          hasTax: hasTax,
          taxRate: taxRate.isFinite ? taxRate : 0.0,
          initialQuantity: orderItem.quantity,
          isFromInventory: orderItem.isFromRepInventory ?? false,
          availableQuantity: availableQuantity,
          inventoryVariant: inventoryVariant,
        ),
      );
    }

    if (seeded.isNotEmpty) {
      cartItems.assignAll(seeded);
    }
  }

  ProductVariant? _resolveVariantForOrderItem(SalesOrderItem item) {
    if (item.productVariant != null) return item.productVariant;

    final catalogVariant = _catalogVariants.firstWhereOrNull((variant) => variant.variantId == item.variantId);
    if (catalogVariant != null) return catalogVariant;

    final inventoryVariant = _inventoryVariants.firstWhereOrNull((variant) => variant.variantId == item.variantId);
    if (inventoryVariant != null) {
      return inventoryVariant.toProductVariant();
    }

    final fallbackName = item.variantName ?? 'variant_${item.variantId}';
    return ProductVariant(
      variantId: item.variantId,
      variantName: fallbackName,
      productsId: item.productVariant?.productsId,
      productsName: item.productVariant?.productsName ?? fallbackName,
      attributes: const [],
      preferredPackaging: const [],
    );
  }

  PackagingType? _resolvePackagingForOrderItem(SalesOrderItem item) {
    if (item.packagingType != null) return item.packagingType;
    final fromMap = _packagingTypesMap[item.packagingTypeId];
    if (fromMap != null) return fromMap;
    return PackagingType(
      packagingTypesId: item.packagingTypeId,
      packagingTypesName: item.packagingTypeName ?? 'units',
    );
  }
}
