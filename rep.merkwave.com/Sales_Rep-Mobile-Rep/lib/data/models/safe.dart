// lib/data/models/safe.dart
import '/core/utils/formatting.dart';

class Safe {
  final int id;
  final String name;
  final String type;
  final double currentBalance;
  final int? ownerUserId;
  final String? notes;
  final DateTime createdAt;
  final DateTime updatedAt;
  final int pendingTransactionsCount;
  final int? paymentMethodId;
  final String? paymentMethodName;
  final String? paymentMethodDescription;
  final String? paymentMethodType;
  final String color; // Color of the safe (enum: white, black, lightgray, gray, blue, green, red, yellow, orange, beige)

  Safe({
    required this.id,
    required this.name,
    required this.type,
    required this.currentBalance,
    this.ownerUserId,
    this.notes,
    required this.createdAt,
    required this.updatedAt,
    this.pendingTransactionsCount = 0,
    this.paymentMethodId,
    this.paymentMethodName,
    this.paymentMethodDescription,
    this.paymentMethodType,
    this.color = 'white', // Default color
  });

  factory Safe.fromJson(Map<String, dynamic> json) {
    // API sometimes returns balance as 'safes_balance' instead of 'safes_current_balance'
    final dynamic balanceRaw = json['safes_current_balance'] ?? json['safes_balance'] ?? 0;
    double parsedBalance;
    try {
      parsedBalance = double.parse(balanceRaw.toString());
    } catch (_) {
      parsedBalance = 0.0; // Fallback to 0 if invalid
    }

    // Owner user id may appear as safes_owner_user_id or safes_rep_user_id
    final ownerIdRaw = json['safes_owner_user_id'] ?? json['safes_rep_user_id'];
    int? parsedOwnerId;
    if (ownerIdRaw != null) {
      try {
        parsedOwnerId = int.parse(ownerIdRaw.toString());
      } catch (_) {
        parsedOwnerId = null;
      }
    }

    DateTime parseDate(String key) {
      final val = json[key];
      if (val == null) return DateTime.now();
      try {
        return DateTime.parse(val.toString());
      } catch (_) {
        return DateTime.now();
      }
    }

    int? parseNullableInt(dynamic value) {
      if (value == null) return null;
      try {
        return int.parse(value.toString());
      } catch (_) {
        return null;
      }
    }

    return Safe(
      id: int.tryParse(json['safes_id'].toString()) ?? 0,
      name: json['safes_name']?.toString() ?? '',
      type: json['safes_type']?.toString() ?? '',
      currentBalance: parsedBalance,
      ownerUserId: parsedOwnerId,
      notes: json['safes_description']?.toString(), // Backend uses 'safes_description', not 'safes_notes'
      createdAt: parseDate('safes_created_at'),
      updatedAt: parseDate('safes_updated_at'),
      pendingTransactionsCount: int.tryParse((json['pending_transactions_count'] ?? '0').toString()) ?? 0,
      paymentMethodId: parseNullableInt(json['safes_payment_method_id'] ?? json['payment_methods_id']),
      paymentMethodName: (json['payment_method_name'] ?? json['payment_methods_name'])?.toString(),
      paymentMethodDescription: (json['payment_method_description'] ?? json['payment_methods_description'])?.toString(),
      paymentMethodType: (json['payment_method_type'] ?? json['payment_methods_type'])?.toString(),
      color: json['safes_color']?.toString() ?? 'white', // Parse color from API, default to white
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'safes_id': id,
      'safes_name': name,
      'safes_type': type,
      'safes_current_balance': currentBalance,
      'safes_owner_user_id': ownerUserId,
      'safes_notes': notes,
      'safes_created_at': createdAt.toIso8601String(),
      'safes_updated_at': updatedAt.toIso8601String(),
      'pending_transactions_count': pendingTransactionsCount,
      'safes_payment_method_id': paymentMethodId,
      'payment_method_name': paymentMethodName,
      'payment_method_description': paymentMethodDescription,
      'payment_method_type': paymentMethodType,
      'safes_color': color,
    };
  }

  String get formattedBalance => Formatting.amount(currentBalance);
}
