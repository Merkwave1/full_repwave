// lib/data/models/client_document_type.dart
class ClientDocumentType {
  final int id;
  final String name;
  final String? description;

  ClientDocumentType({required this.id, required this.name, this.description});

  factory ClientDocumentType.fromJson(Map<String, dynamic> json) {
    return ClientDocumentType(
      id: json['document_type_id'] as int,
      name: json['document_type_name'] as String,
      description: json['document_type_description'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'document_type_id': id,
      'document_type_name': name,
      'document_type_description': description,
    };
  }
}
