import 'package:flutter/material.dart';

/// A global safe messenger utilizing ScaffoldMessenger instead of Get.snackbar
/// to avoid GetX SnackbarController lifecycle issues.
class SafeMessenger {
  static final GlobalKey<ScaffoldMessengerState> scaffoldMessengerKey = GlobalKey<ScaffoldMessengerState>();

  static void show(String message, {String? title, Color? background, SnackBarAction? action, Duration duration = const Duration(seconds: 3)}) {
    final messenger = scaffoldMessengerKey.currentState;
    if (messenger == null) {
      // Fallback: just log
      // ignore: avoid_print
      print('SafeMessenger (no context): ${title != null ? '$title: ' : ''}$message');
      return;
    }
    messenger.hideCurrentSnackBar();
    messenger.showSnackBar(
      SnackBar(
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (title != null) Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
            Text(message),
          ],
        ),
        backgroundColor: background,
        action: action,
        duration: duration,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }
}
