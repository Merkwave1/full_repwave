// lib/data/models/client_area_tag.dart
class ClientAreaTag {
  final int id;
  final String name;

  ClientAreaTag({required this.id, required this.name});

  factory ClientAreaTag.fromJson(Map<String, dynamic> json) {
    return ClientAreaTag(
      id: json['client_area_tag_id'] as int,
      name: json['client_area_tag_name'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'client_area_tag_id': id,
      'client_area_tag_name': name,
    };
  }
}
