// lib/shared_widgets/custom_app_bar.dart
import 'package:flutter/material.dart';
import 'package:get/get.dart';

class CustomAppBar extends StatelessWidget implements PreferredSizeWidget {
  final String title;
  final List<Widget>? actions;
  final bool centerTitle;

  const CustomAppBar({
    super.key,
    required this.title,
    this.actions,
    this.centerTitle = true,
  });

  @override
  Widget build(BuildContext context) {
    return AppBar(
      title: Text(title),
      centerTitle: centerTitle,
      actions: actions,
      backgroundColor: Get.theme.appBarTheme.backgroundColor,
      foregroundColor: Get.theme.appBarTheme.foregroundColor,
      elevation: Get.theme.appBarTheme.elevation,
      shape: Get.theme.appBarTheme.shape,
    );
  }

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight); // Standard AppBar height
}
