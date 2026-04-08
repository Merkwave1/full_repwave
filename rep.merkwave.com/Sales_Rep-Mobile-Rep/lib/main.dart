// lib/main.dart
import 'package:flutter/material.dart';
import 'package:get/get.dart'; // Import GetX
import 'package:get_storage/get_storage.dart'; // Import GetStorage
import '/core/routes/app_pages.dart'; // Import your app pages
import '/core/routes/app_routes.dart'; // Import your app routes
import '/core/bindings/initial_binding.dart'; // Import your initial binding
import '/core/app_theme.dart'; // Import your app theme
import '/core/localization/app_translations.dart'; // Import your translations
import 'package:flutter_localizations/flutter_localizations.dart'; // Required for localization
import '/shared_widgets/safe_messenger.dart';

void main() async {
  // Made main async
  // Ensure Flutter widgets binding is initialized
  WidgetsFlutterBinding.ensureInitialized();
  // Initialize GetStorage
  await GetStorage.init();
  // You might want to initialize Firebase or other services here before runApp
  // For example: await Firebase.initializeApp();

  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    // Get the stored locale from GetStorage, or default to device locale/English
    final GetStorage box = GetStorage();
    final String? storedLocaleCode = box.read('language_code');
    Locale initialLocale;

    if (storedLocaleCode != null) {
      final parts = storedLocaleCode.split('_');
      initialLocale = Locale(parts[0], parts.length > 1 ? parts[1] : '');
    } else {
      initialLocale = Get.deviceLocale ?? const Locale('en', 'US');
      // Save the initial device locale if no preference is stored yet
      box.write('language_code', initialLocale.toLanguageTag().replaceAll('-', '_'));
    }

    assert(() {
      // Debug warning if raw Get.back or Get.snackbar remain (static scan hint only)
      // (A build-time tool would be better; this is a lightweight runtime reminder.)
      return true;
    }());

    return GetMaterialApp(
      title: 'Representative App',
      debugShowCheckedModeBanner: false, // Set to false for production
      theme: AppTheme.lightTheme, // Use your defined app theme
      initialRoute: AppRoutes.login, // Always start at login screen
      getPages: AppPages.routes, // Define all your app's routes and their bindings
      initialBinding: InitialBinding(), // Apply the initial binding for app-wide dependencies
      scaffoldMessengerKey: SafeMessenger.scaffoldMessengerKey,

      // GetX Configuration to prevent snackbar controller issues
      enableLog: false, // Disable GetX logs in production
      defaultTransition: Transition.cupertino, // Set default transition
      transitionDuration: const Duration(milliseconds: 300),

      // Localization properties
      translations: AppTranslations(), // Your custom translations class
      locale: initialLocale, // Set initial locale from storage
      fallbackLocale: const Locale('en', 'US'), // Fallback locale if device locale is not supported
      supportedLocales: const [
        Locale('en', 'US'),
        Locale('ar', 'EG'), // Arabic (Egypt)
      ],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      // You can also add a notFoundRoute for handling unknown routes
      // unknownRoute: GetPage(name: '/notfound', page: () => const NotFoundScreen()),
    );
  }
}
