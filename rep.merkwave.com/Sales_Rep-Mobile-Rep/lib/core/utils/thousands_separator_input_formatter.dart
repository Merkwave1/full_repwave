import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import 'formatting.dart';

/// Input formatter that injects thousands separators while the user types.
/// Supports optional decimal places and gracefully handles Arabic numerals.
class ThousandsSeparatorInputFormatter extends TextInputFormatter {
  ThousandsSeparatorInputFormatter({this.decimalDigits = 2});

  final int decimalDigits;

  final NumberFormat _integerFormatter = NumberFormat('#,##0', 'en_US');

  @override
  TextEditingValue formatEditUpdate(TextEditingValue oldValue, TextEditingValue newValue) {
    final rawText = newValue.text;

    if (rawText.isEmpty) {
      return newValue.copyWith(text: '', selection: const TextSelection.collapsed(offset: 0));
    }

    final converted = _convertToWesternDigits(rawText);
    final String? lastChar = converted.isNotEmpty ? String.fromCharCode(converted.codeUnitAt(converted.length - 1)) : null;
    final bool endsWithDecimalSeparator = lastChar != null && _isDecimalSeparator(lastChar);

    var working = converted.replaceAll('٬', '').replaceAll(' ', '').replaceAll('\u00a0', '').replaceAll('٫', '.').replaceAll('،', ',');

    if (!working.contains('.')) {
      final lastCommaIndex = working.lastIndexOf(',');
      if (lastCommaIndex != -1) {
        final decimalsLength = working.length - lastCommaIndex - 1;
        if (decimalsLength > 0 && decimalsLength <= decimalDigits) {
          working = working.replaceRange(lastCommaIndex, lastCommaIndex + 1, '.');
        }
      }
    }

    working = working.replaceAll(',', '');

    final buffer = StringBuffer();
    bool decimalInserted = false;

    for (final ch in working.split('')) {
      if (_isDigit(ch)) {
        buffer.write(ch);
      } else if (!decimalInserted && ch == '.' && decimalDigits != 0) {
        buffer.write('.');
        decimalInserted = true;
      }
    }

    var sanitized = buffer.toString();

    if (sanitized.isEmpty) {
      return TextEditingValue(
        text: '',
        selection: const TextSelection.collapsed(offset: 0),
      );
    }

    if (endsWithDecimalSeparator && decimalDigits != 0 && !sanitized.contains('.')) {
      sanitized += '.';
    }

    if (sanitized.startsWith('.')) {
      sanitized = '0$sanitized';
    }

    final parts = sanitized.split('.');
    final integerPart = parts.first;
    var decimalPart = parts.length > 1 ? parts[1] : '';

    if (decimalDigits == 0) {
      decimalPart = '';
    } else if (decimalPart.length > decimalDigits) {
      decimalPart = decimalPart.substring(0, decimalDigits);
    }

    final int parsedInteger = int.tryParse(integerPart) ?? 0;
    var formatted = _integerFormatter.format(parsedInteger);

    if (decimalDigits != 0) {
      if (decimalPart.isNotEmpty) {
        formatted = '$formatted.$decimalPart';
      } else if (sanitized.endsWith('.')) {
        formatted = '$formatted.';
      }
    }

    return TextEditingValue(
      text: formatted,
      selection: TextSelection.collapsed(offset: formatted.length),
    );
  }

  static String _convertToWesternDigits(String input) {
    final buffer = StringBuffer();
    for (final codePoint in input.runes) {
      final char = String.fromCharCode(codePoint);
      buffer.write(Formatting.toWesternDigit(char));
    }
    return buffer.toString();
  }

  bool _isDigit(String char) {
    return char.length == 1 && RegExp(r'[0-9]').hasMatch(char);
  }

  bool _isDecimalSeparator(String char) {
    return char == '.' || char == ',' || char == '٫' || char == '،';
  }
}
