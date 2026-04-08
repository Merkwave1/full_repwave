// lib/data/datasources/visit_plan_remote_datasource.dart
import '/data/models/visit_plan.dart';
import '/data/models/visit_day_overview.dart';
import '/services/api_service.dart';

class VisitPlanRemoteDatasource {
  final ApiService apiService;

  VisitPlanRemoteDatasource({required this.apiService});

  Future<List<VisitPlan>> getAllVisitPlans({
    String? visitPlanStatus,
    int? userId,
  }) async {
    try {
      final response = await apiService.getVisitPlans(
        visitPlanStatus: visitPlanStatus,
        userId: userId,
      );

      if (response['status'] == 'success') {
        final List<dynamic> plansData = response['data'] ?? [];
        return plansData.map((planJson) => VisitPlan.fromJson(planJson)).toList();
      } else {
        throw Exception(response['message'] ?? 'Failed to fetch visit plans');
      }
    } catch (e) {
      print('Error in getAllVisitPlans: $e');
      rethrow;
    }
  }

  Future<VisitPlan> getVisitPlanDetail(int visitPlanId) async {
    try {
      final response = await apiService.getVisitPlanDetail(visitPlanId);

      if (response['status'] == 'success') {
        final Map<String, dynamic> planData = response['data'] ?? {};
        return VisitPlan.fromJson(planData);
      } else {
        throw Exception(response['message'] ?? 'Failed to fetch visit plan details');
      }
    } catch (e) {
      print('Error in getVisitPlanDetail: $e');
      rethrow;
    }
  }

  Future<VisitDayOverview> getVisitDayOverview({
    required DateTime date,
    bool includeVisitPlans = true,
    String? visitPlanStatus,
    int? userId,
    String? status,
    int? clientId,
    int? limit,
  }) async {
    try {
      final response = await apiService.getVisitDayOverview(
        date: date,
        includeVisitPlans: includeVisitPlans,
        visitPlanStatus: visitPlanStatus,
        userId: userId,
        status: status,
        clientId: clientId,
        limit: limit,
      );

      if (response['status'] == 'success') {
        final data = response['data'];
        if (data is Map<String, dynamic>) {
          return VisitDayOverview.fromJson(data);
        }
        throw Exception('Unexpected response format for visit overview.');
      } else {
        throw Exception(response['message'] ?? 'Failed to fetch visit overview');
      }
    } catch (e) {
      print('Error in getVisitDayOverview: $e');
      rethrow;
    }
  }
}
