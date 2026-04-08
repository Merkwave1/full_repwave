import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '/core/utils/formatting.dart';
import '/core/utils/thousands_separator_input_formatter.dart';

class FormattedAmountField extends StatelessWidget {
  const FormattedAmountField({
    super.key,
    required this.controller,
    this.labelText,
    this.hintText,
    this.validator,
    this.decimalDigits = 2,
    this.enabled = true,
    this.prefixIcon,
    this.onChanged,
    this.focusNode,
    this.autovalidateMode,
  });

  final TextEditingController controller;
  final String? labelText;
  final String? hintText;
  final FormFieldValidator<String>? validator;
  final int decimalDigits;
  final bool enabled;
  final Widget? prefixIcon;
  final ValueChanged<String>? onChanged;
  final FocusNode? focusNode;
  final AutovalidateMode? autovalidateMode;

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller: controller,
      focusNode: focusNode,
      enabled: enabled,
      textAlign: TextAlign.left,
      textDirection: TextDirection.ltr,
      keyboardType: TextInputType.numberWithOptions(decimal: decimalDigits != 0),
      inputFormatters: <TextInputFormatter>[
        ThousandsSeparatorInputFormatter(decimalDigits: decimalDigits),
      ],
      decoration: InputDecoration(
        labelText: labelText,
        hintText: hintText,
        prefixIcon: prefixIcon,
        suffixText: Formatting.currencySymbol(),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
        ),
      ),
      validator: validator,
      onChanged: onChanged,
      autovalidateMode: autovalidateMode,
    );
  }
}
