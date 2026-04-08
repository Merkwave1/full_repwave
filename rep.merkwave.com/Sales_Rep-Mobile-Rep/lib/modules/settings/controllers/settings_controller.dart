// lib/modules/settings/controllers/settings_controller.dart
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:get_storage/get_storage.dart';

class SettingsController extends GetxController {
  final GetStorage _box = GetStorage();

  // Observable for the current locale code (e.g., 'en_US', 'ar_EG')
  final currentLocaleCode = ''.obs;

  // Observable for printer size setting
  final printerSize = '80'.obs; // Default to 80mm

  // Available printer sizes
  final List<String> printerSizes = ['58', '72', '80'];

  // Available languages
  final List<Map<String, String>> languages = [
    {'code': 'en_US', 'name': 'English'},
    {'code': 'ar_EG', 'name': 'العربية'},
  ];

  @override
  void onInit() {
    super.onInit();
    _loadSettings();
  }

  void _loadSettings() {
    // Load saved language preference
    final String? storedLangCode = _box.read('language_code');
    if (storedLangCode != null) {
      currentLocaleCode.value = storedLangCode;
    } else {
      // If no language is stored, use the current GetX locale
      currentLocaleCode.value = Get.locale?.toLanguageTag().replaceAll('-', '_') ?? 'en_US';
    }

    // Load saved printer size preference
    final String? storedPrinterSize = _box.read('printer_size');
    if (storedPrinterSize != null) {
      printerSize.value = storedPrinterSize;
    }
  }

  void changeLanguage(String languageCode) {
    // languageCode will be 'en_US' or 'ar_EG'
    final parts = languageCode.split('_');
    final locale = Locale(parts[0], parts.length > 1 ? parts[1] : '');
    Get.updateLocale(locale);
    currentLocaleCode.value = languageCode;
    _box.write('language_code', languageCode);

    Get.snackbar(
      'Language Changed',
      'Language has been updated successfully',
      snackPosition: SnackPosition.BOTTOM,
    );
  }

  void changePrinterSize(String size) {
    printerSize.value = size;
    _box.write('printer_size', size);

    Get.snackbar(
      'Printer Size Changed',
      'Printer size changed to ${size}mm',
      snackPosition: SnackPosition.BOTTOM,
    );
  }

  String getLanguageName(String code) {
    final language = languages.firstWhere(
      (lang) => lang['code'] == code,
      orElse: () => {'name': 'English'},
    );
    return language['name'] ?? 'English';
  }

  // Get printer size for use in printing logic
  int getPrinterSizeAsInt() {
    return int.tryParse(printerSize.value) ?? 80;
  }
}
