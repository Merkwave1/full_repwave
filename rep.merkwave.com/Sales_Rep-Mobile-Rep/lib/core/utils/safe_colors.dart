// lib/core/utils/safe_colors.dart
import 'package:flutter/material.dart';

/// Utility class for handling safe colors
/// Maps backend color enum values to Flutter Color objects
class SafeColors {
  // Color mapping matching the backend enum values
  static const Map<String, Color> colorMap = {
    'white': Color(0xFFFFFFFF),
    'black': Color(0xFF111827), // gray-900 for better visibility
    'lightgray': Color(0xFFD1D5DB), // gray-300
    'gray': Color(0xFF6B7280), // gray-500
    'blue': Color(0xFF3B82F6), // blue-500
    'green': Color(0xFF10B981), // green-500
    'red': Color(0xFFEF4444), // red-500
    'yellow': Color(0xFFF59E0B), // yellow-500
    'orange': Color(0xFFF97316), // orange-500
    'beige': Color(0xFFD4C5B9), // amber-200 equivalent
  };

  // Text color for contrast (use dark text on light backgrounds, light text on dark)
  static const Map<String, Color> textColorMap = {
    'white': Color(0xFF1F2937), // gray-800
    'black': Color(0xFFFFFFFF),
    'lightgray': Color(0xFF1F2937), // gray-800
    'gray': Color(0xFFFFFFFF),
    'blue': Color(0xFFFFFFFF),
    'green': Color(0xFFFFFFFF),
    'red': Color(0xFFFFFFFF),
    'yellow': Color(0xFFFFFFFF),
    'orange': Color(0xFFFFFFFF),
    'beige': Color(0xFF1F2937), // gray-800
  };

  // Border colors for better visual separation
  static const Map<String, Color> borderColorMap = {
    'white': Color(0xFFD1D5DB), // gray-300
    'black': Color(0xFF111827), // gray-900
    'lightgray': Color(0xFF9CA3AF), // gray-400
    'gray': Color(0xFF4B5563), // gray-600
    'blue': Color(0xFF2563EB), // blue-600
    'green': Color(0xFF059669), // green-600
    'red': Color(0xFFDC2626), // red-600
    'yellow': Color(0xFFD97706), // yellow-600
    'orange': Color(0xFFEA580C), // orange-600
    'beige': Color(0xFFFBBF24), // amber-300
  };

  // Arabic color names for display
  static const Map<String, String> colorNamesAr = {
    'white': 'أبيض',
    'black': 'أسود',
    'lightgray': 'رمادي فاتح',
    'gray': 'رمادي',
    'blue': 'أزرق',
    'green': 'أخضر',
    'red': 'أحمر',
    'yellow': 'أصفر',
    'orange': 'برتقالي',
    'beige': 'بيج',
  };

  /// Get the background color for a given safe color string
  static Color getBackgroundColor(String? colorName) {
    return colorMap[colorName?.toLowerCase()] ?? colorMap['white']!;
  }

  /// Get the text color for a given safe color string (for contrast)
  static Color getTextColor(String? colorName) {
    return textColorMap[colorName?.toLowerCase()] ?? textColorMap['white']!;
  }

  /// Get the border color for a given safe color string
  static Color getBorderColor(String? colorName) {
    return borderColorMap[colorName?.toLowerCase()] ?? borderColorMap['white']!;
  }

  /// Get the Arabic name for a given safe color string
  static String getColorNameAr(String? colorName) {
    return colorNamesAr[colorName?.toLowerCase()] ?? colorNamesAr['white']!;
  }

  /// Check if a color name is valid
  static bool isValidColor(String? colorName) {
    return colorMap.containsKey(colorName?.toLowerCase());
  }

  /// Get a lighter shade for subtle backgrounds (20% opacity)
  static Color getLightShade(String? colorName) {
    final baseColor = getBackgroundColor(colorName);
    return baseColor.withOpacity(0.2);
  }

  /// Get a medium shade for hover states (40% opacity)
  static Color getMediumShade(String? colorName) {
    final baseColor = getBackgroundColor(colorName);
    return baseColor.withOpacity(0.4);
  }

  /// Create a BoxDecoration with safe color styling
  static BoxDecoration createDecoration({
    required String? colorName,
    double borderRadius = 8.0,
    double borderWidth = 1.0,
    bool useLightBackground = false,
  }) {
    final bgColor = useLightBackground ? getLightShade(colorName) : getBackgroundColor(colorName);

    return BoxDecoration(
      color: bgColor,
      borderRadius: BorderRadius.circular(borderRadius),
      border: Border.all(
        color: getBorderColor(colorName),
        width: borderWidth,
      ),
    );
  }

  /// Create a gradient decoration with safe color
  static BoxDecoration createGradientDecoration({
    required String? colorName,
    double borderRadius = 8.0,
    double borderWidth = 1.0,
  }) {
    final baseColor = getBackgroundColor(colorName);

    return BoxDecoration(
      gradient: LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [
          baseColor,
          baseColor.withOpacity(0.8),
        ],
      ),
      borderRadius: BorderRadius.circular(borderRadius),
      border: Border.all(
        color: getBorderColor(colorName),
        width: borderWidth,
      ),
      boxShadow: [
        BoxShadow(
          color: baseColor.withOpacity(0.3),
          blurRadius: 4,
          offset: const Offset(0, 2),
        ),
      ],
    );
  }
}
