// lib/modules/clients/screens/add_edit_client_screen.dart
import '/shared_widgets/ultra_safe_navigation.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '/modules/clients/controllers/add_edit_client_controller.dart';
import '/shared_widgets/custom_app_bar.dart';
import '/shared_widgets/loading_indicator.dart';
import '/services/location_service.dart'; // New import
import '/data/models/country_with_governorates.dart';

// Top-level function for the Map Picker Bottom Sheet
Widget buildMapPickerBottomSheet(BuildContext context, AddEditClientController controller) {
  // Get instances of services to observe their Rx variables
  final LocationService locationService = Get.find<LocationService>();

  return Obx(() {
    // Use current location from LocationService if available, otherwise default
    LatLng initialMapCenter = locationService.currentLocation.value ?? const LatLng(30.0444, 31.2357); // Default to Cairo
    return Container(
      height: Get.height * 0.8, // Take 80% of screen height
      decoration: const BoxDecoration(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        color: Colors.white,
      ),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Text(
              'select_location_on_map'.tr,
              style: Get.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
            ),
          ),
          Expanded(
            child: Stack(
              // Use Stack to overlay loading indicator on map
              children: [
                FlutterMap(
                  options: MapOptions(
                    initialCenter: initialMapCenter,
                    initialZoom: 13.0,
                    maxZoom: 18.0,
                    minZoom: 3.0,
                    onTap: (tapPos, latlng) {
                      controller.selectLocation(latlng);
                    },
                  ),
                  children: [
                    TileLayer(
                      urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                      userAgentPackageName: 'com.yourcompany.representativeapp',
                    ),
                    if (controller.selectedLocation.value != null)
                      MarkerLayer(
                        markers: [
                          Marker(
                            point: controller.selectedLocation.value!,
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
                Obx(() {
                  if (locationService.isGettingLocation.value) {
                    // Observe service's loading state
                    return Center(
                      child: Container(
                        color: Colors.black54, // Semi-transparent overlay
                        child: LoadingIndicator(message: 'getting_current_location'.tr, color: Colors.white),
                      ),
                    );
                  }
                  return const SizedBox.shrink(); // Hide if not loading
                })
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              children: [
                Text('selected_coordinates'.trParams({
                  'lat': controller.selectedLocation.value?.latitude.toStringAsFixed(5) ?? 'N/A',
                  'long': controller.selectedLocation.value?.longitude.toStringAsFixed(5) ?? 'N/A',
                })),
                const SizedBox(height: 10),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    // Use Navigator.pop instead of Get.back to avoid a GetX bug where
                    // UltraSafeNavigation.back(context) attempts to close an (uninitialized) snackbar controller
                    // causing: LateInitializationError: Field '_controller' has not been initialized.
                    // This safely dismisses just the bottom sheet without touching snackbar state.
                    onPressed: () {
                      try {
                        if (Navigator.of(context).canPop()) {
                          Navigator.of(context).pop();
                        }
                      } catch (e) {
                        // Fallback to Get.back only if absolutely needed
                        try {
                          if (Get.isBottomSheetOpen == true) UltraSafeNavigation.back(context);
                        } catch (_) {}
                      }
                    },
                    child: Text('done'.tr),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  });
}

class AddEditClientScreen extends GetView<AddEditClientController> {
  const AddEditClientScreen({super.key});

  String _countryLabel(CountryWithGovernorates country) {
    final en = country.nameEn.trim();
    final ar = country.nameAr.trim();

    if (en.isNotEmpty && ar.isNotEmpty) {
      return '$en – $ar';
    }
    if (Get.locale?.languageCode == 'ar') {
      if (ar.isNotEmpty) return ar;
      if (en.isNotEmpty) return en;
    } else {
      if (en.isNotEmpty) return en;
      if (ar.isNotEmpty) return ar;
    }
    return 'Country #${country.id}';
  }

  String _governorateLabel(Governorate governorate) {
    final en = governorate.nameEn.trim();
    final ar = governorate.nameAr.trim();

    if (en.isNotEmpty && ar.isNotEmpty) {
      return '$en – $ar';
    }
    if (Get.locale?.languageCode == 'ar') {
      if (ar.isNotEmpty) return ar;
      if (en.isNotEmpty) return en;
    } else {
      if (en.isNotEmpty) return en;
      if (ar.isNotEmpty) return ar;
    }
    return 'Governorate #${governorate.id}';
  }

  // Helper method to build a section title
  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 16.0),
      child: Text(
        title,
        style: Get.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold, color: Get.theme.primaryColor),
      ),
    );
  }

  // Helper method to build a text field with validation and red asterisk
  Widget _buildTextField(
    TextEditingController controller,
    String label, {
    TextInputType keyboardType = TextInputType.text,
    int maxLines = 1,
    bool isRequired = false,
    String? Function(String?)? validator,
  }) {
    // Define common border styles for TextFields
    final OutlineInputBorder defaultBorder = OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide: BorderSide(color: Colors.grey.shade300, width: 1.0),
    );

    final OutlineInputBorder focusedBorder = OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide: BorderSide(color: Get.theme.primaryColor, width: 2.0),
    );

    final OutlineInputBorder errorBorder = OutlineInputBorder(
      // Explicit error border
      borderRadius: BorderRadius.circular(12),
      borderSide: const BorderSide(color: Colors.red, width: 2.0),
    );

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: TextFormField(
        controller: controller,
        keyboardType: keyboardType,
        maxLines: maxLines,
        decoration: InputDecoration(
          labelText: isRequired ? '$label *' : label, // Add asterisk for required fields
          border: defaultBorder,
          enabledBorder: defaultBorder,
          focusedBorder: focusedBorder,
          errorBorder: errorBorder, // Apply explicit error border
          focusedErrorBorder: errorBorder, // Apply explicit error border when focused and in error
          filled: true,
          fillColor: Colors.grey.shade50,
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          labelStyle: TextStyle(color: Colors.grey.shade700),
          hintStyle: TextStyle(color: Colors.grey.shade500),
        ),
        validator: (value) {
          if (isRequired && (value == null || value.isEmpty)) {
            return 'field_required'.trParams({'field': label});
          }
          return validator?.call(value) ?? null;
        },
      ),
    );
  }

  // Helper method to build a dropdown field with validation and red asterisk
  Widget _buildDropdownField<T>(
    String label,
    Rx<T?> selectedValue,
    List<DropdownMenuItem<T>> items,
    String hintText, {
    bool isRequired = false,
  }) {
    // Define common border styles for DropdownFields
    final OutlineInputBorder defaultBorder = OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide: BorderSide(color: Colors.grey.shade300, width: 1.0),
    );

    final OutlineInputBorder focusedBorder = OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide: BorderSide(color: Get.theme.primaryColor, width: 2.0),
    );

    final OutlineInputBorder errorBorder = OutlineInputBorder(
      // Explicit error border
      borderRadius: BorderRadius.circular(12),
      borderSide: const BorderSide(color: Colors.red, width: 2.0),
    );

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: DropdownButtonFormField<T>(
        isExpanded: true,
        decoration: InputDecoration(
          labelText: isRequired ? '$label *' : label, // Add asterisk for required fields
          border: defaultBorder,
          enabledBorder: defaultBorder,
          focusedBorder: focusedBorder,
          errorBorder: errorBorder, // Apply explicit error border
          focusedErrorBorder: errorBorder, // Apply explicit error border when focused and in error
          filled: true,
          fillColor: Colors.grey.shade50,
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          labelStyle: TextStyle(color: Colors.grey.shade700),
          hintStyle: TextStyle(color: Colors.grey.shade500),
        ),
        value: selectedValue.value,
        hint: Text(hintText),
        items: [
          DropdownMenuItem<T>(
            value: null,
            child: Text('select_none'.tr),
          ),
          ...items,
        ],
        onChanged: (T? newValue) {
          selectedValue.value = newValue;
        },
        validator: (value) {
          if (isRequired && value == null) {
            return 'field_required'.trParams({'field': label});
          }
          return null;
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: CustomAppBar(
        title: controller.isEditing.value ? 'edit_client_title'.tr : 'add_new_client'.tr,
      ),
      body: Obx(() {
        if (controller.isLoading.value && controller.areaTags.isEmpty && controller.industries.isEmpty) {
          return LoadingIndicator(message: 'loading_form_data'.tr);
        }
        return Form(
          key: controller.formKey,
          autovalidateMode: AutovalidateMode.onUserInteraction, // Validate on user interaction
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  controller.isEditing.value ? '${'editing'.tr}: ${controller.clientToEdit!.companyName}' : 'add_new_client_form'.tr,
                  style: Get.textTheme.headlineSmall,
                ),
                const SizedBox(height: 20),

                // Core Information
                _buildSectionTitle('core_info'.tr),
                _buildTextField(controller.companyNameController, 'company_name'.tr, isRequired: true),
                _buildTextField(controller.emailController, 'email'.tr, keyboardType: TextInputType.emailAddress, isRequired: true),
                _buildTextField(controller.websiteController, 'website'.tr, keyboardType: TextInputType.url),
                _buildTextField(controller.vatNumberController, 'vat_number'.tr),
                _buildTextField(controller.descriptionController, 'description'.tr, maxLines: 3),

                // Address and Location Details
                _buildSectionTitle('address_location'.tr),
                _buildTextField(controller.addressController, 'address'.tr, isRequired: true),
                _buildTextField(controller.street2Controller, 'street_2'.tr),
                _buildTextField(controller.buildingNumberController, 'building_number'.tr),
                // Country and City (dynamic from API / cached data)
                Obx(() => _buildDropdownField<int?>(
                      'country'.tr,
                      controller.selectedCountryId,
                      controller.countries
                          .map((country) => DropdownMenuItem<int?>(
                                value: country.id,
                                child: Text(_countryLabel(country)),
                              ))
                          .toList(),
                      'select_country'.tr,
                      isRequired: true,
                    )),
                Obx(() => _buildDropdownField<int?>(
                      'state'.tr, // Changed label to State/Governorate
                      controller.selectedGovernorateId,
                      controller.governorates
                          .map((governorate) => DropdownMenuItem<int?>(
                                value: governorate.id,
                                child: Text(_governorateLabel(governorate)),
                              ))
                          .toList(),
                      'select_state'.tr, // Changed hint
                      isRequired: true,
                    )),
                _buildTextField(controller.stateController, 'city'.tr), // Changed label to City, keeping controller as stateController for now
                _buildTextField(controller.zipController, 'zip_code'.tr),
                // Client Type dropdown
                Obx(() => _buildDropdownField<int?>(
                      'client_type'.tr,
                      controller.selectedClientTypeId,
                      controller.clientTypes
                          .map((type) => DropdownMenuItem<int>(
                                value: type.id,
                                child: Text(type.name),
                              ))
                          .toList(),
                      'select_client_type'.tr,
                      isRequired: true,
                    )),
                // Latitude and Longitude input fields (can be manually edited or set by map)
                _buildTextField(controller.latitudeController, 'latitude'.tr, keyboardType: TextInputType.number, validator: (value) {
                  if (value != null && value.isNotEmpty && double.tryParse(value) == null) {
                    return 'invalid_number'.tr;
                  }
                  // Custom validation for latitude/longitude if selectedLocation is null
                  if (controller.selectedLocation.value == null && (value == null || value.isEmpty)) {
                    return 'field_required'.trParams({'field': 'latitude'.tr});
                  }
                  return null;
                }, isRequired: true),
                _buildTextField(controller.longitudeController, 'longitude'.tr, keyboardType: TextInputType.number, validator: (value) {
                  if (value != null && value.isNotEmpty && double.tryParse(value) == null) {
                    return 'invalid_number'.tr;
                  }
                  // Custom validation for latitude/longitude if selectedLocation is null
                  if (controller.selectedLocation.value == null && (value == null || value.isEmpty)) {
                    return 'field_required'.trParams({'field': 'longitude'.tr});
                  }
                  return null;
                }, isRequired: true),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () {
                      controller.showMapPicker(); // Call the method in controller
                    },
                    icon: const Icon(Icons.map),
                    label: Text('select_location_on_map'.tr),
                  ),
                ),
                const SizedBox(height: 10),
                Obx(() => _buildDropdownField<int?>(
                      'area'.tr,
                      controller.selectedAreaTagId,
                      controller.areaTags
                          .map((tag) => DropdownMenuItem<int>(
                                value: tag.id,
                                child: Text(tag.name),
                              ))
                          .toList(),
                      'select_area'.tr,
                      isRequired: true,
                    )),

                // Contact Person Details
                _buildSectionTitle('contact_person_details'.tr),
                _buildTextField(controller.contactNameController, 'contact_person'.tr, isRequired: true),
                _buildTextField(controller.contactJobTitleController, 'job_title'.tr),
                _buildTextField(controller.contactPhone1Controller, 'phone'.tr, keyboardType: TextInputType.phone, isRequired: true),
                _buildTextField(controller.contactPhone2Controller, 'phone_2'.tr, keyboardType: TextInputType.phone),

                // ** FINANCIAL & CREDIT SECTION REMOVED **
                // _buildSectionTitle('financial_credit'.tr),
                // _buildTextField(controller.creditBalanceController, 'credit_balance'.tr, keyboardType: TextInputType.number),
                // _buildTextField(controller.creditLimitController, 'credit_limit'.tr, keyboardType: TextInputType.number),
                // _buildTextField(controller.paymentTermsController, 'payment_terms'.tr),

                // Sales & Business Specifics
                _buildSectionTitle('sales_business'.tr),
                Obx(() => _buildDropdownField<int?>(
                      'industry'.tr,
                      controller.selectedIndustryId,
                      controller.industries
                          .map((industry) => DropdownMenuItem<int>(
                                value: industry.id,
                                child: Text(industry.name),
                              ))
                          .toList(),
                      'select_industry'.tr,
                      isRequired: true,
                    )),
                Obx(() => _buildDropdownField<String?>(
                      'status'.tr,
                      controller.selectedStatus,
                      ['active', 'inactive', 'prospect', 'archived']
                          .map((s) => DropdownMenuItem<String>(
                                value: s,
                                child: Text(s.tr),
                              ))
                          .toList(),
                      'select_status'.tr,
                      isRequired: true,
                    )),
                // Removed legacy 'type' dropdown; using dynamic Client Type only

                // Activity & Order Tracking
                _buildSectionTitle('activity_orders'.tr),
                _buildTextField(controller.referenceNoteController, 'reference_note'.tr, maxLines: 3),

                const SizedBox(height: 30),
                Obx(
                  () => controller.isLoading.value
                      ? const Center(child: LoadingIndicator())
                      : SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            onPressed: controller.saveClient,
                            child: Text(controller.isEditing.value ? 'update_client'.tr : 'add_client'.tr),
                          ),
                        ),
                ),
                const SizedBox(height: 20),
              ],
            ),
          ),
        );
      }),
    );
  }
}
