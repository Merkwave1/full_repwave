// lib/data/models/visit_activity.dart
class VisitActivity {
  final int? id;
  final int visitId;
  final String activityType;
  final String description;
  final int? referenceId;
  final DateTime createdAt;
  final String? additionalData;

  VisitActivity({
    this.id,
    required this.visitId,
    required this.activityType,
    required this.description,
    this.referenceId,
    required this.createdAt,
    this.additionalData,
  });

  factory VisitActivity.fromJson(Map<String, dynamic> json) {
    return VisitActivity(
      id: json['visit_activities_id'] as int?,
      visitId: json['visit_activities_visit_id'] as int,
      activityType: json['visit_activities_type'] as String,
      description: json['visit_activities_description'] as String,
      referenceId: json['visit_activities_reference_id'] as int?,
      createdAt: DateTime.parse(json['visit_activities_created_at'] as String),
      additionalData: json['additional_data'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'visit_activities_id': id,
      'visit_activities_visit_id': visitId,
      'visit_activities_type': activityType,
      'visit_activities_description': description,
      'visit_activities_reference_id': referenceId,
      'visit_activities_created_at': createdAt.toIso8601String(),
      'additional_data': additionalData,
    };
  }

  // Helper method to get activity icon
  String getActivityIcon() {
    switch (activityType.toLowerCase()) {
      case 'sales_order':
      case 'salesorder_created':
        return '🛒';
      case 'payment':
      case 'payment_collected':
        return '💰';
      case 'return':
      case 'return_initiated':
        return '↩️';
      case 'note':
      case 'client_note_added':
        return '📝';
      case 'photo':
      case 'photo_before':
      case 'photo_after':
        return '📸';
      case 'document':
      case 'document_uploaded':
        return '📄';
      case 'support':
        return '🛠️';
      case 'salesinvoice_created':
        return '🧾';
      default:
        return '📋';
    }
  }

  // Helper method to get activity color
  String getActivityColor() {
    switch (activityType.toLowerCase()) {
      case 'sales_order':
      case 'salesorder_created':
        return '#2196F3'; // Blue
      case 'payment':
      case 'payment_collected':
        return '#9C27B0'; // Purple
      case 'return':
      case 'return_initiated':
        return '#FF9800'; // Orange
      case 'note':
      case 'client_note_added':
        return '#00BCD4'; // Cyan
      case 'photo':
      case 'photo_before':
      case 'photo_after':
        return '#3F51B5'; // Indigo
      case 'document':
      case 'document_uploaded':
        return '#795548'; // Brown
      case 'support':
        return '#009688'; // Teal
      case 'salesinvoice_created':
        return '#4CAF50'; // Green
      default:
        return '#757575'; // Grey
    }
  }

  // Helper method to format activity display name
  String getDisplayName() {
    switch (activityType.toLowerCase()) {
      case 'sales_order':
      case 'salesorder_created':
        return 'Sales Order';
      case 'payment':
      case 'payment_collected':
        return 'Payment';
      case 'return':
      case 'return_initiated':
        return 'Return';
      case 'note':
      case 'client_note_added':
        return 'Note';
      case 'photo':
      case 'photo_before':
        return 'Photo (Before)';
      case 'photo_after':
        return 'Photo (After)';
      case 'document':
      case 'document_uploaded':
        return 'Document';
      case 'support':
        return 'Customer Support';
      case 'salesinvoice_created':
        return 'Sales Invoice';
      default:
        return activityType.replaceAll('_', ' ').toUpperCase();
    }
  }
}
