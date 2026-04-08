// lib/data/models/attendance.dart

String normalizeAttendanceStatus(String? rawStatus) {
  final raw = rawStatus?.trim();
  if (raw == null || raw.isEmpty) {
    return 'NotStarted';
  }

  final collapsed = raw.replaceAll(RegExp(r'[\s_-]+'), '').toLowerCase();

  switch (collapsed) {
    case 'clockedin':
    case 'clockin':
    case 'inprogress':
    case 'working':
    case 'active':
    case 'started':
      return 'ClockedIn';
    case 'paused':
    case 'pause':
    case 'onbreak':
    case 'break':
      return 'Paused';
    case 'clockedout':
    case 'clockout':
    case 'ended':
    case 'finished':
    case 'completed':
      return 'ClockedOut';
    case 'notstarted':
    case 'ready':
    case 'idle':
      return 'NotStarted';
    default:
      return rawStatus ?? 'NotStarted';
  }
}

class Attendance {
  final int attendanceId;
  final int userId;
  final String attendanceDate;
  final String? shiftStartTime;
  final String? shiftEndTime;
  final String attendanceStatus; // NotStarted, ClockedIn, Paused, ClockedOut
  final int totalWorkDurationSec;
  final String? totalWorkDurationFormatted;
  final double? startLatitude;
  final double? startLongitude;
  final double? endLatitude;
  final double? endLongitude;

  Attendance({
    required this.attendanceId,
    required this.userId,
    required this.attendanceDate,
    this.shiftStartTime,
    this.shiftEndTime,
    required this.attendanceStatus,
    required this.totalWorkDurationSec,
    this.totalWorkDurationFormatted,
    this.startLatitude,
    this.startLongitude,
    this.endLatitude,
    this.endLongitude,
  });

  factory Attendance.fromJson(Map<String, dynamic> json) {
    return Attendance(
      attendanceId: int.tryParse(json['attendance_id']?.toString() ?? '0') ?? 0,
      userId: int.tryParse(json['user_id']?.toString() ?? '0') ?? 0,
      attendanceDate: json['attendance_date'] ?? '',
      shiftStartTime: json['shift_start_time'],
      shiftEndTime: json['shift_end_time'],
      attendanceStatus: normalizeAttendanceStatus(json['attendance_status']),
      totalWorkDurationSec: int.tryParse(json['total_work_duration_sec']?.toString() ?? '0') ?? 0,
      totalWorkDurationFormatted: json['total_work_duration_formatted'],
      startLatitude: json['start_latitude'] != null ? double.tryParse(json['start_latitude'].toString()) : null,
      startLongitude: json['start_longitude'] != null ? double.tryParse(json['start_longitude'].toString()) : null,
      endLatitude: json['end_latitude'] != null ? double.tryParse(json['end_latitude'].toString()) : null,
      endLongitude: json['end_longitude'] != null ? double.tryParse(json['end_longitude'].toString()) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'attendance_id': attendanceId,
      'user_id': userId,
      'attendance_date': attendanceDate,
      'shift_start_time': shiftStartTime,
      'shift_end_time': shiftEndTime,
      'attendance_status': attendanceStatus,
      'total_work_duration_sec': totalWorkDurationSec,
      'total_work_duration_formatted': totalWorkDurationFormatted,
      'start_latitude': startLatitude,
      'start_longitude': startLongitude,
      'end_latitude': endLatitude,
      'end_longitude': endLongitude,
    };
  }

  Attendance copyWith({
    int? attendanceId,
    int? userId,
    String? attendanceDate,
    String? shiftStartTime,
    String? shiftEndTime,
    String? attendanceStatus,
    int? totalWorkDurationSec,
    String? totalWorkDurationFormatted,
    double? startLatitude,
    double? startLongitude,
    double? endLatitude,
    double? endLongitude,
  }) {
    return Attendance(
      attendanceId: attendanceId ?? this.attendanceId,
      userId: userId ?? this.userId,
      attendanceDate: attendanceDate ?? this.attendanceDate,
      shiftStartTime: shiftStartTime ?? this.shiftStartTime,
      shiftEndTime: shiftEndTime ?? this.shiftEndTime,
      attendanceStatus: attendanceStatus ?? this.attendanceStatus,
      totalWorkDurationSec: totalWorkDurationSec ?? this.totalWorkDurationSec,
      totalWorkDurationFormatted: totalWorkDurationFormatted ?? this.totalWorkDurationFormatted,
      startLatitude: startLatitude ?? this.startLatitude,
      startLongitude: startLongitude ?? this.startLongitude,
      endLatitude: endLatitude ?? this.endLatitude,
      endLongitude: endLongitude ?? this.endLongitude,
    );
  }
}

class AttendanceStatus {
  final bool hasActiveSession;
  final Attendance? attendance;
  final List<BreakLog> breakLogs;
  final bool canStartWork;
  final bool canPauseWork;
  final bool canResumeWork;
  final bool canEndWork;
  final bool showDashboard;

  AttendanceStatus({
    required this.hasActiveSession,
    this.attendance,
    required this.breakLogs,
    required this.canStartWork,
    required this.canPauseWork,
    required this.canResumeWork,
    required this.canEndWork,
    required this.showDashboard,
  });

  factory AttendanceStatus.fromJson(Map<String, dynamic> json) {
    return AttendanceStatus(
      hasActiveSession: json['has_active_session'] ?? false,
      attendance: json['attendance'] != null ? Attendance.fromJson(json['attendance']) : null,
      breakLogs: json['break_logs'] != null ? (json['break_logs'] as List).map((e) => BreakLog.fromJson(e)).toList() : [],
      canStartWork: json['can_start_work'] ?? false,
      canPauseWork: json['can_pause_work'] ?? false,
      canResumeWork: json['can_resume_work'] ?? false,
      canEndWork: json['can_end_work'] ?? false,
      showDashboard: json['show_dashboard'] ?? false,
    );
  }

  AttendanceStatus copyWith({
    bool? hasActiveSession,
    Attendance? attendance,
    List<BreakLog>? breakLogs,
    bool? canStartWork,
    bool? canPauseWork,
    bool? canResumeWork,
    bool? canEndWork,
    bool? showDashboard,
  }) {
    return AttendanceStatus(
      hasActiveSession: hasActiveSession ?? this.hasActiveSession,
      attendance: attendance ?? this.attendance,
      breakLogs: breakLogs ?? this.breakLogs,
      canStartWork: canStartWork ?? this.canStartWork,
      canPauseWork: canPauseWork ?? this.canPauseWork,
      canResumeWork: canResumeWork ?? this.canResumeWork,
      canEndWork: canEndWork ?? this.canEndWork,
      showDashboard: showDashboard ?? this.showDashboard,
    );
  }
}

class BreakLog {
  final int breakLogId;
  final int attendanceId;
  final String breakType; // Pause or Resume
  final String breakTimestamp;
  final double? breakLatitude;
  final double? breakLongitude;
  final String? breakReason;

  BreakLog({
    required this.breakLogId,
    required this.attendanceId,
    required this.breakType,
    required this.breakTimestamp,
    this.breakLatitude,
    this.breakLongitude,
    this.breakReason,
  });

  factory BreakLog.fromJson(Map<String, dynamic> json) {
    return BreakLog(
      breakLogId: int.tryParse(json['break_log_id']?.toString() ?? '0') ?? 0,
      attendanceId: int.tryParse(json['attendance_id']?.toString() ?? '0') ?? 0,
      breakType: json['break_type'] ?? '',
      breakTimestamp: json['break_timestamp'] ?? '',
      breakLatitude: json['break_latitude'] != null ? double.tryParse(json['break_latitude'].toString()) : null,
      breakLongitude: json['break_longitude'] != null ? double.tryParse(json['break_longitude'].toString()) : null,
      breakReason: json['break_reason'],
    );
  }
}
