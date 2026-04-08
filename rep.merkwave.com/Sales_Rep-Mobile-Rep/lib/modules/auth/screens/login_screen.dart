// lib/modules/auth/screens/login_screen.dart
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:package_info_plus/package_info_plus.dart';
// Removed: import 'package:get_storage/get_storage.dart'; // No longer directly used here, managed by ProfileController
import '/modules/auth/controllers/auth_controller.dart';
import '/modules/settings/controllers/settings_controller.dart'; // Use SettingsController for language

class LoginScreen extends GetView<AuthController> {
  const LoginScreen({super.key});

  @override
  Widget build(BuildContext context) {
    // Use SettingsController as the single source of truth for language
    final SettingsController settingsController = Get.find<SettingsController>();
    final theme = Theme.of(context);

    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              theme.primaryColor.withOpacity(0.1),
              Colors.blue.shade50,
              Colors.white,
              Colors.indigo.shade50,
            ],
            stops: const [0.0, 0.3, 0.7, 1.0],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: <Widget>[
                  // Language Toggle at the top

                  // Logo and Brand Section
                  _AnimatedBrandSection(theme: theme),
                  const SizedBox(height: 25.0),

                  // Login Form Card
                  _buildLoginCard(theme),

                  const SizedBox(height: 25.0),
                  _buildLanguageToggle(settingsController, theme),

                  const SizedBox(height: 30.0),

                  // Copyright Footer
                  _buildCopyrightFooter(),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildCopyrightFooter() {
    return Column(
      children: [
        FutureBuilder<PackageInfo>(
          future: PackageInfo.fromPlatform(),
          builder: (context, snapshot) {
            final version = snapshot.data?.version ?? '...';
            return Text(
              'v$version',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 12,
                color: Colors.grey.shade600,
                fontWeight: FontWeight.w500,
              ),
            );
          },
        ),
        const SizedBox(height: 4),
        Text(
          'RepWave © Copyright 2025. All Rights Reserved.',
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 11,
            color: Colors.grey.shade500,
          ),
        ),
      ],
    );
  }

  Widget _buildLanguageToggle(SettingsController settingsController, ThemeData theme) {
    return Align(
      alignment: Alignment.topRight,
      child: Container(
        padding: const EdgeInsets.all(4),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.9),
          borderRadius: BorderRadius.circular(25),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.08),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Obx(() {
          final isEnglish = settingsController.currentLocaleCode.value.startsWith('en');
          return Center(
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                _buildLanguageOption('عربى', !isEnglish, theme, () {
                  settingsController.changeLanguage('ar_EG');
                }),
                const SizedBox(width: 4),
                _buildLanguageOption('English', isEnglish, theme, () {
                  settingsController.changeLanguage('en_US');
                }),
              ],
            ),
          );
        }),
      ),
    );
  }

  Widget _buildLanguageOption(String text, bool isSelected, ThemeData theme, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? theme.primaryColor : Colors.transparent,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          text,
          style: TextStyle(
            fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
            color: isSelected ? Colors.white : Colors.grey.shade700,
            fontSize: 14,
          ),
        ),
      ),
    );
  }

  Widget _buildLoginCard(ThemeData theme) {
    return Container(
      padding: const EdgeInsets.all(28.0),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.08),
            blurRadius: 25,
            offset: const Offset(0, 10),
            spreadRadius: 0,
          ),
          BoxShadow(
            color: theme.primaryColor.withOpacity(0.05),
            blurRadius: 40,
            offset: const Offset(0, 20),
            spreadRadius: 0,
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Company Name Field
          _buildEnhancedTextField(
            controller: controller.companyController,
            labelText: 'company_name'.tr,
            hintText: 'enter_company_name'.tr,
            prefixIcon: Icons.business,
            keyboardType: TextInputType.text,
            theme: theme,
          ),
          const SizedBox(height: 20.0),

          // Email Field
          _buildEnhancedTextField(
            controller: controller.emailController,
            labelText: 'email'.tr,
            hintText: 'enter_your_email'.tr,
            prefixIcon: Icons.email_outlined,
            keyboardType: TextInputType.emailAddress,
            theme: theme,
          ),
          const SizedBox(height: 20.0),

          // Password Field
          Obx(() => _buildEnhancedTextField(
                controller: controller.passwordController,
                labelText: 'password'.tr,
                hintText: 'enter_your_password'.tr,
                prefixIcon: Icons.lock_outline_rounded,
                obscureText: controller.isPasswordHidden.value,
                theme: theme,
                suffixIcon: IconButton(
                  onPressed: controller.togglePasswordVisibility,
                  icon: Icon(
                    controller.isPasswordHidden.value ? Icons.lock : Icons.lock_open,
                    color: theme.primaryColor,
                  ),
                ),
              )),
          const SizedBox(height: 32.0),

          // Error Message
          Obx(() => controller.errorMessage.value.isNotEmpty
              ? Container(
                  margin: const EdgeInsets.only(bottom: 20.0),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.red.shade50,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.red.shade200),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.error_outline, color: Colors.red.shade600, size: 20),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          controller.errorMessage.value,
                          style: TextStyle(
                            color: Colors.red.shade700,
                            fontSize: 14.0,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ],
                  ),
                )
              : const SizedBox.shrink()),

          // Login Button
          Obx(() => controller.isLoading.value
              ? Container(
                  height: 56,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        theme.primaryColor.withOpacity(0.8),
                        Colors.indigo.shade600.withOpacity(0.8),
                      ],
                    ),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: const Center(
                    child: SizedBox(
                      width: 24,
                      height: 24,
                      child: CircularProgressIndicator(
                        valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                        strokeWidth: 2.5,
                      ),
                    ),
                  ),
                )
              : _buildEnhancedButton(
                  onPressed: controller.login,
                  text: 'login'.tr,
                  theme: theme,
                )),
        ],
      ),
    );
  }

  Widget _buildEnhancedTextField({
    required TextEditingController controller,
    required String labelText,
    required String hintText,
    required IconData prefixIcon,
    required ThemeData theme,
    TextInputType keyboardType = TextInputType.text,
    bool obscureText = false,
    Widget? suffixIcon,
  }) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: TextField(
        controller: controller,
        keyboardType: keyboardType,
        obscureText: obscureText,
        style: const TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w500,
        ),
        decoration: InputDecoration(
          labelText: labelText,
          hintText: hintText,
          suffixIcon: suffixIcon,
          prefixIcon: Container(
            margin: const EdgeInsets.only(left: 12, right: 8),
            child: Icon(
              prefixIcon,
              color: theme.primaryColor.withOpacity(0.7),
              size: 22,
            ),
          ),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: BorderSide.none,
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: BorderSide(
              color: Colors.grey.shade200,
              width: 1.5,
            ),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: BorderSide(
              color: theme.primaryColor,
              width: 2.0,
            ),
          ),
          filled: true,
          fillColor: Colors.grey.shade50,
          contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
          labelStyle: TextStyle(
            color: Colors.grey.shade700,
            fontSize: 14,
            fontWeight: FontWeight.w500,
          ),
          hintStyle: TextStyle(
            color: Colors.grey.shade500,
            fontSize: 15,
          ),
        ),
      ),
    );
  }

  Widget _buildEnhancedButton({
    required VoidCallback onPressed,
    required String text,
    required ThemeData theme,
  }) {
    return Container(
      height: 56,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            theme.primaryColor,
            Colors.indigo.shade600,
          ],
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: theme.primaryColor.withOpacity(0.3),
            blurRadius: 12,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onPressed,
          borderRadius: BorderRadius.circular(16),
          child: Center(
            child: Text(
              text,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 17,
                fontWeight: FontWeight.w600,
                letterSpacing: 0.5,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// Animated Brand Section Widget with spinning logo
class _AnimatedBrandSection extends StatefulWidget {
  final ThemeData theme;

  const _AnimatedBrandSection({required this.theme});

  @override
  State<_AnimatedBrandSection> createState() => _AnimatedBrandSectionState();
}

class _AnimatedBrandSectionState extends State<_AnimatedBrandSection> with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(seconds: 3),
      vsync: this,
    )..repeat(); // Continuously repeat the animation
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Spinning Logo
        AnimatedBuilder(
          animation: _controller,
          builder: (context, child) {
            return Transform.rotate(
              angle: _controller.value * 2.0 * 3.14159, // Full rotation (2π)
              child: child,
            );
          },
          child: Image.asset(
            'assets/logo.png',
            width: 120,
            height: 120,
            fit: BoxFit.contain,
          ),
        ),
        const SizedBox(height: 16.0),
        // "RepWave" Text
        const Text(
          'RepWave',
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 28,
            fontWeight: FontWeight.bold,
            color: Color(0xFF2C3E50),
            letterSpacing: 1.2,
          ),
        ),
      ],
    );
  }
}
