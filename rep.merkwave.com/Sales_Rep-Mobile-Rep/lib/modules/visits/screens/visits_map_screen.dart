// lib/modules/visits/screens/visits_map_screen.dart
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:get/get.dart';
import '/modules/visits/controllers/visits_map_controller.dart';
import '/data/models/visit_plan.dart';

class VisitsMapScreen extends GetView<VisitsMapController> {
  const VisitsMapScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('scheduled_visits_map'.tr),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.center_focus_strong),
            onPressed: controller.fitBoundsToShowAllClients,
            tooltip: 'fit_all_clients'.tr,
          ),
          IconButton(
            icon: const Icon(Icons.my_location),
            onPressed: controller.centerOnUserLocation,
            tooltip: 'center_on_location'.tr,
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: controller.refreshData,
          ),
        ],
      ),
      body: Obx(() {
        if (controller.isLoading.value) {
          return const Center(child: CircularProgressIndicator());
        }

        if (controller.errorMessage.value.isNotEmpty) {
          return _buildErrorState();
        }

        return _buildMapView();
      }),
    );
  }

  Widget _buildErrorState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.error_outline,
            size: 64,
            color: Colors.red[300],
          ),
          const SizedBox(height: 16),
          Text(
            'error'.tr,
            style: Get.textTheme.headlineSmall,
          ),
          const SizedBox(height: 8),
          Text(
            controller.errorMessage.value,
            textAlign: TextAlign.center,
            style: Get.textTheme.bodyMedium,
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: controller.refreshData,
            child: Text('retry'.tr),
          ),
        ],
      ),
    );
  }

  Widget _buildMapView() {
    return Column(
      children: [
        // Map info header
        _buildMapInfoHeader(),

        // Map
        Expanded(
          child: FlutterMap(
            mapController: controller.mapController,
            options: MapOptions(
              initialCenter: controller.initialCenter,
              initialZoom: controller.initialZoom,
              minZoom: 5.0,
              maxZoom: 18.0,
              onTap: (tapPosition, point) => controller.onMapTap(point),
            ),
            children: [
              // Tile layer
              TileLayer(
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'com.merkwave.representative_app',
                maxNativeZoom: 19,
              ),

              // Markers layer
              MarkerLayer(
                markers: _buildMarkers(),
              ),
            ],
          ),
        ),

        // Bottom info panel
        _buildBottomInfoPanel(),
      ],
    );
  }

  Widget _buildMapInfoHeader() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16.0),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            Get.theme.primaryColor.withOpacity(0.1),
            Get.theme.primaryColor.withOpacity(0.05),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        border: Border(
          bottom: BorderSide(color: Get.theme.dividerColor),
        ),
      ),
      child: Obx(() {
        final visitsCount = controller.scheduledVisits.length;
        final withLocationCount = controller.visitsWithLocation.length;
        final activeVisit = controller.activeVisit;
        final hasActiveVisit = controller.hasActiveVisit;

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Active visit status bar
            if (hasActiveVisit && activeVisit != null) ...[
              Container(
                padding: const EdgeInsets.all(12),
                margin: const EdgeInsets.only(bottom: 12),
                decoration: BoxDecoration(
                  color: Colors.green.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.green.withOpacity(0.3)),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        color: Colors.green,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Icon(
                        Icons.play_arrow,
                        color: Colors.white,
                        size: 16,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Active Visit in Progress',
                            style: Get.textTheme.bodyMedium?.copyWith(
                              fontWeight: FontWeight.bold,
                              color: Colors.green.shade700,
                            ),
                          ),
                          Text(
                            activeVisit.client?.companyName ?? 'Unknown Client',
                            style: Get.textTheme.bodySmall?.copyWith(
                              color: Colors.green.shade600,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Icon(
                      Icons.location_on,
                      color: Colors.green.shade600,
                      size: 20,
                    ),
                  ],
                ),
              ),
            ],

            // Main header info
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'scheduled_visits_for_today'.tr,
                        style: Get.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: Get.theme.primaryColor,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '$withLocationCount/$visitsCount ${'clients_with_location'.tr}',
                        style: Get.textTheme.bodyMedium?.copyWith(
                          color: Get.theme.colorScheme.onSurface.withOpacity(0.7),
                        ),
                      ),
                    ],
                  ),
                ),

                // Route optimization indicator
                if (withLocationCount > 1) ...[
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: Get.theme.primaryColor.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.route,
                          size: 14,
                          color: Get.theme.primaryColor,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          'Optimized',
                          style: Get.textTheme.bodySmall?.copyWith(
                            color: Get.theme.primaryColor,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ],
        );
      }),
    );
  }

  Widget _buildBottomInfoPanel() {
    return Obx(() {
      final selectedVisit = controller.selectedVisit.value;
      if (selectedVisit == null) {
        final optimizedVisits = controller.optimizedRouteVisits;
        final userLocation = controller.userLocation.value;

        return Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Get.theme.cardColor,
            border: Border(
              top: BorderSide(color: Get.theme.dividerColor),
            ),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'tap_marker_for_details'.tr,
                style: Get.textTheme.bodyMedium?.copyWith(
                  color: Get.theme.colorScheme.onSurface.withOpacity(0.6),
                ),
                textAlign: TextAlign.center,
              ),
              if (optimizedVisits.isNotEmpty && userLocation != null) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Get.theme.primaryColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          Icon(
                            Icons.route,
                            size: 16,
                            color: Get.theme.primaryColor,
                          ),
                          const SizedBox(width: 8),
                          Text(
                            'Optimized Route',
                            style: Get.textTheme.bodyMedium?.copyWith(
                              fontWeight: FontWeight.w600,
                              color: Get.theme.primaryColor,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Clients are numbered by proximity (1 = nearest to you)',
                        style: Get.textTheme.bodySmall?.copyWith(
                          color: Get.theme.colorScheme.onSurface.withOpacity(0.7),
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        );
      }

      return _buildVisitInfoPanel(selectedVisit);
    });
  }

  Widget _buildVisitInfoPanel(ScheduledVisit visit) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Get.theme.cardColor,
        border: Border(
          top: BorderSide(color: Get.theme.dividerColor),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            offset: const Offset(0, -2),
            blurRadius: 4,
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            visit.clientName,
                            style: Get.textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        // Route number indicator
                        Builder(
                          builder: (context) {
                            final optimizedVisits = controller.optimizedRouteVisits;
                            final routeIndex = optimizedVisits.indexOf(visit);
                            if (routeIndex >= 0) {
                              return Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: Get.theme.primaryColor,
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Text(
                                  'Stop ${routeIndex + 1}',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              );
                            }
                            return const SizedBox.shrink();
                          },
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    if (visit.clientAddress.isNotEmpty)
                      Text(
                        visit.clientAddress,
                        style: Get.textTheme.bodySmall?.copyWith(
                          color: Get.theme.colorScheme.onSurface.withOpacity(0.7),
                        ),
                      ),
                  ],
                ),
              ),
              _buildVisitStatusChip(visit),
            ],
          ),

          const SizedBox(height: 12),

          // Distance info
          if (controller.userLocation.value != null && visit.clientLatitude != null && visit.clientLongitude != null)
            Text(
              '${'distance'.tr}: ${controller.getDistanceString(visit)}',
              style: Get.textTheme.bodySmall?.copyWith(
                color: Get.theme.primaryColor,
                fontWeight: FontWeight.w500,
              ),
            ),

          const SizedBox(height: 12),

          // Action buttons
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: () => controller.navigateToClient(visit),
                  icon: const Icon(Icons.navigation, size: 18),
                  label: Text('navigate'.tr),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Get.theme.primaryColor,
                    foregroundColor: Colors.white,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildActionButtonForVisit(visit),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildActionButtonForVisit(ScheduledVisit visit) {
    return Obx(() {
      // Check if there's an active visit for this client
      if (controller.hasActiveVisitForClient(visit)) {
        return ElevatedButton.icon(
          onPressed: () => controller.goToVisitDetails(visit),
          icon: const Icon(Icons.visibility, size: 18),
          label: Text('visit_details'.tr),
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.green,
            foregroundColor: Colors.white,
          ),
        );
      }

      // Check if there's a completed visit for this client
      if (controller.hasCompletedVisitForClient(visit)) {
        return OutlinedButton.icon(
          onPressed: () => controller.goToVisitDetails(visit),
          icon: const Icon(Icons.history, size: 18),
          label: Text('view_details'.tr),
          style: OutlinedButton.styleFrom(
            foregroundColor: Colors.blue,
            side: BorderSide(color: Colors.blue),
          ),
        );
      }

      // Default: Show start visit button
      return OutlinedButton.icon(
        onPressed: () => controller.startVisit(visit),
        icon: const Icon(Icons.play_arrow, size: 18),
        label: Text('start_visit'.tr),
      );
    });
  }

  Widget _buildVisitStatusChip(ScheduledVisit visit) {
    final status = controller.getVisitStatus(visit);
    Color chipColor;
    Color textColor;

    switch (status) {
      case 'Started':
        chipColor = Colors.green;
        textColor = Colors.white;
        break;
      case 'Completed':
        chipColor = Colors.blue;
        textColor = Colors.white;
        break;
      case 'Cancelled':
        chipColor = Colors.red;
        textColor = Colors.white;
        break;
      default:
        chipColor = Colors.orange;
        textColor = Colors.white;
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: chipColor,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        status.tr,
        style: Get.textTheme.bodySmall?.copyWith(
          color: textColor,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }

  List<Marker> _buildMarkers() {
    final markers = <Marker>[];

    // User location marker
    final userLocation = controller.userLocation.value;
    if (userLocation != null) {
      markers.add(
        Marker(
          point: LatLng(userLocation.latitude, userLocation.longitude),
          width: 40,
          height: 40,
          child: Container(
            decoration: BoxDecoration(
              color: Colors.blue,
              shape: BoxShape.circle,
              border: Border.all(color: Colors.white, width: 3),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.3),
                  blurRadius: 4,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: const Icon(
              Icons.my_location,
              color: Colors.white,
              size: 20,
            ),
          ),
        ),
      );
    }

    // Active visit marker (if exists and has location)
    final activeVisit = controller.activeVisit;
    if (activeVisit != null && activeVisit.client != null) {
      final client = activeVisit.client!;
      if (client.latitude != null && client.longitude != null) {
        markers.add(
          Marker(
            point: LatLng(client.latitude!, client.longitude!),
            width: 100,
            height: 100,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Pulsing active visit marker
                Container(
                  width: 50,
                  height: 50,
                  decoration: BoxDecoration(
                    color: Colors.green,
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 4),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.green.withOpacity(0.4),
                        blurRadius: 8,
                        spreadRadius: 2,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: const Icon(
                    Icons.play_arrow,
                    color: Colors.white,
                    size: 24,
                  ),
                ),
                const SizedBox(height: 4),
                // Active visit label
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: Colors.green.withOpacity(0.9),
                    borderRadius: BorderRadius.circular(8),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.2),
                        blurRadius: 2,
                        offset: const Offset(0, 1),
                      ),
                    ],
                  ),
                  child: Column(
                    children: [
                      Text(
                        'ACTIVE',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 8,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        client.companyName,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 9,
                          fontWeight: FontWeight.w600,
                        ),
                        textAlign: TextAlign.center,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      }
    }

    // Client markers with route numbers
    final optimizedVisits = controller.optimizedRouteVisits;
    for (int index = 0; index < optimizedVisits.length; index++) {
      final visit = optimizedVisits[index];
      final lat = visit.clientLatitude!;
      final lng = visit.clientLongitude!;
      final status = controller.getVisitStatus(visit);
      final routeNumber = index + 1; // 1-based numbering

      Color markerColor;

      switch (status) {
        case 'Started':
          markerColor = Colors.green;
          break;
        case 'Completed':
          markerColor = Colors.blue;
          break;
        case 'Cancelled':
          markerColor = Colors.red;
          break;
        default:
          markerColor = Colors.orange;
          break;
      }

      markers.add(
        Marker(
          point: LatLng(lat, lng),
          width: 80,
          height: 90, // Increased height to accommodate content
          child: GestureDetector(
            onTap: () => controller.selectVisit(visit),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Pin with route number
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: markerColor,
                    shape: BoxShape.circle,
                    border: Border.all(color: controller.selectedVisit.value == visit ? Colors.white : Colors.transparent, width: 3),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.3),
                        blurRadius: 4,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Center(
                    child: Text(
                      '$routeNumber',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 2), // Reduced spacing
                // Company name under the pin
                Flexible(
                  // Allow flexible sizing
                  child: Container(
                    constraints: const BoxConstraints(maxWidth: 80),
                    padding: const EdgeInsets.symmetric(horizontal: 3, vertical: 1), // Reduced padding
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.9),
                      borderRadius: BorderRadius.circular(4),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.2),
                          blurRadius: 2,
                          offset: const Offset(0, 1),
                        ),
                      ],
                    ),
                    child: Text(
                      visit.clientName,
                      style: const TextStyle(
                        // Made const
                        color: Colors.black87,
                        fontSize: 9, // Slightly smaller font
                        fontWeight: FontWeight.w600,
                      ),
                      textAlign: TextAlign.center,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return markers;
  }
}
