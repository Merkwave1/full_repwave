import 'package:flutter/material.dart';
import '/shared_widgets/safe_messenger.dart';
import 'package:get/get.dart';

/// Centralized notification helper replacing direct Get.snackbar usage.
/// Provides consistent styling & future-proofing (could swap to overlay/toast later).
class AppNotifier {
  AppNotifier._();

  static void success(String message, {String? title}) => _show(title ?? 'success'.tr, message, background: Colors.green.shade600);
  static void error(String message, {String? title}) => _show(title ?? 'error'.tr, message, background: Colors.red.shade700);
  static void info(String message, {String? title}) => _show(title ?? 'info'.tr, message, background: Colors.blueGrey.shade700);
  static void warning(String message, {String? title}) => _show(title ?? 'warning'.tr, message, background: Colors.orange.shade700);
  static void validation(String message, {String? title}) => _show(title ?? 'validation_error'.tr, message, background: Colors.deepOrange.shade600);

  static void _show(String title, String message, {Color? background}) {
    SafeMessenger.show(message, title: title, background: background);
  }
}
