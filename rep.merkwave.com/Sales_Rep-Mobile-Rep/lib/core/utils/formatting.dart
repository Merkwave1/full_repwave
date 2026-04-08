import 'package:get/get.dart';
import 'package:intl/intl.dart';
import '/modules/auth/controllers/auth_controller.dart';

/// Lightweight formatting helpers centralized for localization-aware UI strings.
class Formatting {
  static final Map<int, NumberFormat> _numberFormatCache = {};
  static const Map<String, String> _easternToWesternDigits = {
    '٠': '0',
    '١': '1',
    '٢': '2',
    '٣': '3',
    '٤': '4',
    '٥': '5',
    '٦': '6',
    '٧': '7',
    '٨': '8',
    '٩': '9',
    '۰': '0',
    '۱': '1',
    '۲': '2',
    '۳': '3',
    '۴': '4',
    '۵': '5',
    '۶': '6',
    '۷': '7',
    '۸': '8',
    '۹': '9',
  };

  /// Get currency symbol from settings or fallback to translation key 'currency'.
  static String currencySymbol() {
    try {
      // Try to get currency symbol from company settings
      if (Get.isRegistered<AuthController>()) {
        final authController = Get.find<AuthController>();
        final currencyFromSettings = authController.companySettings.value?.getSettingValue('currency_symbol');

        if (currencyFromSettings != null && currencyFromSettings.isNotEmpty) {
          return currencyFromSettings;
        }
      }
    } catch (e) {
      // Fallback to translation if AuthController not available or settings not loaded
    }

    // Fallback to localized currency from translations
    return 'currency'.tr;
  }

  /// Format a numeric amount with thousand separators and localized currency symbol.
  ///
  /// Examples:
  /// - amount(1234.56) => "1,234.56 EGP"
  /// - amount(1234567.89) => "1,234,567.89 EGP"
  /// - amount(1000, decimals: 0) => "1,000 EGP"
  static String amount(double value, {int decimals = 2}) {
    final formatter = _numberFormatCache.putIfAbsent(decimals, () {
      // Pattern explanation:
      // #,##0 = use thousands separator (comma), at least one digit
      // .00 (or more 0s) = decimal places (if decimals > 0)
      final pattern = decimals <= 0 ? '#,##0' : '#,##0.${'0' * decimals}';
      return NumberFormat(pattern, 'en_US'); // Explicitly set locale for consistent formatting
    });

    try {
      final formattedValue = formatter.format(value);
      return '$formattedValue ${currencySymbol()}';
    } catch (e) {
      // Fallback with thousand separators if formatting fails
      return '${_formatWithSeparators(value, decimals)} ${currencySymbol()}';
    }
  }

  /// Format a number with thousand separators only (no currency symbol).
  ///
  /// Examples:
  /// - formatNumber(1234.56) => "1,234.56"
  /// - formatNumber(1234567) => "1,234,567.00"
  static String formatNumber(double value, {int decimals = 2}) {
    final formatter = _numberFormatCache.putIfAbsent(decimals, () {
      final pattern = decimals <= 0 ? '#,##0' : '#,##0.${'0' * decimals}';
      return NumberFormat(pattern, 'en_US');
    });

    try {
      return formatter.format(value);
    } catch (e) {
      return _formatWithSeparators(value, decimals);
    }
  }

  /// Manual fallback formatter with thousand separators.
  static String _formatWithSeparators(double value, int decimals) {
    final parts = value.toStringAsFixed(decimals).split('.');
    final integerPart = parts[0];
    final decimalPart = parts.length > 1 ? parts[1] : '';

    // Add thousand separators manually
    final RegExp regExp = RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))');
    final formattedInteger = integerPart.replaceAllMapped(regExp, (Match match) => '${match[1]},');

    return decimals > 0 ? '$formattedInteger.$decimalPart' : formattedInteger;
  }

  /// Convert any Arabic/Eastern numerals to Western digits.
  static String toWesternDigit(String input) {
    return _easternToWesternDigits[input] ?? input;
  }

  static String _convertToWesternDigits(String input) {
    final buffer = StringBuffer();
    for (final codePoint in input.runes) {
      buffer.write(toWesternDigit(String.fromCharCode(codePoint)));
    }
    return buffer.toString();
  }

  /// Remove thousand separators, convert localized digits, and normalize decimal separator.
  static String sanitizeAmount(String? input, {int? decimalDigits}) {
    if (input == null) return '';
    var value = input.trim();
    if (value.isEmpty) return '';

    value = _convertToWesternDigits(value)
        .replaceAll('٬', '')
        .replaceAll(' ', '')
        .replaceAll('\u00a0', '') // non-breaking space
        .replaceAll('٫', '.')
        .replaceAll('،', ',');

    var working = value;

    // Determine if comma should be treated as decimal separator (when '.' absent)
    if (!working.contains('.')) {
      final lastCommaIndex = working.lastIndexOf(',');
      if (lastCommaIndex != -1) {
        final decimalsLength = working.length - lastCommaIndex - 1;
        if (decimalsLength > 0 && decimalsLength <= 2) {
          working = working.replaceRange(lastCommaIndex, lastCommaIndex + 1, '.');
        }
      }
    }

    working = working.replaceAll(',', '');

    final buffer = StringBuffer();
    bool decimalInserted = false;

    for (final codePoint in working.runes) {
      final ch = String.fromCharCode(codePoint);
      if (RegExp(r'[0-9]').hasMatch(ch)) {
        buffer.write(ch);
      } else if (!decimalInserted && ch == '.') {
        buffer.write('.');
        decimalInserted = true;
      }
    }

    var sanitized = buffer.toString();
    if (sanitized.isEmpty) return '';

    if (decimalDigits != null && decimalDigits >= 0 && sanitized.contains('.')) {
      final parts = sanitized.split('.');
      final decimals = parts.length > 1 ? parts[1] : '';
      final trimmedDecimals = decimals.length > decimalDigits ? decimals.substring(0, decimalDigits) : decimals;
      sanitized = trimmedDecimals.isEmpty ? parts.first : '${parts.first}.$trimmedDecimals';
    }

    if (sanitized.startsWith('.')) {
      sanitized = '0$sanitized';
    }
    if (sanitized.endsWith('.')) {
      sanitized = sanitized.substring(0, sanitized.length - 1);
    }

    return sanitized;
  }

  /// Parse an amount string (with possible localization) into a [double].
  static double? parseAmount(String? input, {int? decimalDigits}) {
    final sanitized = sanitizeAmount(input, decimalDigits: decimalDigits);
    if (sanitized.isEmpty) return null;
    return double.tryParse(sanitized);
  }
}
