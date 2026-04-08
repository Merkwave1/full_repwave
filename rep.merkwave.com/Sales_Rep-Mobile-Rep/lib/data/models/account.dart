// lib/data/models/account.dart
class Account {
  final int id;
  final String code;
  final String name;
  final String type;
  final int sortid;

  Account({
    required this.id,
    required this.code,
    required this.name,
    required this.type,
    required this.sortid,
  });

  factory Account.fromJson(Map<String, dynamic> json) {
    return Account(
      id: int.tryParse(json['id'].toString()) ?? 0,
      code: json['code']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      type: json['type']?.toString() ?? '',
      sortid: int.tryParse(json['sortid'].toString()) ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'code': code,
      'name': name,
      'type': type,
      'sortid': sortid,
    };
  }
}
