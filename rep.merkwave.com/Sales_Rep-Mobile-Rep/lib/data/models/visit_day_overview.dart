// lib/data/models/visit_day_overview.dart
import '/data/models/visit_plan.dart';
import '/data/models/visit.dart';

class VisitDayOverview {
  final DateTime date;
  final List<VisitPlan>? visitPlans;
  final List<Visit> actualVisits;
  final Map<String, dynamic>? stats;

  const VisitDayOverview({
    required this.date,
    required this.actualVisits,
    this.visitPlans,
    this.stats,
  });

  bool get hasVisitPlans => visitPlans != null;

  List<VisitPlan> get visitPlansOrEmpty => visitPlans ?? const [];

  factory VisitDayOverview.fromJson(Map<String, dynamic> json) {
    final String? dateString = json['date']?.toString();
    DateTime parsedDate;
    if (dateString != null) {
      parsedDate = DateTime.tryParse(dateString) ?? DateTime.now();
    } else {
      parsedDate = DateTime.now();
    }

    final dynamic plansJson = json['visit_plans'];
    List<VisitPlan>? plans;
    if (plansJson is List) {
      plans = plansJson.whereType<Map<String, dynamic>>().map((plan) => VisitPlan.fromJson(plan)).toList(growable: false);
    }

    final dynamic visitsJson = json['actual_visits'];
    final List<Visit> visits = visitsJson is List ? visitsJson.whereType<Map<String, dynamic>>().map(Visit.fromJson).toList(growable: false) : <Visit>[];

    final Map<String, dynamic>? stats = json['stats'] is Map<String, dynamic> ? Map<String, dynamic>.from(json['stats']) : null;

    return VisitDayOverview(
      date: parsedDate,
      visitPlans: plans,
      actualVisits: visits,
      stats: stats,
    );
  }
}
