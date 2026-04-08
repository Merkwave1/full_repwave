// lib/modules/attendance/controllers/attendance_controller.dart

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:geolocator/geolocator.dart';
import '/data/models/attendance.dart';
import '/data/repositories/attendance_repository.dart';
import '/services/location_tracking_service.dart';

class AttendanceController extends GetxController {
  final AttendanceRepository _repository = AttendanceRepository();

  // Observable state
  final Rx<AttendanceStatus?> currentStatus = Rx<AttendanceStatus?>(null);
  final isLoading = false.obs;
  final errorMessage = ''.obs;

  // Timer for live updates
  Timer? _timer;
  final currentWorkDuration = 0.obs;
  final formattedDuration = '00:00:00'.obs;

  // Break reason dialog
  final breakReasonController = TextEditingController();

  @override
  void onInit() {
    super.onInit();
    // Cancel any existing timers immediately on init
    _timer?.cancel();
    print('🔄 AttendanceController initialized, timers cleared');

    // Initialize with default values to prevent null issues
    currentStatus.value = null;
    currentWorkDuration.value = 0;
    formattedDuration.value = '00:00:00';

    loadCurrentStatus();
  }

  @override
  void onClose() {
    _timer?.cancel();
    breakReasonController.dispose();
    super.onClose();
  }

  // Load current attendance status
  Future<void> loadCurrentStatus() async {
    try {
      isLoading.value = true;
      errorMessage.value = '';

      // FIRST: Cancel any existing timer immediately to prevent conflicts
      _timer?.cancel();
      // print('🛑 Timer cancelled before loading new status');

      final status = await _repository.getCurrentStatus();

      // print('📊 Status loaded: ${status.attendance?.attendanceStatus}, Duration: ${status.attendance?.totalWorkDurationSec}s');

      // Update current status FIRST
      currentStatus.value = status;

      _notifyLocationTracking(status.attendance?.attendanceStatus);

      // THEN: Start timer ONLY if actively working (ClockedIn)
      // Stop timer when paused - just display the current duration
      if (status.attendance?.attendanceStatus == 'ClockedIn') {
        // print('▶️ Starting timer from: ${status.attendance!.totalWorkDurationSec}s');
        _startTimer(status.attendance!.totalWorkDurationSec);
      } else {
        // print('⏸️ Not starting timer, status: ${status.attendance?.attendanceStatus}');
        // Make sure timer is cancelled and update duration without triggering timer
        currentWorkDuration.value = status.attendance?.totalWorkDurationSec ?? 0;
        _updateFormattedDurationWithoutTimer();
      }

      // Update attendance button after status change
      update(['attendance_button']);

      // Force refresh all observables
      currentStatus.refresh();
      formattedDuration.refresh();
      currentWorkDuration.refresh();

      // print('🔄 Status loaded and UI updated: ${status.attendance?.attendanceStatus}');
    } catch (e) {
      errorMessage.value = e.toString();
      Get.snackbar(
        'Error',
        e.toString(),
        backgroundColor: Colors.red.withOpacity(0.1),
        colorText: Colors.red,
        snackPosition: SnackPosition.BOTTOM,
      );
    } finally {
      isLoading.value = false;
    }
  }

  // Start timer for live duration updates
  void _startTimer(int initialDuration) {
    print('🏁 Starting timer with initial duration: ${initialDuration}s');

    // Cancel any existing timer first
    _timer?.cancel();

    currentWorkDuration.value = initialDuration;
    _updateFormattedDurationWithoutTimer(); // Update initial display without timer logging

    print('🏃‍♂️ Timer started! Initial duration: ${initialDuration}s, Formatted: ${formattedDuration.value}');

    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      currentWorkDuration.value++;
      _updateFormattedDuration(); // This will trigger UI updates and logging
      // print('⏰ Timer tick: ${currentWorkDuration.value}s - ${formattedDuration.value}');
    });
  }

  // Update formatted duration string (called by timer)
  void _updateFormattedDuration() {
    final duration = currentWorkDuration.value;
    final hours = duration ~/ 3600;
    final minutes = (duration % 3600) ~/ 60;
    final seconds = duration % 60;
    formattedDuration.value = '${hours.toString().padLeft(2, '0')}:${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';

    // Force refresh to ensure UI updates
    formattedDuration.refresh();

    // Update GetBuilder widgets with attendance_button ID
    update(['attendance_button']);

    // Debug: Print every 5 seconds to verify timer is running
    if (duration % 5 == 0) {
      // print('⏱️ Timer running: ${formattedDuration.value}');
    }
  }

  // Update formatted duration string WITHOUT triggering timer updates (for status loading)
  void _updateFormattedDurationWithoutTimer() {
    final duration = currentWorkDuration.value;
    final hours = duration ~/ 3600;
    final minutes = (duration % 3600) ~/ 60;
    final seconds = duration % 60;
    formattedDuration.value = '${hours.toString().padLeft(2, '0')}:${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';

    // Force refresh to ensure UI updates
    formattedDuration.refresh();

    // print('📝 Duration updated without timer: ${formattedDuration.value}');
  }

  void _applyLocalAttendanceState({
    required String attendanceStatus,
    bool? hasActiveSession,
    bool? canStartWork,
    bool? canPauseWork,
    bool? canResumeWork,
    bool? canEndWork,
    bool? showDashboard,
  }) {
    final existingStatus = currentStatus.value;
    final existingAttendance = existingStatus?.attendance;

    final baseAttendance = existingAttendance ??
        Attendance(
          attendanceId: existingAttendance?.attendanceId ?? 0,
          userId: existingAttendance?.userId ?? 0,
          attendanceDate: existingAttendance?.attendanceDate ?? DateTime.now().toIso8601String(),
          shiftStartTime: existingAttendance?.shiftStartTime,
          shiftEndTime: existingAttendance?.shiftEndTime,
          attendanceStatus: attendanceStatus,
          totalWorkDurationSec: currentWorkDuration.value,
          totalWorkDurationFormatted: formattedDuration.value,
          startLatitude: existingAttendance?.startLatitude,
          startLongitude: existingAttendance?.startLongitude,
          endLatitude: existingAttendance?.endLatitude,
          endLongitude: existingAttendance?.endLongitude,
        );

    final updatedAttendance = baseAttendance.copyWith(
      attendanceStatus: attendanceStatus,
      totalWorkDurationSec: currentWorkDuration.value,
      totalWorkDurationFormatted: formattedDuration.value,
    );

    final baseStatus = existingStatus ??
        AttendanceStatus(
          hasActiveSession: hasActiveSession ?? (attendanceStatus == 'ClockedIn' || attendanceStatus == 'Paused'),
          attendance: updatedAttendance,
          breakLogs: const [],
          canStartWork: canStartWork ?? attendanceStatus == 'NotStarted',
          canPauseWork: canPauseWork ?? attendanceStatus == 'ClockedIn',
          canResumeWork: canResumeWork ?? attendanceStatus == 'Paused',
          canEndWork: canEndWork ?? (attendanceStatus == 'ClockedIn' || attendanceStatus == 'Paused'),
          showDashboard: showDashboard ?? true,
        );

    final newStatus = baseStatus.copyWith(
      hasActiveSession: hasActiveSession ?? baseStatus.hasActiveSession,
      attendance: updatedAttendance,
      canStartWork: canStartWork ?? baseStatus.canStartWork,
      canPauseWork: canPauseWork ?? baseStatus.canPauseWork,
      canResumeWork: canResumeWork ?? baseStatus.canResumeWork,
      canEndWork: canEndWork ?? baseStatus.canEndWork,
      showDashboard: showDashboard ?? baseStatus.showDashboard,
    );

    // Debug: Print the status change
    // print('🔄 Local state updated: $attendanceStatus');

    // Force update by triggering change detection
    currentStatus.value = newStatus;
    currentStatus.refresh();

    // Update GetBuilder widgets with attendance_button ID
    update(['attendance_button']);

    _notifyLocationTracking(attendanceStatus);
  }

  void _refreshStatusWithDelay([Duration delay = const Duration(milliseconds: 600)]) {
    Future.delayed(delay, () async {
      try {
        await loadCurrentStatus();
      } catch (_) {
        // Ignore refresh errors; state will be retried on next manual action
      }
    });
  }

  void _notifyLocationTracking(String? status) {
    if (!Get.isRegistered<LocationTrackingService>()) {
      return;
    }

    try {
      final trackingService = Get.find<LocationTrackingService>();
      trackingService.handleAttendanceStatus(status);
    } catch (_) {}
  }

  // Get current location
  Future<Map<String, double>?> _getCurrentLocation() async {
    try {
      // Check and request permission
      LocationPermission permission = await Geolocator.checkPermission();

      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          Get.snackbar(
            'Permission Required',
            'Location permission is required for attendance tracking',
            backgroundColor: Colors.orange.withOpacity(0.1),
            colorText: Colors.orange,
            snackPosition: SnackPosition.BOTTOM,
          );
          return null;
        }
      }

      if (permission == LocationPermission.deniedForever) {
        Get.snackbar(
          'Permission Required',
          'Location permissions are permanently denied. Please enable in settings.',
          backgroundColor: Colors.red.withOpacity(0.1),
          colorText: Colors.red,
          snackPosition: SnackPosition.BOTTOM,
        );
        return null;
      }

      // Get current position
      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          distanceFilter: 0,
        ),
      );

      return {
        'latitude': position.latitude,
        'longitude': position.longitude,
      };
    } catch (e) {
      Get.snackbar(
        'Location Error',
        'Failed to get current location: $e',
        backgroundColor: Colors.red.withOpacity(0.1),
        colorText: Colors.red,
        snackPosition: SnackPosition.BOTTOM,
      );
      return null;
    }
  }

  // Start work
  Future<void> startWork() async {
    try {
      isLoading.value = true;
      errorMessage.value = '';

      // Show loading dialog with better styling
      Get.dialog(
        WillPopScope(
          onWillPop: () async => false,
          child: Center(
            child: Material(
              color: Colors.transparent,
              child: Container(
                margin: const EdgeInsets.symmetric(horizontal: 40),
                padding: const EdgeInsets.all(32),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.2),
                      blurRadius: 20,
                      offset: const Offset(0, 10),
                    ),
                  ],
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const CircularProgressIndicator(
                      valueColor: AlwaysStoppedAnimation<Color>(Colors.green),
                      strokeWidth: 3,
                    ),
                    const SizedBox(height: 24),
                    Text(
                      'starting_work'.tr,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: Colors.black87,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
        barrierDismissible: false,
      );

      final location = await _getCurrentLocation();
      if (location == null) {
        Get.back(); // Close loading dialog
        return;
      }

      await _repository.startWork(
        latitude: location['latitude']!,
        longitude: location['longitude']!,
      );

      Get.back(); // Close loading dialog

      Get.snackbar(
        'success'.tr,
        'work_started_successfully'.tr,
        backgroundColor: Colors.green.withOpacity(0.1),
        colorText: Colors.green,
        snackPosition: SnackPosition.BOTTOM,
        duration: const Duration(seconds: 2),
      );

      // Reset duration and apply local state FIRST
      currentWorkDuration.value = 0;
      _updateFormattedDuration();

      _applyLocalAttendanceState(
        attendanceStatus: 'ClockedIn',
        hasActiveSession: true,
        canStartWork: false,
        canPauseWork: true,
        canResumeWork: false,
        canEndWork: true,
        showDashboard: true,
      );

      // THEN start timer
      _startTimer(0);

      _refreshStatusWithDelay();
    } catch (e) {
      Get.back(); // Close loading dialog if still open

      errorMessage.value = e.toString();

      // Parse the error message
      String errorMsg = e.toString();
      String title = 'error'.tr;
      String message = errorMsg;

      // Check if it's a location error
      if (errorMsg.contains('designated work location') || errorMsg.contains('Distance:')) {
        title = 'location_error'.tr;

        // Extract distance if available
        final distanceMatch = RegExp(r'Distance:\s*(\d+\.?\d*)m').firstMatch(errorMsg);
        if (distanceMatch != null) {
          final distanceMeters = double.parse(distanceMatch.group(1)!);
          String distanceText;

          if (distanceMeters >= 1000) {
            distanceText = '${(distanceMeters / 1000).toStringAsFixed(2)} km';
          } else {
            distanceText = '${distanceMeters.toStringAsFixed(0)} m';
          }

          message = 'not_at_work_location'.tr + '\n' + 'distance_from_location'.tr.replaceAll('@distance', distanceText);
        } else {
          message = 'not_at_work_location'.tr;
        }
      }

      Get.snackbar(
        title,
        message,
        backgroundColor: Colors.red.withOpacity(0.1),
        colorText: Colors.red,
        snackPosition: SnackPosition.BOTTOM,
        duration: const Duration(seconds: 4),
      );
    } finally {
      isLoading.value = false;
    }
  }

  // Show pause dialog with reason
  Future<void> showPauseDialog() async {
    breakReasonController.clear();

    final result = await Get.dialog<bool>(
      AlertDialog(
        title: Text('pause_work'.tr),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('why_pausing_work'.tr),
            const SizedBox(height: 16),
            TextField(
              controller: breakReasonController,
              decoration: InputDecoration(
                labelText: 'reason_optional'.tr,
                border: const OutlineInputBorder(),
                hintText: 'break_reason_hint'.tr,
              ),
              maxLines: 2,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Get.back(result: false),
            child: Text('cancel'.tr),
          ),
          ElevatedButton(
            onPressed: () => Get.back(result: true),
            child: Text('pause'.tr),
          ),
        ],
      ),
    );

    if (result == true) {
      await pauseWork();
    }
  }

  // Pause work
  Future<void> pauseWork() async {
    try {
      // Show loading dialog with better styling
      Get.dialog(
        WillPopScope(
          onWillPop: () async => false,
          child: Center(
            child: Material(
              color: Colors.transparent,
              child: Container(
                margin: const EdgeInsets.symmetric(horizontal: 40),
                padding: const EdgeInsets.all(32),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.2),
                      blurRadius: 20,
                      offset: const Offset(0, 10),
                    ),
                  ],
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const CircularProgressIndicator(
                      valueColor: AlwaysStoppedAnimation<Color>(Colors.orange),
                      strokeWidth: 3,
                    ),
                    const SizedBox(height: 24),
                    Text(
                      'pausing_work'.tr,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: Colors.black87,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
        barrierDismissible: false,
      );

      isLoading.value = true;
      errorMessage.value = '';

      final location = await _getCurrentLocation();
      if (location == null) {
        Get.back(); // Close loading dialog
        return;
      }

      await _repository.pauseWork(
        latitude: location['latitude']!,
        longitude: location['longitude']!,
        reason: breakReasonController.text.trim().isNotEmpty ? breakReasonController.text.trim() : null,
      );

      // Close loading dialog
      Get.back();

      Get.snackbar(
        'success'.tr,
        'work_paused_successfully'.tr,
        backgroundColor: Colors.orange.withOpacity(0.1),
        colorText: Colors.orange,
        snackPosition: SnackPosition.BOTTOM,
        duration: const Duration(seconds: 2),
      );

      _timer?.cancel();
      _applyLocalAttendanceState(
        attendanceStatus: 'Paused',
        hasActiveSession: true,
        canStartWork: false,
        canPauseWork: false,
        canResumeWork: true,
        canEndWork: true,
        showDashboard: true,
      );

      _refreshStatusWithDelay();
    } catch (e) {
      // Close loading dialog if open
      if (Get.isDialogOpen ?? false) Get.back();

      errorMessage.value = e.toString();

      // Parse the error message for better display
      String title = 'error'.tr;
      String message = e.toString();

      // Check if it's a location error
      if (message.contains('Distance:')) {
        title = 'location_error'.tr;

        // Extract distance and format it
        final distanceRegex = RegExp(r'Distance:\s*(\d+\.?\d*)m');
        final distanceMatch = distanceRegex.firstMatch(message);

        if (distanceMatch != null) {
          final distanceMeters = double.parse(distanceMatch.group(1)!);
          String distanceText;

          if (distanceMeters >= 1000) {
            distanceText = '${(distanceMeters / 1000).toStringAsFixed(2)} km';
          } else {
            distanceText = '${distanceMeters.toStringAsFixed(0)} m';
          }

          message = 'not_at_work_location'.tr + '\n' + 'distance_from_location'.tr.replaceAll('@distance', distanceText);
        } else {
          message = 'not_at_work_location'.tr;
        }
      }

      Get.snackbar(
        title,
        message,
        backgroundColor: Colors.red.withOpacity(0.1),
        colorText: Colors.red,
        snackPosition: SnackPosition.BOTTOM,
        duration: const Duration(seconds: 4),
      );
    } finally {
      isLoading.value = false;
    }
  }

  // Resume work
  Future<void> resumeWork() async {
    try {
      isLoading.value = true;
      errorMessage.value = '';

      // Show loading dialog with better styling
      Get.dialog(
        WillPopScope(
          onWillPop: () async => false,
          child: Center(
            child: Material(
              color: Colors.transparent,
              child: Container(
                margin: const EdgeInsets.symmetric(horizontal: 40),
                padding: const EdgeInsets.all(32),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.2),
                      blurRadius: 20,
                      offset: const Offset(0, 10),
                    ),
                  ],
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const CircularProgressIndicator(
                      valueColor: AlwaysStoppedAnimation<Color>(Colors.blue),
                      strokeWidth: 3,
                    ),
                    const SizedBox(height: 24),
                    Text(
                      'resuming_work'.tr,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: Colors.black87,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
        barrierDismissible: false,
      );

      final location = await _getCurrentLocation();
      if (location == null) {
        Get.back(); // Close loading dialog
        return;
      }

      await _repository.resumeWork(
        latitude: location['latitude']!,
        longitude: location['longitude']!,
      );

      Get.back(); // Close loading dialog

      Get.snackbar(
        'success'.tr,
        'work_resumed_successfully'.tr,
        backgroundColor: Colors.green.withOpacity(0.1),
        colorText: Colors.green,
        snackPosition: SnackPosition.BOTTOM,
        duration: const Duration(seconds: 2),
      );

      // Apply local state FIRST to update UI immediately
      _applyLocalAttendanceState(
        attendanceStatus: 'ClockedIn',
        hasActiveSession: true,
        canStartWork: false,
        canPauseWork: true,
        canResumeWork: false,
        canEndWork: true,
        showDashboard: true,
      );

      // THEN start timer from current duration
      _startTimer(currentWorkDuration.value);

      _refreshStatusWithDelay();
    } catch (e) {
      Get.back(); // Close loading dialog if still open

      errorMessage.value = e.toString();

      // Parse the error message
      String errorMsg = e.toString();
      String title = 'error'.tr;
      String message = errorMsg;

      // Check if it's a location error
      if (errorMsg.contains('designated work location') || errorMsg.contains('Distance:')) {
        title = 'location_error'.tr;

        // Extract distance if available
        final distanceMatch = RegExp(r'Distance:\s*(\d+\.?\d*)m').firstMatch(errorMsg);
        if (distanceMatch != null) {
          final distanceMeters = double.parse(distanceMatch.group(1)!);
          String distanceText;

          if (distanceMeters >= 1000) {
            distanceText = '${(distanceMeters / 1000).toStringAsFixed(2)} km';
          } else {
            distanceText = '${distanceMeters.toStringAsFixed(0)} m';
          }

          message = 'not_at_work_location'.tr + '\n' + 'distance_from_location'.tr.replaceAll('@distance', distanceText);
        } else {
          message = 'not_at_work_location'.tr;
        }
      }

      Get.snackbar(
        title,
        message,
        backgroundColor: Colors.red.withOpacity(0.1),
        colorText: Colors.red,
        snackPosition: SnackPosition.BOTTOM,
        duration: const Duration(seconds: 4),
      );
    } finally {
      isLoading.value = false;
    }
  }

  // Show end work confirmation
  Future<void> showEndWorkDialog() async {
    final result = await Get.dialog<bool>(
      AlertDialog(
        title: Text('end_work_day'.tr),
        content: Text(
          '${' end_work_confirmation'.tr}\n\n${'total_work_duration'.tr}: ${formattedDuration.value}',
        ),
        actions: [
          TextButton(
            onPressed: () => Get.back(result: false),
            child: Text('cancel'.tr),
          ),
          ElevatedButton(
            onPressed: () => Get.back(result: true),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
            ),
            child: Text('end_work'.tr),
          ),
        ],
      ),
    );

    if (result == true) {
      await endWork();
    }
  }

  // End work
  Future<void> endWork() async {
    try {
      // Show loading dialog with better styling
      Get.dialog(
        WillPopScope(
          onWillPop: () async => false,
          child: Center(
            child: Material(
              color: Colors.transparent,
              child: Container(
                margin: const EdgeInsets.symmetric(horizontal: 40),
                padding: const EdgeInsets.all(32),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.2),
                      blurRadius: 20,
                      offset: const Offset(0, 10),
                    ),
                  ],
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const CircularProgressIndicator(
                      valueColor: AlwaysStoppedAnimation<Color>(Colors.red),
                      strokeWidth: 3,
                    ),
                    const SizedBox(height: 24),
                    Text(
                      'ending_work'.tr,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: Colors.black87,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
        barrierDismissible: false,
      );

      isLoading.value = true;
      errorMessage.value = '';

      final location = await _getCurrentLocation();
      if (location == null) {
        Get.back(); // Close loading dialog
        return;
      }

      await _repository.endWork(
        latitude: location['latitude']!,
        longitude: location['longitude']!,
      );

      // Close loading dialog
      Get.back();

      Get.snackbar(
        'success'.tr,
        'work_ended_successfully'.tr,
        backgroundColor: Colors.blue.withOpacity(0.1),
        colorText: Colors.blue,
        snackPosition: SnackPosition.BOTTOM,
        duration: const Duration(seconds: 2),
      );

      _timer?.cancel();
      _applyLocalAttendanceState(
        attendanceStatus: 'ClockedOut',
        hasActiveSession: false,
        canStartWork: false,
        canPauseWork: false,
        canResumeWork: false,
        canEndWork: false,
        showDashboard: true,
      );

      _refreshStatusWithDelay(const Duration(seconds: 1));
    } catch (e) {
      // Close loading dialog if open
      if (Get.isDialogOpen ?? false) Get.back();

      errorMessage.value = e.toString();

      // Parse the error message for better display
      String title = 'error'.tr;
      String message = e.toString();

      // Check if it's a location error
      if (message.contains('Distance:')) {
        title = 'location_error'.tr;

        // Extract distance and format it
        final distanceRegex = RegExp(r'Distance:\s*(\d+\.?\d*)m');
        final distanceMatch = distanceRegex.firstMatch(message);

        if (distanceMatch != null) {
          final distanceMeters = double.parse(distanceMatch.group(1)!);
          String distanceText;

          if (distanceMeters >= 1000) {
            distanceText = '${(distanceMeters / 1000).toStringAsFixed(2)} km';
          } else {
            distanceText = '${distanceMeters.toStringAsFixed(0)} m';
          }

          message = 'not_at_work_location'.tr + '\n' + 'distance_from_location'.tr.replaceAll('@distance', distanceText);
        } else {
          message = 'not_at_work_location'.tr;
        }
      }

      Get.snackbar(
        title,
        message,
        backgroundColor: Colors.red.withOpacity(0.1),
        colorText: Colors.red,
        snackPosition: SnackPosition.BOTTOM,
        duration: const Duration(seconds: 4),
      );
    } finally {
      isLoading.value = false;
    }
  }

  // Refresh status
  @override
  Future<void> refresh() async {
    await loadCurrentStatus();
  }
}
