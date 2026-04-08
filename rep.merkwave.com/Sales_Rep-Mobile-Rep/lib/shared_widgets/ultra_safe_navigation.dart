// lib/shared_widgets/ultra_safe_navigation.dart
import 'package:flutter/material.dart';
import 'package:get/get.dart';

class UltraSafeNavigation {
  /// The most defensive navigation back possible - avoids all GetX snackbar operations
  static void back([BuildContext? context, dynamic result]) {
    // Strategy 1: Try standard Navigator first (most reliable)
    if (context != null && Navigator.of(context).canPop()) {
      try {
        Navigator.of(context).pop(result);
        return;
      } catch (e) {
        // Continue to next strategy
      }
    }

    // Strategy 2: Try GetX navigation without any snackbar operations
    try {
      if (Get.routing.isBack == true) {
        // Use the most basic GetX back without triggering snackbar cleanup
        Get.key.currentState?.pop(result);
        return;
      }
    } catch (e) {
      // Continue to next strategy
    }

    // Strategy 3: Last resort - direct navigator access
    try {
      if (Get.key.currentState != null) {
        Get.key.currentState!.pop(result);
      }
    } catch (e) {
      print('All navigation strategies failed: $e');
    }
  }

  /// Safe navigation to named route
  static Future<T?>? toNamed<T>(String routeName, {dynamic arguments}) {
    try {
      return Get.toNamed<T>(routeName, arguments: arguments);
    } catch (e) {
      print('Navigation error: $e');
      return null;
    }
  }

  /// Safe dialog display
  static Future<T?> dialog<T>(Widget widget, {bool barrierDismissible = true}) {
    try {
      return Get.dialog<T>(widget, barrierDismissible: barrierDismissible);
    } catch (e) {
      print('Dialog error: $e');
      return Future.value(null);
    }
  }

  /// Safe bottom sheet display
  static Future<T?> bottomSheet<T>(Widget bottomsheet) {
    try {
      return Get.bottomSheet<T>(bottomsheet);
    } catch (e) {
      print('Bottom sheet error: $e');
      return Future.value(null);
    }
  }

  /// Displays a floating snackbar with graceful fallbacks. Logs the message if
  /// no visual channel is available.
  static void showMessage(
    String title,
    String message, {
    Color? backgroundColor,
    Color? textColor,
    IconData? icon,
    SnackPosition snackPosition = SnackPosition.BOTTOM,
  }) {
    final Color resolvedBackground = backgroundColor ?? Colors.black87;
    final Color resolvedTextColor = textColor ?? Colors.white;

    try {
      // Close any currently open snackbar to avoid stacking
      if (Get.isSnackbarOpen) {
        Get.back<dynamic>();
      }

      Get.showSnackbar(
        GetSnackBar(
          titleText: Text(
            title,
            style: TextStyle(
              color: resolvedTextColor,
              fontWeight: FontWeight.w700,
              fontSize: 15,
            ),
          ),
          messageText: Text(
            message,
            style: TextStyle(
              color: resolvedTextColor.withOpacity(0.9),
              fontSize: 13,
            ),
          ),
          icon: icon != null ? Icon(icon, color: resolvedTextColor) : null,
          snackPosition: snackPosition,
          snackStyle: SnackStyle.FLOATING,
          backgroundColor: resolvedBackground,
          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          borderRadius: 12,
          duration: const Duration(seconds: 3),
        ),
      );
      return;
    } catch (e) {
      debugPrint('UltraSafeNavigation.showMessage primary channel failed: $e');
    }

    try {
      Get.snackbar(
        title,
        message,
        backgroundColor: resolvedBackground,
        colorText: resolvedTextColor,
        snackPosition: snackPosition,
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        duration: const Duration(seconds: 3),
      );
    } catch (e) {
      debugPrint('UltraSafeNavigation.showMessage fallback failed: $e');
      debugPrint('Message: $title - $message');
    }
  }

  /// Safely close an open dialog (typically a loading dialog) without invoking
  /// Get.back() which internally interacts with snackbar queue and was causing
  /// LateInitializationError in some edge cases.
  ///
  /// If a BuildContext is provided, try using Navigator first. Otherwise fall
  /// back to Get.key.currentState. Silently ignore failures.
  static void closeDialog([BuildContext? context]) {
    try {
      if (context != null) {
        if (Navigator.of(context, rootNavigator: true).canPop()) {
          Navigator.of(context, rootNavigator: true).pop();
          return;
        }
      }
    } catch (e) {
      // Continue to fallback
    }
    try {
      if (Get.isRegistered<GetMaterialController>() && Get.isDialogOpen == true) {
        Get.key.currentState?.pop();
      }
    } catch (e) {
      print('UltraSafeNavigation.closeDialog failed: $e');
    }
  }
}
