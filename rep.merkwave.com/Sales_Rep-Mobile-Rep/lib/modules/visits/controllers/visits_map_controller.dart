// lib/modules/visits/controllers/visits_map_controller.dart
import 'dart:math' as math;
import '/shared_widgets/ultra_safe_navigation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:get/get.dart';
import 'package:geolocator/geolocator.dart';
import '/data/models/visit_plan.dart';
import '/data/models/visit.dart';
import '/modules/visits/controllers/visits_calendar_controller.dart';
import '/modules/visits/controllers/visits_controller.dart';
import '/modules/visits/bindings/visits_binding.dart';
import '/modules/visits/screens/visit_detail_screen.dart';

class VisitsMapController extends GetxController {
  final VisitsCalendarController _calendarController = Get.find<VisitsCalendarController>();
  final MapController mapController = MapController();

  // Observable variables
  final RxBool isLoading = false.obs;
  final RxString errorMessage = ''.obs;
  final Rx<Position?> userLocation = Rx<Position?>(null);
  final Rx<ScheduledVisit?> selectedVisit = Rx<ScheduledVisit?>(null);
  final RxBool isMapReady = false.obs;

  // Default map center (Cairo, Egypt)
  final LatLng initialCenter = const LatLng(30.0444, 31.2357);
  final double initialZoom = 10.0;

  // Get scheduled visits from calendar controller
  List<ScheduledVisit> get scheduledVisits => _calendarController.scheduledVisitsForDate;

  // Get visits that have location data
  List<ScheduledVisit> get visitsWithLocation => scheduledVisits.where((visit) => visit.clientLatitude != null && visit.clientLongitude != null).toList();

  // Get visits optimized by route (nearest neighbor algorithm)
  List<ScheduledVisit> get optimizedRouteVisits {
    final visits = visitsWithLocation;
    final userPos = userLocation.value;

    if (visits.isEmpty || userPos == null) {
      return visits;
    }

    return _optimizeVisitRoute(visits, userPos);
  }

  // Get current active visit from calendar controller
  Visit? get activeVisit {
    try {
      return _calendarController.actualVisits.firstWhere((visit) => visit.status.value == 'Started');
    } catch (e) {
      return null; // No active visit found
    }
  }

  // Check if there's an active visit
  bool get hasActiveVisit => _calendarController.hasActiveVisit;

  // Get the actual visit for a specific scheduled visit
  Visit? getActualVisitForScheduled(ScheduledVisit scheduledVisit) {
    try {
      return _calendarController.actualVisits.firstWhere((visit) {
        final visitDate = visit.startTime;
        final selectedDay = _calendarController.selectedDate.value;
        final isSameDate = visitDate.year == selectedDay.year && visitDate.month == selectedDay.month && visitDate.day == selectedDay.day;
        return isSameDate && visit.clientId == scheduledVisit.clientId;
      });
    } catch (e) {
      return null; // No actual visit found for this scheduled visit
    }
  }

  // Check if a scheduled visit has an active actual visit
  bool hasActiveVisitForClient(ScheduledVisit scheduledVisit) {
    final actualVisit = getActualVisitForScheduled(scheduledVisit);
    return actualVisit?.status.value == 'Started';
  }

  // Check if a scheduled visit has a completed actual visit
  bool hasCompletedVisitForClient(ScheduledVisit scheduledVisit) {
    final actualVisit = getActualVisitForScheduled(scheduledVisit);
    return actualVisit?.status.value == 'Completed';
  }

  // Navigate to visit details for a scheduled visit
  Future<void> goToVisitDetails(ScheduledVisit scheduledVisit) async {
    final actualVisit = getActualVisitForScheduled(scheduledVisit);
    if (actualVisit != null) {
      // Ensure VisitsController is initialized before navigation
      if (!Get.isRegistered<VisitsController>()) {
        VisitsBinding().dependencies();
      }

      // Navigate to visit details screen
      await Get.to(() => VisitDetailScreen(visit: actualVisit));
      // Refresh data when returning from visit details
      await refreshData();
    } else {
      Get.snackbar(
        'Error',
        'No visit details found',
        snackPosition: SnackPosition.BOTTOM,
        backgroundColor: Colors.red,
        colorText: Colors.white,
      );
    }
  }

  @override
  void onInit() {
    super.onInit();
    loadInitialData();
  }

  @override
  void onReady() {
    super.onReady();
    // Wait for the widget to be built, then center the map
    Future.delayed(const Duration(milliseconds: 500), () {
      onMapReady();
    });
  }

  Future<void> loadInitialData() async {
    isLoading.value = true;
    errorMessage.value = '';

    try {
      // Get user location
      await _getCurrentLocation();

      // Don't center map here - wait for map to be ready
    } catch (e) {
      errorMessage.value = e.toString();
      print('Error loading map data: $e');
    } finally {
      isLoading.value = false;
    }
  }

  // Call this when the map is ready
  void onMapReady() {
    if (!isMapReady.value) {
      isMapReady.value = true;
      _centerMapOnBestLocation();
    }
  }

  Future<void> refreshData() async {
    // Also refresh calendar data so client coordinates are up to date
    try {
      await _calendarController.refreshVisits();
    } catch (_) {}

    await loadInitialData();
    if (isMapReady.value) {
      // Re-center and zoom to fit all clients
      _centerMapOnBestLocation();
    }
  }

  // Method to fit bounds to show all clients (can be called externally)
  void fitBoundsToShowAllClients() {
    if (isMapReady.value) {
      _centerMapOnBestLocation();
    }
  }

  // Optimize visit route using nearest neighbor algorithm
  List<ScheduledVisit> _optimizeVisitRoute(List<ScheduledVisit> visits, Position userPos) {
    if (visits.length <= 1) return visits;

    final List<ScheduledVisit> optimizedRoute = [];
    final List<ScheduledVisit> remaining = List.from(visits);

    // Start from user's current location
    LatLng currentLocation = LatLng(userPos.latitude, userPos.longitude);

    while (remaining.isNotEmpty) {
      // Find the nearest client to current location
      ScheduledVisit nearestVisit = remaining.first;
      double minDistance = _calculateDistance(
        currentLocation,
        LatLng(nearestVisit.clientLatitude!, nearestVisit.clientLongitude!),
      );

      for (final visit in remaining) {
        final distance = _calculateDistance(
          currentLocation,
          LatLng(visit.clientLatitude!, visit.clientLongitude!),
        );
        if (distance < minDistance) {
          minDistance = distance;
          nearestVisit = visit;
        }
      }

      // Add nearest visit to route and remove from remaining
      optimizedRoute.add(nearestVisit);
      remaining.remove(nearestVisit);

      // Update current location to the selected visit
      currentLocation = LatLng(nearestVisit.clientLatitude!, nearestVisit.clientLongitude!);
    }

    return optimizedRoute;
  }

  Future<void> _getCurrentLocation() async {
    try {
      // Check if location services are enabled
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        throw Exception('Location services are disabled');
      }

      // Check for location permission
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          throw Exception('Location permission denied');
        }
      }

      if (permission == LocationPermission.deniedForever) {
        throw Exception('Location permission denied forever');
      }

      // Get current position
      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 10),
      );

      userLocation.value = position;
    } catch (e) {
      print('Error getting location: $e');
      // Don't throw error, just continue without user location
    }
  }

  void _centerMapOnBestLocation() {
    if (!isMapReady.value) return;

    final visits = visitsWithLocation;
    final userPos = userLocation.value;

    if (visits.isEmpty && userPos == null) {
      // Use default location
      try {
        mapController.move(initialCenter, initialZoom);
      } catch (e) {
        print('Error moving map to default location: $e');
      }
      return;
    }

    if (userPos != null && visits.isEmpty) {
      // Center on user location
      try {
        mapController.move(LatLng(userPos.latitude, userPos.longitude), 14.0);
      } catch (e) {
        print('Error centering on user location: $e');
      }
      return;
    }

    if (visits.isNotEmpty) {
      try {
        _fitBoundsToShowAllClients(visits, userPos);
      } catch (e) {
        print('Error centering map on visits: $e');
      }
    }
  }

  void _fitBoundsToShowAllClients(List<ScheduledVisit> visits, Position? userPos) {
    // Get all client locations
    final List<LatLng> points = [];

    // Add all client locations
    for (final visit in visits) {
      points.add(LatLng(visit.clientLatitude!, visit.clientLongitude!));
    }

    // Add user location if available
    if (userPos != null) {
      points.add(LatLng(userPos.latitude, userPos.longitude));
    }

    if (points.isEmpty) return;

    if (points.length == 1) {
      // Only one point, center on it with good zoom
      mapController.move(points.first, 15.0);
      return;
    }

    // Calculate bounds
    double minLat = points.first.latitude;
    double maxLat = points.first.latitude;
    double minLng = points.first.longitude;
    double maxLng = points.first.longitude;

    for (final point in points) {
      minLat = math.min(minLat, point.latitude);
      maxLat = math.max(maxLat, point.latitude);
      minLng = math.min(minLng, point.longitude);
      maxLng = math.max(maxLng, point.longitude);
    }

    // Calculate the center point
    final centerLat = (minLat + maxLat) / 2;
    final centerLng = (minLng + maxLng) / 2;
    final center = LatLng(centerLat, centerLng);

    // Calculate the maximum distance from center to any point
    double maxDistance = 0;
    for (final point in points) {
      final distance = _calculateDistance(center, point);
      maxDistance = math.max(maxDistance, distance);
    }

    // Calculate zoom level based on maximum distance
    final zoom = _calculateOptimalZoom(maxDistance);

    // Add some padding by reducing zoom slightly
    final paddedZoom = math.max(6.0, zoom - 1.0);

    print('Map centering: ${points.length} points, center: $center, maxDistance: ${maxDistance.toStringAsFixed(2)}km, zoom: $paddedZoom');

    mapController.move(center, paddedZoom);
  }

  // Calculate distance between two points in kilometers
  double _calculateDistance(LatLng point1, LatLng point2) {
    const double earthRadius = 6371; // Earth's radius in kilometers

    final lat1Rad = point1.latitude * (math.pi / 180);
    final lat2Rad = point2.latitude * (math.pi / 180);
    final deltaLatRad = (point2.latitude - point1.latitude) * (math.pi / 180);
    final deltaLngRad = (point2.longitude - point1.longitude) * (math.pi / 180);

    final a = math.sin(deltaLatRad / 2) * math.sin(deltaLatRad / 2) + math.cos(lat1Rad) * math.cos(lat2Rad) * math.sin(deltaLngRad / 2) * math.sin(deltaLngRad / 2);
    final c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a));

    return earthRadius * c;
  }

  // Calculate optimal zoom level based on maximum distance from center
  double _calculateOptimalZoom(double maxDistanceKm) {
    // More granular zoom calculation based on distance
    if (maxDistanceKm < 0.5) return 16.0; // Very close (< 500m)
    if (maxDistanceKm < 1.0) return 15.0; // Close (< 1km)
    if (maxDistanceKm < 2.0) return 14.0; // Nearby (< 2km)
    if (maxDistanceKm < 5.0) return 13.0; // Local area (< 5km)
    if (maxDistanceKm < 10.0) return 12.0; // District (< 10km)
    if (maxDistanceKm < 20.0) return 11.0; // City area (< 20km)
    if (maxDistanceKm < 50.0) return 10.0; // Large city (< 50km)
    if (maxDistanceKm < 100.0) return 9.0; // Metropolitan (< 100km)
    if (maxDistanceKm < 200.0) return 8.0; // Regional (< 200km)
    if (maxDistanceKm < 500.0) return 7.0; // Large region (< 500km)
    return 6.0; // Country/continental level
  }

  void centerOnUserLocation() {
    final userPos = userLocation.value;
    if (userPos != null && isMapReady.value) {
      try {
        mapController.move(LatLng(userPos.latitude, userPos.longitude), 14.0);
      } catch (e) {
        print('Error centering on user location: $e');
        Get.snackbar(
          'Error',
          'Unable to center on location',
          snackPosition: SnackPosition.BOTTOM,
          backgroundColor: Colors.red,
          colorText: Colors.white,
        );
      }
    } else {
      Get.snackbar(
        'Location Not Available',
        'Unable to get your current location',
        snackPosition: SnackPosition.BOTTOM,
        backgroundColor: Colors.orange,
        colorText: Colors.white,
      );
    }
  }

  void onMapTap(LatLng point) {
    // Clear selection when tapping on empty area
    selectedVisit.value = null;
  }

  void selectVisit(ScheduledVisit visit) {
    selectedVisit.value = visit;

    // Center map on selected visit
    if (visit.clientLatitude != null && visit.clientLongitude != null && isMapReady.value) {
      try {
        mapController.move(LatLng(visit.clientLatitude!, visit.clientLongitude!), 15.0);
      } catch (e) {
        print('Error centering on selected visit: $e');
      }
    }
  }

  String getVisitStatus(ScheduledVisit visit) {
    return _calendarController.getVisitStatus(visit);
  }

  String getDistanceString(ScheduledVisit visit) {
    return _calendarController.getDistanceString(visit);
  }

  Future<void> navigateToClient(ScheduledVisit visit) async {
    await _calendarController.openGoogleMaps(visit);
  }

  Future<void> startVisit(ScheduledVisit visit) async {
    // Check if there's already an active visit
    if (hasActiveVisit) {
      final currentActiveVisit = activeVisit;
      if (currentActiveVisit != null) {
        Get.dialog(
          AlertDialog(
            title: Text('Active Visit in Progress'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('You already have an active visit in progress.'),
                const SizedBox(height: 8),
                Text(
                  'Active Visit: ${currentActiveVisit.client?.companyName ?? 'Unknown Client'}',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 16),
                Text('What would you like to do?'),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () => UltraSafeNavigation.back(Get.context),
                child: Text('Cancel'),
              ),
              TextButton(
                onPressed: () async {
                  UltraSafeNavigation.back(Get.context);
                  // Navigate to active visit details
                  Get.snackbar(
                    'Info',
                    'Please complete your current visit first',
                    snackPosition: SnackPosition.BOTTOM,
                    backgroundColor: Colors.orange,
                    colorText: Colors.white,
                  );
                },
                child: Text('View Active Visit'),
              ),
            ],
          ),
        );
        return;
      }
    }

    // Proceed with starting the visit if no active visit
    final success = await _calendarController.startVisitFromScheduled(visit);
    if (success) {
      // Refresh data to show the newly started visit
      await refreshData();
      Get.snackbar(
        'Success',
        'Visit started successfully',
        snackPosition: SnackPosition.BOTTOM,
        backgroundColor: Colors.green,
        colorText: Colors.white,
      );
    }
  }
}
