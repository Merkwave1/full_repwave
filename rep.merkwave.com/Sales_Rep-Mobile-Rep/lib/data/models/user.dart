// lib/data/models/user.dart
import 'package:get/get.dart';

class User {
  final int id;
  final String name;
  final String role;
  final String uuid;
  final String? email; // Made nullable based on API response
  final String? phone;
  final String? nationalId;
  final bool status; // 1 for active, 0 for inactive
  final String? imageUrl;

  User({
    required this.id,
    required this.name,
    required this.role,
    required this.uuid,
    this.email,
    this.phone,
    this.nationalId,
    this.status = true,
    this.imageUrl,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['users_id'] as int,
      name: json['users_name'] as String,
      role: json['users_role'] as String,
      uuid: json['users_uuid'] as String,
      email: json['users_email'] as String?, // Assuming it might be in data if available
      phone: json['users_phone'] as String?,
      nationalId: json['users_national_id'] as String?,
      status: (json['users_status'] as int?) == 1,
      imageUrl: json['users_image'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'users_id': id,
      'users_name': name,
      'users_role': role,
      'users_uuid': uuid,
      'users_email': email,
      'users_phone': phone,
      'users_national_id': nationalId,
      'users_status': status ? 1 : 0,
      'users_image': imageUrl,
    };
  }

  // Helper methods for role checking
  String get _normalizedRole => role.trim().toLowerCase().replaceAll(' ', '_');

  bool get isRep => _normalizedRole == 'rep' || _normalizedRole == 'sales_rep';
  bool get isrep => isRep; // Legacy compatibility
  bool get isAdmin => _normalizedRole == 'admin';
  bool get isStoreKeeper => _normalizedRole == 'store_keeper' || _normalizedRole == 'storekeeper' || _normalizedRole == 'store';
  bool get isCash => _normalizedRole == 'cash';
  bool get isActive => status;

  // Get a user-friendly role name
  String get roleName {
    switch (_normalizedRole) {
      case 'rep':
      case 'sales_rep':
        return 'sales_rep_role'.tr;
      case 'admin':
        return 'admin_role'.tr;
      case 'store_keeper':
      case 'storekeeper':
      case 'store':
        return 'store_keeper_role'.tr;
      case 'cash':
        return 'أمين الصندوق';
      default:
        return role;
    }
  }
}
