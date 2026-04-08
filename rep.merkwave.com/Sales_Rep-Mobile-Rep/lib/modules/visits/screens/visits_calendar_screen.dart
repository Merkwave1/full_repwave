// lib/modules/visits/screens/visits_calendar_screen.dart
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import '/modules/visits/controllers/visits_calendar_controller.dart';
import '/modules/visits/controllers/visits_controller.dart';
import '/modules/visits/bindings/visits_binding.dart';
import '/modules/visits/screens/visit_detail_screen.dart';
import '/shared_widgets/ultra_safe_navigation.dart';
import '/shared_widgets/safe_messenger.dart';
import '/data/models/visit_plan.dart';

class VisitsCalendarScreen extends GetView<VisitsCalendarController> {
  const VisitsCalendarScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('visits_calendar'.tr),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.calendar_month),
            onPressed: () => _showDatePicker(context),
            tooltip: 'select_date'.tr,
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: controller.refreshVisits,
          ),
        ],
      ),
      body: Column(
        children: [
          // Date Selection Header
          _buildDateHeader(),

          // Today's Stats
          _buildTodayStats(),

          // Active Visit Banner
          _buildActiveVisitBanner(),

          // Filter Status Indicator
          _buildFilterIndicator(),

          // Visits List
          Expanded(
            child: Obx(() {
              if (controller.isLoading.value && controller.scheduledVisitsForDate.isEmpty) {
                return const Center(child: CircularProgressIndicator());
              }

              if (controller.errorMessage.value.isNotEmpty && controller.scheduledVisitsForDate.isEmpty) {
                return _buildErrorState();
              }

              if (controller.scheduledVisitsForDate.isEmpty) {
                return _buildEmptyState();
              }

              return _buildVisitsList();
            }),
          ),
        ],
      ),
      floatingActionButton: Obx(() {
        // Only show map button if there are visits with location data
        final visitsWithLocation = controller.scheduledVisitsForDate.where((visit) => visit.clientLatitude != null && visit.clientLongitude != null).toList();

        if (visitsWithLocation.isEmpty) {
          return const SizedBox.shrink();
        }

        return FloatingActionButton(
          heroTag: 'visits_calendar_map_fab',
          onPressed: () => Get.toNamed('/visits_map'),
          tooltip: 'view_on_map'.tr,
          child: const Icon(Icons.map),
        );
      }),
    );
  }

  Widget _buildDateHeader() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16.0),
      decoration: BoxDecoration(
        color: Get.theme.primaryColor.withOpacity(0.1),
        border: Border(
          bottom: BorderSide(color: Get.theme.dividerColor),
        ),
      ),
      child: Obx(() {
        final selectedDate = controller.selectedDate.value;
        final isToday = _isToday(selectedDate);
        final formattedDate = DateFormat('EEEE, dd MMMM yyyy', Get.locale?.languageCode).format(selectedDate);

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    isToday ? 'today_visits'.tr : 'visits_for'.tr,
                    style: Get.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: Get.theme.primaryColor,
                    ),
                  ),
                ),
                if (!isToday)
                  TextButton.icon(
                    onPressed: () => controller.setSelectedDate(DateTime.now()),
                    icon: const Icon(Icons.today, size: 16),
                    label: Text('today'.tr),
                    style: TextButton.styleFrom(
                      foregroundColor: Get.theme.primaryColor,
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              formattedDate,
              style: Get.textTheme.bodyLarge?.copyWith(
                color: Colors.grey.shade600,
              ),
            ),
          ],
        );
      }),
    );
  }

  Widget _buildTodayStats() {
    return Obx(() {
      final stats = controller.visitsStats;

      return Container(
        padding: const EdgeInsets.all(16.0),
        child: Row(
          children: [
            Expanded(
              child: _buildClickableStatCard(
                'total'.tr,
                stats['total'].toString(),
                Icons.assessment,
                Get.theme.primaryColor,
                'all',
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildClickableStatCard(
                'completed'.tr,
                stats['completed'].toString(),
                Icons.check_circle,
                Colors.green,
                'completed',
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildClickableStatCard(
                'active'.tr,
                stats['active'].toString(),
                Icons.play_circle,
                Colors.orange,
                'active',
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildClickableStatCard(
                'scheduled'.tr,
                stats['scheduled'].toString(),
                Icons.schedule,
                Colors.blue,
                'scheduled',
              ),
            ),
          ],
        ),
      );
    });
  }

  Widget _buildClickableStatCard(String label, String value, IconData icon, Color color, String filterType) {
    return Obx(() {
      final isSelected = controller.selectedFilter.value == filterType;

      return InkWell(
        onTap: () {
          // Toggle filter: if already selected, clear filter; otherwise set filter
          if (isSelected) {
            controller.clearFilter();
          } else {
            controller.setFilter(filterType);
          }
        },
        borderRadius: BorderRadius.circular(8),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
          decoration: BoxDecoration(
            color: isSelected ? color : color.withOpacity(0.1),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: isSelected ? color : color.withOpacity(0.3),
              width: isSelected ? 2 : 1,
            ),
            boxShadow: isSelected
                ? [
                    BoxShadow(
                      color: color.withOpacity(0.3),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ]
                : null,
          ),
          child: Column(
            children: [
              Icon(icon, color: isSelected ? Colors.white : color, size: 20),
              const SizedBox(height: 4),
              Text(
                value,
                style: Get.textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: isSelected ? Colors.white : color,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                label,
                style: Get.textTheme.bodySmall?.copyWith(
                  color: isSelected ? Colors.white : color,
                  fontSize: 10,
                ),
                textAlign: TextAlign.center,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      );
    });
  }

  Widget _buildActiveVisitBanner() {
    return Obx(() {
      final activeVisit = controller.currentActiveVisit;

      if (activeVisit == null) {
        return const SizedBox.shrink(); // Hide when no active visit
      }

      // Get client name from the active visit
      final client = controller.getClientById(activeVisit.clientId);
      final clientName = client?.companyName ?? 'Unknown Client';

      return Container(
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [Colors.orange.shade600, Colors.orange.shade700],
            begin: Alignment.centerLeft,
            end: Alignment.centerRight,
          ),
          borderRadius: BorderRadius.circular(12),
          boxShadow: [
            BoxShadow(
              color: Colors.orange.withOpacity(0.3),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              // Active visit icon
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(
                  Icons.place_outlined,
                  color: Colors.white,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              // Visit info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Active Visit in Progress',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      clientName,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              // Action button
              ElevatedButton(
                onPressed: () async {
                  // Find the active visit and navigate to its details
                  final activeVisit = controller.actualVisits.firstWhere(
                    (visit) => visit.status.value == 'Started',
                    orElse: () => controller.actualVisits.first,
                  );

                  // Ensure VisitsController is initialized before navigation
                  if (!Get.isRegistered<VisitsController>()) {
                    // Initialize visits binding dependencies
                    final binding = VisitsBinding();
                    binding.dependencies();
                  }

                  // Navigate to visit detail screen
                  final result = await Get.to(() => VisitDetailScreen(visit: activeVisit));

                  // Refresh data if visit was ended successfully
                  if (result == true) {
                    await controller.refreshVisits();
                  }
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.white,
                  foregroundColor: Colors.orange.shade700,
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                  elevation: 0,
                  minimumSize: const Size(0, 0),
                ),
                child: const Text(
                  'Manage',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
        ),
      );
    });
  }

  Widget _buildFilterIndicator() {
    return Obx(() {
      final selectedFilter = controller.selectedFilter.value;

      if (selectedFilter == 'all') {
        return const SizedBox.shrink(); // Hide when no filter is active
      }

      String filterText;
      Color filterColor;
      IconData filterIcon;

      switch (selectedFilter) {
        case 'completed':
          filterText = 'completed'.tr;
          filterColor = Colors.green;
          filterIcon = Icons.check_circle;
          break;
        case 'active':
          filterText = 'active'.tr;
          filterColor = Colors.orange;
          filterIcon = Icons.play_circle;
          break;
        case 'scheduled':
          filterText = 'scheduled'.tr;
          filterColor = Colors.blue;
          filterIcon = Icons.schedule;
          break;
        default:
          return const SizedBox.shrink();
      }

      return Container(
        margin: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
        padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
        decoration: BoxDecoration(
          color: filterColor.withOpacity(0.1),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: filterColor.withOpacity(0.3)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(filterIcon, color: filterColor, size: 16),
            const SizedBox(width: 8),
            Text(
              '${'showing'.tr}: $filterText ${'visits'.tr}',
              style: TextStyle(
                color: filterColor,
                fontWeight: FontWeight.w500,
                fontSize: 12,
              ),
            ),
            const SizedBox(width: 8),
            InkWell(
              onTap: controller.clearFilter,
              borderRadius: BorderRadius.circular(12),
              child: Container(
                padding: const EdgeInsets.all(2),
                child: Icon(
                  Icons.close,
                  color: filterColor,
                  size: 16,
                ),
              ),
            ),
          ],
        ),
      );
    });
  }

  Widget _buildVisitsList() {
    return Obx(() {
      final scheduledVisits = controller.filteredScheduledVisits;

      return RefreshIndicator(
        onRefresh: controller.refreshVisits,
        child: ListView.builder(
          padding: const EdgeInsets.all(16.0),
          itemCount: scheduledVisits.length,
          itemBuilder: (context, index) {
            final scheduledVisit = scheduledVisits[index];
            return _buildVisitCard(scheduledVisit);
          },
        ),
      );
    });
  }

  Widget _buildVisitCard(ScheduledVisit scheduledVisit) {
    return Obx(() {
      final plan = scheduledVisit.visitPlan;
      final actualStatus = controller.getVisitStatus(scheduledVisit);
      final statusColor = _getStatusColor(actualStatus);
      final statusIcon = _getStatusIcon(actualStatus);
      final hasActiveVisit = controller.hasActiveVisit;
      final canStartVisit = !hasActiveVisit && actualStatus == 'Scheduled';

      return Card(
        margin: const EdgeInsets.only(bottom: 12),
        elevation: 2,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        child: InkWell(
          onTap: () => _showVisitDetails(scheduledVisit),
          borderRadius: BorderRadius.circular(12),
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header Row
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: statusColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Icon(statusIcon, color: statusColor, size: 20),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            scheduledVisit.clientName,
                            style: Get.textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          if (scheduledVisit.clientContactName.isNotEmpty)
                            Text(
                              scheduledVisit.clientContactName,
                              style: Get.textTheme.bodyMedium?.copyWith(
                                color: Colors.grey.shade600,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                        ],
                      ),
                    ),
                    // Start Visit Button and Status
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        // Status Badge
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: statusColor,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            actualStatus,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        // Start Visit Button
                        if (controller.isLoading.value)
                          const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        else if (actualStatus == 'Scheduled')
                          ElevatedButton.icon(
                            onPressed: canStartVisit ? () => _showStartVisitConfirmation(scheduledVisit) : null,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: canStartVisit ? Colors.green : Colors.grey,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(8),
                              ),
                              elevation: canStartVisit ? 2 : 0,
                              minimumSize: const Size(0, 0),
                            ),
                            icon: const Icon(Icons.play_arrow, size: 16),
                            label: Text(
                              hasActiveVisit && !canStartVisit ? 'disabled'.tr : 'start'.tr,
                              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                            ),
                          )
                        else if (actualStatus == 'Started')
                          ElevatedButton.icon(
                            onPressed: () async {
                              final actualVisit = controller.findActualVisitForScheduled(scheduledVisit);
                              if (actualVisit != null) {
                                // Ensure VisitsController is initialized before navigation
                                if (!Get.isRegistered<VisitsController>()) {
                                  // Initialize visits binding dependencies
                                  final binding = VisitsBinding();
                                  binding.dependencies();
                                }

                                final result = await Get.to(
                                  () => VisitDetailScreen(visit: actualVisit),
                                  transition: Transition.rightToLeft,
                                  duration: const Duration(milliseconds: 300),
                                );

                                // Refresh data if visit was ended successfully
                                if (result == true) {
                                  await controller.refreshVisits();
                                }
                              } else {
                                SafeMessenger.show(
                                  'Visit details not found',
                                  title: 'error'.tr,
                                  background: Colors.red,
                                );
                              }
                            },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.orange,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(8),
                              ),
                              elevation: 2,
                              minimumSize: const Size(0, 0),
                            ),
                            icon: const Icon(Icons.visibility, size: 16),
                            label: const Text(
                              'View',
                              style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                            ),
                          )
                        else if (actualStatus == 'Completed')
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              color: Colors.green.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: Colors.green.withOpacity(0.3)),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.check_circle, size: 16, color: Colors.green),
                                const SizedBox(width: 4),
                                Text(
                                  'completed'.tr,
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.green,
                                  ),
                                ),
                              ],
                            ),
                          )
                        else // Cancelled status
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              color: Colors.red.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: Colors.red.withOpacity(0.3)),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.cancel, size: 16, color: Colors.red),
                                const SizedBox(width: 4),
                                Text(
                                  'cancelled'.tr,
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.red,
                                  ),
                                ),
                              ],
                            ),
                          ),
                      ],
                    ),
                  ],
                ),

                const SizedBox(height: 12),

                // Visit Plan Details
                _buildInfoRow(
                  Icons.assignment,
                  'plan'.tr,
                  plan.visitPlanName,
                ),

                if (plan.visitPlanDescription?.isNotEmpty == true)
                  _buildInfoRow(
                    Icons.info_outline,
                    'description'.tr,
                    plan.visitPlanDescription!,
                  ),

                if (scheduledVisit.clientAddress.isNotEmpty)
                  _buildInfoRow(
                    Icons.location_on,
                    'address'.tr,
                    scheduledVisit.clientAddress,
                  ),

                // Distance information
                Obx(() {
                  final distanceString = controller.getDistanceString(scheduledVisit);
                  if (distanceString.isNotEmpty) {
                    return _buildInfoRow(
                      Icons.near_me,
                      'distance'.tr,
                      distanceString,
                    );
                  }
                  return const SizedBox.shrink();
                }),

                // Google Maps Navigation Button
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: () => controller.openGoogleMaps(scheduledVisit),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.blue,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                        icon: const Icon(Icons.navigation, size: 18),
                        label: Text(
                          'navigate_to_client'.tr,
                          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      );
    });
  }

  Widget _buildInfoRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        children: [
          Icon(icon, size: 16, color: Colors.grey.shade600),
          const SizedBox(width: 8),
          Text(
            '$label: ',
            style: Get.textTheme.bodySmall?.copyWith(
              color: Colors.grey.shade600,
              fontWeight: FontWeight.w500,
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: Get.textTheme.bodySmall,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Obx(() {
      final isToday = _isToday(controller.selectedDate.value);
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.calendar_today_outlined,
              size: 64,
              color: Colors.grey.shade400,
            ),
            const SizedBox(height: 16),
            Text(
              isToday ? 'no_visits_today'.tr : 'no_visits_selected_date'.tr,
              style: Get.textTheme.titleMedium?.copyWith(
                color: Colors.grey.shade600,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              isToday ? 'enjoy_your_free_day'.tr : 'try_different_date'.tr,
              style: Get.textTheme.bodyMedium?.copyWith(
                color: Colors.grey.shade500,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      );
    });
  }

  Widget _buildErrorState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error_outline, size: 64, color: Colors.red),
          const SizedBox(height: 16),
          Text(
            controller.errorMessage.value,
            style: const TextStyle(fontSize: 16),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: controller.refreshVisits,
            child: Text('retry'.tr),
          ),
        ],
      ),
    );
  }

  void _showDatePicker(BuildContext context) async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: controller.selectedDate.value,
      firstDate: DateTime.now().subtract(const Duration(days: 365)),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      builder: (context, child) {
        return Theme(
          data: Get.theme.copyWith(
            colorScheme: Get.theme.colorScheme.copyWith(
              primary: Get.theme.primaryColor,
            ),
          ),
          child: child!,
        );
      },
    );

    if (picked != null) {
      controller.setSelectedDate(picked);
    }
  }

  void _showVisitDetails(ScheduledVisit scheduledVisit) {
    final actualVisit = controller.findActualVisitForScheduled(scheduledVisit);
    final status = controller.getVisitStatus(scheduledVisit);

    Get.dialog(
      Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(
                    status == 'Started'
                        ? Icons.play_circle
                        : status == 'Completed'
                            ? Icons.check_circle
                            : Icons.schedule,
                    color: status == 'Started'
                        ? Colors.orange
                        : status == 'Completed'
                            ? Colors.green
                            : Colors.blue,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'visit_details'.tr,
                      style: Get.textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              _buildDetailRow('Plan', scheduledVisit.planName),
              _buildDetailRow('Client', scheduledVisit.clientName),
              _buildDetailRow('Status', status),
              _buildDetailRow('Scheduled Date', DateFormat('dd MMM yyyy').format(scheduledVisit.scheduledDate)),
              if (scheduledVisit.visitPlan.visitPlanDescription?.isNotEmpty == true) _buildDetailRow('Description', scheduledVisit.visitPlan.visitPlanDescription!),
              if (actualVisit != null) ...[
                const SizedBox(height: 8),
                const Divider(),
                const SizedBox(height: 8),
                _buildDetailRow('Start Time', DateFormat('HH:mm').format(actualVisit.startTime)),
                if (actualVisit.endTime != null) _buildDetailRow('End Time', DateFormat('HH:mm').format(actualVisit.endTime!)),
                if (actualVisit.notes?.isNotEmpty == true) _buildDetailRow('Notes', actualVisit.notes!),
              ],
              const SizedBox(height: 20),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton(
                    onPressed: () => UltraSafeNavigation.back(Get.context),
                    child: Text('close'.tr),
                  ),
                  if (status == 'Started' && actualVisit != null) ...[
                    const SizedBox(width: 8),
                    ElevatedButton.icon(
                      onPressed: () async {
                        UltraSafeNavigation.back(Get.context);

                        // Ensure VisitsController is initialized before navigation
                        if (!Get.isRegistered<VisitsController>()) {
                          // Initialize visits binding dependencies
                          final binding = VisitsBinding();
                          binding.dependencies();
                        }

                        final result = await Get.to(
                          () => VisitDetailScreen(visit: actualVisit),
                          transition: Transition.rightToLeft,
                          duration: const Duration(milliseconds: 300),
                        );

                        // Refresh data if visit was ended successfully
                        if (result == true) {
                          await controller.refreshVisits();
                        }
                      },
                      icon: const Icon(Icons.visibility, size: 16),
                      label: Text('view_details'.tr),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.orange,
                        foregroundColor: Colors.white,
                      ),
                    ),
                  ],
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(
              '$label:',
              style: Get.textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w600,
                color: Colors.grey.shade600,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: Get.textTheme.bodyMedium,
            ),
          ),
        ],
      ),
    );
  }

  void _showStartVisitConfirmation(ScheduledVisit scheduledVisit) {
    Get.dialog(
      AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            Icon(Icons.play_arrow, color: Colors.green),
            const SizedBox(width: 8),
            Text('start_visit'.tr, style: Get.textTheme.titleLarge),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('are_you_sure_start_visit'.tr),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.grey.shade100,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    scheduledVisit.clientName,
                    style: Get.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Plan: ${scheduledVisit.planName}',
                    style: Get.textTheme.bodySmall?.copyWith(
                      color: Colors.grey.shade600,
                    ),
                  ),
                  if (scheduledVisit.clientAddress.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(
                      'Address: ${scheduledVisit.clientAddress}',
                      style: Get.textTheme.bodySmall?.copyWith(
                        color: Colors.grey.shade600,
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'This will create an active visit that you can manage in the Visits tab.',
              style: Get.textTheme.bodySmall?.copyWith(
                color: Colors.grey.shade600,
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => UltraSafeNavigation.back(Get.context),
            child: Text('Cancel'),
          ),
          ElevatedButton.icon(
            onPressed: () async {
              // Safely close the dialog without triggering GetX controller issues
              try {
                // Use safer dialog check to avoid GetX initialization issues
                bool hasOpenDialog = false;
                try {
                  hasOpenDialog = Get.isRegistered<GetMaterialController>() && Get.isDialogOpen == true;
                } catch (e) {
                  // If GetX check fails, assume no dialog is open
                  hasOpenDialog = false;
                }

                if (hasOpenDialog) {
                  final overlayCtx = Get.overlayContext;
                  if (overlayCtx != null) {
                    Navigator.of(overlayCtx).pop();
                  } else {
                    // Fallback
                    UltraSafeNavigation.back(Get.context);
                  }
                }
              } catch (e) {
                debugPrint('[StartVisitFlow] Dialog close error: $e');
              }

              // Microtask to allow route pop animation to register before starting visit & showing snackbar
              Future.microtask(() async {
                debugPrint('[StartVisitFlow] Starting visit after dialog pop for client ${scheduledVisit.clientName}');
                final controller = Get.find<VisitsCalendarController>();
                await controller.startVisitFromScheduled(scheduledVisit);
              });
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.green,
              foregroundColor: Colors.white,
            ),
            icon: const Icon(Icons.play_arrow, size: 18),
            label: Text('start_visit'.tr),
          ),
        ],
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'completed':
        return Colors.green;
      case 'in progress':
        return Colors.blue;
      case 'pending':
        return Colors.orange;
      case 'scheduled':
        return Colors.indigo;
      case 'cancelled':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  IconData _getStatusIcon(String status) {
    switch (status.toLowerCase()) {
      case 'completed':
        return Icons.check_circle;
      case 'in progress':
        return Icons.access_time;
      case 'pending':
        return Icons.pending;
      case 'scheduled':
        return Icons.schedule;
      case 'cancelled':
        return Icons.cancel;
      default:
        return Icons.help_outline;
    }
  }

  bool _isToday(DateTime date) {
    final now = DateTime.now();
    return date.year == now.year && date.month == now.month && date.day == now.day;
  }
}
