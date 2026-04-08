// lib/data/models/client_industry.dart
class ClientIndustry {
  final int id;
  final String name;

  ClientIndustry({required this.id, required this.name});

  factory ClientIndustry.fromJson(Map<String, dynamic> json) {
    return ClientIndustry(
      id: json['client_industries_id'] as int,
      name: json['client_industries_name'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'client_industries_id': id,
      'client_industries_name': name,
    };
  }
}
