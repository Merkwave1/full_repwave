// lib/modules/visits/screens/visit_detail_screen.dart
import 'package:flutter/material.dart';
import '/shared_widgets/ultra_safe_navigation.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '/core/routes/app_routes.dart';
import '/modules/visits/controllers/visits_controller.dart';
import '/modules/visits/bindings/visits_binding.dart';
import '/data/models/visit.dart';
import '/modules/sales_orders/screens/add_edit_sales_order_screen.dart';
import '/modules/sales_orders/bindings/add_edit_sales_order_binding.dart';
import '/modules/payments/screens/add_payment_screen.dart';
import '/modules/payments/bindings/payments_binding.dart';
import '/modules/returns/screens/add_edit_sales_return_screen.dart';
import '/modules/returns/bindings/add_edit_sales_return_binding.dart';
import '/services/media_service.dart';
import '/data/repositories/client_repository.dart';
import '/modules/auth/controllers/auth_controller.dart';
import '/data/repositories/payment_repository.dart';
import '/core/app_constants.dart';
import '/shared_widgets/safe_navigation.dart';
import '/shared_widgets/safe_messenger.dart';
import '/modules/shared/controllers/global_data_controller.dart';

class VisitDetailScreen extends StatelessWidget {
  final Visit visit;

  VisitDetailScreen({super.key, required this.visit});

  @override
  Widget build(BuildContext context) {
    // Ensure VisitsController is available before trying to use it
    if (!Get.isRegistered<VisitsController>()) {
      VisitsBinding().dependencies();
    }

    final VisitsController controller = Get.find<VisitsController>();

    print('VisitDetailScreen build - visit status: ${visit.status.value}');

    return Scaffold(
      appBar: AppBar(
        title: Text('visit_details'.tr),
        centerTitle: true,
        actions: [
          if (visit.status.value == 'Started')
            IconButton(
              icon: const Icon(Icons.stop_circle),
              onPressed: () {
                print('App bar End Visit button pressed - visit status: ${visit.status.value}');
                _showEndVisitDialog(context, controller);
              },
            ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Status Card
            _buildStatusCard(),
            const SizedBox(height: 16),

            // Client Information Card
            _buildClientInfoCard(),
            const SizedBox(height: 16),

            // Visit Timeline Card - only show if visit is not active
            if (visit.status.value != 'Started') _buildTimelineCard(),
            if (visit.status.value != 'Started') const SizedBox(height: 16),

            // Visit Details Card - only show if visit is not active
            if (visit.status.value != 'Started') _buildDetailsCard(),
            if (visit.status.value != 'Started') const SizedBox(height: 16),

            // Location Information Card - only show if visit is not active
            if (visit.status.value != 'Started') _buildLocationCard(),
            if (visit.status.value != 'Started') const SizedBox(height: 16),

            // Activities Card - only show if visit is not active
            if (visit.status.value != 'Started') _buildActivitiesCard(controller),
            if (visit.status.value != 'Started') const SizedBox(height: 16),

            // Action Buttons
            if (visit.status.value == 'Started') _buildActionButtons(context, controller),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusCard() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 4),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            _getStatusColor(visit.status.value).withOpacity(0.1),
            _getStatusColor(visit.status.value).withOpacity(0.05),
          ],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: _getStatusColor(visit.status.value).withOpacity(0.3),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: _getStatusColor(visit.status.value).withOpacity(0.15),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Row(
          children: [
            Container(
              width: 60,
              height: 60,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    _getStatusColor(visit.status.value),
                    _getStatusColor(visit.status.value).withOpacity(0.8),
                  ],
                ),
                borderRadius: BorderRadius.circular(30),
                boxShadow: [
                  BoxShadow(
                    color: _getStatusColor(visit.status.value).withOpacity(0.4),
                    blurRadius: 8,
                    offset: const Offset(0, 3),
                  ),
                ],
              ),
              child: Icon(
                _getStatusIcon(visit.status.value),
                color: Colors.white,
                size: 28,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'visit_status'.tr,
                    style: TextStyle(
                      fontSize: 13,
                      color: Colors.grey.shade600,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    visit.status.value,
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      color: Colors.black87,
                    ),
                  ),
                ],
              ),
            ),
            // Status indicator dot
            Container(
              width: 12,
              height: 12,
              decoration: BoxDecoration(
                color: _getStatusColor(visit.status.value),
                borderRadius: BorderRadius.circular(6),
                boxShadow: [
                  BoxShadow(
                    color: _getStatusColor(visit.status.value).withOpacity(0.5),
                    blurRadius: 4,
                    spreadRadius: 1,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildClientInfoCard() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 4),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Colors.white,
            Colors.blue.shade50.withOpacity(0.3),
          ],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: Colors.blue.withOpacity(0.1),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 15,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header with icon
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [Colors.blue.shade400, Colors.blue.shade600],
                    ),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(
                    Icons.business,
                    color: Colors.white,
                    size: 20,
                  ),
                ),
                const SizedBox(width: 12),
                Text(
                  'client_information'.tr,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Colors.black87,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            _buildEnhancedInfoRow(Icons.business, 'company_name'.tr, visit.client?.companyName ?? 'unknown'.tr),
            if (visit.client?.contactName != null) _buildEnhancedInfoRow(Icons.person, 'contact_name'.tr, visit.client!.contactName!),
            if (visit.client?.contactPhone1 != null) _buildEnhancedInfoRow(Icons.phone, 'phone'.tr, visit.client!.contactPhone1!),
            if (visit.client?.address != null) _buildEnhancedInfoRow(Icons.location_on, 'address'.tr, visit.client!.address!),
          ],
        ),
      ),
    );
  }

  Widget _buildTimelineCard() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 4),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Colors.white,
            Colors.green.shade50.withOpacity(0.3),
          ],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: Colors.green.withOpacity(0.1),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 15,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header with icon
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [Colors.green.shade400, Colors.green.shade600],
                    ),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(
                    Icons.schedule,
                    color: Colors.white,
                    size: 20,
                  ),
                ),
                const SizedBox(width: 12),
                Text(
                  'Visit Timeline',
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Colors.black87,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            _buildEnhancedInfoRow(Icons.play_circle_filled, 'Started At', _formatDateTime(visit.startTime)),
            if (visit.endTime != null) _buildEnhancedInfoRow(Icons.stop_circle, 'Ended At', _formatDateTime(visit.endTime!)),
            if (visit.endTime != null) _buildEnhancedInfoRow(Icons.timer, 'Duration', _calculateDuration()) else _buildEnhancedInfoRow(Icons.timer, 'Duration', visit.getCurrentDuration() + ' (ongoing)'),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailsCard() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 4),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Colors.white,
            Colors.purple.shade50.withOpacity(0.3),
          ],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: Colors.purple.withOpacity(0.1),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 15,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header with icon
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [Colors.purple.shade400, Colors.purple.shade600],
                    ),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(
                    Icons.description,
                    color: Colors.white,
                    size: 20,
                  ),
                ),
                const SizedBox(width: 12),
                Text(
                  'Visit Details',
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Colors.black87,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            if (visit.purpose != null) _buildEnhancedInfoRow(Icons.flag, 'Purpose', visit.purpose!),
            if (visit.outcome != null) _buildEnhancedInfoRow(Icons.check_circle, 'Outcome', visit.outcome!),
            if (visit.notes != null) _buildEnhancedInfoRow(Icons.note, 'Notes', visit.notes!),
          ],
        ),
      ),
    );
  }

  Widget _buildLocationCard() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 4),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Colors.white,
            Colors.orange.shade50.withOpacity(0.3),
          ],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: Colors.orange.withOpacity(0.1),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 15,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header with icon
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [Colors.orange.shade400, Colors.orange.shade600],
                    ),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(
                    Icons.location_on,
                    color: Colors.white,
                    size: 20,
                  ),
                ),
                const SizedBox(width: 12),
                Text(
                  'Location Information',
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Colors.black87,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            if (visit.startLatitude != null && visit.startLongitude != null) _buildEnhancedInfoRow(Icons.play_circle_filled, 'Start Location', '${visit.startLatitude}, ${visit.startLongitude}'),
            if (visit.endLatitude != null && visit.endLongitude != null) _buildEnhancedInfoRow(Icons.stop_circle, 'End Location', '${visit.endLatitude}, ${visit.endLongitude}'),
          ],
        ),
      ),
    );
  }

  Widget _buildActivitiesCard(VisitsController controller) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 4),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Colors.white,
            Colors.indigo.shade50.withOpacity(0.3),
          ],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: Colors.indigo.withOpacity(0.1),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 15,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header with icon and refresh button
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [Colors.indigo.shade400, Colors.indigo.shade600],
                    ),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(
                    Icons.list_alt,
                    color: Colors.white,
                    size: 20,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Visit Activities',
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Colors.black87,
                    ),
                  ),
                ),
                IconButton(
                  icon: Icon(Icons.refresh, color: Colors.indigo.shade600),
                  onPressed: () {
                    // Trigger rebuild to refresh activities
                    if (visit.id != null) {
                      // Force a rebuild by replacing the current screen
                      // Since this is a StatelessWidget, use Get.off to replace current screen
                      Get.off(() => VisitDetailScreen(visit: visit));
                    }
                  },
                ),
              ],
            ),
            const SizedBox(height: 20),

            // Activities list
            if (visit.id != null)
              FutureBuilder<List<Map<String, dynamic>>>(
                future: controller.getVisitActivities(visit.id!),
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return Container(
                      padding: const EdgeInsets.all(20),
                      child: const Center(
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                    );
                  }

                  if (snapshot.hasError) {
                    return Container(
                      padding: const EdgeInsets.all(16),
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
                              'Error loading activities: ${snapshot.error}',
                              style: TextStyle(color: Colors.red.shade700, fontSize: 14),
                            ),
                          ),
                        ],
                      ),
                    );
                  }

                  final activities = snapshot.data ?? [];

                  if (activities.isEmpty) {
                    return Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.grey.shade50,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.grey.shade200),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.info_outline, color: Colors.grey.shade500, size: 20),
                          const SizedBox(width: 8),
                          Text(
                            'No activities recorded yet',
                            style: TextStyle(color: Colors.grey.shade600, fontSize: 14),
                          ),
                        ],
                      ),
                    );
                  }

                  return Column(
                    children: activities.map((activity) => _buildActivityItem(activity)).toList(),
                  );
                },
              )
            else
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.grey.shade50,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.grey.shade200),
                ),
                child: Row(
                  children: [
                    Icon(Icons.warning_outlined, color: Colors.grey.shade500, size: 20),
                    const SizedBox(width: 8),
                    Text(
                      'Visit ID not available',
                      style: TextStyle(color: Colors.grey.shade600, fontSize: 14),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildActivityItem(Map<String, dynamic> activity) {
    final activityType = activity['visit_activities_type'] ?? 'unknown';
    final description = activity['visit_activities_description'] ?? 'No description';
    final createdAt = activity['visit_activities_created_at'] != null ? DateTime.tryParse(activity['visit_activities_created_at']) : null;
    final referenceId = activity['visit_activities_reference_id'];

    // Get activity display properties
    final icon = _getActivityIcon(activityType);
    final color = _getActivityColor(activityType);
    final displayName = _getActivityDisplayName(activityType);

    // Check if this is a document-related activity
    final isDocumentActivity = _isDocumentActivity(activityType);

    return GestureDetector(
      onTap: isDocumentActivity && referenceId != null ? () => _showDocumentDetails(referenceId) : null,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withOpacity(0.2)),
          boxShadow: [
            BoxShadow(
              color: color.withOpacity(0.1),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          children: [
            // Activity icon
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                borderRadius: BorderRadius.circular(24),
              ),
              child: Icon(
                icon,
                color: color,
                size: 24,
              ),
            ),
            const SizedBox(width: 16),

            // Activity details
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          displayName,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: Colors.black87,
                          ),
                        ),
                      ),
                      if (referenceId != null)
                        GestureDetector(
                          onTap: isDocumentActivity ? () => _showDocumentDetails(referenceId) : null,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: color.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(8),
                              border: isDocumentActivity ? Border.all(color: color.withOpacity(0.3)) : null,
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                if (isDocumentActivity)
                                  Icon(
                                    Icons.attachment,
                                    size: 12,
                                    color: color,
                                  ),
                                if (isDocumentActivity) SizedBox(width: 4),
                                Text(
                                  '#$referenceId',
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                    color: color,
                                  ),
                                ),
                                if (isDocumentActivity) SizedBox(width: 4),
                                if (isDocumentActivity)
                                  Icon(
                                    Icons.visibility,
                                    size: 12,
                                    color: color,
                                  ),
                              ],
                            ),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    description,
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.grey.shade600,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (createdAt != null) ...[
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Icon(
                          Icons.access_time,
                          size: 14,
                          color: Colors.grey.shade500,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          _formatActivityDateTime(createdAt),
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey.shade500,
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),

            // Action button
            if (activityType == 'SalesOrder_Created' ||
                activityType == 'Payment_Collected' ||
                activityType == 'Return_Initiated' ||
                activityType == 'sales_order' ||
                activityType == 'payment' ||
                activityType == 'return' ||
                activityType == 'note' ||
                activityType == 'client_note_added' ||
                activityType == 'support' ||
                activityType == 'customer_support' ||
                activityType == 'photo' ||
                activityType == 'photo_before' ||
                activityType == 'photo_after' ||
                activityType == 'document' ||
                activityType == 'document_uploaded' ||
                activityType == 'salesinvoice_created')
              IconButton(
                icon: Icon(
                  Icons.open_in_new,
                  color: color,
                  size: 20,
                ),
                onPressed: () => _handleActivityAction(activityType, referenceId),
              ),
          ],
        ),
      ),
    );
  }

  bool _isDocumentActivity(String activityType) {
    return activityType.toLowerCase() == 'photo_before' || activityType.toLowerCase() == 'photo_after' || activityType.toLowerCase() == 'document_uploaded' || activityType.toLowerCase() == 'photo' || activityType.toLowerCase() == 'document';
  }

  void _showDocumentDetails(int documentId) async {
    try {
      // Show loading dialog
      Get.dialog(
        Center(child: CircularProgressIndicator()),
        barrierDismissible: false,
      );

      final authController = Get.find<AuthController>();
      final clientRepository = Get.find<ClientRepository>();
      final String? userUuid = authController.currentUser.value?.uuid;

      if (userUuid != null) {
        final documentData = await clientRepository.getClientDocumentDetail(documentId, userUuid);

        UltraSafeNavigation.closeDialog(); // Close loading dialog safely

        // Show document details dialog
        _showDocumentDetailsDialog(documentData);
      } else {
        UltraSafeNavigation.closeDialog(); // Close loading dialog safely
        Get.snackbar(
          'Error',
          'User authentication error',
          snackPosition: SnackPosition.BOTTOM,
          backgroundColor: Colors.red,
          colorText: Colors.white,
        );
      }
    } catch (e) {
      UltraSafeNavigation.closeDialog(); // Close loading dialog safely
      Get.snackbar(
        'Error',
        'Failed to load document details: ${e.toString()}',
        snackPosition: SnackPosition.BOTTOM,
        backgroundColor: Colors.red,
        colorText: Colors.white,
      );
    }
  }

  void _showDocumentDetailsDialog(Map<String, dynamic> document) {
    showDialog(
      context: Get.context!,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            Icon(Icons.description, color: Colors.brown),
            SizedBox(width: 8),
            Expanded(
              child: Text(
                document['document_type_name'] ?? 'Document',
                style: TextStyle(fontSize: 18),
              ),
            ),
          ],
        ),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildDocumentDetailRow('Title', document['client_document_title'] ?? 'N/A'),
              _buildDocumentDetailRow('Type', document['document_type_name'] ?? 'N/A'),
              _buildDocumentDetailRow('Client', document['client_name'] ?? 'N/A'),
              if (document['client_company_name'] != null && document['client_company_name'].toString().isNotEmpty) _buildDocumentDetailRow('Company', document['client_company_name']),
              _buildDocumentDetailRow('Uploaded By', document['uploaded_by_user_name'] ?? 'N/A'),
              _buildDocumentDetailRow('File Size', document['client_document_file_size_kb'] != null ? '${document['client_document_file_size_kb']} KB' : 'N/A'),
              _buildDocumentDetailRow('MIME Type', document['client_document_file_mime_type'] ?? 'N/A'),
              if (document['client_document_notes'] != null && document['client_document_notes'].toString().isNotEmpty) _buildDocumentDetailRow('Notes', document['client_document_notes']),
              _buildDocumentDetailRow('Uploaded', document['client_document_created_at'] != null ? _formatActivityDateTime(DateTime.parse(document['client_document_created_at'])) : 'N/A'),
              if (document['client_documents_visit_id'] != null) _buildDocumentDetailRow('Visit ID', '#${document['client_documents_visit_id']}'),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: Text('close'.tr),
          ),
          if (document['client_document_file_path'] != null)
            ElevatedButton.icon(
              onPressed: () => _viewFile(document),
              icon: Icon(Icons.open_in_new),
              label: Text('view_file'.tr),
              style: ElevatedButton.styleFrom(backgroundColor: Colors.brown),
            ),
        ],
      ),
    );
  }

  Widget _buildDocumentDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(
              '$label:',
              style: TextStyle(
                fontWeight: FontWeight.w600,
                color: Colors.grey.shade700,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: TextStyle(color: Colors.black87),
            ),
          ),
        ],
      ),
    );
  }

  IconData _getActivityIcon(String activityType) {
    switch (activityType.toLowerCase()) {
      case 'sales_order':
      case 'salesorder_created':
        return Icons.shopping_cart;
      case 'payment':
      case 'payment_collected':
        return Icons.payment;
      case 'return':
      case 'return_initiated':
        return Icons.keyboard_return;
      case 'note':
      case 'client_note_added':
        return Icons.edit_note;
      case 'photo':
      case 'photo_before':
      case 'photo_after':
        return Icons.camera_alt;
      case 'document':
      case 'document_uploaded':
        return Icons.upload_file;
      case 'support':
      case 'customer_support':
        return Icons.support_agent;
      case 'salesinvoice_created':
        return Icons.receipt;
      default:
        return Icons.assignment;
    }
  }

  Color _getActivityColor(String activityType) {
    switch (activityType.toLowerCase()) {
      case 'sales_order':
      case 'salesorder_created':
        return Colors.blue;
      case 'payment':
      case 'payment_collected':
        return Colors.purple;
      case 'return':
      case 'return_initiated':
        return Colors.orange;
      case 'note':
      case 'client_note_added':
        return Colors.cyan;
      case 'photo':
      case 'photo_before':
      case 'photo_after':
        return Colors.indigo;
      case 'document':
      case 'document_uploaded':
        return Colors.brown;
      case 'support':
      case 'customer_support':
        return Colors.teal;
      case 'salesinvoice_created':
        return Colors.green;
      default:
        return Colors.grey;
    }
  }

  String _getActivityDisplayName(String activityType) {
    switch (activityType.toLowerCase()) {
      case 'sales_order':
      case 'salesorder_created':
        return 'Sales Order';
      case 'payment':
      case 'payment_collected':
        return 'Payment';
      case 'return':
      case 'return_initiated':
        return 'Return';
      case 'note':
      case 'client_note_added':
        return 'Note';
      case 'photo':
      case 'photo_before':
        return 'Photo (Before)';
      case 'photo_after':
        return 'Photo (After)';
      case 'document':
      case 'document_uploaded':
        return 'Document';
      case 'support':
      case 'customer_support':
        return 'Customer Support';
      case 'salesinvoice_created':
        return 'Sales Invoice';
      default:
        return activityType.replaceAll('_', ' ').toUpperCase();
    }
  }

  String _formatActivityDateTime(DateTime dateTime) {
    final now = DateTime.now();
    final difference = now.difference(dateTime);

    if (difference.inDays > 0) {
      return '${difference.inDays}d ago';
    } else if (difference.inHours > 0) {
      return '${difference.inHours}h ago';
    } else if (difference.inMinutes > 0) {
      return '${difference.inMinutes}m ago';
    } else {
      return 'Just now';
    }
  }

  void _handleActivityAction(String activityType, int? referenceId) {
    switch (activityType.toLowerCase()) {
      case 'sales_order':
      case 'salesorder_created':
        if (referenceId != null) {
          // Navigate to sales order detail screen
          Get.toNamed(AppRoutes.salesOrderDetail, arguments: referenceId);
        } else {
          // Show general info for sales order activities without reference ID
          _showActivityDetailsWithoutReference(activityType, 'Sales Order Activity', 'This activity indicates that a sales order was created during this visit, but the specific order reference is not available.');
        }
        break;
      case 'payment':
      case 'payment_collected':
        if (referenceId != null) {
          // Show payment details - we'll fetch and display payment details
          _showPaymentDetails(referenceId);
        } else {
          // Show general info for payment activities without reference ID
          _showActivityDetailsWithoutReference(activityType, 'Payment Activity', 'This activity indicates that a payment was collected during this visit, but the specific payment reference is not available.');
        }
        break;
      case 'return':
      case 'return_initiated':
        if (referenceId != null) {
          // Navigate to return detail screen
          Get.toNamed(AppRoutes.returnOrderDetail, arguments: referenceId);
        } else {
          // Show general info for return activities without reference ID
          _showActivityDetailsWithoutReference(activityType, 'Return Activity', 'This activity indicates that a return was initiated during this visit, but the specific return reference is not available.');
        }
        break;
      case 'note':
      case 'client_note_added':
      case 'support':
      case 'customer_support':
      case 'photo':
      case 'photo_before':
      case 'photo_after':
      case 'document':
      case 'document_uploaded':
        // Show activity details in a dialog (these don't typically need reference IDs)
        _showActivityDetails(activityType, referenceId);
        break;
      case 'salesinvoice_created':
        if (referenceId != null) {
          // Navigate to invoice detail screen if available
          Get.toNamed(AppRoutes.invoiceDetail, arguments: referenceId);
        } else {
          // Show general info for invoice activities without reference ID
          _showActivityDetailsWithoutReference(activityType, 'Invoice Activity', 'This activity indicates that an invoice was created during this visit, but the specific invoice reference is not available.');
        }
        break;
      default:
        // For unknown activity types, show what information is available
        _showActivityDetailsWithoutReference(
            activityType, activityType.replaceAll('_', ' ').toUpperCase(), 'Activity information: ${activityType.replaceAll('_', ' ')}\n${referenceId != null ? 'Reference ID: $referenceId' : 'No reference ID available'}');
        break;
    }
  }

  Widget _buildActionButtons(BuildContext context, VisitsController controller) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 4),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Colors.white,
            Colors.grey.shade50,
          ],
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.08),
            blurRadius: 20,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header with icon
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [Colors.blue.shade400, Colors.blue.shade600],
                    ),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(
                    Icons.dashboard_customize,
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
                        'visit_activities'.tr,
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: Colors.black87,
                        ),
                      ),
                      Text(
                        'select_activity_to_perform'.tr,
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey.shade600,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Sales Activities Section
            _buildEnhancedActivitySection(
              'sales_activities'.tr,
              Icons.trending_up,
              Colors.blue,
              [
                _buildEnhancedActivityButton(
                  icon: Icons.shopping_cart,
                  label: 'create_sales_order'.tr,
                  subtitle: 'new_order'.tr,
                  color: Colors.blue,
                  onPressed: () => _handleCreateSalesOrder(context),
                ),
                _buildEnhancedActivityButton(
                  icon: Icons.payment,
                  label: 'create_payment'.tr,
                  subtitle: 'collect_payment'.tr,
                  color: Colors.purple,
                  onPressed: () => _handleCreatePayment(context),
                ),
              ],
            ),

            const SizedBox(height: 20),

            // Returns & Support Section
            _buildEnhancedActivitySection(
              'returns_support'.tr,
              Icons.support_agent,
              Colors.orange,
              [
                _buildEnhancedActivityButton(
                  icon: Icons.keyboard_return,
                  label: 'create_return'.tr,
                  subtitle: 'return_items'.tr,
                  color: Colors.orange,
                  onPressed: () => _handleCreateReturn(context),
                ),
                _buildEnhancedActivityButton(
                  icon: Icons.support_agent,
                  label: 'customer_support'.tr,
                  subtitle: 'help_client'.tr,
                  color: Colors.teal,
                  onPressed: () => _handleCustomerSupport(context),
                ),
              ],
            ),

            const SizedBox(height: 20),

            // Documentation Section
            _buildEnhancedActivitySection(
              'documentation'.tr,
              Icons.folder_open,
              Colors.indigo,
              [
                _buildEnhancedActivityButton(
                  icon: Icons.upload_file,
                  label: 'upload_document'.tr,
                  subtitle: 'add_document_or_photo'.tr,
                  color: Colors.brown,
                  onPressed: () => _handleUploadDocument(context),
                ),
                _buildEnhancedActivityButton(
                  icon: Icons.edit_note,
                  label: 'add_note'.tr,
                  subtitle: 'quick_note'.tr,
                  color: Colors.cyan,
                  onPressed: () => _handleAddNote(context, controller),
                ),
              ],
            ),

            const SizedBox(height: 28),

            // End Visit Button
            Container(
              width: double.infinity,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [Colors.red.shade400, Colors.red.shade600],
                ),
                borderRadius: BorderRadius.circular(12),
                boxShadow: [
                  BoxShadow(
                    color: Colors.red.withOpacity(0.3),
                    blurRadius: 8,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: ElevatedButton.icon(
                onPressed: () {
                  print('End Visit button pressed - visit status: ${visit.status.value}');
                  _showEndVisitDialog(context, controller);
                },
                icon: const Icon(Icons.stop_circle, size: 20),
                label: Text(
                  'end_visit'.tr,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.transparent,
                  foregroundColor: Colors.white,
                  shadowColor: Colors.transparent,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEnhancedActivitySection(String title, IconData sectionIcon, Color sectionColor, List<Widget> buttons) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: sectionColor.withOpacity(0.05),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: sectionColor.withOpacity(0.2),
          width: 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: sectionColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  sectionIcon,
                  size: 16,
                  color: sectionColor,
                ),
              ),
              const SizedBox(width: 8),
              Text(
                title,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: sectionColor.withOpacity(0.8),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          // New design: Single column layout to prevent overflow
          Column(
            children: buttons
                .map((button) => Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: button,
                    ))
                .toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildEnhancedActivityButton({
    required IconData icon,
    required String label,
    required String subtitle,
    required Color color,
    required VoidCallback onPressed,
  }) {
    return Container(
      width: double.infinity,
      height: 75, // Increased to prevent overflow
      margin: const EdgeInsets.symmetric(horizontal: 4),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.centerLeft,
          end: Alignment.centerRight,
          colors: [
            color.withOpacity(0.8),
            color,
          ],
        ),
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: color.withOpacity(0.3),
            blurRadius: 6,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          onTap: onPressed,
          borderRadius: BorderRadius.circular(12),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              children: [
                // Icon container
                Container(
                  width: 46,
                  height: 46,
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(23),
                  ),
                  child: Icon(
                    icon,
                    color: Colors.white,
                    size: 24,
                  ),
                ),

                const SizedBox(width: 16),

                // Text content
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        label,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 1),
                      Text(
                        subtitle,
                        style: TextStyle(
                          color: Colors.white.withOpacity(0.9),
                          fontSize: 12,
                          fontWeight: FontWeight.w400,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),

                // Arrow icon
                Icon(
                  Icons.arrow_forward_ios,
                  color: Colors.white.withOpacity(0.8),
                  size: 16,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildEnhancedInfoRow(IconData icon, String label, String value) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.6),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: Colors.grey.shade200,
          width: 1,
        ),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Colors.blue.shade50,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(
              icon,
              size: 18,
              color: Colors.blue.shade600,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey.shade600,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: Colors.black87,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'Started':
        return Colors.green;
      case 'Completed':
        return Colors.blue;
      case 'Cancelled':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

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

  String _formatDateTime(DateTime dateTime) {
    return DateFormat('MMM dd, yyyy HH:mm').format(dateTime);
  }

  String _calculateDuration() {
    if (visit.endTime == null) return 'Ongoing';

    final duration = visit.endTime!.difference(visit.startTime);
    final hours = duration.inHours;
    final minutes = duration.inMinutes % 60;

    if (hours > 0) {
      return '${hours}h ${minutes}m';
    } else {
      return '${minutes}m';
    }
  }

  void _showEndVisitDialog(BuildContext pageContext, VisitsController controller) {
    print('_showEndVisitDialog called - visit status: ${visit.status.value}');
    // Ensure the controller knows which visit is active (important if user navigated here from calendar/list)
    if (visit.status.value == 'Started') {
      if (controller.currentVisit.value == null) {
        print('[EndVisit] controller.currentVisit was null. Setting to this visit (id: ${visit.id}).');
        controller.currentVisit.value = visit;
        controller.isVisitActive.value = true;
      } else if (controller.currentVisit.value?.id != visit.id) {
        // Edge case: Another visit is marked active OR lost state. Prefer the screen's visit.
        print('[EndVisit][Warning] controller.currentVisit.id (${controller.currentVisit.value?.id}) differs from screen visit.id (${visit.id}). Overriding with screen visit.');
        controller.currentVisit.value = visit;
        controller.isVisitActive.value = true;
      }
    }
    final outcomeController = TextEditingController();
    final notesController = TextEditingController();
    final RxBool isLoading = false.obs;

    showDialog(
      context: pageContext,
      barrierDismissible: false, // Prevent dismissing while loading
      builder: (dialogContext) => Obx(() => AlertDialog(
            title: Text('end_visit'.tr),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (isLoading.value) ...[
                  const CircularProgressIndicator(),
                  const SizedBox(height: 16),
                  Text('ending_visit'.tr),
                  const SizedBox(height: 16),
                ],
                TextFormField(
                  controller: outcomeController,
                  enabled: !isLoading.value,
                  decoration: InputDecoration(
                    labelText: 'visit_outcome'.tr,
                    hintText: 'required'.tr,
                  ),
                  maxLines: 2,
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: notesController,
                  enabled: !isLoading.value,
                  decoration: InputDecoration(
                    labelText: 'notes'.tr,
                    hintText: 'optional'.tr,
                  ),
                  maxLines: 3,
                ),
              ],
            ),
            actions: [
              if (!isLoading.value) ...[
                TextButton(
                  onPressed: () => Navigator.of(dialogContext).pop(),
                  child: Text('cancel'.tr),
                ),
                ElevatedButton(
                  onPressed: () async {
                    if (outcomeController.text.isNotEmpty) {
                      isLoading.value = true;

                      try {
                        final success = await controller.endVisit(
                          outcomeController.text,
                          notesController.text,
                        );

                        // Always close dialog safely first
                        UltraSafeNavigation.closeDialog(dialogContext);

                        if (success) {
                          // Update local status for immediate UI consistency
                          visit.status.value = 'Completed';
                          // Pop back to the previous screen (Visits list or where we came from)
                          Future.microtask(() {
                            try {
                              FocusManager.instance.primaryFocus?.unfocus();
                            } catch (_) {}
                            if (Navigator.of(pageContext).canPop()) {
                              Navigator.of(pageContext).pop(true);
                            }
                            // Optional: show a safe snackbar via ScaffoldMessenger
                            SafeMessenger.show(
                              'visit_ended_successfully'.tr,
                              title: 'success'.tr,
                              background: Colors.green,
                            );
                          });
                        } else {
                          // Show error message
                          Get.snackbar(
                            'error'.tr,
                            'failed_to_end_visit'.tr,
                            backgroundColor: Colors.red,
                            colorText: Colors.white,
                            snackPosition: SnackPosition.BOTTOM,
                          );
                        }
                      } catch (e) {
                        // Close dialog on error safely
                        UltraSafeNavigation.closeDialog(dialogContext);
                        debugPrint('[EndVisitFlow][Error] Exception ending visit: $e');

                        Get.snackbar(
                          'error'.tr,
                          'failed_to_end_visit'.tr,
                          backgroundColor: Colors.red,
                          colorText: Colors.white,
                          snackPosition: SnackPosition.BOTTOM,
                        );
                      } finally {
                        isLoading.value = false;
                      }
                    } else {
                      Get.snackbar(
                        'error'.tr,
                        'visit_outcome_required'.tr, // Fallback key, ensure translation exists
                        backgroundColor: Colors.red,
                        colorText: Colors.white,
                        snackPosition: SnackPosition.BOTTOM,
                      );
                    }
                  },
                  child: Text('end_visit'.tr),
                ),
              ],
            ],
          )),
    );
  }

  // Activity Handler Methods
  Future<void> _handleCreateSalesOrder(BuildContext context) async {
    if (visit.client?.id != null) {
      // Force refresh inventory before creating sales order
      final globalDataController = Get.find<GlobalDataController>();

      // Show loading indicator
      Get.dialog(
        Center(child: CircularProgressIndicator()),
        barrierDismissible: false,
      );

      try {
        // Force refresh inventory for all warehouses
        await globalDataController.loadRepInventory(forceRefresh: true);

        // Close loading indicator
        if (Get.isDialogOpen ?? false) {
          Get.back();
        }

        // Navigate to sales order creation screen with the current client pre-selected
        Get.to(
          () => AddEditSalesOrderScreen(),
          binding: AddEditSalesOrderBinding(),
          arguments: {
            'clientId': visit.client!.id,
            'visitId': visit.id, // Pass visit ID for activity logging after creation
          },
        );

        // Note: Activity logging will happen after sales order is successfully created
        // in the AddEditSalesOrderController to capture the actual sales order ID

        // Show navigation feedback
        Get.snackbar(
          'Sales Order',
          'Creating sales order for ${visit.client?.companyName ?? 'client'}',
          snackPosition: SnackPosition.BOTTOM,
          backgroundColor: Colors.blue,
          colorText: Colors.white,
          duration: Duration(seconds: 2),
        );
      } catch (e) {
        // Close loading indicator if still open
        if (Get.isDialogOpen ?? false) {
          Get.back();
        }

        // Show error but still allow navigation
        Get.snackbar(
          'Warning',
          'Failed to refresh inventory: $e',
          snackPosition: SnackPosition.BOTTOM,
          backgroundColor: Colors.orange,
          colorText: Colors.white,
          duration: Duration(seconds: 3),
        );

        // Navigate anyway
        Get.to(
          () => AddEditSalesOrderScreen(),
          binding: AddEditSalesOrderBinding(),
          arguments: {
            'clientId': visit.client!.id,
            'visitId': visit.id,
          },
        );
      }
    } else {
      Get.snackbar(
        'Error',
        'Client information is not available for this visit',
        snackPosition: SnackPosition.BOTTOM,
        backgroundColor: Colors.red,
        colorText: Colors.white,
      );
    }
  }

  void _handleCreatePayment(BuildContext context) {
    if (visit.client?.id != null) {
      print('=== NAVIGATING TO PAYMENT SCREEN ===');
      print('=== CLIENT ID: ${visit.client!.id} ===');
      print('=== CLIENT COMPANY: ${visit.client?.companyName ?? 'Unknown'} ===');
      print('=== VISIT ID: ${visit.id} ===');

      // Navigate to payment creation screen with the current client pre-selected
      Get.to(
        () => AddPaymentScreen(
          preSelectedClientId: visit.client!.id,
          visitId: visit.id, // Pass visit ID for activity logging after creation
        ),
        binding: PaymentsBinding(),
      );

      // Note: Activity logging will happen after payment is successfully created
      // in the payment controller to capture the actual payment ID

      // Show navigation feedback
      Get.snackbar(
        'Payment',
        'Creating payment for ${visit.client?.companyName ?? 'client'}',
        snackPosition: SnackPosition.BOTTOM,
        backgroundColor: Colors.purple,
        colorText: Colors.white,
        duration: Duration(seconds: 2),
      );
    } else {
      Get.snackbar(
        'Error',
        'Client information is not available for this visit',
        snackPosition: SnackPosition.BOTTOM,
        backgroundColor: Colors.red,
        colorText: Colors.white,
      );
    }
  }

  void _handleCreateReturn(BuildContext context) {
    if (visit.client?.id != null) {
      // Navigate to return creation screen with the current client pre-selected
      Get.to(
        () => AddEditSalesReturnScreen(
          preSelectedClientId: visit.client!.id,
        ),
        binding: AddEditSalesReturnBinding(),
        arguments: {
          'visitId': visit.id, // Pass visit ID for activity logging after creation
        },
      );

      // Note: Activity logging will happen after return is successfully created
      // in the return controller to capture the actual return ID

      // Show navigation feedback
      Get.snackbar(
        'Return',
        'Creating return for ${visit.client?.companyName ?? 'client'}',
        snackPosition: SnackPosition.BOTTOM,
        backgroundColor: Colors.orange,
        colorText: Colors.white,
        duration: Duration(seconds: 2),
      );
    } else {
      Get.snackbar(
        'Error',
        'Client information is not available for this visit',
        snackPosition: SnackPosition.BOTTOM,
        backgroundColor: Colors.red,
        colorText: Colors.white,
      );
    }
  }

  void _handleCustomerSupport(BuildContext context) async {
    final supportController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            Icon(Icons.support_agent, color: Colors.teal),
            SizedBox(width: 8),
            Text('customer_support'.tr),
          ],
        ),
        content: TextField(
          controller: supportController,
          decoration: InputDecoration(
            labelText: 'Support Details',
            hintText: 'Enter customer support details...',
            border: const OutlineInputBorder(),
          ),
          maxLines: 4,
        ),
        actions: [
          TextButton(
            onPressed: () => SafeNavigation.closeDialog(context),
            child: Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              if (supportController.text.isNotEmpty) {
                SafeNavigation.closeDialog(context);
                // Log the activity
                if (visit.id != null) {
                  final controller = Get.find<VisitsController>();
                  await controller.addVisitActivity(
                    visit.id!,
                    'Customer_Support',
                    'Customer Support: ${supportController.text}',
                  );
                }
                Get.snackbar(
                  'Customer Support',
                  'Support activity added successfully',
                  snackPosition: SnackPosition.BOTTOM,
                  backgroundColor: Colors.teal,
                  colorText: Colors.white,
                );
              } else {
                Get.snackbar(
                  'Error',
                  'Please enter support details',
                  snackPosition: SnackPosition.BOTTOM,
                  backgroundColor: Colors.red,
                  colorText: Colors.white,
                );
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.teal),
            child: Text('add_support'.tr, style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  void _handleUploadDocument(BuildContext context) async {
    final notesController = TextEditingController();
    final mediaService = Get.find<MediaService>();

    // Document types with display names and corresponding IDs
    final Map<String, Map<String, dynamic>> documentTypes = {
      'Image Before': {'id': '1', 'activity_type': 'Photo_Before'},
      'Image After': {'id': '1', 'activity_type': 'Photo_After'},
      'Documents': {'id': '2', 'activity_type': 'Document_Uploaded'},
      'Contracts': {'id': '3', 'activity_type': 'Document_Uploaded'},
      'Invoices': {'id': '4', 'activity_type': 'Document_Uploaded'},
      'Visit Reports': {'id': '5', 'activity_type': 'Document_Uploaded'},
    };

    String? selectedDocumentType;

    bool requiresCameraOnly(String? type) => type == 'Image Before' || type == 'Image After';

    // Clear any previously selected file
    mediaService.clearImage();

    final result = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: Row(
            children: [
              Icon(Icons.upload_file, color: Colors.brown),
              SizedBox(width: 8),
              Text('upload_document'.tr),
            ],
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'Select document type and file:',
                  style: TextStyle(fontSize: 14, color: Colors.grey.shade600),
                ),
                SizedBox(height: 16),

                // Document Type Dropdown
                DropdownButtonFormField<String>(
                  value: selectedDocumentType,
                  decoration: InputDecoration(
                    labelText: 'Document Type',
                    border: OutlineInputBorder(),
                    prefixIcon: Icon(Icons.category),
                  ),
                  items: documentTypes.keys.map((String type) {
                    return DropdownMenuItem<String>(
                      value: type,
                      child: Text(type),
                    );
                  }).toList(),
                  onChanged: (String? newValue) {
                    if (selectedDocumentType != newValue) {
                      if (mediaService.selectedImage.value != null) {
                        mediaService.clearImage();
                        Get.snackbar(
                          'File Cleared',
                          'Please select a new file for the updated document type',
                          snackPosition: SnackPosition.BOTTOM,
                          backgroundColor: Colors.orange,
                          colorText: Colors.white,
                        );
                      }
                      setState(() {
                        selectedDocumentType = newValue;
                      });
                    }
                  },
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Please select a document type';
                    }
                    return null;
                  },
                ),

                SizedBox(height: 16),

                // File selection button
                Container(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () async {
                      if (selectedDocumentType == null) {
                        Get.snackbar(
                          'Missing Information',
                          'Please select a document type first',
                          snackPosition: SnackPosition.BOTTOM,
                          backgroundColor: Colors.orange,
                          colorText: Colors.white,
                        );
                        return;
                      }

                      if (requiresCameraOnly(selectedDocumentType)) {
                        await mediaService.captureImageFromCamera();
                      } else {
                        await mediaService.pickImageFromSource();
                      }

                      setState(() {}); // Refresh to show selected file
                    },
                    icon: Icon(requiresCameraOnly(selectedDocumentType) ? Icons.camera_alt : Icons.attach_file),
                    label: Text(requiresCameraOnly(selectedDocumentType) ? 'take_photo'.tr : 'select_file'.tr),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.grey.shade100,
                      foregroundColor: Colors.brown,
                      elevation: 0,
                    ),
                  ),
                ),

                // Show selected file preview if available
                if (mediaService.selectedImage.value != null)
                  Container(
                    margin: EdgeInsets.symmetric(vertical: 8),
                    padding: EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.green.shade50,
                      border: Border.all(color: Colors.green.shade200),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.check_circle, color: Colors.green, size: 20),
                        SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Selected: ${mediaService.selectedImage.value!.path.split('/').last}',
                            style: TextStyle(fontSize: 12, color: Colors.green.shade800),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ),

                SizedBox(height: 12),
                TextField(
                  controller: notesController,
                  decoration: InputDecoration(
                    labelText: 'Notes (Optional)',
                    hintText: 'Add any notes about this document...',
                    border: const OutlineInputBorder(),
                  ),
                  maxLines: 3,
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () {
                if (selectedDocumentType != null && mediaService.selectedImage.value != null) {
                  Navigator.of(context).pop(true);
                } else if (selectedDocumentType == null) {
                  Get.snackbar(
                    'Missing Information',
                    'Please select a document type',
                    snackPosition: SnackPosition.BOTTOM,
                    backgroundColor: Colors.orange,
                    colorText: Colors.white,
                  );
                } else {
                  Get.snackbar(
                    'Missing File',
                    'Please select a file to upload',
                    snackPosition: SnackPosition.BOTTOM,
                    backgroundColor: Colors.orange,
                    colorText: Colors.white,
                  );
                }
              },
              style: ElevatedButton.styleFrom(backgroundColor: Colors.brown),
              child: Text('upload'.tr, style: TextStyle(color: Colors.white)),
            ),
          ],
        ),
      ),
    );

    if (result == true && selectedDocumentType != null) {
      // Upload document
      try {
        Get.dialog(
          Center(child: CircularProgressIndicator()),
          barrierDismissible: false,
        );

        if (visit.client?.id != null && visit.id != null) {
          final authController = Get.find<AuthController>();
          final clientRepository = Get.find<ClientRepository>();

          final String? userUuid = authController.currentUser.value?.uuid;
          final int? currentUserId = authController.currentUser.value?.id;

          if (userUuid != null && currentUserId != null) {
            // Check if file was selected
            if (mediaService.selectedImage.value != null) {
              final docTypeInfo = documentTypes[selectedDocumentType]!;

              // Prepare document data
              final Map<String, String> fields = {
                'client_document_client_id': visit.client!.id.toString(),
                'client_document_type_id': docTypeInfo['id'],
                'client_document_title': selectedDocumentType == 'Image Before' || selectedDocumentType == 'Image After' ? '$selectedDocumentType - ${DateFormat('yyyy-MM-dd HH:mm').format(DateTime.now())}' : selectedDocumentType!,
                'client_document_notes': notesController.text.isNotEmpty ? '$selectedDocumentType: ${notesController.text}' : '$selectedDocumentType uploaded during visit',
                'client_document_uploaded_by_user_id': currentUserId.toString(),
                'client_documents_visit_id': visit.id.toString(), // Link to current visit
              };

              // Upload document
              final apiResponse = await clientRepository.addClientDocument(
                userUuid,
                fields,
                filePath: mediaService.selectedImage.value!.path,
                fileField: 'document_file',
              );

              UltraSafeNavigation.back(context); // Close loading dialog

              if (apiResponse['status'] == 'success') {
                // Success! The backend automatically creates the visit activity

                Get.snackbar(
                  selectedDocumentType == 'Image Before' || selectedDocumentType == 'Image After' ? 'Photo Uploaded' : 'Document Uploaded',
                  '$selectedDocumentType uploaded and activity recorded successfully',
                  snackPosition: SnackPosition.BOTTOM,
                  backgroundColor: Colors.green,
                  colorText: Colors.white,
                );
              } else {
                Get.snackbar(
                  'Upload Error',
                  apiResponse['message'] ?? 'Failed to upload $selectedDocumentType',
                  snackPosition: SnackPosition.BOTTOM,
                  backgroundColor: Colors.red,
                  colorText: Colors.white,
                );
              }
            } else {
              UltraSafeNavigation.back(context); // Close loading dialog
              Get.snackbar(
                'No File Selected',
                'Please select a file to upload',
                snackPosition: SnackPosition.BOTTOM,
                backgroundColor: Colors.orange,
                colorText: Colors.white,
              );
            }
          } else {
            UltraSafeNavigation.back(context); // Close loading dialog
            Get.snackbar(
              'Error',
              'User authentication error',
              snackPosition: SnackPosition.BOTTOM,
              backgroundColor: Colors.red,
              colorText: Colors.white,
            );
          }
        } else {
          UltraSafeNavigation.back(context); // Close loading dialog
          Get.snackbar(
            'Error',
            'Client or visit information not available',
            snackPosition: SnackPosition.BOTTOM,
            backgroundColor: Colors.red,
            colorText: Colors.white,
          );
        }
      } catch (e) {
        UltraSafeNavigation.back(context); // Close loading dialog
        Get.snackbar(
          'Error',
          'Failed to upload document: ${e.toString()}',
          snackPosition: SnackPosition.BOTTOM,
          backgroundColor: Colors.red,
          colorText: Colors.white,
        );
      }

      // Clear the selected file
      mediaService.clearImage();
    }
  }

  void _handleAddNote(BuildContext context, VisitsController controller) {
    final noteController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('add_note'.tr),
        content: TextField(
          controller: noteController,
          decoration: InputDecoration(
            labelText: 'note'.tr,
            hintText: 'enter_your_note'.tr,
            border: const OutlineInputBorder(),
          ),
          maxLines: 3,
        ),
        actions: [
          TextButton(
            onPressed: () => SafeNavigation.closeDialog(context),
            child: Text('cancel'.tr),
          ),
          ElevatedButton(
            onPressed: () async {
              if (noteController.text.isNotEmpty) {
                SafeNavigation.closeDialog(context);
                // Add note as an activity
                await controller.addVisitActivity(
                  visit.id!,
                  'Client_Note_Added',
                  noteController.text,
                );
                SafeNavigation.showSnackbar(
                  title: 'Success',
                  message: 'Note added successfully',
                  backgroundColor: Colors.green,
                  colorText: Colors.white,
                );
              } else {
                Get.snackbar(
                  'Error',
                  'Please enter a note',
                  snackPosition: SnackPosition.BOTTOM,
                  backgroundColor: Colors.red,
                  colorText: Colors.white,
                );
              }
            },
            child: Text('add'.tr),
          ),
        ],
      ),
    );
  }

  // Method to show payment details
  void _showPaymentDetails(int paymentId) async {
    try {
      Get.dialog(
        Center(child: CircularProgressIndicator()),
        barrierDismissible: false,
      );

      final paymentRepository = PaymentRepository();
      final payment = await paymentRepository.getPaymentDetail(paymentId);

      UltraSafeNavigation.closeDialog(); // Close loading dialog safely

      Get.bottomSheet(
        Container(
          padding: const EdgeInsets.all(20),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.only(
              topLeft: Radius.circular(20),
              topRight: Radius.circular(20),
            ),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Payment Details',
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  IconButton(
                    onPressed: () => UltraSafeNavigation.back(Get.context),
                    icon: const Icon(Icons.close),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              _buildDetailRow('Payment ID', payment.id.toString()),
              _buildDetailRow('Client', payment.clientName),
              _buildDetailRow('Amount', payment.formattedAmount),
              _buildDetailRow('Payment Method', payment.methodName),
              _buildDetailRow('Date', payment.formattedDateTime),
              if (payment.transactionId != null) _buildDetailRow('Transaction ID', payment.transactionId!),
              if (payment.notes != null) _buildDetailRow('Notes', payment.notes!),
              const SizedBox(height: 20),
            ],
          ),
        ),
      );
    } catch (e) {
      UltraSafeNavigation.closeDialog(); // Close loading dialog safely if still open
      Get.snackbar(
        'Error',
        'Failed to load payment details: ${e.toString()}',
        snackPosition: SnackPosition.BOTTOM,
        backgroundColor: Colors.red,
        colorText: Colors.white,
      );
    }
  }

  // Method to show activity details for non-transactional activities
  void _showActivityDetails(String activityType, int? referenceId) {
    String title = _getActivityDisplayName(activityType);
    String description = '';

    switch (activityType.toLowerCase()) {
      case 'note':
      case 'client_note_added':
        description = 'This is a note activity that was added during the visit.';
        break;
      case 'support':
      case 'customer_support':
        description = 'Customer support activity was provided during this visit.';
        break;
      case 'photo':
      case 'photo_before':
      case 'photo_after':
        description = 'A photo was taken during the visit. The image is stored in the client documents.';
        break;
      case 'document':
      case 'document_uploaded':
        description = 'A document was uploaded during the visit. The file is stored in the client documents.';
        break;
      default:
        description = 'Activity details for ${activityType.replaceAll('_', ' ')}';
    }

    Get.bottomSheet(
      Container(
        padding: const EdgeInsets.all(20),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.only(
            topLeft: Radius.circular(20),
            topRight: Radius.circular(20),
          ),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                IconButton(
                  onPressed: () => UltraSafeNavigation.back(Get.context),
                  icon: const Icon(Icons.close),
                ),
              ],
            ),
            const SizedBox(height: 20),
            _buildDetailRow('Activity Type', title),
            if (referenceId != null) _buildDetailRow('Reference ID', referenceId.toString()),
            _buildDetailRow('Description', description),
            const SizedBox(height: 20),
            if (activityType.toLowerCase().contains('photo') || activityType.toLowerCase().contains('document')) ...[
              Text(
                'Note: You can view uploaded files in the Client Documents section.',
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.grey.shade600,
                  fontStyle: FontStyle.italic,
                ),
              ),
              const SizedBox(height: 20),
            ],
          ],
        ),
      ),
    );
  }

  // Helper method to build detail rows
  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              '$label:',
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
          ),
          Expanded(
            child: Text(value),
          ),
        ],
      ),
    );
  }

  // Method to show activity details when no reference ID is available
  void _showActivityDetailsWithoutReference(String activityType, String title, String description) {
    Get.bottomSheet(
      Container(
        padding: const EdgeInsets.all(20),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.only(
            topLeft: Radius.circular(20),
            topRight: Radius.circular(20),
          ),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    title,
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                IconButton(
                  onPressed: () => UltraSafeNavigation.back(Get.context),
                  icon: const Icon(Icons.close),
                ),
              ],
            ),
            const SizedBox(height: 20),
            _buildDetailRow('Activity Type', _getActivityDisplayName(activityType)),
            _buildDetailRow('Status', 'No reference ID available'),
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.blue.shade50,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.blue.shade200),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.info_outline, color: Colors.blue.shade600, size: 20),
                      const SizedBox(width: 8),
                      Text(
                        'Activity Information',
                        style: TextStyle(
                          fontWeight: FontWeight.w600,
                          color: Colors.blue.shade700,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    description,
                    style: TextStyle(
                      color: Colors.blue.shade700,
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            if (activityType.toLowerCase().contains('salesorder') || activityType.toLowerCase().contains('sales_order')) ...[
              Text(
                'To view sales orders for this client, go to the Sales Orders section from the main menu.',
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.grey.shade600,
                  fontStyle: FontStyle.italic,
                ),
              ),
            ] else if (activityType.toLowerCase().contains('payment')) ...[
              Text(
                'To view payments for this client, go to the Payments section from the main menu.',
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.grey.shade600,
                  fontStyle: FontStyle.italic,
                ),
              ),
            ] else if (activityType.toLowerCase().contains('return')) ...[
              Text(
                'To view returns for this client, go to the Returns section from the main menu.',
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.grey.shade600,
                  fontStyle: FontStyle.italic,
                ),
              ),
            ],
            const SizedBox(height: 10),
          ],
        ),
      ),
    );
  }

  // File viewing functionality
  void _viewFile(Map<String, dynamic> document) {
    final String? filePath = document['client_document_file_path'];
    final String? mimeType = document['client_document_file_mime_type'];
    final String fileName = document['client_document_title'] ?? 'Document';

    print('DEBUG: Starting _viewFile with:');
    print('DEBUG: File path: $filePath');
    print('DEBUG: MIME type: $mimeType');
    print('DEBUG: File name: $fileName');

    if (filePath == null || filePath.isEmpty) {
      Get.snackbar(
        'Error',
        'File path not available',
        snackPosition: SnackPosition.BOTTOM,
        backgroundColor: Colors.red,
        colorText: Colors.white,
      );
      return;
    }

    // Build the full URL for the file
    String fullUrl;
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      // File path is already a full URL
      fullUrl = filePath;
    } else {
      // File path is relative, prepend the base URL
      final baseUrl = AppConstants.apiBaseUrl();
      // Remove '/api/clients/{company}' from the base URL to get the domain
      final domainUrl = baseUrl.replaceFirst(RegExp(r'/api/clients/[^/]+'), '');
      fullUrl = '$domainUrl/$filePath';
    }

    print('DEBUG: Full URL constructed: $fullUrl');

    // Determine if the file is an image based on MIME type or file extension
    final bool isImage = _isImageFile(mimeType, filePath);

    print('DEBUG: Is image: $isImage');

    if (isImage) {
      // Show image in full-screen viewer
      print('DEBUG: Showing image viewer');
      _showImageViewer(fullUrl, fileName);
    } else {
      // Show document in web viewer or external app
      print('DEBUG: Showing document viewer');
      _showDocumentViewer(fullUrl, fileName, mimeType);
    }
  }

  bool _isImageFile(String? mimeType, String filePath) {
    // Debug: Print the MIME type and file path for troubleshooting
    print('DEBUG: MIME type: $mimeType, File path: $filePath');

    // First, always check file extension as it's more reliable
    final extension = filePath.toLowerCase().split('.').last;
    final imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
    final isImageByExtension = imageExtensions.contains(extension);
    print('DEBUG: Extension: $extension, Image by extension: $isImageByExtension');

    // If extension says it's an image, trust that
    if (isImageByExtension) {
      print('DEBUG: Detected as image by extension');
      return true;
    }

    // Check MIME type as secondary validation
    if (mimeType != null && mimeType.isNotEmpty) {
      final isImageByMime = mimeType.toLowerCase().startsWith('image/');
      print('DEBUG: Image by MIME type: $isImageByMime');
      if (isImageByMime) {
        print('DEBUG: Detected as image by MIME type');
        return true;
      }
    }

    print('DEBUG: Not detected as image');
    return false;
  }

  void _showImageViewer(String imageUrl, String title) {
    Get.to(
      () => _FullScreenImageViewer(
        imageUrl: imageUrl,
        title: title,
      ),
      transition: Transition.zoom,
    );
  }

  void _showDocumentViewer(String documentUrl, String title, String? mimeType) {
    // For now, we'll use url_launcher to open the document
    // In the future, you could implement an in-app PDF viewer or web viewer
    showDialog(
      context: Get.context!,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            Icon(Icons.description, color: Colors.brown),
            SizedBox(width: 8),
            Expanded(child: Text(title)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('open_document_browser'.tr),
            if (mimeType != null) ...[
              SizedBox(height: 8),
              Text(
                'File type: $mimeType',
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.grey.shade600,
                ),
              ),
            ],
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.of(context).pop();
              try {
                final Uri uri = Uri.parse(documentUrl);
                if (await canLaunchUrl(uri)) {
                  await launchUrl(uri, mode: LaunchMode.externalApplication);
                } else {
                  Get.snackbar(
                    'Error',
                    'Cannot open this file type',
                    snackPosition: SnackPosition.BOTTOM,
                    backgroundColor: Colors.red,
                    colorText: Colors.white,
                  );
                }
              } catch (e) {
                Get.snackbar(
                  'Error',
                  'Failed to open document: ${e.toString()}',
                  snackPosition: SnackPosition.BOTTOM,
                  backgroundColor: Colors.red,
                  colorText: Colors.white,
                );
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.brown),
            child: Text('open'.tr, style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }
}

// Full-screen image viewer widget
class _FullScreenImageViewer extends StatelessWidget {
  final String imageUrl;
  final String title;

  const _FullScreenImageViewer({
    required this.imageUrl,
    required this.title,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black.withOpacity(0.5),
        foregroundColor: Colors.white,
        title: Text(
          title,
          style: TextStyle(color: Colors.white),
        ),
        actions: [
          IconButton(
            icon: Icon(Icons.share, color: Colors.white),
            onPressed: () {
              // TODO: Implement share functionality if needed
              Get.snackbar(
                'Info',
                'Share functionality will be implemented soon',
                snackPosition: SnackPosition.BOTTOM,
                backgroundColor: Colors.blue,
                colorText: Colors.white,
              );
            },
          ),
        ],
      ),
      body: Center(
        child: InteractiveViewer(
          panEnabled: true,
          boundaryMargin: EdgeInsets.all(20),
          minScale: 0.5,
          maxScale: 4.0,
          child: Image.network(
            imageUrl,
            fit: BoxFit.contain,
            loadingBuilder: (context, child, loadingProgress) {
              if (loadingProgress == null) return child;
              return Container(
                width: double.infinity,
                height: double.infinity,
                color: Colors.black,
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      CircularProgressIndicator(
                        color: Colors.white,
                        value: loadingProgress.expectedTotalBytes != null ? loadingProgress.cumulativeBytesLoaded / loadingProgress.expectedTotalBytes! : null,
                      ),
                      SizedBox(height: 16),
                      Text(
                        'Loading image...',
                        style: TextStyle(color: Colors.white),
                      ),
                    ],
                  ),
                ),
              );
            },
            errorBuilder: (context, error, stackTrace) {
              return Container(
                width: double.infinity,
                height: double.infinity,
                color: Colors.black,
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.error_outline,
                        color: Colors.white,
                        size: 64,
                      ),
                      SizedBox(height: 16),
                      Text(
                        'Failed to load image',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                        ),
                      ),
                      SizedBox(height: 8),
                      Text(
                        'Please check your internet connection',
                        style: TextStyle(
                          color: Colors.white70,
                          fontSize: 14,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton(
        heroTag: 'visit_detail_close_fab',
        backgroundColor: Colors.white.withOpacity(0.8),
        child: Icon(Icons.close, color: Colors.black),
        onPressed: () => UltraSafeNavigation.back(context),
      ),
    );
  }
}
