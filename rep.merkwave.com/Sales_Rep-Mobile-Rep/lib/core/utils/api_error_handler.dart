// lib/core/utils/api_error_handler.dart
import 'package:get/get.dart';

/// Utility class to translate API error messages to user-friendly localized messages
class ApiErrorHandler {
  /// Translates server error messages to localized user-friendly messages
  ///
  /// This method analyzes the error message from the API and returns
  /// an appropriate translated message for the user.
  static String translateErrorMessage(String errorMessage) {
    // Clean up the error message
    final cleanMessage = errorMessage.trim();

    // Database Error patterns
    if (cleanMessage.contains('Database Error:')) {
      final actualError = cleanMessage.replaceFirst('Database Error:', '').trim();
      return _translateDatabaseError(actualError);
    }

    // Direct error patterns
    return _translateDirectError(cleanMessage);
  }

  /// Handles Database Error messages
  static String _translateDatabaseError(String error) {
    // Active visit exists
    if (error.contains('already has an active visit in progress')) {
      return 'api_error_active_visit_exists'.tr;
    }

    // Must be at client location (start)
    if (error.contains('You must be at the client location to start this visit')) {
      // Extract distance if available
      final distanceMatch = RegExp(r'Current distance: (\d+)').firstMatch(error);
      if (distanceMatch != null) {
        final distance = distanceMatch.group(1);
        return 'api_error_must_be_at_client_location_start'.tr + '\n' + 'api_error_distance_from_client'.trParams({'distance': distance ?? '0'});
      }
      return 'api_error_must_be_at_client_location_start'.tr;
    }

    // Must be at client location (end)
    if (error.contains('You must be at the client location to end this visit')) {
      // Extract distance if available
      final distanceMatch = RegExp(r'Current distance: (\d+)').firstMatch(error);
      if (distanceMatch != null) {
        final distance = distanceMatch.group(1);
        return 'api_error_must_be_at_client_location_end'.tr + '\n' + 'api_error_distance_from_client'.trParams({'distance': distance ?? '0'});
      }
      return 'api_error_must_be_at_client_location_end'.tr;
    }

    // Client location not set
    if (error.contains('Client location not set')) {
      return 'api_error_client_location_not_set'.tr;
    }

    // No active visit found
    if (error.contains('No active visit found')) {
      return 'api_error_no_active_visit_found'.tr;
    }

    // Visit already completed
    if (error.contains('already been completed')) {
      return 'api_error_visit_already_completed'.tr;
    }

    // Client not found
    if (error.contains('Client not found')) {
      return 'api_error_client_not_found'.tr;
    }

    // Invalid user UUID
    if (error.contains('Invalid user UUID')) {
      return 'api_error_invalid_user_uuid'.tr;
    }

    // Not scheduled in visit plan for today
    if (error.contains('not scheduled in your visit plan for today')) {
      return 'api_error_client_not_in_plan_today'.tr;
    }

    // Generic database error
    return 'api_error_database_error'.tr;
  }

  /// Handles direct error messages (not prefixed with "Database Error:")
  static String _translateDirectError(String error) {
    final lowerError = error.toLowerCase();

    // Check for common error patterns
    if (lowerError.contains('you must be at the client location to start this visit')) {
      final distanceMatch = RegExp(r'current distance:\s*(\d+)', caseSensitive: false).firstMatch(error);
      if (distanceMatch != null) {
        final distance = distanceMatch.group(1);
        return 'api_error_must_be_at_client_location_start'.tr + '\n' + 'api_error_distance_from_client'.trParams({'distance': distance ?? '0'});
      }
      return 'api_error_must_be_at_client_location_start'.tr;
    }

    if (lowerError.contains('you must be at the client location to end this visit')) {
      final distanceMatch = RegExp(r'current distance:\s*(\d+)', caseSensitive: false).firstMatch(error);
      if (distanceMatch != null) {
        final distance = distanceMatch.group(1);
        return 'api_error_must_be_at_client_location_end'.tr + '\n' + 'api_error_distance_from_client'.trParams({'distance': distance ?? '0'});
      }
      return 'api_error_must_be_at_client_location_end'.tr;
    }

    if (lowerError.contains('client location not set')) {
      return 'api_error_client_location_not_set'.tr;
    }

    if (lowerError.contains('no active visit found')) {
      return 'api_error_no_active_visit_found'.tr;
    }

    if (lowerError.contains('already been completed')) {
      return 'api_error_visit_already_completed'.tr;
    }

    if (lowerError.contains('client not found')) {
      return 'api_error_client_not_found'.tr;
    }

    if (lowerError.contains('invalid user uuid')) {
      return 'api_error_invalid_user_uuid'.tr;
    }

    if (error.contains('User UUID not available')) {
      return 'api_error_invalid_user_uuid'.tr;
    }

    // Not scheduled in visit plan for today
    if (lowerError.contains('not scheduled in your visit plan for today')) {
      return 'api_error_client_not_in_plan_today'.tr;
    }

    if (lowerError.contains('network') || lowerError.contains('connection')) {
      return 'error'.tr + ': ' + 'check_internet_connection'.tr;
    }

    // Return generic error for unknown cases
    return 'api_error_unknown'.tr;
  }

  /// Extracts distance from error message if available
  static String? extractDistance(String errorMessage) {
    final distanceMatch = RegExp(r'(\d+)\s*meters?').firstMatch(errorMessage);
    return distanceMatch?.group(1);
  }

  /// Checks if error is related to location validation
  static bool isLocationError(String errorMessage) {
    return errorMessage.contains('must be at') || errorMessage.contains('location') || errorMessage.contains('distance');
  }

  /// Formats error message for display
  static String formatErrorForDisplay(String errorMessage) {
    final translatedMessage = translateErrorMessage(errorMessage);

    // Add distance info if it's a location error
    if (isLocationError(errorMessage)) {
      final distance = extractDistance(errorMessage);
      if (distance != null) {
        return translatedMessage + '\n' + 'distance_meters'.trParams({'distance': distance});
      }
    }

    return translatedMessage;
  }
}
