import 'package:get/get.dart';
import '/core/utils/formatting.dart';

// lib/data/models/safe_transaction.dart
class SafeTransaction {
  final int id;
  final int safeId;
  final String type;
  final int? paymentMethodId;
  final double amount;
  final double? balanceBefore;
  final double? balanceAfter;
  final String? description;
  final String? reference;
  final String? receiptImage;
  final String? notes;
  final String? status;
  final DateTime date;
  final DateTime createdAt;
  final int? createdBy;
  final String? createdByName;
  final String? paymentMethodName;
  final String? paymentMethodType;

  SafeTransaction({
    required this.id,
    required this.safeId,
    required this.type,
    this.paymentMethodId,
    required this.amount,
    this.balanceBefore,
    this.balanceAfter,
    this.description,
    this.reference,
    this.receiptImage,
    this.notes,
    this.status,
    required this.date,
    required this.createdAt,
    this.createdBy,
    this.createdByName,
    this.paymentMethodName,
    this.paymentMethodType,
  });

  factory SafeTransaction.fromJson(Map<String, dynamic> json) {
    DateTime parseDate(String key) {
      final val = json[key];
      if (val == null) return DateTime.now();
      try {
        return DateTime.parse(val.toString());
      } catch (_) {
        return DateTime.now();
      }
    }

    double parseAmount(String key) {
      final val = json[key];
      if (val == null) return 0.0;
      try {
        return double.parse(val.toString());
      } catch (_) {
        return 0.0;
      }
    }

    int? parseId(String key) {
      final val = json[key];
      if (val == null) return null;
      try {
        return int.parse(val.toString());
      } catch (_) {
        return null;
      }
    }

    return SafeTransaction(
      id: int.tryParse(json['safe_transactions_id'].toString()) ?? 0,
      safeId: int.tryParse(json['safe_transactions_safe_id'].toString()) ?? 0,
      type: json['safe_transactions_type']?.toString() ?? '',
      paymentMethodId: parseId('safe_transactions_payment_method_id'),
      amount: parseAmount('safe_transactions_amount'),
      balanceBefore: parseAmount('safe_transactions_balance_before'),
      balanceAfter: parseAmount('safe_transactions_balance_after'),
      description: json['safe_transactions_description']?.toString(),
      reference: json['safe_transactions_reference']?.toString(),
      receiptImage: json['safe_transactions_receipt_image']?.toString(),
      notes: json['safe_transactions_notes']?.toString(),
      status: json['safe_transactions_status']?.toString() ?? 'approved',
      date: parseDate('safe_transactions_date'),
      createdAt: parseDate('safe_transactions_created_at'),
      createdBy: parseId('safe_transactions_created_by'),
      createdByName: json['created_by_name']?.toString(),
      paymentMethodName: json['payment_method_name']?.toString() ?? 'cash'.tr,
      paymentMethodType: json['payment_method_type']?.toString() ?? 'cash',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'safe_transactions_id': id,
      'safe_transactions_safe_id': safeId,
      'safe_transactions_type': type,
      'safe_transactions_payment_method_id': paymentMethodId,
      'safe_transactions_amount': amount,
      'safe_transactions_balance_before': balanceBefore,
      'safe_transactions_balance_after': balanceAfter,
      'safe_transactions_description': description,
      'safe_transactions_reference': reference,
      'safe_transactions_receipt_image': receiptImage,
      'safe_transactions_notes': notes,
      'safe_transactions_status': status,
      'safe_transactions_date': date.toIso8601String(),
      'safe_transactions_created_at': createdAt.toIso8601String(),
      'safe_transactions_created_by': createdBy,
    };
  }

  String get formattedAmount => Formatting.amount(amount);
  String get formattedBalance => balanceAfter != null ? Formatting.amount(balanceAfter!) : 'not_available'.tr;
  String get formattedDate => '${date.day}/${date.month}/${date.year}';
  String get arabicTransactionType => typeDisplayArabic;

  bool get hasReceiptImage => receiptImage != null && receiptImage!.isNotEmpty;

  String get typeDisplayArabic {
    switch (type.toLowerCase()) {
      case 'deposit':
        return 'transaction_deposit'.tr;
      case 'withdrawal':
        return 'transaction_withdrawal'.tr;
      case 'transfer_in':
        return 'transaction_transfer_in'.tr;
      case 'transfer_out':
        return 'transaction_transfer_out'.tr;
      case 'payment':
        return 'transaction_payment'.tr;
      case 'receipt':
        return 'transaction_receipt'.tr;
      case 'supplier_payment':
        return 'transaction_supplier_payment'.tr;
      case 'purchase':
        return 'transaction_purchase'.tr;
      case 'sale':
        return 'transaction_sale'.tr;
      case 'expense':
        return 'transaction_expense'.tr;
      case 'adjustment':
        return 'transaction_adjustment'.tr;
      case 'other':
        return 'transaction_other'.tr;
      default:
        return type;
    }
  }

  bool get isCredit {
    const creditTypes = ['deposit', 'transfer_in', 'receipt', 'sale'];
    return creditTypes.contains(type.toLowerCase());
  }

  bool get isDebit {
    return !isCredit;
  }
}
