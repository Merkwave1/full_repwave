// lib/modules/profile/controllers/profile_controller.dart
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:get_storage/get_storage.dart'; // Import GetStorage
import '/modules/notifications/controllers/notification_controller.dart'; // To listen to notification count

class ProfileController extends GetxController {
  final GetStorage _box = GetStorage(); // Get an instance of GetStorage

  // Observable for the current locale code (e.g., 'en_US', 'ar_EG')
  // Initialize from storage or default to device locale/English
  final currentLocaleCode = ''.obs;

  // You might want to observe notification count here if you need to react to it within ProfileController
  final NotificationController notificationController = Get.find<NotificationController>();

  @override
  void onInit() {
    super.onInit();
    // Load the saved language preference when the controller initializes
    final String? storedLangCode = _box.read('language_code');
    if (storedLangCode != null) {
      currentLocaleCode.value = storedLangCode;
    } else {
      // If no language is stored, use the current GetX locale (which is set in main.dart)
      currentLocaleCode.value = Get.locale?.toLanguageTag().replaceAll('-', '_') ?? 'en_US';
    }
  }

  void changeLanguage(String languageCode) {
    // languageCode will be 'en_US' or 'ar_EG'
    final parts = languageCode.split('_');
    final locale = Locale(parts[0], parts.length > 1 ? parts[1] : '');
    Get.updateLocale(locale);
    currentLocaleCode.value = languageCode; // Update observable
    _box.write('language_code', languageCode); // Save the selected language
  }

  // Example: navigate to notifications screen
  void goToNotifications() {
    // This would typically be handled by Get.toNamed(AppRoutes.notifications);
    // For now, just a placeholder
    Get.snackbar('Notifications', 'Navigating to notifications screen!');
  }
}
