// lib/data/datasources/visit_remote_datasource.dart
import '/data/models/visit.dart';
import '/services/api_service.dart'; // Your existing ApiService
import '/modules/auth/controllers/auth_controller.dart'; // Import AuthController to get user UUID
import '/core/utils/api_error_handler.dart'; // Import ApiErrorHandler
import 'package:get/get.dart'; // Import Get for Get.find
import 'dart:convert'; // Import for jsonEncode

class VisitRemoteDatasource {
  final ApiService _apiService;
  final AuthController _authController = Get.find<AuthController>(); // Get AuthController

  VisitRemoteDatasource(this._apiService);

  // Helper to get the current user's UUID
  String? get _userUuid => _authController.currentUser.value?.uuid;

  Future<Visit> startVisit(int clientId, int repUserId, double latitude, double longitude, {String? purpose}) async {
    if (_userUuid == null) {
      throw Exception(ApiErrorHandler.translateErrorMessage('User UUID not available. Cannot start visit.'));
    }

    try {
      final Map<String, dynamic> responseData = await _apiService.post(
        '/visits/start.php',
        {
          'client_id': clientId,
          'users_uuid': _userUuid,
          'latitude': latitude,
          'longitude': longitude,
          'purpose': purpose ?? 'General visit',
        },
      );

      final String status = responseData['status']?.toString().toLowerCase() ?? '';
      if (status != 'success') {
        final dynamic serverMessage = responseData['message'];
        throw Exception(serverMessage?.toString() ?? 'Unknown error');
      }

      // Check if the response contains the visit_id
      if (responseData.containsKey('data') && responseData['data'] is Map<String, dynamic>) {
        final Map<String, dynamic> data = responseData['data'] as Map<String, dynamic>;

        if (data.containsKey('visit_id')) {
          final int visitId = data['visit_id'] as int;
          final DateTime now = DateTime.now();

          return Visit(
            id: visitId,
            clientId: clientId,
            repUserId: repUserId,
            startTime: now,
            endTime: null,
            startLatitude: latitude,
            startLongitude: longitude,
            endLatitude: null,
            endLongitude: null,
            status: 'Started',
            purpose: purpose ?? 'General visit',
            outcome: null,
            notes: null,
            createdAt: now,
            updatedAt: now,
            client: null,
            representative: null,
          );
        }
      }

      throw Exception('Invalid response format: Missing visit_id');
    } catch (e) {
      // Extract the actual error message from the exception
      String errorMessage = e.toString();

      // Remove "Exception: " prefix if present
      if (errorMessage.startsWith('Exception: ')) {
        errorMessage = errorMessage.substring('Exception: '.length);
      }

      // Remove "API Error (XXX): " prefix if present
      errorMessage = errorMessage.replaceFirst(RegExp(r'API Error \(\d+\):\s*'), '');

      // Translate and throw
      throw Exception(ApiErrorHandler.translateErrorMessage(errorMessage));
    }
  }

  Future<Visit?> endVisit(int visitId, double latitude, double longitude, String outcome, String notes) async {
    if (_userUuid == null) {
      throw Exception(ApiErrorHandler.translateErrorMessage('User UUID not available. Cannot end visit.'));
    }

    try {
      final Map<String, dynamic> responseData = await _apiService.post(
        '/visits/end.php',
        {
          'visit_id': visitId,
          'latitude': latitude,
          'longitude': longitude,
          'outcome': outcome,
          'notes': notes,
          'users_uuid': _userUuid,
        },
      );
      print('End Visit API Response: ${jsonEncode(responseData)}');

      // Handle successful response
      final String status = responseData['status']?.toString().toLowerCase() ?? '';
      if (status == 'success') {
        if (responseData['data'] != null && responseData['data'] is Map<String, dynamic>) {
          return Visit.fromJson(responseData['data'] as Map<String, dynamic>);
        } else {
          return null;
        }
      } else {
        final dynamic serverMessage = responseData['message'];
        throw Exception(serverMessage?.toString() ?? 'Failed to end visit');
      }
    } catch (e) {
      // Extract the actual error message from the exception
      String errorMessage = e.toString();

      // Remove "Exception: " prefix if present
      if (errorMessage.startsWith('Exception: ')) {
        errorMessage = errorMessage.substring('Exception: '.length);
      }

      // Remove "API Error (XXX): " prefix if present
      errorMessage = errorMessage.replaceFirst(RegExp(r'API Error \(\d+\):\s*'), '');

      // Translate and throw
      throw Exception(ApiErrorHandler.translateErrorMessage(errorMessage));
    }
  }

  Future<List<Visit>> getAllVisits({int page = 1, int limit = 20, String? status, int? clientId, String? startDate, String? endDate}) async {
    if (_userUuid == null) {
      throw Exception('User UUID not available. Cannot fetch visits.');
    }

    Map<String, String> queryParameters = {
      'users_uuid': _userUuid!,
      'page': page.toString(),
      'limit': limit.toString(),
    };

    if (status != null) queryParameters['status'] = status;
    if (clientId != null) queryParameters['client_id'] = clientId.toString();
    if (startDate != null) queryParameters['start_date'] = startDate;
    if (endDate != null) queryParameters['end_date'] = endDate;

    final Map<String, dynamic> response = await _apiService.get(
      '/visits/get_all.php',
      queryParameters: queryParameters,
    );

    if (response.containsKey('data') && response['data'] is Map<String, dynamic>) {
      final Map<String, dynamic> responseData = response['data'] as Map<String, dynamic>;

      // Check if visits array exists in the data
      if (responseData.containsKey('visits') && responseData['visits'] is List) {
        final List<dynamic> visitsData = responseData['visits'] as List<dynamic>;
        return visitsData.map((json) => Visit.fromJson(json as Map<String, dynamic>)).toList();
      } else {
        print('Info: "visits" key is missing or not a list in getAllVisits response data.');
        return [];
      }
    } else {
      print('Warning: "data" key is missing or has an unexpected type in getAllVisits response. Response: ${jsonEncode(response)}');
      return [];
    }
  }

  Future<void> addVisitActivity(int visitId, String activityType, String description, {int? referenceId}) async {
    if (_userUuid == null) {
      throw Exception('User UUID not available. Cannot add visit activity.');
    }

    Map<String, dynamic> requestData = {
      'visit_id': visitId,
      'activity_type': activityType,
      'description': description,
      'users_uuid': _userUuid,
    };

    if (referenceId != null) {
      requestData['reference_id'] = referenceId;
    }

    final Map<String, dynamic> responseData = await _apiService.post(
      '/visits/add_activity.php',
      requestData,
    );
    print('Add Visit Activity API Response: ${jsonEncode(responseData)}');

    if (responseData['status'] != 'success') {
      throw Exception('Failed to add visit activity: ${responseData['message'] ?? 'Unknown error'}');
    }
  }

  Future<List<Map<String, dynamic>>> getVisitActivities(int visitId) async {
    if (_userUuid == null) {
      throw Exception('User UUID not available. Cannot fetch visit activities.');
    }

    final Map<String, dynamic> response = await _apiService.get(
      '/visits/get_activities.php',
      queryParameters: {
        'visit_id': visitId.toString(),
        'users_uuid': _userUuid!,
      },
    );
    print('Get Visit Activities API Response: ${jsonEncode(response)}');

    if (response.containsKey('data') && response['data'] is List) {
      return List<Map<String, dynamic>>.from(response['data']);
    } else if (response.containsKey('data') && response['data'] is Map && response['data']['activities'] is List) {
      return List<Map<String, dynamic>>.from(response['data']['activities']);
    } else {
      print('Warning: Unexpected response format for visit activities. Response: ${jsonEncode(response)}');
      return [];
    }
  }

  Future<List<Visit>> getClientVisits(int clientId) async {
    if (_userUuid == null) {
      throw Exception('User UUID not available. Cannot fetch client visits.');
    }
    // Assuming the backend endpoint is /visits/get_client_visits.php with query parameters
    final Map<String, dynamic> response = await _apiService.get(
      '/visits/get_client_visits.php', // Corrected API endpoint path
      queryParameters: {
        'client_id': clientId.toString(),
        'users_uuid': _userUuid!, // Pass user UUID for authorization on backend
      },
    );
    print('Get Client Visits API Response: ${jsonEncode(response)}'); // Print full response

    // Check if 'data' key exists and is a List. If not, return an empty list or throw an error.
    if (response.containsKey('data')) {
      final dynamic responseData = response['data'];
      if (responseData is List) {
        // If it's a list, map it to Visit objects
        return responseData.map((json) => Visit.fromJson(json as Map<String, dynamic>)).toList();
      } else if (responseData is Map<String, dynamic>) {
        // If it's a single map (e.g., for a single visit, or an error/message),
        // and it's not an empty list, you might need to handle this based on API's actual behavior.
        // For now, if it's a map and not a list, we'll assume it's an unexpected format
        // for a "get all visits" call and return an empty list or throw.
        print('Warning: getClientVisits received a single Map under "data" key instead of a List. Assuming no visits found or unexpected format.');
        return []; // Return empty list if a single map is returned instead of a list
      } else if (responseData == null) {
        print('Info: "data" key is null in getClientVisits response. Assuming no visits found.');
        return []; // Return empty list if 'data' is null
      }
    }
    // If 'data' key is entirely missing, or not a list/map, return empty list
    print('Warning: "data" key is missing or has an unexpected type in getClientVisits response. Assuming no visits found. Response: ${jsonEncode(response)}');
    return [];
  }

  Future<Visit> getVisitDetails(int visitId) async {
    if (_userUuid == null) {
      throw Exception('User UUID not available. Cannot get visit details.');
    }
    final Map<String, dynamic> responseData = await _apiService.get(
      '/visits/get_details.php', // Corrected API endpoint path
      queryParameters: {
        'visit_id': visitId.toString(),
        'users_uuid': _userUuid!, // Pass user UUID for authorization on backend
      },
    );
    print('Get Visit Details API Response: ${jsonEncode(responseData)}'); // Print full response
    // Ensure the 'data' key exists and is a Map before parsing
    if (responseData.containsKey('data') && responseData['data'] is Map<String, dynamic>) {
      return Visit.fromJson(responseData['data'] as Map<String, dynamic>);
    } else {
      throw Exception('Invalid response format for getVisitDetails: Missing or invalid "data" key. Response: ${jsonEncode(responseData)}');
    }
  }

  Future<void> updateVisitNotes(int visitId, String notes) async {
    if (_userUuid == null) {
      throw Exception('User UUID not available. Cannot update visit notes.');
    }
    final Map<String, dynamic> responseData = await _apiService.post(
      // Capture response for logging
      '/visits/update_notes.php', // Corrected API endpoint path
      {
        'visit_id': visitId,
        'notes': notes,
        'users_uuid': _userUuid, // Pass user UUID for authorization on backend
      },
    );
    print('Update Visit Notes API Response: ${jsonEncode(responseData)}'); // Print full response
    // You might want to check the 'status' or 'message' here for success/failure
    if (responseData['status'] != 'success') {
      throw Exception('Failed to update visit notes: ${responseData['message'] ?? 'Unknown error'}');
    }
  }
}
