// lib/modules/auth/controllers/auth_controller.dart
import 'dart:async';

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:get_storage/get_storage.dart'; // Import GetStorage
import 'package:package_info_plus/package_info_plus.dart';
import 'package:url_launcher/url_launcher.dart';
import '/core/routes/app_routes.dart';
import '/services/api_service.dart';
import '/services/data_cache_service.dart';
import '/services/location_service.dart';
import '/services/location_tracking_service.dart';
import '/data/models/user.dart';
import '/core/app_constants.dart'; // Import AppConstants
import '/data/models/product_lookup.dart';
import '/modules/products/controllers/products_data_controller.dart';
import '/modules/shared/controllers/global_data_controller.dart';
import '/data/repositories/product_repository.dart';
import '/data/repositories/company_settings_repository.dart';
import '/data/models/company_setting.dart';
import 'package:disable_battery_optimization/disable_battery_optimization.dart';
import '/modules/attendance/controllers/attendance_controller.dart';

class AuthController extends GetxController {
  final ApiService _apiService = Get.find<ApiService>();
  final GetStorage _box = GetStorage(); // Get an instance of GetStorage

  final TextEditingController emailController = TextEditingController();
  final TextEditingController passwordController = TextEditingController();
  final TextEditingController companyController = TextEditingController();

  final isLoading = false.obs;
  final errorMessage = ''.obs;

  // Password visibility for login screen
  final isPasswordHidden = true.obs;

  final Rx<User?> currentUser = Rx<User?>(null);

  // Company Settings
  final Rx<CompanySettings?> companySettings = Rx<CompanySettings?>(null);
  final RxString companyName = ''.obs;
  final RxString companyLogo = ''.obs;

  @override
  void onInit() {
    super.onInit();
    print('🔄 AuthController.onInit() - Checking for saved session...');

    // Load last logged-in email from storage if available
    final String? lastEmail = _box.read('user_email');
    emailController.text = lastEmail ?? ''; // Set to stored email or empty string
    // Prefill company from storage
    final String? lastCompany = _box.read('company_slug');
    companyController.text = lastCompany ?? '';

    // Check if user is already authenticated and restore session
    checkAuthenticationStatus();
  }

  void checkAuthenticationStatus() {
    final int? userId = _box.read('user_id');
    final String? userName = _box.read('user_name');
    final String? userRole = _box.read('user_role');
    final String? userUuid = _box.read('users_uuid');

    if (userId != null && userName != null && userRole != null && userUuid != null) {
      print('🔐 Found saved session - restoring user: $userName ($userRole)');

      // User is already authenticated, restore user state
      currentUser.value = User(
        id: userId,
        name: userName,
        role: userRole,
        uuid: userUuid,
        email: _box.read('user_email') ?? '',
      );

      // Initialize ProductsDataController for authenticated user
      _initializeProductsDataController();

      // Load company settings for already authenticated user
      _loadCompanySettingsFromStorage();

      // Navigate to dashboard automatically if user has valid session
      // Use a slight delay to ensure routing is ready
      Future.delayed(const Duration(milliseconds: 100), () {
        if (Get.currentRoute == AppRoutes.login || Get.currentRoute == '/') {
          print('🚀 Auto-navigating to dashboard from saved session');
          _fetchAttendanceStatus().then((_) {
            Get.offAllNamed(AppRoutes.dashboard);
          });
        } else {
          print('✅ User already on correct route: ${Get.currentRoute}');
        }
      });
    } else {
      print('❌ No saved session found - staying on login page');
    }
  }

  @override
  void onClose() {
    emailController.dispose();
    passwordController.dispose();
    companyController.dispose();
    super.onClose();
  }

  /// Toggle password visibility on login screen
  void togglePasswordVisibility() {
    isPasswordHidden.value = !isPasswordHidden.value;
  }

  void login() async {
    isLoading.value = true;
    errorMessage.value = '';

    try {
      // Validate input fields first
      final company = companyController.text.trim();
      final email = emailController.text.trim();
      final password = passwordController.text.trim();

      if (company.isEmpty) {
        errorMessage.value = 'Please enter company name';
        isLoading.value = false;
        return;
      }

      if (email.isEmpty) {
        errorMessage.value = 'Please enter your email';
        isLoading.value = false;
        return;
      }

      if (password.isEmpty) {
        errorMessage.value = 'Please enter your password';
        isLoading.value = false;
        return;
      }

      // Validate email format
      if (!GetUtils.isEmail(email)) {
        errorMessage.value = 'Please enter a valid email address';
        isLoading.value = false;
        return;
      }

      // Check for background location permission first
      if (Get.isRegistered<LocationService>()) {
        final locationService = Get.find<LocationService>();
        final hasPermission = await locationService.hasBackgroundLocationPermission();

        if (!hasPermission) {
          print('Login blocked: Background location permission not granted');

          // Request background location permission with dialog
          final granted = await locationService.requestBackgroundLocationPermission(showDialog: true);

          if (!granted) {
            errorMessage.value = 'Background location permission is required to login. Please grant "Allow all the time" permission.';
            isLoading.value = false;
            return;
          }
        }

        print('Login proceeding: Background location permission verified');
      }

      // Check Battery Optimization - Must be disabled (added to Never Sleeping Apps)
      bool? isBatteryOptimizationDisabled = await DisableBatteryOptimization.isBatteryOptimizationDisabled;

      if (isBatteryOptimizationDisabled == null || !isBatteryOptimizationDisabled) {
        print('Login blocked: Battery optimization is enabled (app not in Never Sleeping Apps)');

        // Show dialog asking user to disable battery optimization
        await _showBatteryOptimizationRequiredDialog();

        isLoading.value = false;
        return;
      }

      print('Login proceeding: Battery optimization disabled (app in Never Sleeping Apps)');

      // Normalize and store company slug before calling API
      final normalizedCompany = company.replaceAll(RegExp(r'[^a-zA-Z0-9_-]'), '').toLowerCase();

      if (normalizedCompany.isEmpty) {
        errorMessage.value = 'Invalid company name. Please use only letters, numbers, dash or underscore.';
        isLoading.value = false;
        return;
      }

      _box.write('company_slug', normalizedCompany);

      // Clear caches on login while preserving company slug and email
      await _clearAppCachesPreservingLoginFields();

      // Get app version to send with login request
      final packageInfo = await PackageInfo.fromPlatform();
      final appVersion = packageInfo.version;

      final response = await _apiService.post(
        AppConstants.apiLoginEndpoint,
        {
          'users_email': email,
          'users_password': password,
          'login_type': 'rep', // Indicate this is a rep login, not admin
          'app_version': appVersion, // Send app version for version check
        },
      );

      // Check for update required response
      if (response['status'] == 'failure' && response['data'] != null) {
        final data = response['data'];
        if (data['update_required'] == true) {
          errorMessage.value = response['message'] ?? 'من فضلك قم بالتحديث';
          isLoading.value = false;
          
          // Show update dialog
          _showUpdateRequiredDialog(
            requiredVersion: data['required_version'],
            currentVersion: data['current_version'],
            downloadUrl: data['download_url'],
            changelog: data['changelog'],
          );
          return;
        }
      }

      if (response['status'] == 'success' && response['data'] != null) {
        currentUser.value = User.fromJson(response['data']);

        // Validate that user is authorized for rep app
        if (!currentUser.value!.isRep && !currentUser.value!.isAdmin && !currentUser.value!.isStoreKeeper && !currentUser.value!.isCash) {
          errorMessage.value = 'Access denied: This app is for field team roles only.';
          currentUser.value = null;
          return;
        }

        // Save the successfully logged-in email to storage
        _box.write('user_email', email);
        _box.write('user_id', currentUser.value!.id);
        _box.write('user_name', currentUser.value!.name);
        _box.write('user_role', currentUser.value!.role);
        _box.write('users_uuid', currentUser.value!.uuid);

        // Show welcome message
        print('Welcome ${currentUser.value!.name} (${currentUser.value!.roleName})');

        // Fetch attendance status BEFORE navigating to dashboard
        await _fetchAttendanceStatus();

        // Clear loader before navigating away
        isLoading.value = false;

        // Navigate to dashboard immediately
        if (Get.currentRoute != AppRoutes.dashboard) {
          Get.offAllNamed(AppRoutes.dashboard);
        }

        // Run post-login bootstrapping in background (don't wait)
        _runPostLoginBootstrap(waitForCoreData: false);
      } else {
        // Handle different error scenarios with user-friendly messages
        String message = response['message'] ?? 'Invalid credentials';

        // Check for specific error messages and provide better user experience
        if (message.contains('غير مسموح لك بالدخول') || message.contains('not authorized')) {
          errorMessage.value = 'Access denied: This app is for sales representatives only. Please contact your administrator.';
        } else if (message.contains('deactivated')) {
          errorMessage.value = 'Account deactivated. Please contact support.';
        } else if (message.contains('expired')) {
          errorMessage.value = 'System subscription expired. Please contact support.';
        } else if (message.contains('Company not found') || message.contains('Invalid company')) {
          errorMessage.value = 'Company not found. Please check the company name and try again.';
        } else if (message.contains('Invalid credentials') || message.contains('wrong password')) {
          errorMessage.value = 'Invalid email or password. Please try again.';
        } else {
          errorMessage.value = message;
        }
      }
    } catch (e) {
      // Better error handling for different error types
      String errorMsg = e.toString();

      if (errorMsg.contains('SocketException') || errorMsg.contains('Failed host lookup')) {
        errorMessage.value = 'No internet connection. Please check your network and try again.';
      } else if (errorMsg.contains('TimeoutException')) {
        errorMessage.value = 'Connection timeout. Please check your internet connection.';
      } else if (errorMsg.contains('FormatException') || errorMsg.contains('Unexpected character')) {
        errorMessage.value = 'Invalid company name. Please verify the company name is correct.';
      } else if (errorMsg.contains('Company not found')) {
        errorMessage.value = 'Company not found. Please check the company name.';
      } else {
        errorMessage.value = 'Login failed: ${errorMsg.length > 100 ? errorMsg.substring(0, 100) + '...' : errorMsg}';
      }

      print('Login error: $e');
    } finally {
      isLoading.value = false;
    }
  }

  /// Show update required dialog when app version doesn't match server version
  void _showUpdateRequiredDialog({
    String? requiredVersion,
    String? currentVersion,
    String? downloadUrl,
    String? changelog,
  }) {
    Get.dialog(
      WillPopScope(
        onWillPop: () async => false, // Prevent dismissing by back button
        child: AlertDialog(
          title: Row(
            children: [
              Icon(Icons.system_update, color: Colors.orange, size: 28),
              const SizedBox(width: 8),
              Text('تحديث مطلوب', style: TextStyle(fontWeight: FontWeight.bold)),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'من فضلك قم بالتحديث للاستمرار في استخدام التطبيق',
                style: TextStyle(fontSize: 16),
              ),
              const SizedBox(height: 16),
              if (currentVersion != null)
                Text('الإصدار الحالي: $currentVersion', style: TextStyle(color: Colors.grey)),
              if (requiredVersion != null)
                Text('الإصدار المطلوب: $requiredVersion', style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold)),
              if (changelog != null && changelog.isNotEmpty) ...[
                const SizedBox(height: 12),
                Text('ما الجديد:', style: TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                Text(changelog, style: TextStyle(fontSize: 14, color: Colors.grey[700])),
              ],
            ],
          ),
          actions: [
            if (downloadUrl != null && downloadUrl.isNotEmpty)
              ElevatedButton.icon(
                onPressed: () async {
                  // Open download URL
                  final uri = Uri.parse(downloadUrl);
                  try {
                    await launchUrl(uri, mode: LaunchMode.externalApplication);
                  } catch (e) {
                    Get.snackbar('خطأ', 'لا يمكن فتح رابط التحميل', backgroundColor: Colors.red, colorText: Colors.white);
                  }
                },
                icon: Icon(Icons.download),
                label: Text('تحميل التحديث'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.green,
                  foregroundColor: Colors.white,
                ),
              ),
          ],
        ),
      ),
      barrierDismissible: false,
    );
  }

  Future<void> logout() async {
    Get.dialog(
      WillPopScope(
        onWillPop: () async => false,
        child: const Center(
          child: Card(
            elevation: 8,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.all(Radius.circular(16))),
            child: Padding(
              padding: EdgeInsets.all(24.0),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  SizedBox(
                    width: 32,
                    height: 32,
                    child: CircularProgressIndicator(strokeWidth: 3),
                  ),
                  SizedBox(height: 16),
                  Text('Please wait...'),
                ],
              ),
            ),
          ),
        ),
      ),
      barrierDismissible: false,
    );

    await _resetSessionState();

    if (Get.isDialogOpen == true) {
      Get.back();
    }

    if (Get.currentRoute != AppRoutes.login) {
      Get.offAllNamed(AppRoutes.login);
    }
  }

  Future<void> logoutDueToSessionExpiry() async {
    await _resetSessionState();

    if (Get.isDialogOpen == true) {
      Get.back();
    }

    if (Get.currentRoute != AppRoutes.login) {
      Get.offAllNamed(AppRoutes.login);
    }
  }

  Future<void> _resetSessionState() async {
    currentUser.value = null;
    companySettings.value = null;
    companyName.value = '';
    companyLogo.value = '';

    // Stop location tracking service
    _stopLocationTracking();

    // Clear all cached data (including GlobalDataController data)
    await _clearAppCachesPreservingLoginFields();

    _box.remove('user_id');
    _box.remove('user_name');
    _box.remove('user_role');
    _box.remove('users_uuid');
    _box.remove('company_name');
    _box.remove('company_logo');

    if (Get.isRegistered<ProductsDataController>()) {
      Get.delete<ProductsDataController>(force: true);
    }
  }

  // Initialize ProductsDataController after successful authentication
  Future<void> _initializeProductsDataController({bool awaitDataFetch = false}) async {
    // Check if ProductRepository is available before trying to access it
    if (!Get.isRegistered<ProductRepository>()) {
      print('ProductRepository not yet available. Skipping ProductsDataController initialization.');
      return;
    }

    if (!Get.isRegistered<ProductsDataController>()) {
      Get.lazyPut<ProductsDataController>(
        () => ProductsDataController(productRepository: Get.find<ProductRepository>()),
        fenix: true,
      );
    }
    // Trigger data fetching after ensuring registration
    final controller = Get.find<ProductsDataController>();
    if (awaitDataFetch) {
      await controller.fetchAllProductsData();
    } else {
      controller.initializeAndFetchData();
    }
  }

  // Fetch company settings after successful authentication
  Future<void> _fetchCompanySettings() async {
    try {
      if (!Get.isRegistered<CompanySettingsRepository>()) {
        // Close the dialog if it's open
        if (Get.isDialogOpen == true) {
          Get.back();
        }
        print('CompanySettingsRepository not available. Skipping company settings fetch.');
        return;
      }

      final repository = Get.find<CompanySettingsRepository>();
      final settings = await repository.getCompanySettings();

      companySettings.value = settings;
      companyName.value = settings.companyName ?? '';
      companyLogo.value = settings.companyLogo ?? '';

      // Save company settings to local storage for offline access
      _box.write('company_name', companyName.value);
      _box.write('company_logo', companyLogo.value);

      // print('Company settings fetched successfully:');
      // print('Company Name: ${companyName.value}');
      // print('Company Logo: ${companyLogo.value}');
    } catch (e) {
      print('Error fetching company settings: $e');
      // Load from local storage if API fails
      _loadCompanySettingsFromStorage();
    }
  }

  /// Public method to refresh company settings, used by version sync handlers.
  Future<void> refreshCompanySettings() async {
    await _fetchCompanySettings();
  }

  // Load company settings from local storage
  void _loadCompanySettingsFromStorage() {
    companyName.value = _box.read('company_name') ?? '';
    companyLogo.value = _box.read('company_logo') ?? '';
    // print('Loaded company settings from storage:');
    // print('Company Name: ${companyName.value}');
    // print('Company Logo: ${companyLogo.value}');
  }

  // Initialize Global Data Controller after login, preferring cached data for faster login
  Future<void> _initializeGlobalDataController() async {
    try {
      final globalDataController = Get.find<GlobalDataController>();
      final bool includeRepInventory = !(currentUser.value?.isStoreKeeper ?? false);
      await globalDataController.ensureCoreDataLoaded(
        includeSafes: true,
        includeRepInventory: includeRepInventory,
        includeCountries: true,
      );
    } catch (e) {
      print('Error initializing global data controller: $e');
      // Don't throw error as this shouldn't prevent login
    }
  }

  void _warmUpGlobalDataInBackground() {
    try {
      if (!Get.isRegistered<GlobalDataController>()) {
        return;
      }

      final globalDataController = Get.find<GlobalDataController>();

      unawaited(Future(() async {
        try {
          await globalDataController.initializeGlobalData(forceRefresh: false);
          await _loadEssentialDataToCache();
        } catch (e) {
          print('Background global data warm-up failed: $e');
        }
      }));
    } catch (e) {
      print('Unable to schedule global data warm-up: $e');
    }
  }

  // Load all essential app data to cache for offline capabilities
  Future<void> _loadEssentialDataToCache() async {
    try {
      // Get the DataCacheService instance (should be available from InitialBinding)
      if (!Get.isRegistered<DataCacheService>()) {
        // print('DataCacheService not available, skipping cache loading');
        return;
      }

      final cacheService = DataCacheService.instance;
      final globalDataController = Get.find<GlobalDataController>();

      // print('Loading essential data to cache...');

      // Wait for cache service to be ready (initialization happens in onInit)
      while (cacheService.isInitializing.value) {
        await Future.delayed(const Duration(milliseconds: 100));
      }

      // Set total items dynamically based on what we're about to cache
      int groupsToCache = 0;
      if (globalDataController.clients.isNotEmpty) groupsToCache++;
      if (globalDataController.products.isNotEmpty) groupsToCache++;
      if (globalDataController.myWarehouses.isNotEmpty || globalDataController.otherMainWarehouses.isNotEmpty) groupsToCache++;
      if (globalDataController.paymentMethods.isNotEmpty) groupsToCache++;
      if (globalDataController.safes.isNotEmpty) groupsToCache++;
      if (groupsToCache == 0) {
        cacheService.totalItems.value = 1;
      } else {
        cacheService.totalItems.value = groupsToCache;
      }

      // Cache clients data
      // print('GlobalDataController clients count: ${globalDataController.clients.length}');
      if (globalDataController.clients.isNotEmpty) {
        final clientsJson = globalDataController.clients.map((client) => client.toJson()).toList();
        // print('Converting ${clientsJson.length} clients to JSON for caching...');
        await cacheService.cacheClients(clientsJson);
        // print('Successfully cached ${clientsJson.length} clients');
      } else {
        print('No clients found in GlobalDataController to cache');
      }

      // Cache products data using basic fields only to avoid complex nested object issues
      if (globalDataController.products.isNotEmpty) {
        final productsJson = globalDataController.products
            .map((product) => {
                  'variantId': product.variantId,
                  'productsId': product.productsId,
                  'productsName': product.productsName,
                  'productsDescription': product.productsDescription,
                  'variantName': product.variantName,
                  'variantUnitPrice': product.variantUnitPrice,
                  'productsCategoryId': product.productsCategoryId,
                  'productsUnitOfMeasureId': product.productsUnitOfMeasureId,
                  'baseUnitName': product.baseUnitName,
                  'variantStatus': product.variantStatus,
                  'variantSku': product.variantSku,
                  'variantBarcode': product.variantBarcode,
                  'variantImageUrl': product.variantImageUrl,
                  'variantCostPrice': product.variantCostPrice,
                  'variantWeight': product.variantWeight,
                  'variantVolume': product.variantVolume,
                  'variantNotes': product.variantNotes,
                  'variantHasTax': product.variantHasTax,
                  'variantTaxRate': product.variantTaxRate,
                })
            .toList();
        await cacheService.cacheProducts(productsJson);
      }

      // Persist grouped products payload (product -> variants -> preferred packaging) using existing data
      _persistGroupedProducts(globalDataController.products);

      // Cache warehouses data
      if (globalDataController.myWarehouses.isNotEmpty || globalDataController.otherMainWarehouses.isNotEmpty) {
        final myWarehousesJson = globalDataController.myWarehouses.map((warehouse) => warehouse.toJson()).toList();
        final otherWarehousesJson = globalDataController.otherMainWarehouses.map((warehouse) => warehouse.toJson()).toList();
        await cacheService.cacheWarehouses(myWarehousesJson, otherWarehousesJson);
      }

      // Cache payment methods data
      if (globalDataController.paymentMethods.isNotEmpty) {
        final paymentMethodsJson = globalDataController.paymentMethods.map((method) => method.toJson()).toList();
        await cacheService.cachePaymentMethods(paymentMethodsJson);
      }

      // Cache safes data
      if (globalDataController.safes.isNotEmpty) {
        final safesJson = globalDataController.safes.map((safe) => safe.toJson()).toList();
        await cacheService.cacheSafes(safesJson);
      }

      print('Essential data loaded to cache successfully');
    } catch (e) {
      print('Error loading essential data to cache: $e');
      // Don't throw error as this shouldn't prevent login
    }
  }

  void _persistGroupedProducts(List<ProductVariant> variants) {
    if (variants.isEmpty) {
      return;
    }

    try {
      final Map<int, Map<String, dynamic>> grouped = <int, Map<String, dynamic>>{};

      for (final ProductVariant variant in variants) {
        final int? productId = variant.productsId;
        if (productId == null) {
          continue;
        }

        final Map<String, dynamic> productEntry = grouped.putIfAbsent(productId, () {
          return <String, dynamic>{
            'products_id': productId,
            'products_name': variant.productsName,
            'products_unit_of_measure_id': variant.productsUnitOfMeasureId,
            'products_category_id': variant.productsCategoryId,
            'products_description': variant.productsDescription,
            'products_brand': variant.productsBrand,
            'products_image_url': variant.productsImageUrl,
            'products_supplier_id': variant.productsSupplierId,
            'products_expiry_period_in_days': variant.productsExpiryPeriodInDays,
            'preferred_packaging': <Map<String, dynamic>>[],
            'variants': <Map<String, dynamic>>[],
          };
        });

        final List<Map<String, dynamic>> variantsList = (productEntry['variants'] as List<Map<String, dynamic>>);
        variantsList.add(<String, dynamic>{
          'variant_id': variant.variantId,
          'variant_name': variant.variantName,
          'variant_sku': variant.variantSku,
          'variant_barcode': variant.variantBarcode,
          'variant_image_url': variant.variantImageUrl,
          'variant_unit_price': variant.variantUnitPrice,
          'variant_cost_price': variant.variantCostPrice,
          'variant_weight': variant.variantWeight,
          'variant_volume': variant.variantVolume,
          'variant_status': variant.variantStatus,
          'variant_notes': variant.variantNotes,
          'variant_has_tax': variant.variantHasTax == null ? null : (variant.variantHasTax! ? 1 : 0),
          'variant_tax_rate': variant.variantTaxRate,
          'attributes': variant.attributes.map((attr) => attr.toJson()).toList(),
          'preferred_packaging': variant.preferredPackaging.map((pkg) => pkg.toJson()).toList(),
        });

        final List<Map<String, dynamic>> preferredPackagingList = (productEntry['preferred_packaging'] as List<Map<String, dynamic>>);
        for (final PreferredPackaging packaging in variant.preferredPackaging) {
          final Map<String, dynamic> packagingJson = packaging.toJson();
          final bool exists = preferredPackagingList.any(
            (existing) => existing['packaging_types_id'] == packagingJson['packaging_types_id'],
          );
          if (!exists) {
            preferredPackagingList.add(packagingJson);
          }
        }
      }

      if (grouped.isNotEmpty) {
        _box.write('cached_grouped_products', grouped.values.toList());
        _box.write('cached_grouped_products_last_fetch', DateTime.now().toIso8601String());
      }
    } catch (e) {
      print('Failed to persist grouped products: $e');
    }
  }

  // Clear Hive caches and transient stored caches while preserving login fields
  Future<void> _clearAppCachesPreservingLoginFields() async {
    try {
      print('Clearing all cached data before login...');

      // Preserve values in memory (we are not erasing storage, but just in case future logic changes)
      final preservedEmail = _box.read('user_email');
      final preservedCompanySlug = _box.read('company_slug');

      // Clear GlobalDataController - ALL user data (in-memory + GetStorage)
      if (Get.isRegistered<GlobalDataController>()) {
        final globalDataController = Get.find<GlobalDataController>();
        globalDataController.clearAllUserData();
      }

      // Clear DataCacheService (Hive boxes)
      if (Get.isRegistered<DataCacheService>()) {
        await DataCacheService.instance.clearAllCache();
      }

      // Clear transient GetStorage caches
      _box.remove('cached_grouped_products');
      _box.remove('cached_grouped_products_last_fetch');

      // Re-write preserved fields explicitly (no-ops if unchanged)
      if (preservedEmail != null) _box.write('user_email', preservedEmail);
      if (preservedCompanySlug != null) _box.write('company_slug', preservedCompanySlug);

      print('All cached data cleared successfully');
    } catch (e) {
      print('Error while clearing caches: $e');
    }
  }

  /// Start location tracking service when user logs in
  void _startLocationTracking() {
    try {
      if (Get.isRegistered<LocationTrackingService>()) {
        final trackingService = Get.find<LocationTrackingService>();
        trackingService.startTracking();
      }
    } catch (e) {
      print('⚠️ Error starting location tracking: $e');
    }
  }

  /// Stop location tracking service when user logs out
  void _stopLocationTracking() {
    try {
      if (Get.isRegistered<LocationTrackingService>()) {
        final trackingService = Get.find<LocationTrackingService>();
        trackingService.stopTracking();
      }
    } catch (e) {
      print('⚠️ Error stopping location tracking: $e');
    }
  }

  /// Show battery optimization dialog to guide user for better app performance
  void _showBatteryOptimizationDialog() {
    // Wait a bit after login to show the dialog
    Future.delayed(const Duration(seconds: 2), () {
      if (Get.isDialogOpen != true) {
        Get.dialog(
          AlertDialog(
            title: Row(
              children: [
                const Icon(Icons.battery_charging_full, color: Colors.green, size: 28),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'important_settings'.tr,
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'battery_optimization_message'.tr,
                    style: const TextStyle(fontSize: 14),
                  ),
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.blue.shade50,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.blue.shade200),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(Icons.info_outline, color: Colors.blue.shade700, size: 20),
                            const SizedBox(width: 8),
                            Text(
                              'how_to_enable'.tr,
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                color: Colors.blue.shade900,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          '1. ${'open_settings'.tr}',
                          style: const TextStyle(fontSize: 13),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '2. ${'go_to_battery'.tr}',
                          style: const TextStyle(fontSize: 13),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '3. ${'find_never_sleeping'.tr}',
                          style: const TextStyle(fontSize: 13),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '4. ${'add_this_app'.tr}',
                          style: const TextStyle(fontSize: 13),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.orange.shade50,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.orange.shade200),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.warning_amber, color: Colors.orange.shade700, size: 20),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'battery_optimization_note'.tr,
                            style: const TextStyle(fontSize: 12),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed: () {
                  Get.back();
                  // Mark that user has seen this dialog
                  _box.write('battery_dialog_shown', true);
                },
                child: Text('ok_understood'.tr),
              ),
            ],
          ),
          barrierDismissible: false,
        );
      }
    });
  }

  /// Show dialog requiring user to add app to Never Sleeping Apps before login
  Future<void> _showBatteryOptimizationRequiredDialog() async {
    return Get.dialog(
      WillPopScope(
        onWillPop: () async => false, // Prevent dismissing by back button
        child: AlertDialog(
          title: Row(
            children: [
              const Icon(Icons.battery_alert, color: Colors.red, size: 28),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'battery_optimization_required'.tr,
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.red.shade50,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.red.shade200),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.error_outline, color: Colors.red.shade700, size: 24),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          'app_not_in_never_sleeping'.tr,
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  'battery_optimization_required_message'.tr,
                  style: const TextStyle(fontSize: 14),
                ),
                const SizedBox(height: 16),
                Text(
                  'please_add_to_never_sleeping'.tr,
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.blue.shade50,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.blue.shade200),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(Icons.info_outline, color: Colors.blue.shade700, size: 20),
                          const SizedBox(width: 8),
                          Text(
                            'how_to_enable'.tr,
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              color: Colors.blue.shade900,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        '1. ${'open_settings'.tr}',
                        style: const TextStyle(fontSize: 13),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '2. ${'go_to_battery'.tr}',
                        style: const TextStyle(fontSize: 13),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '3. ${'find_never_sleeping'.tr}',
                        style: const TextStyle(fontSize: 13),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '4. ${'add_this_app'.tr}',
                        style: const TextStyle(fontSize: 13),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () {
                Get.back();
                errorMessage.value = 'cannot_login_without_optimization'.tr;
              },
              child: Text(
                'later'.tr,
                style: const TextStyle(color: Colors.grey),
              ),
            ),
            ElevatedButton.icon(
              onPressed: () async {
                Get.back();
                // Try to open battery settings directly
                await DisableBatteryOptimization.showDisableBatteryOptimizationSettings();

                // Show message to user
                Get.snackbar(
                  'info'.tr,
                  'Please add this app to "Never Sleeping Apps", then try logging in again.',
                  snackPosition: SnackPosition.BOTTOM,
                  duration: const Duration(seconds: 5),
                  backgroundColor: Colors.blue,
                  colorText: Colors.white,
                );
              },
              icon: const Icon(Icons.settings, size: 20),
              label: Text('go_to_battery_settings'.tr),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.blue,
                foregroundColor: Colors.white,
              ),
            ),
          ],
        ),
      ),
      barrierDismissible: false,
    );
  }

  /// Check attendance status after login and navigate accordingly
  Future<void> _checkAttendanceAndNavigate() async {
    try {
      // Try to get or initialize AttendanceController
      AttendanceController attendanceController;

      if (Get.isRegistered<AttendanceController>()) {
        attendanceController = Get.find<AttendanceController>();
      } else {
        // Initialize AttendanceController if not already registered
        attendanceController = AttendanceController();
        Get.put(attendanceController);
      }

      var attendanceFetchTimedOut = false;

      // Load current attendance status with a timeout guard so navigation never hangs
      await attendanceController.loadCurrentStatus().timeout(
        const Duration(seconds: 8),
        onTimeout: () {
          attendanceFetchTimedOut = true;
          print('Attendance status fetch timed out; continuing to dashboard.');
          return;
        },
      );

      if (attendanceFetchTimedOut) {
        print('Proceeding without confirmed attendance status.');
      }

      // Get the attendance status
      final status = attendanceController.currentStatus.value;
      final attendanceStatus = status?.attendance?.attendanceStatus ?? 'NotStarted';

      // If user is actively working (ClockedIn), dashboard will show active session
      if (attendanceStatus != 'ClockedIn') {
        print('Attendance status: $attendanceStatus – dashboard will show start/resume prompt.');
      }
    } catch (e) {
      print('Error checking attendance status: $e');
    }
  }

  /// Fetch attendance status ONLY before navigating to dashboard
  Future<void> _fetchAttendanceStatus() async {
    try {
      // Try to get or initialize AttendanceController
      AttendanceController attendanceController;

      if (Get.isRegistered<AttendanceController>()) {
        attendanceController = Get.find<AttendanceController>();
      } else {
        // Initialize AttendanceController if not already registered
        attendanceController = AttendanceController();
        Get.put(attendanceController);
      }

      print('📍 Fetching attendance status before navigation...');

      var attendanceFetchTimedOut = false;

      // Load current attendance status with a timeout guard
      await attendanceController.loadCurrentStatus().timeout(
        const Duration(seconds: 5),
        onTimeout: () {
          attendanceFetchTimedOut = true;
          print('⚠️ Attendance status fetch timed out; continuing to dashboard.');
          return;
        },
      );

      if (attendanceFetchTimedOut) {
        print('⚠️ Proceeding without confirmed attendance status.');
      } else {
        // Get the attendance status
        final status = attendanceController.currentStatus.value;
        final attendanceStatus = status?.attendance?.attendanceStatus ?? 'NotStarted';
        print('✅ Attendance status fetched: $attendanceStatus');
      }
    } catch (e) {
      print('❌ Error fetching attendance status: $e');
      // Continue anyway - don't block navigation
    }
  }

  Future<void> _runPostLoginBootstrap({bool waitForCoreData = false}) async {
    Future<void> safeRun(Future<void> Function() action) async {
      try {
        await action();
      } catch (_) {
        // Errors are already logged inside the individual helpers.
      }
    }

    // If waitForCoreData is true, wait for core data to load before continuing
    // Otherwise, run everything in background
    if (waitForCoreData) {
      await safeRun(() => _initializeGlobalDataController());
      await safeRun(() => _initializeProductsDataController(awaitDataFetch: true));
    } else {
      // Run in background without waiting
      unawaited(safeRun(() => _initializeGlobalDataController()));
      unawaited(safeRun(() => _initializeProductsDataController(awaitDataFetch: false)));
    }

    // Always warm up global data in background
    _warmUpGlobalDataInBackground();

    // Fetch company settings (run in background)
    unawaited(safeRun(() => _fetchCompanySettings()));

    // Start location tracking
    _startLocationTracking();
  }
}
