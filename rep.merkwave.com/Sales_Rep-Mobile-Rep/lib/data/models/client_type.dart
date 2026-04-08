// lib/data/models/client_type.dart
class ClientType {
  final int id;
  final String name;

  ClientType({required this.id, required this.name});

  factory ClientType.fromJson(Map<String, dynamic> json) {
    return ClientType(
      id: json['client_type_id'] as int,
      name: json['client_type_name'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'client_type_id': id,
      'client_type_name': name,
    };
  }
}
