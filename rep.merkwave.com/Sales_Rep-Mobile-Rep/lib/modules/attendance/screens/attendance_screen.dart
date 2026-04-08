// lib/modules/attendance/screens/attendance_screen.dart

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '/modules/attendance/controllers/attendance_controller.dart';
import '/data/models/attendance.dart';

class AttendanceScreen extends GetView<AttendanceController> {
  const AttendanceScreen({super.key});

  @override
  Widget build(BuildContext context) {
    const primaryColor = Color(0xFF3F51B5);

    return Scaffold(
      appBar: AppBar(
        title: Text('attendance'.tr),
        backgroundColor: primaryColor,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: controller.refresh,
          ),
        ],
      ),
      body: Obx(() {
        if (controller.isLoading.value && controller.currentStatus.value == null) {
          return const Center(child: CircularProgressIndicator());
        }

        final status = controller.currentStatus.value;
        if (status == null) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error_outline, size: 64, color: Colors.grey),
                const SizedBox(height: 16),
                Text(
                  controller.errorMessage.value.isEmpty ? 'failed_to_load_attendance'.tr : controller.errorMessage.value,
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Colors.grey),
                ),
                const SizedBox(height: 16),
                ElevatedButton.icon(
                  onPressed: controller.refresh,
                  icon: const Icon(Icons.refresh),
                  label: Text('retry'.tr),
                ),
              ],
            ),
          );
        }

        return RefreshIndicator(
          onRefresh: controller.refresh,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Status Card
                  _buildStatusCard(status, primaryColor),
                  const SizedBox(height: 20),

                  // Timer Card (only show when dashboard should be visible)
                  if (status.showDashboard) ...[
                    _buildTimerCard(primaryColor),
                    const SizedBox(height: 20),
                  ],

                  // Action Buttons
                  _buildActionButtons(status, primaryColor),
                  const SizedBox(height: 20),

                  // Today's Info (only show when dashboard should be visible)
                  if (status.showDashboard && status.attendance != null) ...[
                    _buildTodayInfoCard(status.attendance!, primaryColor),
                    const SizedBox(height: 20),
                  ],

                  // Break Sessions (only show when dashboard should be visible)
                  if (status.showDashboard && status.breakLogs.isNotEmpty) ...[
                    _buildBreakSessionsCard(status.breakLogs, primaryColor),
                  ],
                ],
              ),
            ),
          ),
        );
      }),
    );
  }

  Widget _buildStatusCard(AttendanceStatus status, Color primaryColor) {
    Color statusColor;
    IconData statusIcon;
    String statusText;

    switch (status.attendance?.attendanceStatus ?? 'NotStarted') {
      case 'ClockedIn':
        statusColor = Colors.green;
        statusIcon = Icons.check_circle;
        statusText = 'working'.tr;
        break;
      case 'Paused':
        statusColor = Colors.orange;
        statusIcon = Icons.pause_circle;
        statusText = 'on_break'.tr;
        break;
      case 'ClockedOut':
        statusColor = Colors.blue;
        statusIcon = Icons.done_all;
        statusText = 'day_ended'.tr;
        break;
      default:
        statusColor = Colors.grey;
        statusIcon = Icons.schedule;
        statusText = 'not_started'.tr;
    }

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            statusColor.withOpacity(0.8),
            statusColor.withOpacity(0.6),
          ],
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: statusColor.withOpacity(0.3),
            blurRadius: 12,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.2),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(statusIcon, color: Colors.white, size: 40),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'current_status'.tr,
                  style: const TextStyle(
                    color: Colors.white70,
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  statusText,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  DateTime.now().toString().substring(0, 10),
                  style: const TextStyle(
                    color: Colors.white70,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTimerCard(Color primaryColor) {
    return Obx(() => Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.05),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            children: [
              Text(
                'work_duration'.tr,
                style: const TextStyle(
                  fontSize: 16,
                  color: Colors.grey,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                controller.formattedDuration.value,
                style: TextStyle(
                  fontSize: 48,
                  fontWeight: FontWeight.bold,
                  color: primaryColor,
                  fontFeatures: const [FontFeature.tabularFigures()],
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'hours_minutes_seconds'.tr,
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.grey.shade600,
                ),
              ),
            ],
          ),
        ));
  }

  Widget _buildActionButtons(AttendanceStatus status, Color primaryColor) {
    return Obx(() {
      final isLoading = controller.isLoading.value;

      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Start Work Button
          if (status.canStartWork)
            _buildActionButton(
              label: 'start_work'.tr,
              icon: Icons.play_circle_filled,
              color: Colors.green,
              onPressed: isLoading ? null : controller.startWork,
              isLoading: isLoading,
            ),

          // Pause Work Button
          if (status.canPauseWork) ...[
            _buildActionButton(
              label: 'pause_work'.tr,
              icon: Icons.pause_circle_filled,
              color: Colors.orange,
              onPressed: isLoading ? null : controller.showPauseDialog,
              isLoading: isLoading,
            ),
            const SizedBox(height: 12),
          ],

          // Resume Work Button
          if (status.canResumeWork) ...[
            _buildActionButton(
              label: 'resume_work'.tr,
              icon: Icons.play_circle_outline,
              color: Colors.green,
              onPressed: isLoading ? null : controller.resumeWork,
              isLoading: isLoading,
            ),
            const SizedBox(height: 12),
          ],

          // End Work Button
          if (status.canEndWork)
            _buildActionButton(
              label: 'end_work_day'.tr,
              icon: Icons.stop_circle,
              color: Colors.red,
              onPressed: isLoading ? null : controller.showEndWorkDialog,
              isLoading: isLoading,
            ),
        ],
      );
    });
  }

  Widget _buildActionButton({
    required String label,
    required IconData icon,
    required Color color,
    required VoidCallback? onPressed,
    bool isLoading = false,
  }) {
    return ElevatedButton.icon(
      onPressed: onPressed,
      icon: isLoading
          ? const SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
              ),
            )
          : Icon(icon, size: 28),
      label: Text(
        label,
        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
      ),
      style: ElevatedButton.styleFrom(
        backgroundColor: color,
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(vertical: 16),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        elevation: 4,
      ),
    );
  }

  Widget _buildTodayInfoCard(Attendance attendance, Color primaryColor) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.info_outline, color: primaryColor, size: 24),
                const SizedBox(width: 8),
                Text(
                  'today_summary'.tr,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const Divider(height: 24),
            _buildInfoRow(
              'start_time'.tr,
              attendance.shiftStartTime?.substring(11, 19) ?? '-',
              Icons.login,
            ),
            const SizedBox(height: 12),
            _buildInfoRow(
              'end_time'.tr,
              attendance.shiftEndTime?.substring(11, 19) ?? '-',
              Icons.logout,
            ),
            const SizedBox(height: 12),
            _buildInfoRow(
              'total_duration'.tr,
              attendance.totalWorkDurationFormatted ?? '-',
              Icons.timer,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value, IconData icon) {
    return Row(
      children: [
        Icon(icon, size: 20, color: Colors.grey.shade600),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            label,
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey.shade700,
            ),
          ),
        ),
        Text(
          value,
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.bold,
          ),
        ),
      ],
    );
  }

  Widget _buildBreakSessionsCard(List<BreakLog> breakLogs, Color primaryColor) {
    // Group breaks into sessions (Pause + Resume pairs)
    final sessions = <Map<String, dynamic>>[];
    BreakLog? pauseLog;

    for (var log in breakLogs) {
      if (log.breakType == 'Pause') {
        pauseLog = log;
      } else if (log.breakType == 'Resume' && pauseLog != null) {
        final pauseTime = DateTime.parse(pauseLog.breakTimestamp);
        final resumeTime = DateTime.parse(log.breakTimestamp);
        final duration = resumeTime.difference(pauseTime);

        sessions.add({
          'pause': pauseLog,
          'resume': log,
          'duration': duration,
        });
        pauseLog = null;
      }
    }

    // Add ongoing break if exists
    if (pauseLog != null) {
      sessions.add({
        'pause': pauseLog,
        'resume': null,
        'duration': null,
      });
    }

    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.coffee, color: primaryColor, size: 24),
                const SizedBox(width: 8),
                Text(
                  'break_sessions'.tr,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const Divider(height: 24),
            ...sessions.asMap().entries.map((entry) {
              final index = entry.key;
              final session = entry.value;
              final pauseLog = session['pause'] as BreakLog;
              final resumeLog = session['resume'] as BreakLog?;
              final duration = session['duration'] as Duration?;

              return Column(
                children: [
                  if (index > 0) const Divider(height: 24),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: Colors.orange.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          '#${index + 1}',
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            color: Colors.orange,
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '${'paused'.tr}: ${pauseLog.breakTimestamp.substring(11, 19)}',
                              style: const TextStyle(fontSize: 13),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              resumeLog != null ? '${'resumed'.tr}: ${resumeLog.breakTimestamp.substring(11, 19)}' : 'still_on_break'.tr,
                              style: TextStyle(
                                fontSize: 13,
                                color: resumeLog != null ? Colors.black87 : Colors.orange,
                                fontWeight: resumeLog != null ? FontWeight.normal : FontWeight.bold,
                              ),
                            ),
                            if (pauseLog.breakReason != null && pauseLog.breakReason!.isNotEmpty) ...[
                              const SizedBox(height: 4),
                              Text(
                                '${'reason'.tr}: ${pauseLog.breakReason}',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Colors.grey.shade600,
                                  fontStyle: FontStyle.italic,
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                      if (duration != null)
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 6,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.orange.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            '${duration.inMinutes} ${'min'.tr}',
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              color: Colors.orange,
                              fontSize: 13,
                            ),
                          ),
                        ),
                    ],
                  ),
                ],
              );
            }),
          ],
        ),
      ),
    );
  }
}
