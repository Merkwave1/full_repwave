// lib/data/repositories/attendance_repository.dart

import 'package:get/get.dart';
import '/services/api_service.dart';
import '/data/models/attendance.dart';

class AttendanceRepository {
  final ApiService _apiService = Get.find<ApiService>();

  // Get current attendance status
  Future<AttendanceStatus> getCurrentStatus() async {
    try {
      final response = await _apiService.get(
        '/representative_attendance/get_current_status.php',
      );

      if (response['status'] == 'success') {
        return AttendanceStatus.fromJson(response['data']);
      } else {
        throw Exception(response['message'] ?? 'Failed to get attendance status');
      }
    } catch (e) {
      throw Exception('Error getting attendance status: $e');
    }
  }

  // Start work
  Future<Map<String, dynamic>> startWork({
    required double latitude,
    required double longitude,
  }) async {
    try {
      final response = await _apiService.get(
        '/representative_attendance/start_work.php',
        queryParameters: {
          'start_latitude': latitude.toString(),
          'start_longitude': longitude.toString(),
        },
      );

      if (response['status'] == 'success') {
        return response;
      } else {
        throw Exception(response['message'] ?? 'Failed to start work');
      }
    } catch (e) {
      throw Exception('Error starting work: $e');
    }
  }

  // Pause work
  Future<Map<String, dynamic>> pauseWork({
    required double latitude,
    required double longitude,
    String? reason,
  }) async {
    try {
      final params = {
        'break_latitude': latitude.toString(),
        'break_longitude': longitude.toString(),
      };

      if (reason != null && reason.isNotEmpty) {
        params['break_reason'] = reason;
      }

      final response = await _apiService.get(
        '/representative_attendance/pause_work.php',
        queryParameters: params,
      );

      if (response['status'] == 'success') {
        return response;
      } else {
        throw Exception(response['message'] ?? 'Failed to pause work');
      }
    } catch (e) {
      throw Exception('Error pausing work: $e');
    }
  }

  // Resume work
  Future<Map<String, dynamic>> resumeWork({
    required double latitude,
    required double longitude,
  }) async {
    try {
      final response = await _apiService.get(
        '/representative_attendance/resume_work.php',
        queryParameters: {
          'break_latitude': latitude.toString(),
          'break_longitude': longitude.toString(),
        },
      );

      if (response['status'] == 'success') {
        return response;
      } else {
        throw Exception(response['message'] ?? 'Failed to resume work');
      }
    } catch (e) {
      throw Exception('Error resuming work: $e');
    }
  }

  // End work
  Future<Map<String, dynamic>> endWork({
    required double latitude,
    required double longitude,
  }) async {
    try {
      final response = await _apiService.get(
        '/representative_attendance/end_work.php',
        queryParameters: {
          'end_latitude': latitude.toString(),
          'end_longitude': longitude.toString(),
        },
      );

      if (response['status'] == 'success') {
        return response;
      } else {
        throw Exception(response['message'] ?? 'Failed to end work');
      }
    } catch (e) {
      throw Exception('Error ending work: $e');
    }
  }

  // Get attendance history
  Future<Map<String, dynamic>> getAttendanceHistory({
    String? startDate,
    String? endDate,
  }) async {
    try {
      final params = <String, String>{};

      if (startDate != null) params['start_date'] = startDate;
      if (endDate != null) params['end_date'] = endDate;

      final response = await _apiService.get(
        '/representative_attendance/get_attendance_history.php',
        queryParameters: params,
      );

      if (response['status'] == 'success') {
        return response['data'];
      } else {
        throw Exception(response['message'] ?? 'Failed to get attendance history');
      }
    } catch (e) {
      throw Exception('Error getting attendance history: $e');
    }
  }

  // Get break logs
  Future<Map<String, dynamic>> getBreakLogs(int attendanceId) async {
    try {
      final response = await _apiService.get(
        '/representative_attendance/get_break_logs.php',
        queryParameters: {
          'attendance_id': attendanceId.toString(),
        },
      );

      if (response['status'] == 'success') {
        return response['data'];
      } else {
        throw Exception(response['message'] ?? 'Failed to get break logs');
      }
    } catch (e) {
      throw Exception('Error getting break logs: $e');
    }
  }
}
