// lib/modules/visits/bindings/visits_calendar_binding.dart
import 'package:get/get.dart';
import '/modules/visits/controllers/visits_calendar_controller.dart';
import '/data/repositories/visit_plan_repository.dart';
import '/data/repositories/visit_repository.dart';
import '/data/datasources/visit_plan_remote_datasource.dart';
import '/data/datasources/visit_remote_datasource.dart';
import '/services/api_service.dart';

class VisitsCalendarBinding extends Bindings {
  @override
  void dependencies() {
    // Register ApiService if not already registered
    if (!Get.isRegistered<ApiService>()) {
      Get.put<ApiService>(ApiService());
    }

    // Register Visit Plan dependencies
    Get.lazyPut<VisitPlanRemoteDatasource>(
      () => VisitPlanRemoteDatasource(apiService: Get.find<ApiService>()),
    );

    Get.lazyPut<VisitPlanRepository>(
      () => VisitPlanRepository(remoteDatasource: Get.find<VisitPlanRemoteDatasource>()),
    );

    // Register Visit dependencies if not already registered
    if (!Get.isRegistered<VisitRemoteDatasource>()) {
      Get.lazyPut<VisitRemoteDatasource>(
        () => VisitRemoteDatasource(Get.find<ApiService>()),
      );
    }

    if (!Get.isRegistered<VisitRepository>()) {
      Get.lazyPut<VisitRepository>(
        () => VisitRepository(remoteDatasource: Get.find<VisitRemoteDatasource>()),
      );
    }

    // Register the controller
    Get.lazyPut<VisitsCalendarController>(
      () => VisitsCalendarController(
        visitPlanRepository: Get.find<VisitPlanRepository>(),
        visitRepository: Get.find<VisitRepository>(),
      ),
    );
  }
}
