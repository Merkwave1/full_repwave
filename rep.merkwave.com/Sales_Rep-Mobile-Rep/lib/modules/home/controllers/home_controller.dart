// lib/modules/home/controllers/home_controller.dart
import 'package:get/get.dart';
import '/modules/shared/controllers/global_data_controller.dart';
import '/modules/attendance/controllers/attendance_controller.dart';

class HomeController extends GetxController {
  // Add any specific state or logic for the Home/Dashboard screen here
  // For example, fetching today's visits summary
  final todayVisitsCount = 0.obs; // Example observable
  final isLoading = false.obs; // Loading state
  bool _attendanceInitialized = false;

  @override
  void onInit() {
    super.onInit();
    fetchTodayVisitsSummary();
  }

  @override
  void onReady() {
    super.onReady();
    _ensureAttendanceStatusLoaded();
  }

  void _ensureAttendanceStatusLoaded() {
    if (_attendanceInitialized) return;
    if (Get.isRegistered<AttendanceController>()) {
      final attendanceController = Get.find<AttendanceController>();
      attendanceController.loadCurrentStatus();
    }
    _attendanceInitialized = true;
  }

  void fetchTodayVisitsSummary() async {
    isLoading.value = true;
    try {
      // TODO: Replace with actual API call to fetch today's visits count
      // For now, simulate fetching data with a more realistic count
      await Future.delayed(const Duration(milliseconds: 500));

      // Simulate realistic visit count (0-8 visits per day is more realistic)
      final currentHour = DateTime.now().hour;
      // Early morning: fewer visits, afternoon: more visits
      int simulatedCount = currentHour < 9
          ? 0
          : currentHour < 12
              ? 2
              : currentHour < 17
                  ? 4
                  : 3;

      todayVisitsCount.value = simulatedCount;
    } catch (e) {
      // Handle error
      todayVisitsCount.value = 0;
    } finally {
      isLoading.value = false;
    }
  }

  // Method to refresh data (can be called from UI)
  void refreshData() {
    fetchTodayVisitsSummary();
    // Also refresh core cached data needed for header (safes, etc.)
    GlobalDataController.instance.ensureCoreDataLoaded(includeSafes: true, includeRepInventory: false);
    _attendanceInitialized = false;
    _ensureAttendanceStatusLoaded();
  }

  // Method to update visit count when a visit is started
  void incrementVisitCount() {
    todayVisitsCount.value += 1;
  }
}
