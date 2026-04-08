// lib/services/location_tracking_service.dart
import 'dart:async';
import 'package:get/get.dart';
import 'package:geolocator/geolocator.dart';
import 'package:battery_plus/battery_plus.dart';
import 'package:device_info_plus/device_info_plus.dart';
import 'dart:io';
import '/services/api_service.dart';
import '/modules/auth/controllers/auth_controller.dart';
import '/modules/attendance/controllers/attendance_controller.dart';
import 'package:wakelock_plus/wakelock_plus.dart';

/// Service for tracking and sending location, battery level, and device info periodically
/// Runs every minute when user is logged in and app is in foreground or background
class LocationTrackingService extends GetxService {
  StreamSubscription<Position>? _positionStreamSubscription;
  bool _isSendingStreamUpdate = false;
  final Battery _battery = Battery();
  final DeviceInfoPlugin _deviceInfo = DeviceInfoPlugin();

  final isTracking = false.obs;
  final lastUpdateTime = Rx<DateTime?>(null);
  final lastKnownLocation = Rx<Position?>(null);
  final lastBatteryLevel = RxInt(0);
  final deviceName = ''.obs;
  bool _hasActiveAttendance = false;

  // Tracking interval - every 40 seconds
  static const Duration trackingInterval = Duration(seconds: 40);
  static const Duration _maxLocationAge = Duration(seconds: 45);
  static const Duration _freshLocationTimeout = Duration(seconds: 20);
  static const Duration _minStreamUpdateSpacing = Duration(seconds: 50);
  static const ForegroundNotificationConfig _foregroundNotificationConfig = ForegroundNotificationConfig(
    notificationText: "Location tracking is active",
    notificationTitle: "Rep Wave",
    enableWakeLock: true,
  );

  @override
  void onInit() {
    super.onInit();
    _initializeDeviceInfo();
  }

  @override
  void onClose() {
    stopTracking();
    super.onClose();
  }

  /// Initialize device information (Android only)
  Future<void> _initializeDeviceInfo() async {
    try {
      if (Platform.isAndroid) {
        AndroidDeviceInfo androidInfo = await _deviceInfo.androidInfo;
        deviceName.value = '${androidInfo.brand} ${androidInfo.model}';
        // print('📱 Device: ${deviceName.value}');
      } else {
        deviceName.value = 'Unknown Device';
      }
    } catch (e) {
      deviceName.value = 'Unknown Device';
    }
  }

  /// Start periodic location tracking
  /// Should be called when user logs in
  void startTracking() {
    if (isTracking.value) {
      return;
    }

    // Check if user is logged in
    if (!_isUserLoggedIn()) {
      return;
    }

    if (!_hasActiveAttendance && !_isAttendanceActive()) {
      print('⏸️ Attendance inactive - deferring location stream start');
      return;
    }

    print('🟢 Location Tracking Started (GPS forced fresh location every minute)');
    isTracking.value = true;

    // Enable WakeLock to keep app active even when screen is locked
    _enableWakeLock();

    // Send location immediately on start
    _trackAndSendLocation();

    // Keep GPS warm with a foreground service-backed stream
    _startPositionStream();
  }

  /// Stop periodic location tracking
  /// Should be called when user logs out
  void stopTracking() {
    if (!isTracking.value) {
      return;
    }

    print('🔴 Location Tracking Stopped');
    _stopPositionStream();
    isTracking.value = false; // Disable WakeLock to save battery
    _isSendingStreamUpdate = false;
    _disableWakeLock();
    _hasActiveAttendance = false;
  }

  void handleAttendanceStatus(String? status) {
    final isActive = status == 'ClockedIn';
    _hasActiveAttendance = isActive;

    if (isActive) {
      startTracking();
    } else {
      if (isTracking.value) {
        print('🛑 Attendance inactive - stopping location tracking');
      }
      stopTracking();
    }
  }

  /// Track location, battery, and device info, then send to API
  Future<void> _trackAndSendLocation() async {
    try {
      // Check if user is still logged in
      if (!_isUserLoggedIn()) {
        stopTracking();
        return;
      }

      if (!_hasActiveAttendance && !_isAttendanceActive()) {
        print('⏸️ Skipping location update - attendance not active');
        return;
      }

      // Get current location
      Position? position = await _getCurrentLocation();
      if (position == null) {
        print('⚠️ Failed to get location');
        return;
      }

      lastKnownLocation.value = position;
      await _sendPositionToAPI(position);
    } catch (e) {
      print('❌ Location tracking error: $e');
    }
  }

  /// Send position with battery info to API
  Future<void> _sendPositionToAPI(Position position) async {
    try {
      // Get battery level
      int batteryLevel = await _getBatteryLevel();
      lastBatteryLevel.value = batteryLevel;

      // Send data to API
      await _sendDataToAPI(
        latitude: position.latitude,
        longitude: position.longitude,
        batteryLevel: batteryLevel,
        phoneType: deviceName.value,
      );

      lastUpdateTime.value = DateTime.now();
      print('✅ Location sent: (${position.latitude.toStringAsFixed(7)}, ${position.longitude.toStringAsFixed(7)}) | Battery: $batteryLevel%');
    } catch (e) {
      print('❌ Failed to send position: $e');
    }
  }

  /// Get current location
  Future<Position?> _getCurrentLocation() async {
    try {
      // Check if location services are enabled
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        return null;
      }

      // Check location permission
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          return null;
        }
      }

      if (permission == LocationPermission.deniedForever) {
        return null;
      }

      // CRITICAL: Force fresh GPS location - Android caches location by default!
      // Solution: Use LocationSettings with forceLocationManager
      const LocationSettings locationSettings = LocationSettings(
        accuracy: LocationAccuracy.bestForNavigation, // Highest accuracy
        distanceFilter: 0, // Always get new location
        timeLimit: Duration(seconds: 45), // Wait longer for fresh GPS fix
      );

      final AndroidSettings androidSettings = AndroidSettings(
        accuracy: LocationAccuracy.bestForNavigation,
        distanceFilter: 0,
        forceLocationManager: true, // ⚡ CRITICAL: Bypass FusedLocationProvider cache
        intervalDuration: trackingInterval, // Request every minute
        foregroundNotificationConfig: _foregroundNotificationConfig,
      );

      // Try multiple times to get fresh location
      Position? position;
      for (int attempt = 0; attempt < 3; attempt++) {
        try {
          final currentAttemptPosition = await Geolocator.getCurrentPosition(
            locationSettings: Platform.isAndroid ? androidSettings : locationSettings,
          );

          position = currentAttemptPosition;

          if (_isPositionFresh(currentAttemptPosition)) {
            print('✅ Fresh GPS location (age: ${_describeLocationAge(currentAttemptPosition)})');
            break;
          }

          if (attempt < 2) {
            print('⚠️ Cached location (age: ${_describeLocationAge(currentAttemptPosition)}) - retrying...');
            // await Future.delayed(_cachedLocationRetryDelay); // Wait before retry
          }
        } catch (e) {
          if (attempt == 2) rethrow;
          await Future.delayed(Duration(seconds: 3));
        }
      }

      if (position == null || !_isPositionFresh(position)) {
        print('⏳ Waiting for real-time GPS fix via stream...');
        final stalePosition = position;
        position = await _waitForFreshPosition(
          baseSettings: locationSettings,
          androidSettings: androidSettings,
        );

        if (position == null) {
          print('⚠️ Unable to obtain fresh GPS fix — skipping location update (last cached age: ${_describeNullableLocationAge(stalePosition)})');
          return null;
        }
      }

      return position;
    } catch (e) {
      print('⚠️ Error getting location: $e');
      return null;
    }
  }

  void _startPositionStream() {
    _stopPositionStream();
    _isSendingStreamUpdate = false;

    final LocationSettings baseSettings = const LocationSettings(
      accuracy: LocationAccuracy.bestForNavigation,
      distanceFilter: 0,
    );

    final AndroidSettings androidStreamSettings = AndroidSettings(
      accuracy: LocationAccuracy.bestForNavigation,
      distanceFilter: 0,
      forceLocationManager: true,
      intervalDuration: trackingInterval,
      foregroundNotificationConfig: _foregroundNotificationConfig,
    );

    final LocationSettings streamSettings = Platform.isAndroid ? androidStreamSettings : baseSettings;

    _positionStreamSubscription = Geolocator.getPositionStream(
      locationSettings: streamSettings,
    ).listen(
      (position) async {
        await _handleStreamPosition(position);
      },
      onError: (error) {
        print('⚠️ Location stream error: $error');
      },
    );

    print('📡 Location stream started (interval: ${trackingInterval.inSeconds}s)');
  }

  void _stopPositionStream() {
    if (_positionStreamSubscription != null) {
      unawaited(_positionStreamSubscription!.cancel());
      _positionStreamSubscription = null;
      print('📡 Location stream stopped');
    }
  }

  Future<void> _handleStreamPosition(Position position) async {
    if (!isTracking.value) {
      return;
    }

    lastKnownLocation.value = position;

    if (!_isPositionFresh(position, maxAge: trackingInterval)) {
      print('⚠️ Streamed GPS still stale (age: ${_describeLocationAge(position)}) - waiting...');
      return;
    }

    if (!_isUserLoggedIn()) {
      stopTracking();
      return;
    }

    if (!_hasActiveAttendance && !_isAttendanceActive()) {
      print('⏸️ Stream update skipped - attendance not active');
      return;
    }

    if (!_shouldSendStreamUpdate()) {
      return;
    }

    if (_isSendingStreamUpdate) {
      print('⏸️ Stream update skipped - previous send in progress');
      return;
    }

    _isSendingStreamUpdate = true;
    try {
      await _sendPositionToAPI(position);
    } catch (e) {
      print('❌ Stream position send failed: $e');
    } finally {
      _isSendingStreamUpdate = false;
    }
  }

  bool _shouldSendStreamUpdate() {
    final lastSent = lastUpdateTime.value;
    if (lastSent == null) {
      return true;
    }

    final elapsed = DateTime.now().difference(lastSent);
    if (elapsed < _minStreamUpdateSpacing) {
      final remaining = _minStreamUpdateSpacing - elapsed;
      print('⏸️ Stream update throttled (next in ~${remaining.inSeconds}s)');
      return false;
    }

    return true;
  }

  bool _isPositionFresh(Position position, {Duration maxAge = _maxLocationAge}) {
    final age = _positionAge(position);
    return age <= maxAge;
  }

  Duration _positionAge(Position position) {
    return DateTime.now().difference(position.timestamp);
  }

  String _describeLocationAge(Position position) {
    final age = _positionAge(position);
    if (age.inSeconds < 60) {
      return '${age.inSeconds}s';
    }
    final minutes = age.inMinutes;
    final seconds = age.inSeconds % 60;
    if (seconds == 0) {
      return '${minutes}min';
    }
    return '${minutes}min ${seconds}s';
  }

  String _describeNullableLocationAge(Position? position) {
    if (position == null) {
      return 'none';
    }
    return _describeLocationAge(position);
  }

  Future<Position?> _waitForFreshPosition({
    required LocationSettings baseSettings,
    required AndroidSettings androidSettings,
  }) async {
    final LocationSettings streamSettings = Platform.isAndroid
        ? AndroidSettings(
            accuracy: androidSettings.accuracy,
            distanceFilter: androidSettings.distanceFilter,
            forceLocationManager: androidSettings.forceLocationManager,
            intervalDuration: const Duration(seconds: 5),
            foregroundNotificationConfig: androidSettings.foregroundNotificationConfig,
          )
        : LocationSettings(
            accuracy: baseSettings.accuracy,
            distanceFilter: baseSettings.distanceFilter,
          );

    StreamSubscription<Position>? subscription;
    final completer = Completer<Position?>();

    try {
      subscription = Geolocator.getPositionStream(locationSettings: streamSettings).listen(
        (position) {
          if (_isPositionFresh(position, maxAge: _freshLocationTimeout)) {
            print('✅ Fresh GPS location from stream (age: ${_describeLocationAge(position)})');
            if (!completer.isCompleted) {
              completer.complete(position);
            }
          } else {
            print('⚠️ Streamed GPS still stale (age: ${_describeLocationAge(position)}) - waiting...');
          }
        },
        onError: (error) {
          if (!completer.isCompleted) {
            completer.completeError(error);
          }
        },
      );

      return await completer.future.timeout(
        _freshLocationTimeout,
        onTimeout: () {
          if (!completer.isCompleted) {
            completer.complete(null);
          }
          return null;
        },
      );
    } catch (e) {
      print('⚠️ Error while waiting for fresh GPS update: $e');
      return null;
    } finally {
      await subscription?.cancel();
    }
  }

  /// Get battery level
  Future<int> _getBatteryLevel() async {
    try {
      int batteryLevel = await _battery.batteryLevel;
      return batteryLevel;
    } catch (e) {
      return 0;
    }
  }

  bool _isUserLoggedIn() {
    if (!Get.isRegistered<AuthController>()) {
      return false;
    }

    final authController = Get.find<AuthController>();
    return authController.currentUser.value != null;
  }

  bool _isAttendanceActive() {
    if (_hasActiveAttendance) {
      return true;
    }

    if (!Get.isRegistered<AttendanceController>()) {
      return false;
    }

    try {
      final attendanceController = Get.find<AttendanceController>();
      final status = attendanceController.currentStatus.value?.attendance?.attendanceStatus;
      final isActive = status == 'ClockedIn';
      _hasActiveAttendance = isActive;
      return isActive;
    } catch (_) {
      return false;
    }
  }

  /// Send location, battery, and device data to API
  Future<void> _sendDataToAPI({
    required double latitude,
    required double longitude,
    required int batteryLevel,
    required String phoneType,
  }) async {
    try {
      if (!Get.isRegistered<ApiService>()) {
        return;
      }

      final apiService = Get.find<ApiService>();

      // Get user UUID
      final authController = Get.find<AuthController>();
      final userUuid = authController.currentUser.value?.uuid;

      if (userUuid == null) {
        return;
      }

      await apiService.post(
        '/location/update.php',
        {
          'users_uuid': userUuid,
          'latitude': latitude.toString(),
          'longitude': longitude.toString(),
          'battery_level': batteryLevel.toString(),
          'phone_type': phoneType,
        },
      );
    } catch (e) {
      print('❌ Failed to send location: $e');
    }
  }

  /// Manually trigger a location update
  /// Can be called from UI or when needed
  Future<void> triggerManualUpdate() async {
    print('🔄 Manual location update triggered');

    if (!_isAttendanceActive()) {
      print('⏸️ Manual update skipped - attendance not active');
      return;
    }

    final latest = lastKnownLocation.value;
    if (latest != null && _isPositionFresh(latest, maxAge: trackingInterval)) {
      print('📍 Using freshest streamed location for manual update');
      await _sendPositionToAPI(latest);
    } else {
      await _trackAndSendLocation();
    }
  }

  /// Get tracking status information
  Map<String, dynamic> getTrackingStatus() {
    return {
      'isTracking': isTracking.value,
      'lastUpdateTime': lastUpdateTime.value?.toString() ?? 'Never',
      'lastLocation': lastKnownLocation.value != null ? '${lastKnownLocation.value!.latitude}, ${lastKnownLocation.value!.longitude}' : 'Unknown',
      'lastBatteryLevel': '${lastBatteryLevel.value}%',
      'deviceName': deviceName.value,
    };
  }

  /// Enable WakeLock to keep app running even when screen is off
  Future<void> _enableWakeLock() async {
    try {
      await WakelockPlus.enable();
      print('🔓 WakeLock enabled - App will continue running when screen is locked');
    } catch (e) {
      print('⚠️ Failed to enable WakeLock: $e');
    }
  }

  /// Disable WakeLock to save battery
  Future<void> _disableWakeLock() async {
    try {
      await WakelockPlus.disable();
      print('🔒 WakeLock disabled');
    } catch (e) {
      print('⚠️ Failed to disable WakeLock: $e');
    }
  }
}
