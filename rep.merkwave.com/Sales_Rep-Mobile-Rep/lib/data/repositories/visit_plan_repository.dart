// lib/data/repositories/visit_plan_repository.dart
import '/data/datasources/visit_plan_remote_datasource.dart';
import '/data/models/visit_plan.dart';
import '/data/models/visit_day_overview.dart';

class VisitPlanRepository {
  final VisitPlanRemoteDatasource remoteDatasource;

  VisitPlanRepository({required this.remoteDatasource});

  Future<List<VisitPlan>> getAllVisitPlans({
    String? visitPlanStatus,
    int? userId,
  }) async {
    return await remoteDatasource.getAllVisitPlans(
      visitPlanStatus: visitPlanStatus,
      userId: userId,
    );
  }

  Future<VisitPlan> getVisitPlanDetail(int visitPlanId) async {
    return await remoteDatasource.getVisitPlanDetail(visitPlanId);
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
    return await remoteDatasource.getVisitDayOverview(
      date: date,
      includeVisitPlans: includeVisitPlans,
      visitPlanStatus: visitPlanStatus,
      userId: userId,
      status: status,
      clientId: clientId,
      limit: limit,
    );
  }
}
