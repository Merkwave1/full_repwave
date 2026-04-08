// lib/data/models/visit_plan.dart
import '/data/models/client.dart';
import 'package:geolocator/geolocator.dart';

class VisitPlan {
  final int visitPlanId;
  final String visitPlanName;
  final String? visitPlanDescription;
  final int userId;
  final String visitPlanStatus;
  final DateTime visitPlanStartDate;
  final DateTime visitPlanEndDate;
  final String visitPlanRecurrenceType;
  final List<int>? visitPlanSelectedDays;
  final int visitPlanRepeatEvery;
  final DateTime visitPlanCreatedAt;
  final DateTime visitPlanUpdatedAt;
  final String? representativeName;
  final int clientsCount;
  final List<VisitPlanClient>? clients;

  VisitPlan({
    required this.visitPlanId,
    required this.visitPlanName,
    this.visitPlanDescription,
    required this.userId,
    required this.visitPlanStatus,
    required this.visitPlanStartDate,
    required this.visitPlanEndDate,
    required this.visitPlanRecurrenceType,
    this.visitPlanSelectedDays,
    required this.visitPlanRepeatEvery,
    required this.visitPlanCreatedAt,
    required this.visitPlanUpdatedAt,
    this.representativeName,
    required this.clientsCount,
    this.clients,
  });

  factory VisitPlan.fromJson(Map<String, dynamic> json) {
    return VisitPlan(
      visitPlanId: _parseInt(json['visit_plan_id']),
      visitPlanName: json['visit_plan_name'] ?? '',
      visitPlanDescription: json['visit_plan_description'],
      userId: _parseInt(json['user_id']),
      visitPlanStatus: json['visit_plan_status'] ?? '',
      visitPlanStartDate: DateTime.parse(json['visit_plan_start_date']),
      visitPlanEndDate: DateTime.parse(json['visit_plan_end_date']),
      visitPlanRecurrenceType: json['visit_plan_recurrence_type'] ?? '',
      visitPlanSelectedDays: _parseSelectedDays(json['visit_plan_selected_days']),
      visitPlanRepeatEvery: _parseInt(json['visit_plan_repeat_every']),
      visitPlanCreatedAt: DateTime.parse(json['visit_plan_created_at']),
      visitPlanUpdatedAt: DateTime.parse(json['visit_plan_updated_at']),
      representativeName: json['representative_name'],
      clientsCount: _parseInt(json['clients_count']),
      clients: json['clients'] != null ? (json['clients'] as List).map((client) => VisitPlanClient.fromJson(client)).toList() : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'visit_plan_id': visitPlanId,
      'visit_plan_name': visitPlanName,
      'visit_plan_description': visitPlanDescription,
      'user_id': userId,
      'visit_plan_status': visitPlanStatus,
      'visit_plan_start_date': visitPlanStartDate.toIso8601String(),
      'visit_plan_end_date': visitPlanEndDate.toIso8601String(),
      'visit_plan_recurrence_type': visitPlanRecurrenceType,
      'visit_plan_selected_days': visitPlanSelectedDays?.map(_mapDartWeekdayToBackend).toList(),
      'visit_plan_repeat_every': visitPlanRepeatEvery,
      'visit_plan_created_at': visitPlanCreatedAt.toIso8601String(),
      'visit_plan_updated_at': visitPlanUpdatedAt.toIso8601String(),
      'representative_name': representativeName,
      'clients_count': clientsCount,
      'clients': clients?.map((client) => client.toJson()).toList(),
    };
  }

  static int _parseInt(dynamic value) {
    if (value == null) return 0;
    if (value is int) return value;
    if (value is String) return int.tryParse(value) ?? 0;
    return 0;
  }

  static List<int>? _parseSelectedDays(dynamic value) {
    if (value == null) return null;
    if (value is List) {
      final List<int> mapped = [];
      for (final element in value) {
        final parsed = _parseInt(element);
        if (parsed == 0) continue;
        mapped.add(_mapBackendWeekdayToDart(parsed));
      }
      return mapped;
    }
    return null;
  }

  // Helper methods to generate scheduled visits for a specific date
  bool isScheduledForDate(DateTime date) {
    // Check if the date is within the plan's date range
    if (date.isBefore(visitPlanStartDate) || date.isAfter(visitPlanEndDate)) {
      return false;
    }

    // Handle different recurrence types
    switch (visitPlanRecurrenceType.toLowerCase()) {
      case 'daily':
        return _isDailyScheduled(date);
      case 'weekly':
        return _isWeeklyScheduled(date);
      case 'monthly':
        return _isMonthlyScheduled(date);
      case 'once':
        return _isSameDateAs(date, visitPlanStartDate);
      default:
        return false;
    }
  }

  bool _isDailyScheduled(DateTime date) {
    final daysDifference = date.difference(visitPlanStartDate).inDays;
    return daysDifference >= 0 && daysDifference % visitPlanRepeatEvery == 0;
  }

  bool _isWeeklyScheduled(DateTime date) {
    if (visitPlanSelectedDays == null || visitPlanSelectedDays!.isEmpty) {
      return false;
    }

    final weekday = date.weekday;
    if (!visitPlanSelectedDays!.contains(weekday)) {
      return false;
    }

    final weeksDifference = date.difference(visitPlanStartDate).inDays ~/ 7;
    return weeksDifference >= 0 && weeksDifference % visitPlanRepeatEvery == 0;
  }

  static int _mapDartWeekdayToBackend(int dartWeekday) {
    switch (dartWeekday) {
      case DateTime.monday:
        return 3;
      case DateTime.tuesday:
        return 4;
      case DateTime.wednesday:
        return 5;
      case DateTime.thursday:
        return 6;
      case DateTime.friday:
        return 7;
      case DateTime.saturday:
        return 1;
      case DateTime.sunday:
        return 2;
      default:
        return dartWeekday;
    }
  }

  static int _mapBackendWeekdayToDart(int backendWeekday) {
    switch (backendWeekday) {
      case 1:
        return DateTime.saturday;
      case 2:
        return DateTime.sunday;
      case 3:
        return DateTime.monday;
      case 4:
        return DateTime.tuesday;
      case 5:
        return DateTime.wednesday;
      case 6:
        return DateTime.thursday;
      case 7:
        return DateTime.friday;
      default:
        return backendWeekday;
    }
  }

  bool _isMonthlyScheduled(DateTime date) {
    final monthsDifference = (date.year - visitPlanStartDate.year) * 12 + (date.month - visitPlanStartDate.month);

    return monthsDifference >= 0 && monthsDifference % visitPlanRepeatEvery == 0 && date.day == visitPlanStartDate.day;
  }

  bool _isSameDateAs(DateTime date1, DateTime date2) {
    return date1.year == date2.year && date1.month == date2.month && date1.day == date2.day;
  }
}

class VisitPlanClient {
  final int visitPlanClientsId;
  final int clientId;
  final DateTime visitPlanClientAddedAt;
  final String? clientsCompanyName;
  final String? clientsContactName;
  final String? clientsContactPhone1;
  final String? clientsAddress;
  final String? clientsCity;
  final double? clientsLatitude;
  final double? clientsLongitude;
  final String? clientStatus;

  VisitPlanClient({
    required this.visitPlanClientsId,
    required this.clientId,
    required this.visitPlanClientAddedAt,
    this.clientsCompanyName,
    this.clientsContactName,
    this.clientsContactPhone1,
    this.clientsAddress,
    this.clientsCity,
    this.clientsLatitude,
    this.clientsLongitude,
    this.clientStatus,
  });

  factory VisitPlanClient.fromJson(Map<String, dynamic> json) {
    return VisitPlanClient(
      visitPlanClientsId: _parseInt(json['visit_plan_clients_id']),
      clientId: _parseInt(json['client_id']),
      visitPlanClientAddedAt: DateTime.parse(json['visit_plan_client_added_at']),
      clientsCompanyName: json['clients_company_name'],
      clientsContactName: json['clients_contact_name'],
      clientsContactPhone1: json['clients_contact_phone_1'],
      clientsAddress: json['clients_address'],
      clientsCity: json['clients_city'],
      clientsLatitude: json['clients_latitude'] != null ? double.tryParse(json['clients_latitude'].toString()) : null,
      clientsLongitude: json['clients_longitude'] != null ? double.tryParse(json['clients_longitude'].toString()) : null,
      clientStatus: json['client_status'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'visit_plan_clients_id': visitPlanClientsId,
      'client_id': clientId,
      'visit_plan_client_added_at': visitPlanClientAddedAt.toIso8601String(),
      'clients_company_name': clientsCompanyName,
      'clients_contact_name': clientsContactName,
      'clients_contact_phone_1': clientsContactPhone1,
      'clients_address': clientsAddress,
      'clients_city': clientsCity,
      'clients_latitude': clientsLatitude,
      'clients_longitude': clientsLongitude,
      'client_status': clientStatus,
    };
  }

  static int _parseInt(dynamic value) {
    if (value == null) return 0;
    if (value is int) return value;
    if (value is String) return int.tryParse(value) ?? 0;
    return 0;
  }
}

// Helper class to represent a scheduled visit from a visit plan
class ScheduledVisit {
  final VisitPlan visitPlan;
  final Client? client; // Make client optional
  final DateTime scheduledDate;
  final VisitPlanClient planClient;

  ScheduledVisit({
    required this.visitPlan,
    this.client, // Optional cached client
    required this.scheduledDate,
    required this.planClient,
  });

  // Helper getters that fallback to plan client data if cached client is not available
  String get clientName => client?.companyName ?? planClient.clientsCompanyName ?? 'Unknown Client';
  String get clientContactName => client?.contactName ?? planClient.clientsContactName ?? '';
  String get clientPhone => client?.contactPhone1 ?? planClient.clientsContactPhone1 ?? '';
  String get clientAddress => client?.address ?? planClient.clientsAddress ?? '';
  String get clientCity => client?.city ?? planClient.clientsCity ?? '';
  int get clientId => client?.id ?? planClient.clientId;

  // Get client coordinates with fallback to cached client data
  // Prioritize fresh API data from planClient over potentially stale cached client data
  double? get clientLatitude => planClient.clientsLatitude ?? client?.latitude;
  double? get clientLongitude => planClient.clientsLongitude ?? client?.longitude;

  String get planName => visitPlan.visitPlanName;
  String get status => 'Scheduled'; // Since these are planned visits
  String get representativeName => visitPlan.representativeName ?? '';

  // Helper to convert to Visit for starting
  Map<String, dynamic> toVisitStartData() {
    return {
      'client_id': clientId,
      'purpose': 'Scheduled visit from plan: ${visitPlan.visitPlanName}',
      'visit_plan_id': visitPlan.visitPlanId,
      'visit_plan_name': visitPlan.visitPlanName,
    };
  }

  // Calculate distance between user location and client location
  double? calculateDistance(double userLatitude, double userLongitude) {
    final clientLat = clientLatitude;
    final clientLng = clientLongitude;

    if (clientLat == null || clientLng == null) {
      return null; // Cannot calculate distance without client coordinates
    }

    return Geolocator.distanceBetween(
          userLatitude,
          userLongitude,
          clientLat,
          clientLng,
        ) /
        1000; // Convert from meters to kilometers
  }

  // Get formatted distance string
  String getDistanceString(double userLatitude, double userLongitude) {
    final distance = calculateDistance(userLatitude, userLongitude);
    if (distance == null) {
      return 'Distance unavailable';
    }

    if (distance < 1) {
      return '${(distance * 1000).round()}m';
    } else {
      return '${distance.toStringAsFixed(1)}km';
    }
  }
}
