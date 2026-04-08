// lib/data/repositories/visit_repository.dart
import '/data/datasources/visit_remote_datasource.dart';
import '/data/models/visit.dart';

class VisitRepository {
  final VisitRemoteDatasource remoteDatasource;

  VisitRepository({required this.remoteDatasource});

  Future<Visit> startVisit(int clientId, int repUserId, double latitude, double longitude, {String? purpose}) async {
    return await remoteDatasource.startVisit(clientId, repUserId, latitude, longitude, purpose: purpose);
  }

  Future<Visit?> endVisit(int visitId, double latitude, double longitude, String outcome, String notes) async {
    return await remoteDatasource.endVisit(visitId, latitude, longitude, outcome, notes);
  }

  Future<List<Visit>> getAllVisits({int page = 1, int limit = 20, String? status, int? clientId, String? startDate, String? endDate}) async {
    return await remoteDatasource.getAllVisits(page: page, limit: limit, status: status, clientId: clientId, startDate: startDate, endDate: endDate);
  }

  Future<List<Visit>> getClientVisits(int clientId) async {
    return await remoteDatasource.getClientVisits(clientId);
  }

  Future<Visit> getVisitDetails(int visitId) async {
    return await remoteDatasource.getVisitDetails(visitId);
  }

  Future<void> updateVisitNotes(int visitId, String notes) async {
    return await remoteDatasource.updateVisitNotes(visitId, notes);
  }

  Future<void> addVisitActivity(int visitId, String activityType, String description, {int? referenceId}) async {
    return await remoteDatasource.addVisitActivity(visitId, activityType, description, referenceId: referenceId);
  }

  Future<List<Map<String, dynamic>>> getVisitActivities(int visitId) async {
    return await remoteDatasource.getVisitActivities(visitId);
  }
}
