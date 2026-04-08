// lib/modules/settings/screens/settings_screen.dart
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import '/shared_widgets/ultra_safe_navigation.dart';
import 'package:get/get.dart';
import '/modules/auth/controllers/auth_controller.dart';
import '/modules/settings/controllers/settings_controller.dart';

class SettingsScreen extends GetView<SettingsController> {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final AuthController authController = Get.find<AuthController>();

    return Scaffold(
      appBar: AppBar(
        title: Text('settings'.tr),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Language Settings Card
            Card(
              elevation: 2,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.language, color: Get.theme.primaryColor),
                        const SizedBox(width: 8),
                        Text(
                          'language_settings'.tr,
                          style: Get.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Obx(() => ListTile(
                          title: Text('select_language'.tr),
                          subtitle: Text(controller.getLanguageName(controller.currentLocaleCode.value)),
                          trailing: DropdownButton<String>(
                            value: controller.currentLocaleCode.value,
                            onChanged: (String? newValue) {
                              if (newValue != null) {
                                controller.changeLanguage(newValue);
                              }
                            },
                            items: controller.languages.map<DropdownMenuItem<String>>((language) {
                              return DropdownMenuItem<String>(
                                value: language['code'],
                                child: Text(language['name'] ?? ''),
                              );
                            }).toList(),
                          ),
                        )),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Printer Settings Card
            Card(
              elevation: 2,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.print, color: Get.theme.primaryColor),
                        const SizedBox(width: 8),
                        Text(
                          'printer_settings'.tr,
                          style: Get.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Obx(() => ListTile(
                          title: Text('printer_paper_size'.tr),
                          subtitle: Text('${controller.printerSize.value}mm'),
                          trailing: DropdownButton<String>(
                            value: controller.printerSize.value,
                            onChanged: (String? newValue) {
                              if (newValue != null) {
                                controller.changePrinterSize(newValue);
                              }
                            },
                            items: controller.printerSizes.map<DropdownMenuItem<String>>((size) {
                              return DropdownMenuItem<String>(
                                value: size,
                                child: Text('${size}mm'),
                              );
                            }).toList(),
                          ),
                        )),
                    const Divider(),
                    ListTile(
                      leading: Icon(Icons.info_outline, color: Colors.blue),
                      title: Text('printer_size_info'.tr),
                      subtitle: Text('printer_size_description'.tr),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Debug Tools Card (only show in debug mode)
            if (kDebugMode)
              Card(
                elevation: 2,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(Icons.bug_report, color: Get.theme.primaryColor),
                          const SizedBox(width: 8),
                          Text(
                            'Debug Tools',
                            style: Get.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                    ],
                  ),
                ),
              ),
            const SizedBox(height: 16),

            // Account Actions Card
            Card(
              elevation: 2,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.account_circle, color: Get.theme.primaryColor),
                        const SizedBox(width: 8),
                        Text(
                          'account_actions'.tr,
                          style: Get.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    ListTile(
                      leading: const Icon(Icons.logout, color: Colors.redAccent),
                      title: Text('logout'.tr),
                      subtitle: Text('sign_out_of_account'.tr),
                      onTap: () {
                        Get.defaultDialog(
                          title: 'logout_confirmation_title'.tr,
                          middleText: 'logout_confirmation_message'.tr,
                          textConfirm: 'yes'.tr,
                          textCancel: 'no'.tr,
                          confirmTextColor: Colors.white,
                          cancelTextColor: Colors.black,
                          buttonColor: Colors.redAccent,
                          onConfirm: () {
                            UltraSafeNavigation.back(context);
                            authController.logout();
                          },
                          onCancel: () {
                            UltraSafeNavigation.back(context);
                          },
                        );
                      },
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
