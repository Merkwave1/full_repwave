// lib/data/exceptions/api_exceptions.dart
class ApiException implements Exception {
  final String message;

  ApiException(this.message);

  @override
  String toString() => message;
}

class CreditLimitExceededException implements Exception {
  final double available;
  final double requiredAmount;
  final String message;

  CreditLimitExceededException({
    required this.message,
    required this.available,
    required this.requiredAmount,
  });

  @override
  String toString() => message;
}
