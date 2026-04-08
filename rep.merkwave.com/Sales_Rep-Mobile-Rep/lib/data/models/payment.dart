// lib/data/models/payment.dart
import '/core/utils/formatting.dart';

class Payment {
  final int id;
  final int clientId;
  final String clientName;
  final int methodId;
  final String methodName;
  final double amount;
  final DateTime date;
  final String? transactionId;
  final String? notes;
  final int repUserId;
  final int safeId;
  final int? safeTransactionId;
  final DateTime createdAt;
  final DateTime updatedAt;

  Payment({
    required this.id,
    required this.clientId,
    required this.clientName,
    required this.methodId,
    required this.methodName,
    required this.amount,
    required this.date,
    this.transactionId,
    this.notes,
    required this.repUserId,
    required this.safeId,
    this.safeTransactionId,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Payment.fromJson(Map<String, dynamic> json) {
    return Payment(
      id: int.parse(json['payments_id'].toString()),
      clientId: int.parse(json['payments_client_id'].toString()),
      clientName: json['clients_company_name'] ?? '',
      methodId: int.parse(json['payments_method_id'].toString()),
      methodName: json['payment_methods_name'] ?? '',
      amount: double.parse(json['payments_amount'].toString()),
      date: DateTime.parse(json['payments_date']),
      transactionId: json['payments_transaction_id'],
      notes: json['payments_notes'],
      repUserId: int.parse(json['payments_rep_user_id'].toString()),
      safeId: int.parse(json['payments_safe_id'].toString()),
      safeTransactionId: json['payments_safe_transaction_id'] != null ? int.parse(json['payments_safe_transaction_id'].toString()) : null,
      createdAt: DateTime.parse(json['payments_created_at']),
      updatedAt: DateTime.parse(json['payments_updated_at']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'payments_id': id,
      'payments_client_id': clientId,
      'clients_company_name': clientName,
      'payments_method_id': methodId,
      'payment_methods_name': methodName,
      'payments_amount': amount,
      'payments_date': date.toIso8601String(),
      'payments_transaction_id': transactionId,
      'payments_notes': notes,
      'payments_rep_user_id': repUserId,
      'payments_safe_id': safeId,
      'payments_safe_transaction_id': safeTransactionId,
      'payments_created_at': createdAt.toIso8601String(),
      'payments_updated_at': updatedAt.toIso8601String(),
    };
  }

  String get formattedAmount => Formatting.amount(amount);

  String get formattedDate {
    return '${date.day}/${date.month}/${date.year}';
  }

  String get formattedDateTime {
    return '${date.day}/${date.month}/${date.year} ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
  }
}

class PaymentMethod {
  final int id;
  final String name;
  final String? description;
  final DateTime createdAt;
  final DateTime updatedAt;

  PaymentMethod({
    required this.id,
    required this.name,
    this.description,
    required this.createdAt,
    required this.updatedAt,
  });

  factory PaymentMethod.fromJson(Map<String, dynamic> json) {
    return PaymentMethod(
      id: int.parse(json['payment_methods_id'].toString()),
      name: json['payment_methods_name'] ?? '',
      description: json['payment_methods_description'],
      createdAt: DateTime.parse(json['payment_methods_created_at']),
      updatedAt: DateTime.parse(json['payment_methods_updated_at']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'payment_methods_id': id,
      'payment_methods_name': name,
      'payment_methods_description': description,
      'payment_methods_created_at': createdAt.toIso8601String(),
      'payment_methods_updated_at': updatedAt.toIso8601String(),
    };
  }
}
