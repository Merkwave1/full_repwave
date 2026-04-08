// lib/modules/visits/controllers/visits_calendar_controller.dart
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:geolocator/geolocator.dart';
import 'package:url_launcher/url_launcher.dart';
import '/data/models/visit_plan.dart';
import '/data/models/visit.dart';
import '/data/models/client.dart';
import '/data/repositories/visit_plan_repository.dart';
import '/data/repositories/visit_repository.dart';
import '/modules/auth/controllers/auth_controller.dart';
import '/modules/shared/controllers/global_data_controller.dart';
import '/modules/home/controllers/home_controller.dart';
import '/modules/visits/screens/visit_detail_screen.dart';
import '/modules/visits/bindings/visits_binding.dart';
import '/modules/visits/controllers/visits_controller.dart';

class VisitsCalendarController extends GetxController {
  final VisitPlanRepository visitPlanRepository;
  final VisitRepository visitRepository;
  final GlobalDataController _globalDataController = Get.find<GlobalDataController>();
  final AuthController _authController = Get.find<AuthController>();

  VisitsCalendarController({
    required this.visitPlanRepository,
    required this.visitRepository,
  });

  // Observable variables
  final RxBool isLoading = false.obs;
  final RxString errorMessage = ''.obs;
  final RxList<VisitPlan> allVisitPlans = <VisitPlan>[].obs;
  final RxList<Visit> actualVisits = <Visit>[].obs;
  final Rx<DateTime> selectedDate = DateTime.now().obs;
  final RxString selectedFilter = 'all'.obs; // Filter state: 'all', 'completed', 'active', 'scheduled'
  final Rx<Position?> currentUserLocation = Rx<Position?>(null);
  bool _hasLoadedPlans = false;

  // Get clients from global cache
  List<Client> get clients => _globalDataController.clients;

  // Get scheduled visits for selected date
  List<ScheduledVisit> get scheduledVisitsForDate {
    final selected = selectedDate.value;
    List<ScheduledVisit> scheduledVisits = [];

    for (final plan in allVisitPlans) {
      if (plan.isScheduledForDate(selected)) {
        // Create scheduled visits for each client in the plan
        if (plan.clients != null) {
          for (final planClient in plan.clients!) {
            final client = getClientById(planClient.clientId); // This can be null
            // Create ScheduledVisit regardless of whether client is found in cache
            scheduledVisits.add(ScheduledVisit(
              visitPlan: plan,
              client: client, // Can be null, will fallback to planClient data
              scheduledDate: selected,
              planClient: planClient,
            ));
          }
        }
      }
    }

    return scheduledVisits;
  }

  // Get filtered scheduled visits based on selected filter
  List<ScheduledVisit> get filteredScheduledVisits {
    final allVisits = scheduledVisitsForDate;

    // Apply filter first
    List<ScheduledVisit> filteredVisits;
    if (selectedFilter.value == 'all') {
      filteredVisits = allVisits;
    } else {
      filteredVisits = allVisits.where((visit) {
        final status = getVisitStatus(visit);
        switch (selectedFilter.value) {
          case 'completed':
            return status == 'Completed';
          case 'active':
            return status == 'Started';
          case 'scheduled':
            return status == 'Scheduled';
          default:
            return true;
        }
      }).toList();
    }

    // Sort visits: Active visits first, then by distance, then completed visits last
    filteredVisits.sort((a, b) {
      final statusA = getVisitStatus(a);
      final statusB = getVisitStatus(b);

      // Priority order: Started > Scheduled (sorted by distance) > Completed
      final priorityA = _getVisitPriority(statusA);
      final priorityB = _getVisitPriority(statusB);

      if (priorityA != priorityB) {
        return priorityA.compareTo(priorityB);
      }

      // If both have same priority and are scheduled, sort by distance
      if (statusA == 'Scheduled' && statusB == 'Scheduled') {
        final userLocation = currentUserLocation.value;
        if (userLocation != null) {
          final distanceA = a.calculateDistance(userLocation.latitude, userLocation.longitude) ?? double.infinity;
          final distanceB = b.calculateDistance(userLocation.latitude, userLocation.longitude) ?? double.infinity;
          return distanceA.compareTo(distanceB);
        }
      }

      // Default sort by client name
      return a.clientName.compareTo(b.clientName);
    });

    return filteredVisits;
  }

  // Helper method to get visit priority for sorting
  int _getVisitPriority(String status) {
    switch (status) {
      case 'Started':
        return 1; // Highest priority (active visits)
      case 'Scheduled':
        return 2; // Medium priority (sorted by distance)
      case 'Completed':
        return 3; // Lowest priority (completed visits)
      case 'Cancelled':
        return 4; // Last
      default:
        return 2;
    }
  }

  @override
  void onInit() {
    super.onInit();
    loadInitialData();
  }

  void loadInitialData() async {
    // Load clients from cache if empty
    if (_globalDataController.clients.isEmpty) {
      await _globalDataController.loadClients();
    }
    await _loadDayOverview(date: selectedDate.value, forceRefreshPlans: true);
    // Get current location for distance calculations (don't await to avoid blocking)
    updateCurrentLocation();
  }

  Future<void> loadVisitPlans() async {
    await _loadDayOverview(date: selectedDate.value, forceRefreshPlans: true);
  }

  Future<void> loadActualVisitsForDate() async {
    await _loadDayOverview(date: selectedDate.value, forceRefreshPlans: false);
  }

  Future<void> _loadDayOverview({required DateTime date, bool forceRefreshPlans = false}) async {
    final bool shouldIncludePlans = forceRefreshPlans || !_hasLoadedPlans || allVisitPlans.isEmpty;
    try {
      if (shouldIncludePlans) {
        isLoading.value = true;
        errorMessage.value = '';
      }

      final overview = await visitPlanRepository.getVisitDayOverview(
        date: date,
        includeVisitPlans: shouldIncludePlans,
        visitPlanStatus: 'Active',
        userId: _authController.currentUser.value?.id,
      );

      if (shouldIncludePlans && overview.visitPlans != null) {
        allVisitPlans.assignAll(overview.visitPlansOrEmpty);
        _hasLoadedPlans = true;
      }

      actualVisits.assignAll(overview.actualVisits);
    } catch (e) {
      if (shouldIncludePlans) {
        errorMessage.value = e.toString();
        Get.snackbar(
          'error'.tr,
          'failed_to_load_visit_plans'.tr,
          snackPosition: SnackPosition.BOTTOM,
          backgroundColor: Colors.red,
          colorText: Colors.white,
        );
      } else {
        print('Error loading actual visits for $date: $e');
      }
    } finally {
      if (shouldIncludePlans) {
        isLoading.value = false;
      }
    }
  }

  Future<void> refreshVisits() async {
    // Force refresh clients so updated coordinates from Admin reflect in distances
    try {
      await _globalDataController.loadClients(forceRefresh: true);
    } catch (e) {
      // Non-fatal; continue with other refresh steps
      print('Warning: failed to refresh clients before visits refresh: $e');
    }

    await _loadDayOverview(date: selectedDate.value, forceRefreshPlans: true);
    // Update location for distance calculations
    updateCurrentLocation();
  }

  // Force refresh actual visits (can be called from other screens)
  Future<void> refreshActualVisits() async {
    await _loadDayOverview(date: selectedDate.value, forceRefreshPlans: false);
  }

  void setSelectedDate(DateTime date) {
    selectedDate.value = date;
    // Load actual visits for the new date
    _loadDayOverview(date: date, forceRefreshPlans: false);
  }

  // Set the filter for visits
  void setFilter(String filter) {
    selectedFilter.value = filter;
  }

  // Clear filter (show all visits)
  void clearFilter() {
    selectedFilter.value = 'all';
  }

  Client? getClientById(int clientId) {
    try {
      return clients.firstWhere((client) => client.id == clientId);
    } catch (e) {
      return null;
    }
  }

  // Get visits stats for selected date
  Map<String, int> get visitsStats {
    final scheduledVisits = scheduledVisitsForDate;

    // Count visits by actual status using the getVisitStatus method for accuracy
    int activeCount = 0;
    int completedCount = 0;
    int cancelledCount = 0;
    int scheduledCount = 0;

    for (final scheduledVisit in scheduledVisits) {
      final status = getVisitStatus(scheduledVisit);
      switch (status) {
        case 'Started':
          activeCount++;
          break;
        case 'Completed':
          completedCount++;
          break;
        case 'Cancelled':
          cancelledCount++;
          break;
        case 'Scheduled':
        default:
          scheduledCount++;
          break;
      }
    }

    // Total is the count of all scheduled visits
    final totalVisits = scheduledVisits.length;

    return {
      'total': totalVisits,
      'completed': completedCount,
      'active': activeCount,
      'scheduled': scheduledCount,
      'cancelled': cancelledCount,
    };
  }

  // Check if there's any active visit
  bool get hasActiveVisit {
    return actualVisits.any((visit) => visit.status.value == 'Started');
  }

  // Get the current active visit
  Visit? get currentActiveVisit {
    try {
      return actualVisits.firstWhere((visit) => visit.status.value == 'Started');
    } catch (e) {
      return null;
    }
  }

  // Get actual status for a scheduled visit
  String getVisitStatus(ScheduledVisit scheduledVisit) {
    // Get all actual visits for this client on this date
    final actualVisitsForClient = actualVisits.where((visit) {
      final visitDate = visit.startTime;
      final selectedDay = selectedDate.value;
      final isSameDate = visitDate.year == selectedDay.year && visitDate.month == selectedDay.month && visitDate.day == selectedDay.day;
      return isSameDate && visit.clientId == scheduledVisit.clientId;
    }).toList();

    if (actualVisitsForClient.isEmpty) {
      return 'Scheduled'; // No actual visit found for this client
    }

    // Get all scheduled visits for this client on this date
    final scheduledVisitsForClient = scheduledVisitsForDate.where((sv) => sv.clientId == scheduledVisit.clientId).toList();

    // If there's only one scheduled visit for this client, return the status of any actual visit
    if (scheduledVisitsForClient.length == 1) {
      return actualVisitsForClient.first.status.value;
    }

    // Multiple scheduled visits for same client - need to match them up
    // Sort both lists by some criteria (e.g., creation order or plan order)
    scheduledVisitsForClient.sort((a, b) => a.visitPlan.visitPlanId.compareTo(b.visitPlan.visitPlanId));
    actualVisitsForClient.sort((a, b) => a.startTime.compareTo(b.startTime));

    // Find the index of current scheduled visit
    final currentIndex = scheduledVisitsForClient.indexOf(scheduledVisit);

    // If we have a corresponding actual visit at this index, return its status
    if (currentIndex >= 0 && currentIndex < actualVisitsForClient.length) {
      return actualVisitsForClient[currentIndex].status.value;
    }

    // Otherwise, this scheduled visit hasn't been started yet
    return 'Scheduled';
  }

  // Find actual visit for a scheduled visit
  Visit? findActualVisitForScheduled(ScheduledVisit scheduledVisit) {
    final actualVisitsForClient = actualVisits.where((visit) {
      final visitDate = visit.startTime;
      final selectedDay = selectedDate.value;
      final isSameDate = visitDate.year == selectedDay.year && visitDate.month == selectedDay.month && visitDate.day == selectedDay.day;
      return isSameDate && visit.clientId == scheduledVisit.clientId;
    }).toList();

    if (actualVisitsForClient.isEmpty) {
      return null;
    }

    // If there's only one actual visit for this client on this date, return it
    if (actualVisitsForClient.length == 1) {
      return actualVisitsForClient.first;
    }

    // Multiple visits - return the first one (could be improved with better matching logic)
    return actualVisitsForClient.first;
  }

  // Navigate to specific date
  void goToToday() {
    setSelectedDate(DateTime.now());
  }

  void goToPreviousDay() {
    final previous = selectedDate.value.subtract(const Duration(days: 1));
    setSelectedDate(previous);
  }

  void goToNextDay() {
    final next = selectedDate.value.add(const Duration(days: 1));
    setSelectedDate(next);
  }

  // Get current user location for distance calculation
  Future<void> updateCurrentLocation() async {
    try {
      final position = await _getCurrentLocation();
      currentUserLocation.value = position;
    } catch (e) {
      print('Error getting current location for distance calculation: $e');
      // Don't show error to user since this is for enhanced functionality
    }
  }

  // Get distance string for a scheduled visit
  String getDistanceString(ScheduledVisit scheduledVisit) {
    final userLocation = currentUserLocation.value;
    if (userLocation == null) {
      return ''; // Return empty string if no location available
    }

    return scheduledVisit.getDistanceString(
      userLocation.latitude,
      userLocation.longitude,
    );
  }

  // Start visit from scheduled visit
  Future<bool> startVisitFromScheduled(ScheduledVisit scheduledVisit) async {
    try {
      isLoading.value = true;
      errorMessage.value = '';

      // Get current location
      final position = await _getCurrentLocation();
      if (position == null) {
        errorMessage.value = 'Location access is required to start a visit';
        Get.snackbar(
          'Error',
          'Location access is required to start a visit',
          snackPosition: SnackPosition.BOTTOM,
          backgroundColor: Colors.red,
          colorText: Colors.white,
        );
        return false;
      }

      // Get current user ID
      final userId = _authController.currentUser.value?.id;
      if (userId == null) {
        errorMessage.value = 'User not authenticated';
        Get.snackbar(
          'Error',
          'User not authenticated',
          snackPosition: SnackPosition.BOTTOM,
          backgroundColor: Colors.red,
          colorText: Colors.white,
        );
        return false;
      }

      // Start the visit with the scheduled visit purpose
      final purpose = 'Scheduled visit from plan: ${scheduledVisit.planName}';

      await visitRepository.startVisit(
        scheduledVisit.clientId,
        userId,
        position.latitude,
        position.longitude,
        purpose: purpose,
      );

      // Refresh the actual visits data to reflect the new visit
      await loadActualVisitsForDate();

      // Small delay to ensure the visit is properly loaded
      await Future.delayed(const Duration(milliseconds: 200));

      // Find the newly created visit
      Visit? newVisit;
      try {
        newVisit = actualVisits.firstWhere((visit) => visit.clientId == scheduledVisit.clientId && visit.status.value == 'Started');
      } catch (e) {
        // No visit found, try refreshing once more
        await loadActualVisitsForDate();
        try {
          newVisit = actualVisits.firstWhere((visit) => visit.clientId == scheduledVisit.clientId && visit.status.value == 'Started');
        } catch (e) {
          newVisit = null;
        }
      }

      // Update home dashboard visit count if controller exists
      if (Get.isRegistered<HomeController>()) {
        Get.find<HomeController>().incrementVisitCount();
      }

      Get.snackbar(
        'success'.tr,
        'visit_started_successfully'.tr.replaceAll('@clientName', scheduledVisit.clientName),
        snackPosition: SnackPosition.BOTTOM,
        backgroundColor: Colors.green,
        colorText: Colors.white,
      );

      // Navigate directly to the visit details screen if we found the new visit.
      // Use Get.to so the calendar remains in the backstack and can be refreshed
      // when the details page returns (for example after ending the visit).
      if (newVisit != null) {
        // Ensure VisitsController is registered (needed by VisitDetailScreen)
        if (!Get.isRegistered<VisitsController>()) {
          VisitsBinding().dependencies();
        }
        final result = await Get.to(
          () => VisitDetailScreen(visit: newVisit!),
          transition: Transition.rightToLeft,
          duration: const Duration(milliseconds: 300),
        );

        // If the detail screen indicates the visit was ended, refresh calendar
        if (result == true) {
          await refreshVisits();
        }
      } else {
        // Fallback: navigate to dashboard with visits tab selected
        Get.offAllNamed('/dashboard', arguments: 3); // Index 3 is visits tab
      }

      return true;
    } catch (e) {
      errorMessage.value = 'Failed to start visit: ${e.toString()}';
      Get.snackbar(
        'error'.tr,
        'Failed to start visit: ${e.toString()}',
        snackPosition: SnackPosition.BOTTOM,
        backgroundColor: Colors.red,
        colorText: Colors.white,
      );
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  // Get current location
  Future<Position?> _getCurrentLocation() async {
    try {
      // Check if location services are enabled
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        Get.snackbar(
          'Location Services Disabled',
          'Please enable location services in your device settings',
          snackPosition: SnackPosition.BOTTOM,
          backgroundColor: Colors.orange,
          colorText: Colors.white,
        );
        return null;
      }

      // Check for location permission
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          Get.snackbar(
            'Location Permission Denied',
            'Location permission is required to start a visit',
            snackPosition: SnackPosition.BOTTOM,
            backgroundColor: Colors.red,
            colorText: Colors.white,
          );
          return null;
        }
      }

      if (permission == LocationPermission.deniedForever) {
        Get.snackbar(
          'Location Permission Denied Forever',
          'Please enable location permission in settings',
          snackPosition: SnackPosition.BOTTOM,
          backgroundColor: Colors.red,
          colorText: Colors.white,
        );
        return null;
      }

      // Get current position
      return await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 15),
      );
    } catch (e) {
      print('Error getting location: $e');
      Get.snackbar(
        'Location Error',
        'Unable to get your current location. Please try again.',
        snackPosition: SnackPosition.BOTTOM,
        backgroundColor: Colors.red,
        colorText: Colors.white,
      );
      return null;
    }
  }

  // Open Google Maps for navigation to client location
  Future<void> openGoogleMaps(ScheduledVisit scheduledVisit) async {
    final clientLat = scheduledVisit.clientLatitude;
    final clientLng = scheduledVisit.clientLongitude;

    if (clientLat == null || clientLng == null) {
      Get.snackbar(
        'Location Not Available',
        'Client location coordinates are not available for navigation',
        snackPosition: SnackPosition.BOTTOM,
        backgroundColor: Colors.orange,
        colorText: Colors.white,
      );
      return;
    }

    try {
      final userLocation = currentUserLocation.value;
      bool launched = false;

      // Primary approach: Use Google Maps web URL which works reliably
      String mapsUrl;

      if (userLocation != null) {
        // Navigation with directions
        mapsUrl = 'https://www.google.com/maps/dir/?api=1&origin=${userLocation.latitude},${userLocation.longitude}&destination=$clientLat,$clientLng&travelmode=driving';
      } else {
        // Just show location
        mapsUrl = 'https://www.google.com/maps/search/?api=1&query=$clientLat,$clientLng';
      }

      // Try to launch the URL
      final uri = Uri.parse(mapsUrl);
      launched = await launchUrl(uri, mode: LaunchMode.externalApplication);

      if (launched) {
        // Show success message
        Get.snackbar(
          'Navigation',
          'Opening maps for ${scheduledVisit.clientName}',
          snackPosition: SnackPosition.BOTTOM,
          backgroundColor: Colors.green,
          colorText: Colors.white,
          duration: const Duration(seconds: 2),
        );
        return;
      }

      // Fallback 1: Try with different launch mode
      launched = await launchUrl(uri, mode: LaunchMode.platformDefault);

      if (launched) {
        Get.snackbar(
          'Navigation',
          'Opening maps for ${scheduledVisit.clientName}',
          snackPosition: SnackPosition.BOTTOM,
          backgroundColor: Colors.green,
          colorText: Colors.white,
          duration: const Duration(seconds: 2),
        );
        return;
      }

      // Fallback 2: Simple Google Maps URL
      final simpleUrl = 'https://maps.google.com/?q=$clientLat,$clientLng';
      final simpleUri = Uri.parse(simpleUrl);
      launched = await launchUrl(simpleUri, mode: LaunchMode.externalApplication);

      if (launched) {
        Get.snackbar(
          'Location Opened',
          'Client location opened in maps',
          snackPosition: SnackPosition.BOTTOM,
          backgroundColor: Colors.blue,
          colorText: Colors.white,
        );
        return;
      }

      // Final fallback: Open in app webview
      launched = await launchUrl(simpleUri, mode: LaunchMode.inAppWebView);

      if (launched) {
        Get.snackbar(
          'Maps Opened',
          'Location opened in browser. You can navigate from there.',
          snackPosition: SnackPosition.BOTTOM,
          backgroundColor: Colors.blue,
          colorText: Colors.white,
        );
        return;
      }

      // If we get here, nothing worked
      throw Exception('All launch attempts failed');
    } catch (e) {
      print('Error opening maps: $e');

      // Provide helpful error message and alternative
      Get.snackbar(
        'Navigation Error',
        'Could not open maps app. You can manually navigate to coordinates: $clientLat, $clientLng',
        snackPosition: SnackPosition.BOTTOM,
        backgroundColor: Colors.red,
        colorText: Colors.white,
        duration: const Duration(seconds: 5),
      );
    }
  }
}
