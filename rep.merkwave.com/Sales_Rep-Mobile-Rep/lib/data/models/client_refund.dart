class ClientRefund {
  final int id;
  final int clientId;
  final String? clientName;
  final int? methodId;
  final String? methodName;
  final double amount;
  final DateTime date;
  final String? notes;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  ClientRefund({
    required this.id,
    required this.clientId,
    this.clientName,
    this.methodId,
    this.methodName,
    required this.amount,
    required this.date,
    this.notes,
    this.createdAt,
    this.updatedAt,
  });

  factory ClientRefund.fromJson(Map<String, dynamic> json) {
    DateTime? _parseDate(dynamic v) {
      if (v == null) return null;
      final s = v.toString();
      if (s.isEmpty) return null;
      try {
        final cleaned = s.replaceAll(' ', 'T');
        return DateTime.parse(cleaned);
      } catch (_) {
        return null;
      }
    }

    return ClientRefund(
      id: int.parse((json['client_refunds_id'] ?? json['id']).toString()),
      clientId: int.parse((json['client_refunds_client_id'] ?? json['client_id']).toString()),
      clientName: json['clients_company_name'] ?? json['client_name'],
      methodId: json['client_refunds_method_id'] != null ? int.tryParse(json['client_refunds_method_id'].toString()) : null,
      methodName: json['payment_method_name'] ?? json['method_name'],
      amount: double.parse((json['client_refunds_amount'] ?? json['amount']).toString()),
      date: _parseDate(json['client_refunds_date'] ?? json['refund_date']) ?? DateTime.now(),
      notes: json['client_refunds_notes'] ?? json['notes'],
      createdAt: _parseDate(json['client_refunds_created_at'] ?? json['created_at']),
      updatedAt: _parseDate(json['client_refunds_updated_at'] ?? json['updated_at']),
    );
  }
}
