// lib/modules/clients/widgets/client_card.dart
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '/data/models/client.dart';
import '/modules/clients/controllers/clients_controller.dart'; // To access controller methods and helpers
import '/core/routes/app_routes.dart'; // For navigation

// Removed unused import
class ClientCard extends GetView<ClientsController> {
  final Client client;

  const ClientCard({
    super.key,
    required this.client,
  });

  @override
  Widget build(BuildContext context) {
    // Determine status color
    Color statusColor = Colors.grey;
    if (client.status == 'active') {
      statusColor = Colors.green;
    } else if (client.status == 'inactive') {
      statusColor = Colors.red;
    } else if (client.status == 'prospect') {
      statusColor = Colors.orange;
    } else if (client.status == 'archived') {
      statusColor = Colors.blueGrey;
    }

    final statusKey = client.status.toLowerCase();
    final statusLabel = statusKey.tr;

    // Get the VisitsController instance

    return Card(
      elevation: 6, // Increased elevation for a more prominent shadow
      margin: const EdgeInsets.symmetric(vertical: 10.0, horizontal: 8.0), // Adjusted margin
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16), // More rounded corners
        side: BorderSide(color: Colors.grey.shade200, width: 1.0), // Added a subtle border
      ),
      child: InkWell(
        // Use InkWell for ripple effect on tap
        borderRadius: BorderRadius.circular(16), // Match card border radius
        onTap: () {
          // Navigate to client details screen, passing the client ID
          Get.toNamed(AppRoutes.clientDetail, arguments: client.id);
          Get.snackbar(
            'client_selected_title'.tr, // Localized string
            '${'viewing_details_for'.tr} ${client.companyName}', // Localized string
            snackPosition: SnackPosition.BOTTOM,
            backgroundColor: Colors.green.withOpacity(0.8),
            colorText: Colors.white,
          );
        },
        child: Padding(
          // Added Padding inside InkWell for content spacing
          padding: const EdgeInsets.all(16.0),
          child: Row(
            // Using Row for more control over leading/content layout
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CircleAvatar(
                radius: 28, // Slightly larger avatar
                backgroundColor: Theme.of(context).primaryColor.withOpacity(0.15), // Slightly darker background
                child: Text(
                  client.companyName.isNotEmpty ? client.companyName[0].toUpperCase() : '?', // Safety check for empty company name
                  style: TextStyle(color: Theme.of(context).primaryColor, fontWeight: FontWeight.bold, fontSize: 20),
                ),
              ),
              const SizedBox(width: 16), // Spacing between avatar and text content
              Expanded(
                // Expanded to prevent overflow
                flex: 1, // Explicit flex to ensure proper space distribution
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min, // Take minimum space needed
                  children: [
                    Row(
                      // Inner Row for company name and status circle
                      children: [
                        Expanded(
                          // Expanded to constrain company name text
                          child: Text(
                            client.companyName, // Display company name
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Colors.blueGrey), // Enhanced title style
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 8),
                        // Status Indicator Circle
                        Container(
                          width: 10,
                          height: 10,
                          decoration: BoxDecoration(
                            color: statusColor,
                            shape: BoxShape.circle,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6), // Spacing
                    Text(
                      '${'status'.tr}: $statusLabel', // Display status
                      style: TextStyle(color: Colors.grey.shade700, fontSize: 13),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    // Type removed; consider displaying client type name if available
                    // Display last visit date
                    if (client.lastVisit != null)
                      Text(
                        '${'last_visit'.tr}: ${client.lastVisit!.toLocal().toString().split(' ')[0]}', // Format date
                        style: TextStyle(color: Colors.grey.shade700, fontSize: 13),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    // Display area tag name
                    Text(
                      '${'area'.tr}: ${controller.getAreaTagName(client.areaTagId)}', // Access controller for helper
                      style: TextStyle(color: Colors.grey.shade700, fontSize: 13),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    // Display industry name
                    Text(
                      '${'industry'.tr}: ${controller.getIndustryName(client.industryId)}', // Access controller for helper
                      style: TextStyle(color: Colors.grey.shade700, fontSize: 13),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
