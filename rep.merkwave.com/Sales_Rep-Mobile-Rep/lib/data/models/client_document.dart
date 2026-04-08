// lib/data/models/client_document.dart
class ClientDocument {
  final int id;
  final int clientId;
  final int documentTypeId;
  final String documentTypeName; // From join
  final String title;
  final String filePath; // Full URL to the file
  final String? fileMimeType;
  final double? fileSizeKb;
  final int? uploadedByUserId;
  final String? uploadedByUserName; // From join
  final String? notes;
  final DateTime createdAt;
  final DateTime updatedAt;

  ClientDocument({
    required this.id,
    required this.clientId,
    required this.documentTypeId,
    required this.documentTypeName,
    required this.title,
    required this.filePath,
    this.fileMimeType,
    this.fileSizeKb,
    this.uploadedByUserId,
    this.uploadedByUserName,
    this.notes,
    required this.createdAt,
    required this.updatedAt,
  });

  factory ClientDocument.fromJson(Map<String, dynamic> json) {
    DateTime? parseDateTime(dynamic value) {
      if (value is String && value.isNotEmpty) {
        final cleanedValue = value.replaceAll(' ', 'T');
        return DateTime.tryParse(cleanedValue);
      }
      return null;
    }

    double parseDouble(dynamic value) {
      if (value is num) {
        return value.toDouble();
      } else if (value is String && value.isNotEmpty) {
        return double.tryParse(value) ?? 0.0;
      }
      return 0.0;
    }

    return ClientDocument(
      id: json['client_document_id'] as int,
      clientId: json['client_document_client_id'] as int,
      documentTypeId: json['client_document_type_id'] as int,
      documentTypeName: json['document_type_name'] as String,
      title: json['client_document_title'] as String,
      filePath: json['client_document_file_path'] as String,
      fileMimeType: json['client_document_file_mime_type'] as String?,
      fileSizeKb: parseDouble(json['client_document_file_size_kb']),
      uploadedByUserId: json['client_document_uploaded_by_user_id'] as int?,
      uploadedByUserName: json['uploaded_by_user_name'] as String?,
      notes: json['client_document_notes'] as String?,
      createdAt: parseDateTime(json['client_document_created_at']) ?? DateTime.now(), // Fallback
      updatedAt: parseDateTime(json['client_document_updated_at']) ?? DateTime.now(), // Fallback
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'client_document_id': id,
      'client_document_client_id': clientId,
      'client_document_type_id': documentTypeId,
      'document_type_name': documentTypeName,
      'client_document_title': title,
      'client_document_file_path': filePath,
      'client_document_file_mime_type': fileMimeType,
      'client_document_file_size_kb': fileSizeKb,
      'client_document_uploaded_by_user_id': uploadedByUserId,
      'uploaded_by_user_name': uploadedByUserName,
      'client_document_notes': notes,
      'client_document_created_at': createdAt.toIso8601String(),
      'client_document_updated_at': updatedAt.toIso8601String(),
    };
  }
}
