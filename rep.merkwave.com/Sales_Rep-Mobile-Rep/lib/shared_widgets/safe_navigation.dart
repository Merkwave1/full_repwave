// lib/shared_widgets/safe_navigation.dart
import 'package:flutter/material.dart';
import 'package:get/get.dart';

class SafeNavigation {
  /// Safely goes back, handling snackbar and navigation issues
  static void back([BuildContext? context, dynamic result]) {
    // Avoid Get.back() entirely as it can trigger uninitialized SnackbarController
    // Use only Navigator.pop() to prevent LateInitializationError

    // Try context-based navigation first
    try {
      if (context != null && Navigator.of(context).canPop()) {
        Navigator.of(context).pop(result);
        return;
      }
    } catch (e) {
      // Continue to fallback
    }

    // Fallback to global navigator key without touching GetX
    try {
      if (Get.key.currentState?.canPop() == true) {
        Get.key.currentState?.pop(result);
        return;
      }
    } catch (e) {
      // Last resort: print error for debugging
      print('SafeNavigation.back failed: $e');
    }
  }

  /// Safely close dialog with BuildContext
  static void closeDialog(BuildContext context, {dynamic result}) {
    try {
      Navigator.of(context).pop(result);
    } catch (e) {
      // Fallback to global navigator without Get.back
      try {
        Get.key.currentState?.pop(result);
      } catch (_) {
        print('SafeNavigation.closeDialog failed: $e');
      }
    }
  }

  /// Safely closes all snackbars without throwing errors
  static void closeSnackbars() {
    try {
      // Avoid GetX snackbar methods that can trigger uninitialized controller
      // Instead, rely on ScaffoldMessenger which is more stable
      if (Get.context != null) {
        ScaffoldMessenger.of(Get.context!).clearSnackBars();
      }
    } catch (e) {
      // Ignore all snackbar errors - the controller might not be initialized
      print('Snackbar close error (safely ignored): $e');
    }
  }

  /// Shows a snackbar with error handling
  static void showSnackbar({
    required String title,
    required String message,
    Color? backgroundColor,
    Color? colorText,
    Duration? duration,
  }) {
    try {
      // Check if GetX is properly initialized before showing snackbar
      if (Get.isRegistered<GetMaterialController>()) {
        // Avoid closing existing snackbars to prevent controller issues
        // Just show the new snackbar directly
        Get.snackbar(
          title,
          message,
          backgroundColor: backgroundColor,
          colorText: colorText,
          duration: duration ?? const Duration(seconds: 3),
          snackPosition: SnackPosition.BOTTOM,
        );
      } else {
        // GetX not properly initialized, use ScaffoldMessenger
        if (Get.context != null) {
          ScaffoldMessenger.of(Get.context!).showSnackBar(
            SnackBar(
              content: Text('$title: $message'),
              backgroundColor: backgroundColor,
              duration: duration ?? const Duration(seconds: 3),
            ),
          );
        } else {
          print('Snackbar skipped - no context: $title - $message');
        }
      }
    } catch (e) {
      // Fallback to ScaffoldMessenger if GetX fails
      try {
        if (Get.context != null) {
          ScaffoldMessenger.of(Get.context!).showSnackBar(
            SnackBar(
              content: Text('$title: $message'),
              backgroundColor: backgroundColor,
              duration: duration ?? const Duration(seconds: 3),
            ),
          );
        }
      } catch (fallbackError) {
        print('Snackbar error: $e, fallback also failed: $fallbackError');
      }
    }
  }

  /// Safely navigates to a new route
  static Future<T?>? toNamed<T>(String routeName, {dynamic arguments}) {
    try {
      return Get.toNamed<T>(routeName, arguments: arguments);
    } catch (e) {
      print('Navigation error: $e');
      return null;
    }
  }

  /// Safely navigates and replaces current route
  static Future<T?>? offNamed<T>(String routeName, {dynamic arguments}) {
    try {
      return Get.offNamed<T>(routeName, arguments: arguments);
    } catch (e) {
      print('Navigation error: $e');
      return null;
    }
  }

  /// Safely shows a dialog
  static Future<T?> dialog<T>(Widget widget, {bool barrierDismissible = true}) {
    try {
      return Get.dialog<T>(widget, barrierDismissible: barrierDismissible);
    } catch (e) {
      print('Dialog error: $e');
      return Future.value(null);
    }
  }

  /// Safely shows a bottom sheet
  static Future<T?> bottomSheet<T>(
    Widget bottomsheet, {
    Color? backgroundColor,
    double? elevation,
    bool persistent = true,
    ShapeBorder? shape,
    Clip? clipBehavior,
    Color? barrierColor,
    bool? ignoreSafeArea,
    bool isScrollControlled = false,
    bool useRootNavigator = false,
    bool isDismissible = true,
    bool enableDrag = true,
    RouteSettings? settings,
    Duration? enterBottomSheetDuration,
    Duration? exitBottomSheetDuration,
  }) {
    try {
      return Get.bottomSheet<T>(
        bottomsheet,
        backgroundColor: backgroundColor,
        elevation: elevation,
        persistent: persistent,
        shape: shape,
        clipBehavior: clipBehavior,
        barrierColor: barrierColor,
        ignoreSafeArea: ignoreSafeArea,
        isScrollControlled: isScrollControlled,
        useRootNavigator: useRootNavigator,
        isDismissible: isDismissible,
        enableDrag: enableDrag,
        settings: settings,
        enterBottomSheetDuration: enterBottomSheetDuration,
        exitBottomSheetDuration: exitBottomSheetDuration,
      );
    } catch (e) {
      print('Bottom sheet error: $e');
      return Future.value(null);
    }
  }

  /// Generic confirmation dialog helper that returns true when confirmed.
  static Future<bool> showConfirmationDialog({
    required BuildContext context,
    required String title,
    required String message,
    String? confirmText,
    String? cancelText,
    IconData? icon,
    Color? iconColor,
    bool barrierDismissible = false,
  }) async {
    final result = await showDialog<bool>(
      context: context,
      barrierDismissible: barrierDismissible,
      builder: (dialogContext) {
        return AlertDialog(
          title: Row(
            children: [
              if (icon != null) ...[
                Icon(icon, color: iconColor ?? Get.theme.colorScheme.primary),
                const SizedBox(width: 8),
              ],
              Expanded(child: Text(title, style: Get.textTheme.titleMedium)),
            ],
          ),
          content: Text(
            message,
            style: Get.textTheme.bodyMedium,
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(false),
              child: Text(cancelText ?? 'cancel'.tr),
            ),
            ElevatedButton(
              onPressed: () => Navigator.of(dialogContext).pop(true),
              child: Text(confirmText ?? 'confirm'.tr),
            ),
          ],
        );
      },
    );

    return result ?? false;
  }

  /// Shows exit confirmation dialog when user tries to close the app
  static Future<bool> showExitConfirmation(BuildContext context) async {
    final result = await showDialog<bool>(
      context: context,
      barrierDismissible: false, // Prevent dismissing by tapping outside
      builder: (BuildContext context) {
        return AlertDialog(
          title: Text('exit_confirmation_title'.tr),
          content: Text('exit_confirmation_message'.tr),
          actions: <Widget>[
            TextButton(
              onPressed: () => Navigator.of(context).pop(false), // Cancel
              child: Text('no'.tr),
            ),
            TextButton(
              onPressed: () => Navigator.of(context).pop(true), // Confirm exit
              child: Text('yes'.tr),
            ),
          ],
        );
      },
    );
    return result ?? false; // Return false if dialog is dismissed
  }
}
