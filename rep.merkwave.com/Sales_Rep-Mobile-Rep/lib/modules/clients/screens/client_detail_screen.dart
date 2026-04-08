// lib/modules/clients/screens/client_detail_screen.dart
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';
import '/modules/clients/controllers/client_detail_controller.dart';
import '/shared_widgets/loading_indicator.dart';
import '/core/routes/app_routes.dart';
import '/core/utils/formatting.dart';

class ClientDetailScreen extends GetView<ClientDetailController> {
  const ClientDetailScreen({super.key});

  // Helper method to build a row for client information
  Widget _buildInfoRow(String label, String? value, {VoidCallback? onTap}) {
    // If the value is null, empty, or 'N/A', return an empty widget to hide the row.
    if (value == null || value.isEmpty || value == 'N/A') {
      return const SizedBox.shrink();
    }

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120, // Fixed width for labels
            child: Text(
              '$label:',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                color: Colors.grey.shade700,
              ),
            ),
          ),
          Expanded(
            child: GestureDetector(
              // Use GestureDetector to make text clickable
              onTap: onTap,
              child: Text(
                value, // No need for '?? N/A' anymore
                style: TextStyle(
                  fontSize: 16,
                  color: onTap != null ? Colors.blue : Colors.black, // Change color if clickable
                  decoration: onTap != null ? TextDecoration.underline : TextDecoration.none, // Underline if clickable
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _localizedStatus(String status) {
    final lower = status.toLowerCase();
    final translated = lower.tr;
    if (translated == lower) {
      return status.capitalizeFirst ?? status;
    }
    return translated;
  }

  // Helper method to build a themed information card
  Widget _buildInfoCard(BuildContext context, {required String title, required List<Widget> children, Widget? trailingButton}) {
    // Filter out any empty SizedBox widgets before building the card
    final visibleChildren = children.where((child) => child is! SizedBox || child.height != 0).toList();

    // If there are no visible children after filtering, don't build the card at all
    if (visibleChildren.isEmpty) {
      return const SizedBox.shrink();
    }

    return Card(
      elevation: 4,
      margin: const EdgeInsets.only(bottom: 16.0),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  title,
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: Theme.of(context).primaryColor,
                      ),
                ),
                if (trailingButton != null) trailingButton,
              ],
            ),
            const Divider(height: 24, thickness: 1),
            ...visibleChildren,
          ],
        ),
      ),
    );
  }

  Future<void> _openInterestedProducts() async {
    final clientId = controller.client.value?.id;
    if (clientId == null) {
      Get.snackbar('Error', 'client_not_found'.tr, snackPosition: SnackPosition.BOTTOM);
      return;
    }

    final result = await Get.toNamed(
      AppRoutes.clientInterestedProducts,
      arguments: {
        'clientId': clientId,
        'clientName': controller.client.value?.companyName,
      },
    );

    if (result == true) {
      await controller.refreshInterestedProducts();
    }
  }

  Widget _buildInterestedProductsCard(BuildContext context) {
    final clientName = controller.client.value?.companyName ?? 'client'.tr;
    final clientId = controller.client.value?.id;

    return _buildInfoCard(
      context,
      title: 'interested_products'.tr,
      trailingButton: IconButton(
        icon: const Icon(Icons.add_box),
        onPressed: () async {
          if (clientId == null) {
            Get.snackbar('Error', 'client_not_found'.tr, snackPosition: SnackPosition.BOTTOM);
            return;
          }

          final result = await Get.toNamed(
            AppRoutes.addInterestedProduct,
            arguments: {
              'clientId': clientId,
              'clientName': clientName,
            },
          );

          if (result == true) {
            Get.snackbar('Success', 'interested_product_added'.tr, snackPosition: SnackPosition.BOTTOM);
          }
        },
      ),
      children: [
        Text('${'view_all'.tr} ${'interested_products'.tr} - $clientName'),
        const SizedBox(height: 8),
        Align(
          alignment: Alignment.centerRight,
          child: TextButton(
            onPressed: _openInterestedProducts,
            child: Text('view_interested_products'.tr),
          ),
        ),
      ],
    );
  }

  Widget _buildTagChip(
    BuildContext context, {
    required String label,
    Color? textColor,
    Color? backgroundColor,
    Color? borderColor,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: backgroundColor ?? Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: borderColor ?? Colors.grey.shade300),
        boxShadow: backgroundColor == null
            ? [
                BoxShadow(
                  color: Colors.grey.shade200,
                  blurRadius: 4,
                  offset: const Offset(0, 2),
                ),
              ]
            : null,
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: textColor ?? Colors.grey.shade700,
        ),
      ),
    );
  }

  // Function to launch URL
  Future<void> _launchUrl(String url) async {
    final Uri uri = Uri.parse(url);
    if (!await launchUrl(uri)) {
      Get.snackbar('Error', 'Could not launch $url', snackPosition: SnackPosition.BOTTOM);
    }
  }

  // Function to launch email
  Future<void> _launchEmail(String email) async {
    final Uri uri = Uri.parse('mailto:$email');
    if (!await launchUrl(uri)) {
      Get.snackbar('Error', 'Could not send email to $email', snackPosition: SnackPosition.BOTTOM);
    }
  }

  // Function to launch phone dialer
  Future<void> _launchPhone(String phoneNumber) async {
    final Uri uri = Uri.parse('tel:$phoneNumber');
    if (!await launchUrl(uri)) {
      Get.snackbar('Error', 'Could not dial $phoneNumber', snackPosition: SnackPosition.BOTTOM);
    }
  }

  // Function to launch map application
  Future<void> _launchMap(double latitude, double longitude, String label) async {
    final String googleMapsUrl = 'https://www.google.com/maps/search/?api=1&query=$latitude,$longitude&query_place_id=$label';
    final String appleMapsUrl = 'http://maps.apple.com/?q=$latitude,$longitude&label=$label';

    if (GetPlatform.isAndroid) {
      if (!await launchUrl(Uri.parse(googleMapsUrl), mode: LaunchMode.externalApplication)) {
        Get.snackbar('Error', 'Could not open Google Maps.', snackPosition: SnackPosition.BOTTOM);
      }
    } else if (GetPlatform.isIOS) {
      if (!await launchUrl(Uri.parse(appleMapsUrl), mode: LaunchMode.externalApplication)) {
        Get.snackbar('Error', 'Could not open Apple Maps.', snackPosition: SnackPosition.BOTTOM);
      }
    } else {
      if (!await launchUrl(Uri.parse('https://www.openstreetmap.org/?mlat=$latitude&mlon=$longitude#map=15/$latitude/$longitude'), mode: LaunchMode.externalApplication)) {
        Get.snackbar('Error', 'Could not open map in browser.', snackPosition: SnackPosition.BOTTOM);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    // Get the VisitsController instance

    return Scaffold(
      appBar: AppBar(
        title: Obx(() => Text(controller.client.value?.companyName ?? 'client_details'.tr)), // Localized title
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.receipt_long),
            tooltip: 'account_statement'.tr,
            onPressed: () {
              final idToPass = controller.client.value?.id;
              final nameToPass = controller.client.value?.companyName;
              if (idToPass != null) {
                Get.toNamed(
                  AppRoutes.clientAccountStatement,
                  arguments: {'id': idToPass, 'name': nameToPass},
                );
              }
            },
          ),
          IconButton(
            icon: const Icon(Icons.edit),
            onPressed: () {
              if (controller.client.value != null) {
                Get.toNamed(AppRoutes.addEditClient, arguments: controller.client.value);
              } else {
                Get.snackbar('edit_client_title'.tr, 'client_data_not_available_for_edit'.tr);
              }
            },
          ),
        ],
      ),
      body: Obx(() {
        if (controller.isLoading.value) {
          return LoadingIndicator(message: 'loading_client_details'.tr);
        } else if (controller.errorMessage.value.isNotEmpty) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Text(
                controller.errorMessage.value,
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.red, fontSize: 16),
              ),
            ),
          );
        } else if (controller.client.value == null) {
          return Center(
            child: Text('client_not_found'.tr),
          );
        } else {
          final client = controller.client.value!;
          return SingleChildScrollView(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Client Image (if available) with Add/Change button
                Center(
                  child: Padding(
                    padding: const EdgeInsets.only(bottom: 16.0),
                    child: Column(
                      children: [
                        if (client.image != null && client.image!.isNotEmpty)
                          ClipRRect(
                            borderRadius: BorderRadius.circular(12),
                            child: Image.network(
                              client.image!,
                              width: 150,
                              height: 150,
                              fit: BoxFit.cover,
                              errorBuilder: (context, error, stackTrace) => Container(
                                width: 150,
                                height: 150,
                                color: Colors.grey.shade200,
                                alignment: Alignment.center,
                                child: const Icon(Icons.image_not_supported, color: Colors.grey, size: 50),
                              ),
                            ),
                          ),
                        const SizedBox(height: 12),
                        ElevatedButton.icon(
                          onPressed: () => controller.uploadClientImage(),
                          icon: Icon(client.image != null && client.image!.isNotEmpty ? Icons.change_circle : Icons.add_photo_alternate),
                          label: Text(client.image != null && client.image!.isNotEmpty ? 'تغيير الصورة' : 'اضافة صورة'),
                          style: ElevatedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                // Core Client Information
                _buildInfoCard(
                  context,
                  title: 'core_info'.tr,
                  children: [
                    _buildInfoRow('company_name'.tr, client.companyName),
                    _buildInfoRow('contact_person'.tr, client.contactName),
                    _buildInfoRow('job_title'.tr, client.contactJobTitle),
                    _buildInfoRow('email'.tr, client.email, onTap: client.email != null && client.email!.isNotEmpty ? () => _launchEmail(client.email!) : null),
                    _buildInfoRow('phone'.tr, client.contactPhone1, onTap: client.contactPhone1 != null && client.contactPhone1!.isNotEmpty ? () => _launchPhone(client.contactPhone1!) : null),
                    _buildInfoRow('phone_2'.tr, client.contactPhone2, onTap: client.contactPhone2 != null && client.contactPhone2!.isNotEmpty ? () => _launchPhone(client.contactPhone2!) : null),
                    _buildInfoRow('website'.tr, client.website, onTap: client.website != null && client.website!.isNotEmpty ? () => _launchUrl(client.website!) : null),
                    _buildInfoRow('vat_number'.tr, client.vatNumber),
                    _buildInfoRow('status'.tr, _localizedStatus(client.status)),
                    // Legacy type removed; you may show dynamic client type name here if available
                    _buildInfoRow('description'.tr, client.description),
                  ],
                ),
                // Address and Location Details
                _buildInfoCard(
                  context,
                  title: 'address_location'.tr,
                  children: [
                    _buildInfoRow('address'.tr, client.address),
                    _buildInfoRow('street_2'.tr, client.street2),
                    _buildInfoRow('building_number'.tr, client.buildingNumber),
                    _buildInfoRow('city'.tr, client.city),
                    _buildInfoRow('state'.tr, client.state),
                    _buildInfoRow('zip_code'.tr, client.zip),
                    _buildInfoRow('country'.tr, client.country),
                    _buildInfoRow('area'.tr, controller.getAreaTagName(client.areaTagId)),
                    _buildInfoRow('latitude'.tr, client.latitude?.toStringAsFixed(5)),
                    _buildInfoRow('longitude'.tr, client.longitude?.toStringAsFixed(5)),
                  ],
                ),
                // Map Section
                if (client.latitude != null && client.longitude != null)
                  _buildInfoCard(
                    context,
                    title: 'location_on_map'.tr,
                    children: [
                      SizedBox(
                        height: 200, // Fixed height for the map
                        child: FlutterMap(
                          options: MapOptions(
                            initialCenter: LatLng(client.latitude!, client.longitude!),
                            initialZoom: 15.0,
                            maxZoom: 18.0,
                            minZoom: 3.0,
                          ),
                          children: [
                            TileLayer(
                              urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                              userAgentPackageName: 'com.yourcompany.representativeapp',
                            ),
                            MarkerLayer(
                              markers: [
                                Marker(
                                  point: LatLng(client.latitude!, client.longitude!),
                                  width: 80.0,
                                  height: 80.0,
                                  child: const Icon(
                                    Icons.location_pin,
                                    color: Colors.red,
                                    size: 40.0,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                      Center(
                        child: ElevatedButton.icon(
                          onPressed: () {
                            _launchMap(client.latitude!, client.longitude!, client.companyName);
                          },
                          icon: const Icon(Icons.navigation),
                          label: Text('navigate_to_map'.tr),
                        ),
                      ),
                    ],
                  )
                else
                  _buildInfoCard(
                    context,
                    title: 'location_on_map'.tr,
                    children: [
                      Text('map_not_available'.tr),
                    ],
                  ),

                // Financial & Credit Information
                _buildInfoCard(
                  context,
                  title: 'financial_credit'.tr,
                  children: [
                    _buildInfoRow('credit_balance'.tr, Formatting.amount(client.creditBalance)),
                    _buildInfoRow('credit_limit'.tr, Formatting.amount(client.creditLimit)),
                    _buildInfoRow('payment_terms'.tr, client.paymentTerms),
                  ],
                ),
                // Sales & Business Specifics
                _buildInfoCard(
                  context,
                  title: 'sales_business'.tr,
                  children: [
                    _buildInfoRow('industry'.tr, controller.getIndustryName(client.industryId)),
                    _buildInfoRow('source'.tr, client.source),
                  ],
                ),
                const SizedBox(height: 20),
                _buildInterestedProductsCard(context),
                const SizedBox(height: 20),
                // New: Documents Section
                _buildInfoCard(
                  context,
                  title: 'documents'.tr,
                  trailingButton: IconButton(
                    icon: const Icon(Icons.add_box),
                    onPressed: () {
                      final idToPass = controller.client.value?.id;
                      print('!!!!!! NAVIGATING TO DOCUMENTS with ID: $idToPass !!!!!!');
                      Get.toNamed(AppRoutes.clientDocuments, arguments: idToPass);
                    },
                  ),
                  children: [
                    Text('view_all_documents_for_client'.trParams({'clientName': client.companyName})),
                    const SizedBox(height: 8),
                    Align(
                      alignment: Alignment.centerRight,
                      child: TextButton(
                        onPressed: () {
                          final idToPass = controller.client.value?.id;
                          print('!!!!!! NAVIGATING TO DOCUMENTS with ID: $idToPass !!!!!!!');
                          Get.toNamed(AppRoutes.clientDocuments, arguments: idToPass);
                        },
                        child: Text('view_documents'.tr),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                // New: Visits Section
              ],
            ),
          );
        }
      }),
    );
  }
}
