// lib/data/models/visit.dart
import 'package:get/get.dart'; // Assuming GetX for Rx status
import '/data/models/client.dart'; // Adjust import based on your path
import '/data/models/user.dart'; // Adjust import based on your path
import 'dart:developer'; // Import for log function

class Visit {
  final int? id;
  final int clientId; // Still non-nullable as per your schema
  final int repUserId; // Still non-nullable as per your schema
  final DateTime startTime;
  final DateTime? endTime;
  final double? startLatitude;
  final double? startLongitude;
  final double? endLatitude;
  final double? endLongitude;
  final RxString status;
  final String? purpose; // Added purpose field
  final String? outcome; // Added outcome field
  String? notes; // Changed to non-final to allow updates
  Client? client; // Changed to non-final to allow assignment after creation
  final DateTime? createdAt;
  final DateTime? updatedAt;

  final User? representative;

  Visit({
    this.id,
    required this.clientId,
    required this.repUserId,
    required this.startTime,
    this.endTime,
    this.startLatitude,
    this.startLongitude,
    this.endLatitude,
    this.endLongitude,
    String? status,
    this.purpose,
    this.outcome,
    this.notes,
    this.createdAt,
    this.updatedAt,
    this.client, // Now accepts client in constructor
    this.representative,
  }) : status = (status ?? 'Started').obs;

  factory Visit.fromJson(Map<String, dynamic> json) {
    // Print the incoming JSON for this specific Visit object to debug

    // Extract the 'data' map if it exists, otherwise use the original json map
    final Map<String, dynamic> visitData = json['data'] ?? json;

    try {
      return Visit(
        id: visitData['visits_id'] as int?, // Nullable int
        clientId: visitData['visits_client_id'] as int, // Assuming this is always int
        repUserId: visitData['visits_rep_user_id'] as int, // Assuming this is always int
        startTime: DateTime.parse(visitData['visits_start_time'] as String),
        endTime: visitData['visits_end_time'] != null ? DateTime.parse(visitData['visits_end_time'] as String) : null,
        // Safely parse latitude/longitude which might come as String or num
        startLatitude: visitData['visits_start_latitude'] != null
            ? double.tryParse(visitData['visits_start_latitude'].toString()) // Convert to string then parse
            : null,
        startLongitude: visitData['visits_start_longitude'] != null
            ? double.tryParse(visitData['visits_start_longitude'].toString()) // Convert to string then parse
            : null,
        endLatitude: visitData['visits_end_latitude'] != null
            ? double.tryParse(visitData['visits_end_latitude'].toString()) // Convert to string then parse
            : null,
        endLongitude: visitData['visits_end_longitude'] != null
            ? double.tryParse(visitData['visits_end_longitude'].toString()) // Convert to string then parse
            : null,
        status: visitData['visits_status'] as String?,
        purpose: visitData['visits_purpose'] as String?,
        outcome: visitData['visits_outcome'] as String?,
        notes: visitData['visits_notes'] as String?,
        createdAt: visitData['visits_created_at'] != null ? DateTime.parse(visitData['visits_created_at'] as String) : null,
        updatedAt: visitData['visits_updated_at'] != null ? DateTime.parse(visitData['visits_updated_at'] as String) : null,
        // Client and Representative might be nested objects in some API responses
        client: visitData['client'] != null
            ? Client.fromJson(visitData['client'])
            : (() {
                final dynamic rawName = visitData['client_name'] ?? visitData['clients_company_name'];
                final String? clientName = rawName != null ? rawName.toString().trim() : null;
                if (clientName == null || clientName.isEmpty) {
                  return null;
                }
                return Client(
                  id: visitData['visits_client_id'] as int,
                  companyName: clientName,
                  contactName: null,
                  contactPhone1: null,
                  email: null,
                  address: null,
                  status: 'active',
                  type: 'store',
                  lastVisit: null,
                  areaTagId: null,
                  industryId: null,
                );
              })(),
        representative: visitData['representative'] != null
            ? User.fromJson(visitData['representative'])
            : (visitData['rep_user_name'] != null
                ? User(
                    id: visitData['visits_rep_user_id'] as int,
                    name: visitData['rep_user_name'] as String,
                    uuid: '',
                    role: '',
                    phone: null,
                    email: null,
                  )
                : null),
      );
    } catch (e, stack) {
      log('Error parsing Visit JSON: $e\nStack: $stack\nJSON: $json', name: 'VisitModelError', error: e, stackTrace: stack);
      rethrow;
    }
  }

  Map<String, dynamic> toJson() {
    return {
      'visits_id': id,
      'visits_client_id': clientId,
      'visits_rep_user_id': repUserId,
      'visits_start_time': startTime.toIso8601String(),
      'visits_end_time': endTime?.toIso8601String(),
      'visits_start_latitude': startLatitude,
      'visits_start_longitude': startLongitude,
      'visits_end_latitude': endLatitude,
      'visits_end_longitude': endLongitude,
      'visits_status': status.value,
      'visits_purpose': purpose,
      'visits_outcome': outcome,
      'visits_notes': notes,
      'visits_created_at': createdAt?.toIso8601String(),
      'visits_updated_at': updatedAt?.toIso8601String(),
    };
  }

  // Method to update the status (already exists)
  void updateStatus(String newStatus) {
    status.value = newStatus;
  }

  // Add a copyWith method to easily create a new instance with updated values
  Visit copyWith({
    int? id,
    int? clientId,
    int? repUserId,
    DateTime? startTime,
    DateTime? endTime,
    double? startLatitude,
    double? startLongitude,
    double? endLatitude,
    double? endLongitude,
    String? status,
    String? purpose,
    String? outcome,
    String? notes,
    DateTime? createdAt,
    DateTime? updatedAt,
    Client? client,
    User? representative,
  }) {
    return Visit(
      id: id ?? this.id,
      clientId: clientId ?? this.clientId,
      repUserId: repUserId ?? this.repUserId,
      startTime: startTime ?? this.startTime,
      endTime: endTime ?? this.endTime,
      startLatitude: startLatitude ?? this.startLatitude,
      startLongitude: startLongitude ?? this.startLongitude,
      endLatitude: endLatitude ?? this.endLatitude,
      endLongitude: endLongitude ?? this.endLongitude,
      status: status ?? this.status.value, // Use .value for RxString
      purpose: purpose ?? this.purpose,
      outcome: outcome ?? this.outcome,
      notes: notes ?? this.notes,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      client: client ?? this.client,
      representative: representative ?? this.representative,
    );
  }

  // Calculate visit duration
  Duration? getDuration() {
    if (endTime != null) {
      return endTime!.difference(startTime);
    }
    return null;
  }

  // Get formatted duration string
  String getFormattedDuration() {
    final duration = getDuration();
    if (duration == null) {
      return 'Ongoing';
    }

    final hours = duration.inHours;
    final minutes = duration.inMinutes.remainder(60);
    final seconds = duration.inSeconds.remainder(60);

    if (hours > 0) {
      return '${hours}h ${minutes}m ${seconds}s';
    } else if (minutes > 0) {
      return '${minutes}m ${seconds}s';
    } else {
      return '${seconds}s';
    }
  }

  // Get current visit duration (for ongoing visits)
  String getCurrentDuration() {
    final currentTime = DateTime.now();
    final duration = currentTime.difference(startTime);

    final hours = duration.inHours;
    final minutes = duration.inMinutes.remainder(60);
    final seconds = duration.inSeconds.remainder(60);

    if (hours > 0) {
      return '${hours}h ${minutes}m ${seconds}s';
    } else if (minutes > 0) {
      return '${minutes}m ${seconds}s';
    } else {
      return '${seconds}s';
    }
  }
}
