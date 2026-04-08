// lib/modules/visits/screens/visits_screen.dart
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import '/shared_widgets/ultra_safe_navigation.dart';
import '/modules/visits/controllers/visits_controller.dart';
import '/modules/visits/bindings/visits_binding.dart';
import '/modules/visits/screens/visit_detail_screen.dart';
import '/data/models/visit.dart';
import '/data/models/client.dart';
import '/shared_widgets/searchable_dropdown.dart';

class VisitsScreen extends StatelessWidget {
  const VisitsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    const primaryColor = Color(0xFF3F51B5); // AppBar color

    // Ensure the controller is available by applying binding if needed
    if (!Get.isRegistered<VisitsController>()) {
      VisitsBinding().dependencies();
    }

    final VisitsController controller = Get.find<VisitsController>();

    return Scaffold(
      backgroundColor: primaryColor.withOpacity(0.04),
      body: RefreshIndicator(
        color: primaryColor,
        onRefresh: () async {
          controller.refreshVisits();
          // allow some time for api
          await Future.delayed(const Duration(milliseconds: 350));
        },
        child: CustomScrollView(
          slivers: [
            // Header Section
            SliverToBoxAdapter(
              child: Container(
                width: double.infinity,
                margin: const EdgeInsets.all(16),
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      Colors.white,
                      primaryColor.withOpacity(0.02),
                    ],
                  ),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: primaryColor.withOpacity(0.1),
                    width: 1,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: primaryColor.withOpacity(0.1),
                      spreadRadius: 1,
                      blurRadius: 6,
                      offset: const Offset(0, 3),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [primaryColor, primaryColor.withOpacity(0.7)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(
                        Icons.calendar_today,
                        color: Colors.white,
                        size: 24,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'my_visits'.tr,
                            style: TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.bold,
                              color: primaryColor,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'track_client_visits'.tr,
                            style: TextStyle(
                              fontSize: 14,
                              color: Colors.grey[600],
                            ),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: primaryColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Icon(
                        Icons.location_on,
                        color: primaryColor,
                        size: 20,
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Active visit banner as sliver
            SliverToBoxAdapter(
              child: Obx(() => controller.isVisitActive.value ? _buildActiveVisitBanner(controller) : const SizedBox.shrink()),
            ),

            // (Overview + status sections removed per request)

            // Main content
            SliverToBoxAdapter(
              child: Obx(() {
                if (controller.isLoading.value && controller.visits.isEmpty) {
                  return const SizedBox(
                    height: 300,
                    child: Center(child: CircularProgressIndicator()),
                  );
                }

                if (controller.errorMessage.value.isNotEmpty && controller.visits.isEmpty) {
                  return SizedBox(
                    height: 300,
                    child: Center(
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
                    ),
                  );
                }

                if (controller.visits.isEmpty) {
                  return Padding(
                    padding: const EdgeInsets.symmetric(vertical: 24),
                    child: _buildEmptyVisitsState(context, controller),
                  );
                }

                return const SizedBox.shrink();
              }),
            ),

            // Loading indicator when refreshing existing data
            SliverToBoxAdapter(
              child: Obx(() {
                if (controller.isLoading.value && controller.visits.isNotEmpty) {
                  return Container(
                    width: double.infinity,
                    margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    padding: const EdgeInsets.all(12.0),
                    decoration: BoxDecoration(
                      color: primaryColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: primaryColor.withOpacity(0.3)),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: primaryColor,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          'refreshing'.tr,
                          style: TextStyle(
                            color: primaryColor,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  );
                }
                return const SizedBox.shrink();
              }),
            ),

            // Visits list
            Obx(() {
              if (controller.visits.isNotEmpty) {
                return SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      if (index == controller.visits.length) {
                        if (controller.isLoadingMore.value) {
                          return const Center(
                            child: Padding(
                              padding: EdgeInsets.all(16.0),
                              child: CircularProgressIndicator(),
                            ),
                          );
                        } else if (controller.hasMoreData.value) {
                          return Center(
                            child: Padding(
                              padding: const EdgeInsets.all(16.0),
                              child: ElevatedButton(
                                onPressed: controller.loadMoreVisits,
                                child: Text('load_more'.tr),
                              ),
                            ),
                          );
                        }
                        return const SizedBox.shrink();
                      }

                      final visit = controller.visits[index];
                      return _buildEnhancedVisitCard(visit, controller);
                    },
                    childCount: controller.visits.length + (controller.hasMoreData.value ? 1 : 0),
                  ),
                );
              }
              return const SliverToBoxAdapter(child: SizedBox.shrink());
            }),

            // Bottom padding
            const SliverToBoxAdapter(
              child: SizedBox(height: 80),
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        heroTag: 'visits_start_visit_fab',
        onPressed: () => _showStartVisitDialog(context, controller),
        icon: const Icon(Icons.add),
        label: Text('start_visit'.tr),
        backgroundColor: primaryColor,
        foregroundColor: Colors.white,
      ),
    );
  }

  Widget _buildActiveVisitBanner(VisitsController controller) {
    const primaryColor = Color(0xFF3F51B5); // AppBar color

    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            primaryColor.withOpacity(0.15),
            primaryColor.withOpacity(0.08),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: primaryColor.withOpacity(0.3)),
        boxShadow: [
          BoxShadow(
            color: primaryColor.withOpacity(0.1),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: primaryColor,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(
                  Icons.radio_button_checked,
                  color: Colors.white,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'active_visit'.tr,
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: primaryColor,
                        fontSize: 16,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      controller.currentVisit.value?.client?.companyName ?? '',
                      style: TextStyle(
                        fontSize: 14,
                        color: primaryColor.withOpacity(0.7),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
              ElevatedButton.icon(
                onPressed: () => _showEndVisitDialog(Get.context!, controller),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.red,
                  foregroundColor: Colors.white,
                  elevation: 2,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                icon: const Icon(Icons.stop, size: 18),
                label: Text('end_visit'.tr),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: BoxDecoration(
              color: primaryColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: primaryColor.withOpacity(0.2)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.access_time, size: 16, color: primaryColor),
                const SizedBox(width: 6),
                Obx(() {
                  return Text(
                    controller.currentVisitDuration.value.isNotEmpty ? controller.currentVisitDuration.value : (controller.currentVisit.value?.getCurrentDuration() ?? ''),
                    style: TextStyle(
                      fontSize: 14,
                      color: primaryColor,
                      fontWeight: FontWeight.bold,
                    ),
                  );
                }),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // (Removed overview section method per request)

  IconData _getStatusIcon(String status) {
    switch (status) {
      case 'Started':
        return Icons.play_circle_filled;
      case 'Completed':
        return Icons.check_circle;
      case 'Cancelled':
        return Icons.cancel;
      default:
        return Icons.help;
    }
  }

  String _localizeStatus(String status) {
    switch (status) {
      case 'Started':
        return 'visit_status_started'.tr;
      case 'Completed':
        return 'visit_status_completed'.tr;
      case 'Cancelled':
        return 'visit_status_cancelled'.tr;
      default:
        return status;
    }
  }

  String _localizeVisitPurpose(String purpose) {
    final normalized = purpose.trim().toLowerCase();
    if (normalized == 'general visit') {
      return 'visit_purpose_general'.tr;
    }
    if (normalized == 'scheduled visit from plan') {
      return 'visit_purpose_scheduled_plan'.tr;
    }
    return purpose;
  }

  Widget _buildEnhancedVisitCard(Visit visit, VisitsController controller) {
    Color statusColor = Color(int.parse(controller.getStatusColor(visit.status.value)));
    final bool isActive = visit.status.value == 'Started';

    return AnimatedContainer(
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeOut,
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            statusColor.withOpacity(isActive ? 0.18 : 0.12),
            statusColor.withOpacity(0.05),
          ],
        ),
        border: Border.all(color: statusColor.withOpacity(0.25), width: 1),
        boxShadow: [
          BoxShadow(
            color: statusColor.withOpacity(0.15),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(18),
          onTap: () async {
            if (!Get.isRegistered<VisitsController>()) {
              VisitsBinding().dependencies();
            }
            final result = await Get.to(() => VisitDetailScreen(visit: visit));
            if (result == true) {
              // Refresh visits when coming back after ending a visit
              try {
                if (Get.isRegistered<VisitsController>()) {
                  final c = Get.find<VisitsController>();
                  c.refreshVisits();
                }
              } catch (_) {}
            }
          },
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: statusColor.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Icon(
                    _getStatusIcon(visit.status.value),
                    color: statusColor,
                    size: 22,
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              visit.client?.companyName ?? 'unknown_client'.tr,
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                                color: Colors.black87,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          _buildStatusChip(visit.status.value, statusColor),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(
                        _buildVisitSubtitle(visit),
                        style: TextStyle(
                          fontSize: 13,
                          color: Colors.grey.shade700,
                          height: 1.3,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      if (visit.purpose != null && visit.purpose!.isNotEmpty) ...[
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            Icon(Icons.flag, size: 14, color: statusColor.withOpacity(0.8)),
                            const SizedBox(width: 4),
                            Expanded(
                              child: Text(
                                _localizeVisitPurpose(visit.purpose!),
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Colors.grey.shade600,
                                  fontStyle: FontStyle.italic,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Icon(Icons.arrow_forward_ios, size: 16, color: Colors.grey.shade500),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildStatusChip(String status, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.15),
        borderRadius: BorderRadius.circular(30),
        border: Border.all(color: color.withOpacity(0.4), width: 0.8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 6,
            height: 6,
            decoration: BoxDecoration(
              color: color,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 6),
          Text(
            _localizeStatus(status),
            style: TextStyle(
              fontSize: 11,
              letterSpacing: 0.3,
              fontWeight: FontWeight.w600,
              color: _darken(color),
            ),
          ),
        ],
      ),
    );
  }

  Color _darken(Color c, [double amount = .25]) {
    assert(amount >= 0 && amount <= 1);
    return Color.fromARGB(
      c.alpha,
      (c.red * (1 - amount)).round(),
      (c.green * (1 - amount)).round(),
      (c.blue * (1 - amount)).round(),
    );
  }

  String _buildVisitSubtitle(Visit visit) {
    final List<String> subtitleParts = [];

    subtitleParts.add(_localizeStatus(visit.status.value));
    subtitleParts.add(_formatDateTime(visit.startTime));

    final duration = visit.status.value == 'Started' ? visit.getCurrentDuration() : visit.getFormattedDuration();
    subtitleParts.add('⏱️ $duration');

    if (visit.purpose != null && visit.purpose!.isNotEmpty) {
      subtitleParts.add('📝 ${_localizeVisitPurpose(visit.purpose!)}');
    }

    return subtitleParts.join(' • ');
  }

  String _formatDateTime(DateTime dateTime) {
    return DateFormat('MMM dd, yyyy HH:mm').format(dateTime);
  }

  void _showStartVisitDialog(BuildContext context, VisitsController controller) {
    DropdownOption<Client>? selectedClientOption;
    final purposeController = TextEditingController();

    // Convert clients to dropdown options
    final clientOptions = controller.clients
        .map((client) => DropdownOption<Client>(
              value: client,
              label: client.companyName + (client.contactName != null ? ' (${client.contactName})' : ''),
            ))
        .toList();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('start_new_visit'.tr),
        content: SizedBox(
          width: double.maxFinite,
          height: 300, // Reduced height since we no longer need space for manual dropdown
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Searchable client dropdown
                SearchableDropdown<Client>(
                  options: clientOptions,
                  value: selectedClientOption,
                  onChanged: (option) {
                    selectedClientOption = option;
                  },
                  hintText: 'search_clients'.tr,
                  labelText: 'select_client'.tr,
                  searchPlaceholder: 'search_clients'.tr,
                  validator: (option) {
                    if (option == null) {
                      return 'please_select_client'.tr;
                    }
                    return null;
                  },
                ),

                const SizedBox(height: 16),

                // Visit purpose field
                TextFormField(
                  controller: purposeController,
                  decoration: InputDecoration(
                    labelText: 'visit_purpose'.tr,
                    hintText: 'optional'.tr,
                    border: const OutlineInputBorder(),
                  ),
                  maxLines: 2,
                ),
              ],
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => UltraSafeNavigation.back(context),
            child: Text('cancel'.tr),
          ),
          ElevatedButton(
            onPressed: () async {
              if (selectedClientOption?.value != null) {
                UltraSafeNavigation.back(context);
                final success = await controller.startVisit(
                  selectedClientOption!.value,
                  purpose: purposeController.text.isNotEmpty ? purposeController.text : null,
                );
                if (success) {
                  Get.snackbar(
                    'success'.tr,
                    'visit_started_successfully'.trParams({'clientName': selectedClientOption!.value.companyName}),
                    snackPosition: SnackPosition.BOTTOM,
                    backgroundColor: Colors.green,
                    colorText: Colors.white,
                  );
                }
              } else {
                Get.snackbar(
                  'error'.tr,
                  'please_select_client'.tr,
                  snackPosition: SnackPosition.BOTTOM,
                  backgroundColor: Colors.red,
                  colorText: Colors.white,
                );
              }
            },
            child: Text('start_visit'.tr),
          ),
        ],
      ),
    );
  }

  void _showEndVisitDialog(BuildContext context, VisitsController controller) {
    final outcomeController = TextEditingController();
    final notesController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('end_visit'.tr),
        content: SizedBox(
          width: double.maxFinite,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextFormField(
                  controller: outcomeController,
                  decoration: InputDecoration(
                    labelText: 'visit_outcome'.tr,
                    hintText: 'required'.tr,
                    border: const OutlineInputBorder(),
                  ),
                  maxLines: 2,
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: notesController,
                  decoration: InputDecoration(
                    labelText: 'notes'.tr,
                    hintText: 'optional'.tr,
                    border: const OutlineInputBorder(),
                  ),
                  maxLines: 3,
                ),
              ],
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => UltraSafeNavigation.back(context),
            child: Text('cancel'.tr),
          ),
          Obx(() => ElevatedButton(
                onPressed: controller.isLoading.value
                    ? null
                    : () async {
                        if (outcomeController.text.isNotEmpty) {
                          try {
                            final success = await controller.endVisit(
                              outcomeController.text,
                              notesController.text,
                            );
                            if (success) {
                              Navigator.of(context).pop(); // Use Navigator.pop instead of UltraSafeNavigation.back(context)
                              Get.snackbar(
                                'success'.tr,
                                'visit_ended_successfully'.tr,
                                snackPosition: SnackPosition.BOTTOM,
                                backgroundColor: Colors.green,
                                colorText: Colors.white,
                              );
                            }
                          } catch (e) {
                            Get.snackbar(
                              'error'.tr,
                              'failed_to_end_visit'.trParams({'error': e.toString()}),
                              snackPosition: SnackPosition.BOTTOM,
                              backgroundColor: Colors.red,
                              colorText: Colors.white,
                            );
                          }
                        } else {
                          Get.snackbar(
                            'error'.tr,
                            'please_enter_visit_outcome'.tr,
                            snackPosition: SnackPosition.BOTTOM,
                            backgroundColor: Colors.red,
                            colorText: Colors.white,
                          );
                        }
                      },
                child: controller.isLoading.value
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : Text('end_visit'.tr),
              )),
        ],
      ),
    );
  }

  Widget _buildEmptyVisitsState(BuildContext context, VisitsController controller) {
    const primaryColor = Color(0xFF3F51B5);
    final theme = Theme.of(context);

    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 360),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 32),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(24),
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                Colors.white,
                primaryColor.withOpacity(0.08),
              ],
            ),
            border: Border.all(
              color: primaryColor.withOpacity(0.1),
              width: 1.2,
            ),
            boxShadow: [
              BoxShadow(
                color: primaryColor.withOpacity(0.12),
                blurRadius: 20,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: SingleChildScrollView(
            physics: const BouncingScrollPhysics(),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        primaryColor,
                        primaryColor.withOpacity(0.7),
                      ],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.calendar_month_rounded,
                    size: 58,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 24),
                Text(
                  'no_visits_found'.tr,
                  style: theme.textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: primaryColor,
                    letterSpacing: 0.2,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 10),
                Text(
                  'start_your_first_visit_to_begin'.tr,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: Colors.grey.shade700,
                    height: 1.4,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 28),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () => _showStartVisitDialog(context, controller),
                    icon: const Icon(Icons.add_circle_outline_rounded),
                    label: Text(
                      'start_new_visit'.tr,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: primaryColor,
                      foregroundColor: Colors.white,
                      elevation: 3,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(18),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
