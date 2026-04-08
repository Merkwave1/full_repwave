// lib/services/api_service.dart
import 'dart:async';
import 'dart:convert';
import 'dart:developer' as developer;
import 'dart:math';
import 'package:http/http.dart' as http;
import 'package:get/get.dart';
import 'package:flutter/material.dart';
import '/core/app_constants.dart';
import '/core/routes/app_routes.dart';
import 'package:http_parser/http_parser.dart';
import '/modules/auth/controllers/auth_controller.dart';
import '/modules/shared/controllers/global_data_controller.dart';
import '/modules/notifications/controllers/notification_controller.dart';
import '/modules/products/controllers/products_data_controller.dart';
import '/modules/payments/controllers/payments_controller.dart';
import '/services/data_cache_service.dart';

class ApiService extends GetxService {
  String get _baseUrl => AppConstants.apiBaseUrl();
  final Random _random = Random();
  static const Duration _versionCheckInterval = Duration(minutes: 1);
  DateTime? _lastVersionCheck;
  Future<void>? _versionCheckFuture;
  final Map<String, int> _cachedRemoteVersions = {};
  bool _isVersionSyncInProgress = false;

  static const Set<String> _visitPlanEntities = {
    'visit_plans',
    'visit_plan_clients',
  };

  static const String _versionsEndpointPath = '/versions/get_all.php';

  // Get current user UUID
  String? _getUserUuid() {
    try {
      if (Get.isRegistered<AuthController>()) {
        final authController = Get.find<AuthController>();
        return authController.currentUser.value?.uuid;
      }
    } catch (e) {
      print('Warning: Could not get user UUID: $e');
    }
    return null;
  }

  // Generate cache-busting parameter
  String _generateCacheBuster() {
    return DateTime.now().millisecondsSinceEpoch.toString() + _random.nextInt(999999).toString().padLeft(6, '0');
  }

  // Add common parameters (UUID + cache buster) to query parameters
  Map<String, String> _addCommonParameters(Map<String, String>? existingParams) {
    final params = Map<String, String>.from(existingParams ?? {});

    // Add user UUID if available
    final uuid = _getUserUuid();
    if (uuid != null) {
      params['users_uuid'] = uuid;
    }

    // Add cache-busting parameter
    params['_'] = _generateCacheBuster();

    return params;
  }

  // Add common parameters to POST data
  Map<String, dynamic> _addCommonParametersToData(Map<String, dynamic> data) {
    final enrichedData = Map<String, dynamic>.from(data);

    // Add user UUID if available and not already present
    final uuid = _getUserUuid();
    if (uuid != null) {
      enrichedData.putIfAbsent('users_uuid', () => uuid);
      // Some legacy endpoints expect the field to be named `uuid`
      enrichedData.putIfAbsent('uuid', () => uuid);
    }

    // Add cache-busting parameter
    enrichedData['_'] = _generateCacheBuster();

    return enrichedData;
  }

  static const List<String> _sensitiveKeyFragments = ['password', 'pass', 'token', 'secret'];

  dynamic _sanitizeData(dynamic data) {
    if (data == null) return null;
    if (data is Map) {
      return data.map((key, value) => MapEntry(key, _sanitizeData(_maskSensitiveValue(key.toString(), value))));
    }
    if (data is List) {
      return data.map(_sanitizeData).toList();
    }
    if (data is DateTime) {
      return data.toIso8601String();
    }
    return data;
  }

  dynamic _maskSensitiveValue(String key, dynamic value) {
    final lowerKey = key.toLowerCase();
    if (_sensitiveKeyFragments.any((fragment) => lowerKey.contains(fragment))) {
      return '***';
    }
    return value;
  }

  String _truncate(String input, {int max = 500}) {
    if (input.length <= max) return input;
    return '${input.substring(0, max)}…(${input.length} chars)';
  }

  String _summarizeRequest(dynamic request) {
    if (request == null) return '-';
    try {
      if (request is String) {
        return _truncate(request);
      }
      if (request is Map || request is List) {
        final sanitized = _sanitizeData(request);
        return _truncate(jsonEncode(sanitized));
      }
      return _truncate(request.toString());
    } catch (_) {
      return '-';
    }
  }

  String _summarizeResponse(dynamic response, String? rawResponse) {
    try {
      if (response != null) {
        if (response is String) {
          return _truncate(response);
        }
        if (response is Map || response is List) {
          return _truncate(jsonEncode(_sanitizeData(response)));
        }
        return _truncate(response.toString());
      }
      if (rawResponse != null) {
        return _truncate(rawResponse);
      }
      return '-';
    } catch (_) {
      return '-';
    }
  }

  Map<String, String?> _deriveEntityAndAction(String method, String url) {
    String path;
    try {
      path = Uri.parse(url).path;
    } catch (_) {
      path = url;
    }

    final segments = path.split('/').where((segment) => segment.isNotEmpty).toList();
    final file = segments.isNotEmpty ? segments.last.toLowerCase() : '';
    final folder = segments.length > 1 ? segments[segments.length - 2].toLowerCase() : '';
    final entity = _humanizeEntity(folder);
    final methodUpper = method.toUpperCase();

    String? action;
    if (file.contains('get_all')) {
      action = 'Fetching';
    } else if (file.contains('get_detail')) {
      action = 'Fetching details for';
    } else if (file.contains('add')) {
      action = 'Adding';
    } else if (file.contains('update')) {
      action = 'Updating';
    } else if (file.contains('delete')) {
      action = 'Deleting';
    } else if (file.contains('reports')) {
      action = 'Fetching report for';
    } else if (file.contains('login')) {
      action = 'Authenticating';
    } else {
      switch (methodUpper) {
        case 'GET':
          action = 'Fetching';
          break;
        case 'POST':
          action = 'Posting to';
          break;
        case 'PUT':
          action = 'Updating';
          break;
        case 'DELETE':
          action = 'Deleting';
          break;
        default:
          action = methodUpper;
      }
    }

    return {
      'entity': entity?.isNotEmpty == true ? entity : null,
      'action': action,
    };
  }

  String? _humanizeEntity(String? value) {
    if (value == null || value.isEmpty) return null;
    const map = {
      'sales_orders': 'sales orders',
      'sales_invoices': 'sales invoices',
      'sales_returns': 'sales returns',
      'purchase_orders': 'purchase orders',
      'purchase_returns': 'purchase returns',
      'client_area_tags': 'client area tags',
      'client_industries': 'client industries',
      'client_types': 'client types',
      'product_attributes': 'product attributes',
      'product_variants': 'product variants',
      'packaging_types': 'packaging types',
      'versions': 'versions',
      'users': 'users',
      'clients': 'clients',
      'suppliers': 'suppliers',
      'warehouses': 'warehouses',
      'inventory': 'inventory',
      'payments': 'payments',
      'payment_methods': 'payment methods',
      'safes': 'safes',
      'safe_transactions': 'safe transactions',
      'safe_transfers': 'safe transfers',
      'transfers': 'transfers',
      'goods_receipts': 'goods receipts',
      'notifications': 'notifications',
      'reports': 'reports',
      'settings': 'settings',
    };
    return map[value] ?? value.replaceAll(RegExp(r'[_-]+'), ' ');
  }

  String _buildActionPrefix(String method, String url) {
    try {
      final derived = _deriveEntityAndAction(method, url);
      final entity = derived['entity'];
      final action = derived['action'];
      if (entity != null && action != null) {
        return '$action ${entity.trim()}'.trim();
      }
      if (entity != null) {
        return '${method.toUpperCase()} $entity';
      }
    } catch (_) {
      // ignore
    }
    return 'Requesting';
  }

  int _calculateResponseSize(String body, Map<String, String> headers) {
    final headerSize = headers['content-length'];
    if (headerSize != null) {
      final parsed = int.tryParse(headerSize);
      if (parsed != null) {
        return parsed;
      }
    }
    return utf8.encode(body).length;
  }

  bool _shouldSkipVersionCheck(String? path) {
    if (path == null || path.isEmpty) {
      return false;
    }

    final normalized = path.toLowerCase();
    if (normalized.contains('/versions/')) {
      return true;
    }

    final loginPath = AppConstants.apiLoginEndpoint.toLowerCase();
    if (normalized.contains(loginPath)) {
      return true;
    }

    return false;
  }

  String? _resolveVersionEntityFromPath(String? path) {
    if (path == null || path.isEmpty) {
      return null;
    }

    final normalized = path.toLowerCase();
    final segments = normalized.split('/').where((segment) => segment.isNotEmpty).toList();
    if (segments.length < 2) {
      return null;
    }

    final folder = segments[segments.length - 2];
    const overrides = <String, String>{
      'product': 'products',
      'sales_deliveries': 'sales_deliveries',
      'sales_orders': 'sales_orders',
    };
    return overrides[folder] ?? folder;
  }

  Future<void> _checkVersionsIfNeeded({String? forPath}) async {
    if (_shouldSkipVersionCheck(forPath)) {
      return;
    }

    // Require an authenticated user (UUID) before attempting version checks
    if (_getUserUuid() == null) {
      return;
    }

    if (_isVersionSyncInProgress) {
      return;
    }

    final now = DateTime.now();
    if (_lastVersionCheck != null && now.difference(_lastVersionCheck!) < _versionCheckInterval) {
      return;
    }

    if (_versionCheckFuture != null) {
      return _versionCheckFuture!;
    }

    final String? skipEntity = _resolveVersionEntityFromPath(forPath);
    final Set<String>? skipEntities = skipEntity != null ? {skipEntity} : null;

    _versionCheckFuture = _performVersionCheck(skipEntities: skipEntities).whenComplete(() {
      _versionCheckFuture = null;
    });

    await _versionCheckFuture;
  }

  Future<void> _performVersionCheck({Set<String>? skipEntities}) async {
    final stopwatch = Stopwatch()..start();
    final queryParams = _addCommonParameters({});

    Uri uri = Uri.parse('$_baseUrl$_versionsEndpointPath');
    uri = uri.replace(queryParameters: queryParams);

    try {
      final response = await http.get(uri);
      stopwatch.stop();

      final rawBody = response.body;
      final parsedBody = _parseResponseBody(rawBody);
      final sizeBytes = _calculateResponseSize(rawBody, response.headers);
      final isSuccess = response.statusCode >= 200 && response.statusCode < 300;

      _logApiInteraction(
        url: uri.toString(),
        method: 'GET',
        statusCode: response.statusCode,
        ok: isSuccess,
        durationMs: stopwatch.elapsedMilliseconds,
        sizeBytes: sizeBytes,
        requestData: queryParams,
        responseData: parsedBody,
        rawResponse: rawBody,
        headers: response.headers,
      );

      final resolved = _handleResponse(
        response,
        preParsedBody: parsedBody,
        rawBody: rawBody,
      );

      final dynamic payload = resolved['data'] ?? resolved['message'];
      if (payload is List) {
        final Map<String, int> parsedVersions = {};
        for (final item in payload) {
          if (item is Map) {
            final entity = item['entity']?.toString();
            final dynamic versionValue = item['version'];
            if (entity != null && entity.isNotEmpty) {
              final int? version = versionValue is int ? versionValue : int.tryParse(versionValue?.toString() ?? '');
              if (version != null) {
                parsedVersions[entity] = version;
              }
            }
          }
        }

        if (parsedVersions.isNotEmpty) {
          await _applyVersionUpdates(parsedVersions, skipEntities: skipEntities);
        }
      }
    } catch (e, stackTrace) {
      stopwatch.stop();
      developer.log('Version check failed: $e', name: 'API', error: e, stackTrace: stackTrace);
    } finally {
      _lastVersionCheck = DateTime.now();
    }
  }

  Future<void> _applyVersionUpdates(Map<String, int> newVersions, {Set<String>? skipEntities}) async {
    final List<String> changedEntities = [];

    newVersions.forEach((entity, version) {
      final previousVersion = _cachedRemoteVersions[entity];
      if (previousVersion == null || previousVersion != version) {
        _cachedRemoteVersions[entity] = version;
        final normalizedEntity = entity.toLowerCase();
        if (skipEntities == null || !skipEntities.contains(normalizedEntity)) {
          changedEntities.add(entity);
        } else {
          developer.log(
            'Skipping immediate sync for "$entity" because the entity is already being fetched.',
            name: 'VersionSync',
          );
        }
      }
    });

    if (changedEntities.isEmpty) {
      return;
    }

    developer.log(
      'Version changes detected for: ${changedEntities.join(', ')}',
      name: 'API',
    );

    await _handleVersionSync(changedEntities);
  }

  Future<void> _handleVersionSync(List<String> changedEntities) async {
    if (changedEntities.isEmpty) {
      return;
    }

    if (_isVersionSyncInProgress) {
      developer.log('Version sync already in progress; skipping new sync request.', name: 'VersionSync');
      return;
    }

    _isVersionSyncInProgress = true;

    final Set<String> normalized = changedEntities.map((entity) => entity.toLowerCase()).toSet();
    final List<Future<void>> syncTasks = [];
    final Set<String> scheduledKeys = <String>{};

    void scheduleAction(Set<String> targetEntities, String actionKey, Future<void> Function() action) {
      if (normalized.intersection(targetEntities).isEmpty) {
        return;
      }
      if (!scheduledKeys.add(actionKey)) {
        return;
      }
      try {
        syncTasks.add(action());
      } catch (e, stackTrace) {
        developer.log('Failed to schedule sync action "$actionKey": $e', name: 'VersionSync', error: e, stackTrace: stackTrace);
      }
    }

    final globalController = Get.isRegistered<GlobalDataController>() ? GlobalDataController.instance : null;
    if (globalController != null) {
      scheduleAction({'clients'}, 'load_clients', () => globalController.loadClients(forceRefresh: true));
      scheduleAction({'client_area_tags', 'client_industries', 'client_types'}, 'load_client_metadata', () => globalController.loadClientMetadata(forceRefresh: true));
      scheduleAction({'payment_methods'}, 'load_payment_methods', () => globalController.loadPaymentMethods(forceRefresh: true));
      scheduleAction({'safes'}, 'load_safes', () => globalController.loadSafes(forceRefresh: true));
      scheduleAction({'warehouses'}, 'load_warehouses', () => globalController.loadWarehouses(forceRefresh: true));
      scheduleAction({'inventory'}, 'load_rep_inventory', () => globalController.loadRepInventory(forceRefresh: true));
      scheduleAction({'products', 'product_variants', 'product_preferred_packaging'}, 'load_products', () => globalController.loadProducts(forceRefresh: true));
      scheduleAction({'packaging_types'}, 'load_packaging_types', () => globalController.loadPackagingTypes(forceRefresh: true));
      scheduleAction({'categories'}, 'load_product_categories', () => globalController.loadProductCategories(forceRefresh: true));
    }

    if (Get.isRegistered<ProductsDataController>()) {
      final productsDataController = Get.find<ProductsDataController>();
      scheduleAction({'base_units', 'product_attributes', 'product_attribute_values'}, 'refresh_products_data', () async {
        await productsDataController.fetchAllProductsData();
      });
    }

    if (Get.isRegistered<NotificationController>()) {
      final notificationsController = Get.find<NotificationController>();
      scheduleAction({'notifications'}, 'refresh_notifications', () async {
        await notificationsController.fetchNotifications(isRefresh: true, showErrors: false);
        await notificationsController.fetchUnreadCount();
      });
    }

    if (Get.isRegistered<PaymentsController>()) {
      final paymentsController = Get.find<PaymentsController>();
      scheduleAction({'payments'}, 'refresh_payments', () => paymentsController.loadPayments());
    }

    if (Get.isRegistered<AuthController>()) {
      final authController = Get.find<AuthController>();
      scheduleAction({'settings'}, 'refresh_company_settings', () => authController.refreshCompanySettings());
    }

    scheduleAction(_visitPlanEntities, 'refresh_visit_plans', () => _refreshVisitPlansCache());

    if (syncTasks.isEmpty) {
      developer.log('No targeted sync handlers for entities: ${normalized.join(', ')}; performing full refresh.', name: 'VersionSync');
      syncTasks.add(_refreshGlobalData());
    }

    try {
      await Future.wait(syncTasks);
    } catch (e, stackTrace) {
      developer.log('Failed to sync data after version change: $e', name: 'VersionSync', error: e, stackTrace: stackTrace);
    } finally {
      _isVersionSyncInProgress = false;
    }
  }

  Future<void> _refreshGlobalData() async {
    if (!Get.isRegistered<GlobalDataController>()) {
      developer.log('GlobalDataController not registered; skipping global data refresh.', name: 'VersionSync');
      return;
    }

    try {
      await GlobalDataController.instance.refreshAllData();
    } catch (e, stackTrace) {
      developer.log('Failed to refresh global data cache: $e', name: 'VersionSync', error: e, stackTrace: stackTrace);
    }
  }

  Future<void> _refreshVisitPlansCache() async {
    if (!Get.isRegistered<AuthController>()) {
      developer.log('AuthController not registered; skipping visit plans refresh.', name: 'VersionSync');
      return;
    }

    final authController = Get.find<AuthController>();
    final String? userUuid = authController.currentUser.value?.uuid;
    final int? userId = authController.currentUser.value?.id;

    if (userUuid == null) {
      developer.log('User UUID missing; cannot refresh visit plans.', name: 'VersionSync');
      return;
    }

    try {
      final response = await getVisitPlans(userId: userId);
      final List<Map<String, dynamic>> normalizedPlans = _normalizeMapList(response['data'])..addAll(_normalizeMapList(response['message']));

      if (normalizedPlans.isEmpty) {
        developer.log('Visit plan sync returned no data to cache.', name: 'VersionSync');
        return;
      }

      if (!Get.isRegistered<DataCacheService>()) {
        developer.log('DataCacheService not registered; visit plans will not be cached.', name: 'VersionSync');
        return;
      }

      await DataCacheService.instance.cacheVisitPlans(normalizedPlans);
      developer.log('Visit plans cache refreshed (${normalizedPlans.length} items).', name: 'VersionSync');
    } catch (e, stackTrace) {
      developer.log('Failed to refresh visit plans cache: $e', name: 'VersionSync', error: e, stackTrace: stackTrace);
    }
  }

  List<Map<String, dynamic>> _normalizeMapList(dynamic source) {
    final List<Map<String, dynamic>> result = [];

    void addFromList(List<dynamic> list) {
      for (final item in list) {
        if (item is Map<String, dynamic>) {
          result.add(Map<String, dynamic>.from(item));
        } else if (item is Map) {
          result.add(item.map((key, value) => MapEntry(key.toString(), value)));
        }
      }
    }

    if (source is List) {
      addFromList(source);
    } else if (source is Map) {
      for (final value in source.values) {
        if (value is List) {
          addFromList(value);
        }
      }
    }

    return result;
  }

  void _logApiInteraction({
    required String url,
    required String method,
    required int statusCode,
    required bool ok,
    required int durationMs,
    required int sizeBytes,
    dynamic requestData,
    dynamic responseData,
    String? rawResponse,
    Map<String, String>? headers,
    String? errorMessage,
  }) {
    try {
      final sizeKB = sizeBytes / 1024;
      final action = _buildActionPrefix(method, url);

      // Simplified logging - only URL and response
      final statusText = ok ? statusCode.toString() : (statusCode == 0 ? 'ERR' : statusCode.toString());
      final mainLine = '$action — [API] ${method.toUpperCase()} $statusText ${durationMs}ms ${sizeKB.toStringAsFixed(2)}KB';

      // Print only the main line and URL
      print('------------------------- Start -------------------------'); // Separator line
      print('$mainLine\n📍 URL: $url');

      // Print simplified response (only status and message if available)
      if (responseData != null && responseData is Map) {
        final simplifiedResponse = {
          'status': responseData['status'],
          'message': responseData['message'],
          'data': responseData['data'] != null ? responseData['data'] : 'No data',
        };
        print('📥 Response: ${jsonEncode(simplifiedResponse)}');
      } else if (errorMessage != null) {
        print('❌ Error: $errorMessage');
      }

      print('------------------------- End -------------------------'); // Separator line

      // Keep detailed logging for debugging if needed (commented out by default)
      // final sanitizedRequest = _sanitizeData(requestData);
      // final logDetails = <String, dynamic>{
      //   'url': url,
      //   'method': method,
      //   'status': ok ? statusCode : (statusCode == 0 ? 'ERR' : statusCode),
      //   'ok': ok,
      //   'durationMs': durationMs,
      //   'sizeBytes': sizeBytes,
      //   'sizeKB': sizeKB.toStringAsFixed(2),
      //   'headers': headers ?? <String, String>{},
      //   'request': sanitizedRequest,
      //   'requestSummary': _summarizeRequest(requestData),
      //   'response': responseData,
      //   'responseSummary': _summarizeResponse(responseData, rawResponse),
      // };
      // if (errorMessage != null) {
      //   logDetails['error'] = errorMessage;
      // }
      // developer.log(mainLine, name: 'API');
      // developer.log(jsonEncode(_sanitizeData(logDetails)), name: 'API_DETAILS');
    } catch (e) {
      developer.log('Failed to log API interaction: $e', name: 'API', level: 1000);
    }
  }

  // Helper to parse response body safely
  Map<String, dynamic> _parseResponseBody(String responseBody) {
    try {
      // Clean up response body in case there's a path prefix before JSON
      String cleanedBody = responseBody;

      // Look for the first occurrence of { to start JSON parsing
      int jsonStart = responseBody.indexOf('{');
      if (jsonStart > 0) {
        cleanedBody = responseBody.substring(jsonStart);
      }

      return json.decode(cleanedBody);
    } catch (e) {
      // If parsing fails, it's likely not JSON (HTML 404 page, etc.)
      print('Failed to parse JSON response: $e');
      print('Raw response body: ${responseBody.substring(0, responseBody.length > 200 ? 200 : responseBody.length)}...');

      // Check if it's an HTML response (company not found = 404 page)
      if (responseBody.trim().startsWith('<!doctype') || responseBody.trim().startsWith('<html')) {
        return {
          'status': 'error',
          'message': 'Company not found. Please check the company name and try again.',
        };
      }

      // Generic error for other non-JSON responses
      return {
        'status': 'error',
        'message': 'Unable to connect to server. Please check your internet connection and try again.',
      };
    }
  }

  // Generic POST request (for x-www-form-urlencoded)
  Future<Map<String, dynamic>> post(String path, Map<String, dynamic> data) async {
    await _checkVersionsIfNeeded(forPath: path);

    // Add common parameters (UUID + cache buster) to data
    final enrichedData = _addCommonParametersToData(data);

    final Uri uri = Uri.parse('$_baseUrl$path');
    // SAFEGUARD: Ensure delivery status is valid for sales orders create/update
    try {
      if (path == AppConstants.apiUpdateSalesOrderEndpoint || path == AppConstants.apiAddSalesOrderEndpoint) {
        final dyn = enrichedData['sales_orders_delivery_status'];
        if (dyn == null || (dyn is String && (dyn.isEmpty || dyn.toLowerCase() == 'null'))) {
          enrichedData['sales_orders_delivery_status'] = 'Not_Delivered';
        }
      }
    } catch (_) {}
    final stopwatch = Stopwatch()..start();

    try {
      final response = await http.post(
        uri,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: enrichedData.map((key, value) => MapEntry(key, value.toString())),
      );
      stopwatch.stop();

      final rawBody = response.body;
      final parsedBody = _parseResponseBody(rawBody);
      final sizeBytes = _calculateResponseSize(rawBody, response.headers);
      final isSuccess = response.statusCode >= 200 && response.statusCode < 300;

      _logApiInteraction(
        url: uri.toString(),
        method: 'POST',
        statusCode: response.statusCode,
        ok: isSuccess,
        durationMs: stopwatch.elapsedMilliseconds,
        sizeBytes: sizeBytes,
        requestData: enrichedData,
        responseData: parsedBody,
        rawResponse: rawBody,
        headers: response.headers,
      );

      return _handleResponse(
        response,
        preParsedBody: parsedBody,
        rawBody: rawBody,
      );
    } catch (e) {
      stopwatch.stop();
      _logApiInteraction(
        url: uri.toString(),
        method: 'POST',
        statusCode: 0,
        ok: false,
        durationMs: stopwatch.elapsedMilliseconds,
        sizeBytes: 0,
        requestData: enrichedData,
        responseData: null,
        rawResponse: null,
        headers: null,
        errorMessage: e.toString(),
      );
      rethrow;
    }
  }

  // New method for Multipart POST request (for file uploads)
  Future<Map<String, dynamic>> postMultipart(String path, Map<String, String> fields, {String? filePath, String? fileField}) async {
    await _checkVersionsIfNeeded(forPath: path);

    // Add common parameters to fields for multipart requests
    final enrichedFields = Map<String, String>.from(fields);
    final uuid = _getUserUuid();
    if (uuid != null && !enrichedFields.containsKey('users_uuid')) {
      enrichedFields['users_uuid'] = uuid;
    }
    enrichedFields['_'] = _generateCacheBuster();

    final Uri uri = Uri.parse('$_baseUrl$path');
    final stopwatch = Stopwatch()..start();
    final Map<String, dynamic> logFields = {
      ...enrichedFields,
      if (filePath != null && fileField != null) '__file__$fileField': filePath,
    };

    try {
      // FALLBACK STRATEGY: If file is provided, try multipart first, then fallback to regular POST
      if (filePath != null && fileField != null) {
        try {
          final request = http.MultipartRequest('POST', uri);

          // Add enriched fields
          request.fields.addAll(enrichedFields);

          // Add file
          final file = await http.MultipartFile.fromPath(
            fileField,
            filePath,
            contentType: MediaType('image', 'jpeg'),
          );
          request.files.add(file);

          final streamedResponse = await request.send();
          final response = await http.Response.fromStream(streamedResponse);
          stopwatch.stop();

          // Check if we got a server-level "Forbidden" (not JSON)
          if (response.statusCode == 403 && response.body.trim().toLowerCase() == 'forbidden') {
            throw Exception('Multipart blocked by server');
          }

          final rawBody = response.body;
          final parsedBody = _parseResponseBody(rawBody);
          final sizeBytes = _calculateResponseSize(rawBody, response.headers);
          final isSuccess = response.statusCode >= 200 && response.statusCode < 300;

          _logApiInteraction(
            url: uri.toString(),
            method: 'POST',
            statusCode: response.statusCode,
            ok: isSuccess,
            durationMs: stopwatch.elapsedMilliseconds,
            sizeBytes: sizeBytes,
            requestData: logFields,
            responseData: parsedBody,
            rawResponse: rawBody,
            headers: response.headers,
          );

          return _handleResponse(
            response,
            preParsedBody: parsedBody,
            rawBody: rawBody,
          );
        } catch (e) {
          stopwatch.stop();
          _logApiInteraction(
            url: uri.toString(),
            method: 'POST',
            statusCode: 0,
            ok: false,
            durationMs: stopwatch.elapsedMilliseconds,
            sizeBytes: 0,
            requestData: logFields,
            responseData: null,
            rawResponse: null,
            headers: null,
            errorMessage: e.toString(),
          );

          // Remove image-related fields and try regular POST with enriched fields
          Map<String, dynamic> fallbackFields = Map<String, dynamic>.from(enrichedFields);
          fallbackFields.remove(fileField);

          return await post(path, fallbackFields);
        }
      } else {
        // No file, use regular POST with enriched fields
        return await post(path, Map<String, dynamic>.from(enrichedFields));
      }
    } catch (e) {
      stopwatch.stop();
      _logApiInteraction(
        url: uri.toString(),
        method: 'POST',
        statusCode: 0,
        ok: false,
        durationMs: stopwatch.elapsedMilliseconds,
        sizeBytes: 0,
        requestData: logFields,
        responseData: null,
        rawResponse: null,
        headers: null,
        errorMessage: e.toString(),
      );
      rethrow;
    }
  }

  // Generic GET request (for query parameters)
  Future<Map<String, dynamic>> get(String path, {Map<String, String>? queryParameters}) async {
    await _checkVersionsIfNeeded(forPath: path);

    // Add common parameters (UUID + cache buster) to query parameters
    final enrichedParams = _addCommonParameters(queryParameters);

    Uri uri = Uri.parse('$_baseUrl$path');
    uri = uri.replace(queryParameters: enrichedParams);
    final stopwatch = Stopwatch()..start();

    try {
      final response = await http.get(uri);
      stopwatch.stop();

      final rawBody = response.body;
      final parsedBody = _parseResponseBody(rawBody);
      final sizeBytes = _calculateResponseSize(rawBody, response.headers);
      final isSuccess = response.statusCode >= 200 && response.statusCode < 300;

      _logApiInteraction(
        url: uri.toString(),
        method: 'GET',
        statusCode: response.statusCode,
        ok: isSuccess,
        durationMs: stopwatch.elapsedMilliseconds,
        sizeBytes: sizeBytes,
        requestData: enrichedParams,
        responseData: parsedBody,
        rawResponse: rawBody,
        headers: response.headers,
      );

      return _handleResponse(
        response,
        preParsedBody: parsedBody,
        rawBody: rawBody,
      );
    } catch (e) {
      stopwatch.stop();
      _logApiInteraction(
        url: uri.toString(),
        method: 'GET',
        statusCode: 0,
        ok: false,
        durationMs: stopwatch.elapsedMilliseconds,
        sizeBytes: 0,
        requestData: enrichedParams,
        responseData: null,
        rawResponse: null,
        headers: null,
        errorMessage: e.toString(),
      );
      rethrow;
    }
  }

  Map<String, dynamic> _handleResponse(
    http.Response response, {
    Map<String, dynamic>? preParsedBody,
    String? rawBody,
  }) {
    final Map<String, dynamic> responseBody = preParsedBody ?? _parseResponseBody(response.body);
    final String resolvedRawBody = rawBody ?? response.body;

    final dynamic messageData = responseBody['message'];
    String? message;
    if (messageData is String) {
      message = messageData;
    } else if (messageData != null && messageData is! List && messageData is! Map) {
      message = messageData.toString();
    }

    if (_isAuthorizationErrorMessage(message) || _isAuthorizationErrorMessage(resolvedRawBody)) {
      showSessionExpiredDialog(message: message);
    }

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return responseBody;
    } else {
      String errorMessage = message ?? 'An unknown error occurred.';

      if (response.statusCode == 404) {
        errorMessage = 'API Error (404): Resource not found. Please check the endpoint URL.';
      } else if (response.statusCode == 403) {
        final String detailedError = message ?? 'Server denied access';
        errorMessage = 'Server Access Denied (403): $detailedError';
      } else if (response.statusCode == 401) {
        errorMessage = 'Unauthorized: Please log in again.';
      } else if (responseBody['raw_body'] != null && responseBody['raw_body'] is String && (responseBody['raw_body'] as String).startsWith('<')) {
        errorMessage = 'API Error (${response.statusCode}): Unexpected server response format.';
      } else {
        errorMessage = 'API Error (${response.statusCode}): $errorMessage';
      }

      throw Exception(errorMessage);
    }
  }

  bool _isAuthorizationErrorMessage(String? message) {
    if (message == null || message.isEmpty) {
      return false;
    }
    final lowerMessage = message.toLowerCase();
    return [
      'you are not authorized to perform this action',
      'you are not authorized',
      'please re login',
      'please relogin',
      'please re-login',
      'unauthorized',
      'authorization failed',
      'session expired',
      'login expired',
      'authentication failed',
      'please login again',
      'invalid user uuid',
    ].any((pattern) => lowerMessage.contains(pattern));
  }

  bool _sessionDialogVisible = false;
  bool _sessionLogoutInProgress = false;

  void showSessionExpiredDialog({String? message}) {
    final dialogMessage = message ?? 'Session expired. Please login again.';

    if (_sessionDialogVisible) {
      _ensureSessionLogout();
      return;
    }

    _sessionDialogVisible = true;

    Future.microtask(() async {
      try {
        await _ensureSessionLogout();
        await Future.delayed(const Duration(milliseconds: 200));

        final context = Get.overlayContext ?? Get.context;
        if (context == null) {
          _sessionDialogVisible = false;
          return;
        }

        if (Get.isDialogOpen == true) {
          Get.back();
        }

        await Get.dialog(
          WillPopScope(
            onWillPop: () async => false,
            child: AlertDialog(
              title: Row(
                children: const [
                  Icon(Icons.warning, color: Colors.orange, size: 28),
                  SizedBox(width: 12),
                  Text(
                    'Session Expired',
                    style: TextStyle(
                      color: Colors.black87,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    dialogMessage,
                    style: const TextStyle(fontSize: 16),
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'Please log in again to continue.',
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.grey,
                    ),
                  ),
                ],
              ),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
              actions: [
                TextButton(
                  onPressed: () {
                    if (Get.isDialogOpen == true) {
                      Get.back();
                    }
                  },
                  child: const Text(
                    'Re-Login',
                    style: TextStyle(
                      color: Colors.blue,
                      fontWeight: FontWeight.w600,
                      fontSize: 16,
                    ),
                  ),
                ),
              ],
              actionsPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            ),
          ),
          barrierDismissible: false,
        );
      } catch (e) {
        developer.log('Failed to present session expiry dialog: $e', name: 'API');
      } finally {
        _sessionDialogVisible = false;
      }
    });
  }

  void _handleAuthorizationError(String message) {
    showSessionExpiredDialog(message: message);
  }

  // Visit Plans API methods
  Future<Map<String, dynamic>> getVisitPlans({
    String? visitPlanStatus,
    int? userId,
  }) async {
    final AuthController authController = Get.find<AuthController>();
    final String? userUuid = authController.currentUser.value?.uuid;

    if (userUuid == null) {
      throw Exception('User not authenticated');
    }

    Map<String, String> queryParams = {
      'users_uuid': userUuid,
    };

    if (visitPlanStatus != null) {
      queryParams['visit_plan_status'] = visitPlanStatus;
    }

    if (userId != null) {
      queryParams['user_id'] = userId.toString();
    }

    return await get('/visit_plans/get_all.php', queryParameters: queryParams);
  }

  Future<Map<String, dynamic>> getVisitDayOverview({
    DateTime? date,
    bool includeVisitPlans = true,
    String? visitPlanStatus,
    int? userId,
    String? status,
    int? clientId,
    int? limit,
  }) async {
    final AuthController authController = Get.find<AuthController>();
    final String? userUuid = authController.currentUser.value?.uuid;

    if (userUuid == null) {
      throw Exception('User not authenticated');
    }

    final DateTime targetDate = date ?? DateTime.now();

    final Map<String, String> queryParams = {
      'users_uuid': userUuid,
      'date': targetDate.toIso8601String().split('T')[0],
    };

    if (!includeVisitPlans) {
      queryParams['include_visit_plans'] = '0';
    }

    if (visitPlanStatus != null) {
      queryParams['visit_plan_status'] = visitPlanStatus;
    }

    if (userId != null) {
      queryParams['user_id'] = userId.toString();
    }

    if (status != null) {
      queryParams['status'] = status;
    }

    if (clientId != null) {
      queryParams['client_id'] = clientId.toString();
    }

    if (limit != null) {
      queryParams['limit'] = limit.toString();
    }

    return await get('/visits/get_daily_overview.php', queryParameters: queryParams);
  }

  Future<Map<String, dynamic>> getVisitPlanDetail(int visitPlanId) async {
    final AuthController authController = Get.find<AuthController>();
    final String? userUuid = authController.currentUser.value?.uuid;

    if (userUuid == null) {
      throw Exception('User not authenticated');
    }

    Map<String, String> queryParams = {
      'users_uuid': userUuid,
      'visit_plan_id': visitPlanId.toString(),
    };

    return await get('/visit_plans/get_detail.php', queryParameters: queryParams);
  }

  Future<void> _ensureSessionLogout() async {
    if (_sessionLogoutInProgress) {
      return;
    }

    _sessionLogoutInProgress = true;

    try {
      if (Get.isRegistered<AuthController>()) {
        final authController = Get.find<AuthController>();
        await authController.logoutDueToSessionExpiry();
      } else {
        if (Get.isDialogOpen == true) {
          Get.back();
        }

        if (Get.currentRoute != AppRoutes.login) {
          Get.offAllNamed(AppRoutes.login);
        }
      }
    } catch (e, stackTrace) {
      developer.log('Error during forced logout: $e', name: 'API', error: e, stackTrace: stackTrace);

      try {
        if (Get.currentRoute != AppRoutes.login) {
          Get.offAllNamed(AppRoutes.login);
        }
      } catch (_) {}
    } finally {
      _sessionLogoutInProgress = false;
    }
  }
}
