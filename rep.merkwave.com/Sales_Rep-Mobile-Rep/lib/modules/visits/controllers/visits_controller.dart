// lib/modules/visits/controllers/visits_controller.dart
import 'dart:async';
import 'package:get/get.dart';
import '/shared_widgets/app_notifier.dart';
import 'package:geolocator/geolocator.dart';
import '/data/models/visit.dart';
import '/data/models/client.dart';
import '/data/repositories/visit_repository.dart';
import '/data/repositories/client_repository.dart';
import '/modules/auth/controllers/auth_controller.dart';
import '/modules/shared/controllers/global_data_controller.dart';

class VisitsController extends GetxController {
  final VisitRepository visitRepository;
  final ClientRepository clientRepository;
  final GlobalDataController _globalDataController = Get.find<GlobalDataController>();

  VisitsController({required this.visitRepository, required this.clientRepository});

  // Observable variables for visits list
  final RxBool isLoading = false.obs;
  final RxBool isLoadingMore = false.obs;
  final RxString errorMessage = ''.obs;
  final RxList<Visit> visits = <Visit>[].obs;

  // Get clients from global cache instead of local list
  List<Client> get clients => _globalDataController.clients;

  // Current active visit
  final Rxn<Visit> currentVisit = Rxn<Visit>();
  final RxBool isVisitActive = false.obs;

  // Timer for live duration updates
  Timer? _durationTimer;
  final RxString currentVisitDuration = ''.obs;

  // Pagination
  final RxInt currentPage = 1.obs;
  final RxBool hasMoreData = true.obs;
  final int pageSize = 20;

  // Filters
  final RxString selectedStatus = 'All'.obs;
  final Rxn<Client> selectedClient = Rxn<Client>();
  final Rxn<DateTime> startDateFilter = Rxn<DateTime>();
  final Rxn<DateTime> endDateFilter = Rxn<DateTime>();

  // Auth controller reference
  final AuthController _authController = Get.find<AuthController>();

  @override
  void onInit() {
    super.onInit();
    loadInitialData();
  }

  @override
  void onClose() {
    _stopDurationTimer();
    super.onClose();
  }

  void _startDurationTimer() {
    _stopDurationTimer();
    _durationTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (currentVisit.value != null) {
        currentVisitDuration.value = currentVisit.value!.getCurrentDuration();
      }
    });
  }

  void _stopDurationTimer() {
    _durationTimer?.cancel();
    _durationTimer = null;
  }

  void loadInitialData() async {
    // Load clients from cache if empty, otherwise use cached data
    if (_globalDataController.clients.isEmpty) {
      await _globalDataController.loadClients();
    }
    await loadVisits(refresh: true);
    checkActiveVisit();
  }

  // Remove the redundant loadClients method as we now use GlobalDataController

  Future<void> loadVisits({bool refresh = false}) async {
    try {
      if (refresh) {
        isLoading.value = true;
        currentPage.value = 1;
        hasMoreData.value = true;
        visits.clear();
      } else {
        isLoadingMore.value = true;
      }

      errorMessage.value = '';

      final visitsList = await visitRepository.getAllVisits(
        page: currentPage.value,
        limit: pageSize,
        status: selectedStatus.value == 'All' ? null : selectedStatus.value,
        clientId: selectedClient.value?.id,
        startDate: startDateFilter.value?.toIso8601String().split('T')[0],
        endDate: endDateFilter.value?.toIso8601String().split('T')[0],
      );

      if (visitsList.length < pageSize) {
        hasMoreData.value = false;
      }

      if (refresh) {
        visits.assignAll(visitsList);
      } else {
        visits.addAll(visitsList);
      }

      currentPage.value++;

      // Check for active visits after loading
      if (refresh) {
        checkActiveVisit();
      }
    } catch (e) {
      errorMessage.value = 'Failed to load visits: ${e.toString()}';
      print('Error loading visits: $e');
    } finally {
      isLoading.value = false;
      isLoadingMore.value = false;
    }
  }

  void loadMoreVisits() {
    if (!isLoadingMore.value && hasMoreData.value) {
      loadVisits();
    }
  }

  void refreshVisits() {
    loadVisits(refresh: true);
  }

  void applyFilters() {
    loadVisits(refresh: true);
  }

  void clearFilters() {
    selectedStatus.value = 'All';
    selectedClient.value = null;
    startDateFilter.value = null;
    endDateFilter.value = null;
    loadVisits(refresh: true);
  }

  void checkActiveVisit() {
    // Check if there's an active visit
    final activeVisit = visits.firstWhereOrNull((visit) => visit.status.value == 'Started');
    if (activeVisit != null) {
      currentVisit.value = activeVisit;
      isVisitActive.value = true;
      // Start the timer for live duration updates
      _startDurationTimer();
    } else {
      currentVisit.value = null;
      isVisitActive.value = false;
      // Stop the timer if no active visit
      _stopDurationTimer();
    }
  }

  Future<bool> startVisit(Client client, {String? purpose}) async {
    try {
      isLoading.value = true;
      errorMessage.value = '';

      // Get current location
      final position = await getCurrentLocation();
      if (position == null) {
        errorMessage.value = 'location_access_required_start_visit'.tr;
        return false;
      }

      // Get current user ID
      final userId = _authController.currentUser.value?.id;
      if (userId == null) {
        errorMessage.value = 'user_not_authenticated'.tr;
        return false;
      }

      final visit = await visitRepository.startVisit(
        client.id,
        userId,
        position.latitude,
        position.longitude,
        purpose: purpose ?? 'General visit',
      );

      // Populate the client information in the visit object
      visit.client = client;

      currentVisit.value = visit;
      isVisitActive.value = true;

      // Start the duration timer for live updates
      _startDurationTimer();

      AppNotifier.success('visit_started_successfully'.trParams({'clientName': client.companyName}));

      // Refresh visits list after a short delay to ensure the server has processed the new visit
      await Future.delayed(Duration(milliseconds: 500));
      await loadVisits(refresh: true);

      return true;
    } catch (e) {
      // Extract clean error message (remove 'Exception: ' prefix if present)
      String cleanError = e.toString();
      if (cleanError.startsWith('Exception: ')) {
        cleanError = cleanError.substring('Exception: '.length);
      }
      errorMessage.value = cleanError;
      AppNotifier.error(cleanError);
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  Future<bool> endVisit(String outcome, String notes) async {
    try {
      if (currentVisit.value == null) {
        errorMessage.value = 'no_active_visit_to_end'.tr;
        return false;
      }

      isLoading.value = true;
      errorMessage.value = '';

      // Get current location
      final position = await getCurrentLocation();
      if (position == null) {
        errorMessage.value = 'location_access_required_end_visit'.tr;
        return false;
      }

      await visitRepository.endVisit(
        currentVisit.value!.id!,
        position.latitude,
        position.longitude,
        outcome,
        notes,
      );

      currentVisit.value = null;
      isVisitActive.value = false;

      // Stop the duration timer
      _stopDurationTimer();

      // Refresh visits list after a short delay to ensure the server has processed the end visit
      await Future.delayed(Duration(milliseconds: 500));
      await loadVisits(refresh: true);

      return true;
    } catch (e) {
      // Extract clean error message (remove 'Exception: ' prefix if present)
      String cleanError = e.toString();
      if (cleanError.startsWith('Exception: ')) {
        cleanError = cleanError.substring('Exception: '.length);
      }
      errorMessage.value = cleanError;
      AppNotifier.error(cleanError);
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  Future<void> addVisitActivity(int visitId, String activityType, String description, {int? referenceId}) async {
    try {
      await visitRepository.addVisitActivity(visitId, activityType, description, referenceId: referenceId);
    } catch (e) {
      print('Error adding visit activity: $e');
    }
  }

  Future<List<Map<String, dynamic>>> getVisitActivities(int visitId) async {
    try {
      return await visitRepository.getVisitActivities(visitId);
    } catch (e) {
      print('Error fetching visit activities: $e');
      return [];
    }
  }

  Future<Position?> getCurrentLocation() async {
    try {
      // Check if location services are enabled
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        AppNotifier.warning('enable_location_services_message'.tr, title: 'location_services_disabled'.tr);
        throw Exception('Location services are disabled');
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          AppNotifier.error('location_permission_required_message'.tr, title: 'location_permission_denied'.tr);
          throw Exception('Location permissions are denied');
        }
      }

      if (permission == LocationPermission.deniedForever) {
        AppNotifier.error('location_permission_settings_message'.tr, title: 'location_permission_permanently_denied'.tr);
        throw Exception('Location permissions are permanently denied');
      }

      // Get current position with timeout
      Position position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      ).timeout(Duration(seconds: 30));

      print('Location obtained: ${position.latitude}, ${position.longitude}');
      return position;
    } catch (e) {
      print('Error getting location: $e');
      AppNotifier.error('failed_to_get_current_location'.trParams({'error': e.toString()}), title: 'location_error'.tr);
      return null;
    }
  }

  String getStatusColor(String status) {
    switch (status) {
      case 'Started':
        return '0xFF4CAF50'; // Green
      case 'Completed':
        return '0xFF2196F3'; // Blue
      case 'Cancelled':
        return '0xFFF44336'; // Red
      default:
        return '0xFF9E9E9E'; // Grey
    }
  }

  String getActivityTypeDisplayName(String activityType) {
    switch (activityType) {
      case 'SalesOrder_Created':
        return 'Sales Order Created';
      case 'SalesInvoice_Created':
        return 'Sales Invoice Created';
      case 'Payment_Collected':
        return 'Payment Collected';
      case 'Return_Initiated':
        return 'Return Initiated';
      case 'Document_Uploaded':
        return 'Document Uploaded';
      case 'Photo_Before':
        return 'Photo Before';
      case 'Photo_After':
        return 'Photo After';
      case 'Client_Note_Added':
        return 'Note Added';
      default:
        return activityType;
    }
  }
}
