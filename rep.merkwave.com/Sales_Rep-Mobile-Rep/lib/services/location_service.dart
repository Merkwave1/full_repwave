// lib/services/location_service.dart
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '/shared_widgets/app_notifier.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart'; // For LatLng
import 'package:permission_handler/permission_handler.dart' as permission_handler;

class LocationService extends GetxService {
  final Rx<LatLng?> currentLocation = Rx<LatLng?>(null);
  final isGettingLocation = false.obs;

  @override
  void onInit() {
    super.onInit();
    // Optionally fetch location on service init if always needed
    // _getCurrentLocation();
  }

  /// Check if background location permission is granted
  Future<bool> hasBackgroundLocationPermission() async {
    try {
      final permission = await Geolocator.checkPermission();
      print('LocationService: Current permission status: $permission');
      return permission == LocationPermission.always;
    } catch (e) {
      print('LocationService Error checking permission: $e');
      return false;
    }
  }

  /// Request background location permission with dialog
  Future<bool> requestBackgroundLocationPermission({bool showDialog = true}) async {
    try {
      print('LocationService: Checking current permission status...');
      LocationPermission permission = await Geolocator.checkPermission();
      print('LocationService: Current permission: $permission');

      // If already denied forever, show settings dialog
      if (permission == LocationPermission.deniedForever) {
        if (showDialog) {
          await _showPermissionDeniedDialog();
        }
        return false;
      }

      // If denied, request basic permission first
      if (permission == LocationPermission.denied) {
        print('LocationService: Requesting basic location permission...');
        permission = await Geolocator.requestPermission();
        print('LocationService: Permission after request: $permission');

        if (permission == LocationPermission.denied || permission == LocationPermission.deniedForever) {
          if (showDialog) {
            await _showPermissionDeniedDialog();
          }
          return false;
        }
      }

      // If we have whileInUse, try to upgrade to always
      if (permission == LocationPermission.whileInUse) {
        print('LocationService: Have whileInUse, requesting background permission...');

        if (showDialog) {
          // Show custom dialog explaining background permission
          bool shouldRequest = await _showBackgroundPermissionDialog();
          if (!shouldRequest) {
            return false;
          }
        }

        // Request background location using permission_handler
        final status = await permission_handler.Permission.locationAlways.request();
        print('LocationService: Background permission status: $status');

        // Check final permission status
        permission = await Geolocator.checkPermission();
        print('LocationService: Final permission after background request: $permission');

        if (permission == LocationPermission.always) {
          AppNotifier.success(
            'Background location permission granted successfully!',
            title: 'Success',
          );
          return true;
        } else {
          if (showDialog) {
            await _showPermissionRequiredDialog();
          }
          return false;
        }
      }

      // Already have always permission
      if (permission == LocationPermission.always) {
        print('LocationService: Already have background location permission');
        return true;
      }

      return false;
    } catch (e) {
      print('LocationService Error requesting background permission: $e');
      if (showDialog) {
        AppNotifier.error(
          'Failed to request background location permission: $e',
          title: 'Error',
        );
      }
      return false;
    }
  }

  /// Show dialog explaining why background permission is needed
  Future<bool> _showBackgroundPermissionDialog() async {
    return await Get.dialog<bool>(
          WillPopScope(
            onWillPop: () async => false,
            child: AlertDialog(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
              title: Row(
                children: [
                  Icon(Icons.location_on, color: Get.theme.primaryColor, size: 28),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Text(
                      'Background Location Required',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'This app requires background location access to:',
                    style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
                  ),
                  const SizedBox(height: 12),
                  _buildPermissionReason(Icons.route, 'Track your visits accurately'),
                  _buildPermissionReason(Icons.sync, 'Sync data automatically'),
                  _buildPermissionReason(Icons.update, 'Keep app updated in the background'),
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.amber.shade50,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.amber.shade200),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.info_outline, color: Colors.amber.shade700),
                        const SizedBox(width: 8),
                        const Expanded(
                          child: Text(
                            'Please select "Allow all the time" in the next screen',
                            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: () => Get.back(result: false),
                  child: Text(
                    'Cancel',
                    style: TextStyle(color: Colors.grey.shade600),
                  ),
                ),
                ElevatedButton(
                  onPressed: () => Get.back(result: true),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Get.theme.primaryColor,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                  ),
                  child: const Text(
                    'Continue',
                    style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
          ),
          barrierDismissible: false,
        ) ??
        false;
  }

  /// Show dialog when permission is required but not granted
  Future<void> _showPermissionRequiredDialog() async {
    await Get.dialog(
      AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: [
            Icon(Icons.warning_amber_rounded, color: Colors.orange.shade600, size: 28),
            const SizedBox(width: 12),
            const Expanded(
              child: Text(
                'Permission Required',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
        content: const Text(
          'Background location permission is required to use this app. Without it, the app cannot track your visits or sync data properly.',
          style: TextStyle(fontSize: 14),
        ),
        actions: [
          TextButton(
            onPressed: () => Get.back(),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  /// Show dialog when permission is permanently denied
  Future<void> _showPermissionDeniedDialog() async {
    await Get.dialog(
      AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: [
            Icon(Icons.block, color: Colors.red.shade600, size: 28),
            const SizedBox(width: 12),
            const Expanded(
              child: Text(
                'Permission Denied',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
        content: const Text(
          'Location permission has been permanently denied. Please enable it from app settings to continue.',
          style: TextStyle(fontSize: 14),
        ),
        actions: [
          TextButton(
            onPressed: () => Get.back(),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              Get.back();
              await Geolocator.openAppSettings();
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Get.theme.primaryColor,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            child: const Text(
              'Open Settings',
              style: TextStyle(color: Colors.white),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPermissionReason(IconData icon, String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Icon(icon, size: 20, color: Get.theme.primaryColor),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(fontSize: 14),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> getCurrentLocation({bool showErrors = true}) async {
    isGettingLocation.value = true;
    print('LocationService: Attempting to get current location...');
    try {
      LocationPermission permission = await Geolocator.checkPermission();
      print('LocationService: Location permission status: $permission');

      if (permission == LocationPermission.denied) {
        print('LocationService: Requesting location permission...');
        permission = await Geolocator.requestPermission();
        print('LocationService: Location permission after request: $permission');
        if (permission == LocationPermission.denied) {
          if (showErrors) {
            AppNotifier.error('Location permissions are denied.', title: 'Location Permission');
          }
          isGettingLocation.value = false;
          return;
        }
      }

      if (permission == LocationPermission.whileInUse) {
        print('LocationService: Requesting background location permission...');
        final LocationPermission upgraded = await Geolocator.requestPermission();
        print('LocationService: Location permission after background request: $upgraded');
        if (upgraded == LocationPermission.always) {
          permission = upgraded;
        } else {
          if (showErrors) {
            AppNotifier.warning(
              'Background location access is recommended to keep telemetry updates running while the screen is locked. Please choose "Allow all the time" in the next prompt or enable it from settings.',
              title: 'Background Location',
            );
          }
        }
      }

      if (permission == LocationPermission.deniedForever) {
        if (showErrors) {
          AppNotifier.error('Location permissions are permanently denied, we cannot request permissions.', title: 'Location Permission');
        }
        isGettingLocation.value = false;
        return;
      }

      Position position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.best,
          distanceFilter: 0,
          timeLimit: Duration(seconds: 20),
        ),
      );
      currentLocation.value = LatLng(position.latitude, position.longitude);
      print('LocationService: Current location fetched: Lat ${position.latitude}, Long ${position.longitude}');
    } catch (e) {
      if (showErrors) {
        AppNotifier.error('Failed to get current location: $e', title: 'Location Error');
      }
      print('LocationService Error: $e');
    } finally {
      isGettingLocation.value = false;
      print('LocationService: Finished getting current location. isGettingLocation: ${isGettingLocation.value}');
    }
  }
}
