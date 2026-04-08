// lib/modules/clients/controllers/add_edit_client_controller.dart
import 'package:collection/collection.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '/shared_widgets/app_notifier.dart';
import 'package:latlong2/latlong.dart';
import '/data/models/client.dart';
import '/data/models/client_area_tag.dart';
import '/data/models/client_industry.dart';
import '/data/models/client_type.dart';
import '/data/models/country_with_governorates.dart';
import '/data/repositories/client_repository.dart';
import '/data/repositories/location_repository.dart';
import '/modules/auth/controllers/auth_controller.dart';
import '/modules/clients/controllers/clients_controller.dart';
import '/modules/clients/screens/add_edit_client_screen.dart' as AddEditClientScreenFile;
import '/services/location_service.dart';
import '/services/media_service.dart';
import '/modules/shared/controllers/global_data_controller.dart';
import '/modules/visits/controllers/visits_calendar_controller.dart';
import '/modules/dashboard/controllers/dashboard_controller.dart';
import '/services/data_cache_service.dart';
import '../../../core/routes/app_routes.dart';

class AddEditClientController extends GetxController {
  final ClientRepository _clientRepository;
  final AuthController _authController = Get.find<AuthController>();
  final ClientsController _clientsController = Get.find<ClientsController>();
  final LocationService _locationService = Get.find<LocationService>();
  final MediaService _mediaService = Get.find<MediaService>();

  final GlobalKey<FormState> formKey = GlobalKey<FormState>();

  static const Set<String> _allowedStatuses = {'active', 'inactive', 'prospect', 'archived'};

  static const Map<String, String> _statusAliases = {
    'active': 'active',
    'inactive': 'inactive',
    'prospect': 'prospect',
    'archived': 'archived',
    // Common English variants/legacy values
    'active ': 'active',
    'inactive ': 'inactive',
    'prospective': 'prospect',
    'pending': 'prospect',
    'archieve': 'archived',
    // Arabic translations
    'نشط': 'active',
    'فعال': 'active',
    'نشط ': 'active',
    'غير نشط': 'inactive',
    'غيرنشط': 'inactive',
    'محتمل': 'prospect',
    'قيد المتابعة': 'prospect',
    'مؤرشف': 'archived',
    'أرشيف': 'archived',
    'ارشيف': 'archived',
  };

  String _normalizeStatus(String? status) {
    final raw = status?.toString().trim();
    if (raw == null || raw.isEmpty) {
      return 'active';
    }

    if (_allowedStatuses.contains(raw)) {
      return raw;
    }

    final lower = raw.toLowerCase();
    if (_allowedStatuses.contains(lower)) {
      return lower;
    }

    final aliasDirect = _statusAliases[raw];
    if (aliasDirect != null) {
      return aliasDirect;
    }

    final aliasLower = _statusAliases[lower];
    if (aliasLower != null) {
      return aliasLower;
    }

    final cleaned = lower.replaceAll(RegExp(r'[\s_\-]'), '');
    for (final entry in _statusAliases.entries) {
      final normalizedKey = entry.key.toLowerCase().replaceAll(RegExp(r'[\s_\-]'), '');
      if (normalizedKey == cleaned) {
        return entry.value;
      }
    }

    return 'active';
  }

  void _logPayload(Map<String, String> fields, String action) {
    final mappedStatus = fields['clients_status'];
    debugPrint('📦 [Client $action] Prepared payload:');
    debugPrint('    • status => $mappedStatus');
    debugPrint('    • areaTag => ${fields['clients_area_tag_id']}');
    debugPrint('    • industry => ${fields['clients_industry_id']}');
    debugPrint('    • rep => ${fields['clients_rep_user_id']}');
    debugPrint('    • clientType => ${fields['clients_client_type_id']}');
    debugPrint('    • hasImage => ${_mediaService.selectedImage.value != null}');
    debugPrint('    • full payload => $fields');
  }

  // Form field controllers
  final companyNameController = TextEditingController();
  final emailController = TextEditingController();
  final websiteController = TextEditingController();
  final vatNumberController = TextEditingController();
  final descriptionController = TextEditingController();
  final addressController = TextEditingController();
  final street2Controller = TextEditingController();
  final buildingNumberController = TextEditingController();
  final cityController = TextEditingController();
  final stateController = TextEditingController();
  final zipController = TextEditingController();
  final countryController = TextEditingController();
  final contactNameController = TextEditingController();
  final contactJobTitleController = TextEditingController();
  final contactPhone1Controller = TextEditingController();
  final contactPhone2Controller = TextEditingController();
  final creditBalanceController = TextEditingController();
  final creditLimitController = TextEditingController();
  final paymentTermsController = TextEditingController();
  final sourceController = TextEditingController();
  final referenceNoteController = TextEditingController();
  final latitudeController = TextEditingController();
  final longitudeController = TextEditingController();

  // Dropdown observables
  final selectedStatus = Rx<String?>('active');
  final selectedClientTypeId = Rx<int?>(null);
  final selectedAreaTagId = Rx<int?>(null);
  final selectedIndustryId = Rx<int?>(null);
  final selectedCountryId = Rxn<int>();
  final selectedGovernorateId = Rxn<int>();

  final RxList<ClientAreaTag> areaTags = <ClientAreaTag>[].obs;
  final RxList<ClientIndustry> industries = <ClientIndustry>[].obs;
  final RxList<ClientType> clientTypes = <ClientType>[].obs;

  // Country/Governorate dropdown data sourced from API
  final RxList<CountryWithGovernorates> countries = <CountryWithGovernorates>[].obs;
  final RxList<Governorate> governorates = <Governorate>[].obs;

  CountryWithGovernorates? get _selectedCountry => countries.firstWhereOrNull((country) => country.id == selectedCountryId.value);

  Governorate? get _selectedGovernorate => governorates.firstWhereOrNull((gov) => gov.id == selectedGovernorateId.value);

  String? get _selectedCountryName {
    final country = _selectedCountry;
    if (country == null) {
      return null;
    }
    return country.nameAr.trim().isNotEmpty ? country.nameAr.trim() : country.nameEn.trim();
  }

  String? get _selectedGovernorateName {
    final governorate = _selectedGovernorate;
    if (governorate == null) {
      return null;
    }
    return governorate.nameAr.trim().isNotEmpty ? governorate.nameAr.trim() : governorate.nameEn.trim();
  }

  final Rx<LatLng?> selectedLocation = Rx<LatLng?>(null);

  final isLoading = false.obs;
  final isEditing = false.obs;
  Client? clientToEdit;
  final int? clientId;

  AddEditClientController({required ClientRepository clientRepository, this.clientId}) : _clientRepository = clientRepository;

  @override
  void onInit() {
    super.onInit();
    clientToEdit = Get.arguments as Client?;

    _mediaService.clearImage();

    _initAsync();

    _locationService.getCurrentLocation().then((_) {
      // Set current location as default if available
      if (_locationService.currentLocation.value != null) {
        selectLocation(_locationService.currentLocation.value!);
      }
    });

    // React to country changes to update governorates list and preserve selection when possible
    ever<int?>(selectedCountryId, (id) {
      final previousGovernorateId = selectedGovernorateId.value;
      _syncGovernoratesWithSelectedCountry();

      if (previousGovernorateId != null && governorates.any((gov) => gov.id == previousGovernorateId)) {
        selectedGovernorateId.value = previousGovernorateId;
      } else if (governorates.isNotEmpty && (selectedGovernorateId.value == null || id == null)) {
        selectedGovernorateId.value = governorates.first.id;
      } else if (selectedGovernorateId.value != null && !governorates.any((gov) => gov.id == selectedGovernorateId.value)) {
        selectedGovernorateId.value = governorates.isNotEmpty ? governorates.first.id : null;
      }

      countryController.text = _selectedCountryName ?? '';
    });

    // Removed the listener that was overwriting cityController (and potentially confusing things)
    // ever<int?>(selectedGovernorateId, (_) {
    //   cityController.text = _selectedGovernorateName ?? '';
    // });
  }

  Future<void> _initAsync() async {
    await _initializeCountriesAndCities();
    await _fetchDataAndPopulateForm();
  }

  void _syncGovernoratesWithSelectedCountry() {
    final country = _selectedCountry;
    if (country == null) {
      governorates.clear();
      return;
    }

    final sortedGovernorates = [...country.governorates]..sort((a, b) => a.sortOrder.compareTo(b.sortOrder));
    governorates.assignAll(sortedGovernorates);
  }

  @override
  void onClose() {
    _mediaService.clearImage();

    companyNameController.dispose();
    emailController.dispose();
    websiteController.dispose();
    vatNumberController.dispose();
    descriptionController.dispose();
    addressController.dispose();
    street2Controller.dispose();
    buildingNumberController.dispose();
    cityController.dispose();
    stateController.dispose();
    zipController.dispose();
    countryController.dispose();
    contactNameController.dispose();
    contactJobTitleController.dispose();
    contactPhone1Controller.dispose();
    contactPhone2Controller.dispose();
    creditBalanceController.dispose();
    creditLimitController.dispose();
    paymentTermsController.dispose();
    sourceController.dispose();
    referenceNoteController.dispose();
    latitudeController.dispose();
    longitudeController.dispose();
    super.onClose();
  }

  void _populateForm(Client client) {
    companyNameController.text = client.companyName;
    emailController.text = client.email ?? '';
    websiteController.text = client.website ?? '';
    vatNumberController.text = client.vatNumber ?? '';
    descriptionController.text = client.description ?? '';
    addressController.text = client.address ?? '';
    street2Controller.text = client.street2 ?? '';
    buildingNumberController.text = client.buildingNumber ?? '';
    // stateController is bound to the "City" input field in the UI
    stateController.text = client.city ?? '';
    // cityController is unused in the UI, but we'll set it to governorate name for consistency if needed, or just ignore
    cityController.text = client.state ?? '';
    zipController.text = client.zip ?? '';
    countryController.text = client.country ?? '';
    contactNameController.text = client.contactName ?? '';
    contactJobTitleController.text = client.contactJobTitle ?? '';
    contactPhone1Controller.text = client.contactPhone1 ?? '';
    contactPhone2Controller.text = client.contactPhone2 ?? '';
    creditBalanceController.text = client.creditBalance.toString();
    creditLimitController.text = client.creditLimit.toString();
    paymentTermsController.text = client.paymentTerms ?? '';
    sourceController.text = client.source ?? '';
    referenceNoteController.text = client.referenceNote ?? '';
    latitudeController.text = client.latitude?.toString() ?? '';
    longitudeController.text = client.longitude?.toString() ?? '';

    selectedStatus.value = _normalizeStatus(client.status);
    selectedClientTypeId.value = client.clientTypeId;
    selectedAreaTagId.value = client.areaTagId;
    selectedIndustryId.value = client.industryId;

    // Initialize Country and Governorate
    if (client.countryId != null) {
      selectedCountryId.value = client.countryId;
      // Force sync governorates for the selected country
      _syncGovernoratesWithSelectedCountry();

      if (client.governorateId != null) {
        selectedGovernorateId.value = client.governorateId;
      } else {
        // Fallback: try to match governorate by name (client.state)
        final trimmedState = client.state?.trim();
        if (trimmedState != null && trimmedState.isNotEmpty) {
          final matchedGovernorate = governorates.firstWhereOrNull((gov) {
            final ar = gov.nameAr.trim();
            final en = gov.nameEn.trim();
            final lower = trimmedState.toLowerCase();
            return ar == trimmedState || en.toLowerCase() == lower;
          });
          selectedGovernorateId.value = matchedGovernorate?.id;
        }
      }
    } else {
      // Fallback: try to match country by name
      final trimmedCountry = client.country?.trim();
      if (trimmedCountry != null && trimmedCountry.isNotEmpty) {
        final matchedCountry = countries.firstWhereOrNull((country) {
          final ar = country.nameAr.trim();
          final en = country.nameEn.trim();
          final lower = trimmedCountry.toLowerCase();
          return ar == trimmedCountry || en.toLowerCase() == lower;
        });
        if (matchedCountry != null) {
          selectedCountryId.value = matchedCountry.id;
          _syncGovernoratesWithSelectedCountry();

          // Try to match governorate by name (client.state)
          final trimmedState = client.state?.trim();
          if (trimmedState != null && trimmedState.isNotEmpty) {
            final matchedGovernorate = governorates.firstWhereOrNull((gov) {
              final ar = gov.nameAr.trim();
              final en = gov.nameEn.trim();
              final lower = trimmedState.toLowerCase();
              return ar == trimmedState || en.toLowerCase() == lower;
            });
            selectedGovernorateId.value = matchedGovernorate?.id;
          } else {
            selectedGovernorateId.value = null;
          }
        } else {
          selectedCountryId.value = null;
        }
      }
    }

    if (client.latitude != null && client.longitude != null) {
      selectedLocation.value = LatLng(client.latitude!, client.longitude!);
    }
  }

  Future<void> _fetchDataAndPopulateForm() async {
    isLoading.value = true;
    try {
      // Try to get metadata from GlobalDataController cache first (loaded during login)
      if (Get.isRegistered<GlobalDataController>()) {
        final globalController = Get.find<GlobalDataController>();

        // Check if cache has data
        if (globalController.clientAreaTags.isNotEmpty && globalController.clientIndustries.isNotEmpty && globalController.clientTypes.isNotEmpty) {
          print("Using client metadata from GlobalDataController cache");
          areaTags.assignAll(globalController.clientAreaTags);
          industries.assignAll(globalController.clientIndustries);
          clientTypes.assignAll(globalController.clientTypes);
          print("Loaded from cache: ${areaTags.length} area tags, ${industries.length} industries, ${clientTypes.length} types");
        } else {
          // Fallback: Fetch from API only if cache is empty
          print("GlobalDataController cache empty, fetching from API...");
          final results = await Future.wait([
            _clientRepository.getClientAreaTags(),
            _clientRepository.getClientIndustries(),
            _clientRepository.getClientTypes(),
          ]);
          areaTags.assignAll(results[0] as List<ClientAreaTag>);
          industries.assignAll(results[1] as List<ClientIndustry>);
          clientTypes.assignAll(results[2] as List<ClientType>);
          print("Fetched from API: ${areaTags.length} area tags, ${industries.length} industries, ${clientTypes.length} types");
        }
      } else {
        // GlobalDataController not registered, fetch from API
        print("GlobalDataController not available, fetching from API...");
        final results = await Future.wait([
          _clientRepository.getClientAreaTags(),
          _clientRepository.getClientIndustries(),
          _clientRepository.getClientTypes(),
        ]);
        areaTags.assignAll(results[0] as List<ClientAreaTag>);
        industries.assignAll(results[1] as List<ClientIndustry>);
        clientTypes.assignAll(results[2] as List<ClientType>);
      }

      if (clientToEdit != null) {
        isEditing.value = true;
        _populateForm(clientToEdit!);
      } else {
        // Default client type to first option if available
        if (clientTypes.isNotEmpty && selectedClientTypeId.value == null) {
          selectedClientTypeId.value = clientTypes.first.id;
        }
      }
    } catch (e) {
      AppNotifier.error('Failed to load form data: $e');
    } finally {
      isLoading.value = false;
    }
  }

  Future<void> _initializeCountriesAndCities() async {
    try {
      if (Get.isRegistered<GlobalDataController>()) {
        final globalController = Get.find<GlobalDataController>();
        if (globalController.countriesWithGovernorates.isEmpty) {
          await globalController.loadCountriesWithGovernorates();
        }
        if (globalController.countriesWithGovernorates.isNotEmpty) {
          countries.assignAll(globalController.countriesWithGovernorates);
        }
      }

      if (countries.isEmpty && Get.isRegistered<DataCacheService>()) {
        final cached = DataCacheService.instance.getCachedCountriesWithGovernorates();
        if (cached.isNotEmpty) {
          countries.assignAll(
            cached.map((json) => CountryWithGovernorates.fromJson(json)).toList(),
          );
        }
      }

      if (countries.isEmpty && Get.isRegistered<LocationRepository>()) {
        try {
          final locationRepository = Get.find<LocationRepository>();
          final remoteCountries = await locationRepository.getCountriesWithGovernorates();
          if (remoteCountries.isNotEmpty) {
            countries.assignAll(remoteCountries);
          }
        } catch (e) {
          print('Failed to fetch countries from API: $e');
        }
      }
    } catch (e) {
      print('Failed to initialize countries data: $e');
    }

    if (countries.isEmpty) {
      print('No countries available for selection.');
      return;
    }

    countries.sort((a, b) => a.sortOrder.compareTo(b.sortOrder));

    if (selectedCountryId.value == null || !countries.any((country) => country.id == selectedCountryId.value)) {
      final defaultCountry = countries.firstWhereOrNull(
            (country) => country.nameEn.toLowerCase() == 'egypt' || country.nameAr.trim() == 'مصر',
          ) ??
          countries.first;
      selectedCountryId.value = defaultCountry.id;
    } else {
      selectedCountryId.refresh();
    }

    _syncGovernoratesWithSelectedCountry();
    countryController.text = _selectedCountryName ?? countryController.text;
    if (selectedGovernorateId.value != null) {
      cityController.text = _selectedGovernorateName ?? cityController.text;
    }
  }

  void selectLocation(LatLng location) {
    selectedLocation.value = location;
    latitudeController.text = location.latitude.toString();
    longitudeController.text = location.longitude.toString();
  }

  Future<void> showMapPicker() async {
    if (_locationService.currentLocation.value == null && !_locationService.isGettingLocation.value) {
      await _locationService.getCurrentLocation();
    }

    Get.bottomSheet(
      AddEditClientScreenFile.buildMapPickerBottomSheet(Get.context!, this),
      backgroundColor: Get.theme.canvasColor,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      isScrollControlled: true,
    );
  }

  Future<void> saveClient() async {
    if (!formKey.currentState!.validate()) {
      AppNotifier.validation('Please fill in all required fields correctly.');
      return;
    }

    isLoading.value = true;

    try {
      final String? userUuid = _authController.currentUser.value?.uuid;
      if (userUuid == null) {
        throw Exception('User not logged in or UUID not available.');
      }

      final String normalizedStatus = _normalizeStatus(selectedStatus.value);
      selectedStatus.value = normalizedStatus;

      final String countryName = (_selectedCountryName ?? countryController.text).trim();
      final String governorateName = (_selectedGovernorateName ?? cityController.text).trim();

      final Map<String, String> fields = {
        'clients_company_name': companyNameController.text,
        'clients_email': emailController.text,
        'clients_website': websiteController.text,
        'clients_vat_number': vatNumberController.text,
        'clients_description': descriptionController.text,
        'clients_address': addressController.text,
        'clients_street2': street2Controller.text,
        'clients_building_number': buildingNumberController.text,
        'clients_city': stateController.text, // Map "State" text field to City column
        'clients_state': selectedGovernorateId.value?.toString() ?? '', // Send ID in legacy column too
        'clients_governorate_id': selectedGovernorateId.value?.toString() ?? '', // Send ID
        'clients_zip': zipController.text,
        'clients_country': selectedCountryId.value?.toString() ?? '', // Send ID in legacy column too
        'clients_country_id': selectedCountryId.value?.toString() ?? '', // Send ID
        'clients_latitude': selectedLocation.value?.latitude.toString() ?? '',
        'clients_longitude': selectedLocation.value?.longitude.toString() ?? '',
        'clients_area_tag_id': selectedAreaTagId.value?.toString() ?? '',
        'clients_contact_name': contactNameController.text,
        'clients_contact_job_title': contactJobTitleController.text,
        'clients_contact_phone_1': contactPhone1Controller.text,
        'clients_contact_phone_2': contactPhone2Controller.text,
        'clients_credit_balance': (double.tryParse(creditBalanceController.text) ?? 0.0).toString(),
        'clients_credit_limit': (double.tryParse(creditLimitController.text) ?? 0.0).toString(),
        'clients_payment_terms': paymentTermsController.text,
        'clients_industry_id': selectedIndustryId.value?.toString() ?? '',
        'clients_source': sourceController.text,
        'clients_status': normalizedStatus,
        'clients_client_type_id': selectedClientTypeId.value?.toString() ?? '',
        'clients_reference_note': referenceNoteController.text,
        'clients_rep_user_id': _authController.currentUser.value!.id.toString(),
      };

      _logPayload(fields, isEditing.value ? 'update' : 'add');

      if (isEditing.value) {
        if (clientToEdit?.id == null) {
          throw Exception('Client ID is missing for update.');
        }
        fields['clients_id'] = clientToEdit!.id.toString();

        final response = await _clientRepository.updateClient(
          userUuid,
          clientToEdit!.id,
          fields,
          filePath: _mediaService.selectedImage.value?.path,
          fileField: 'clients_image',
        );

        if (response['status'] == 'success') {
          AppNotifier.success(response['message'] ?? 'Client updated successfully!');
        } else {
          throw Exception(response['message'] ?? 'Client update failed.');
        }
      } else {
        final response = await _clientRepository.addClient(
          userUuid,
          fields,
          filePath: _mediaService.selectedImage.value?.path,
          fileField: 'clients_image',
        );

        if (response['status'] == 'success') {
          AppNotifier.success(response['message'] ?? 'Client added successfully!');
        } else {
          throw Exception(response['message'] ?? 'Failed to add client.');
        }
      }

      await _clientsController.refreshClients();

      // Also refresh the global clients cache used across the app (e.g., Visits Calendar)
      if (Get.isRegistered<GlobalDataController>()) {
        try {
          await GlobalDataController.instance.loadClients(forceRefresh: true);
        } catch (_) {}
      }

      // If visits calendar is active, refresh it so distances recalc with new coordinates
      if (Get.isRegistered<VisitsCalendarController>()) {
        try {
          await Get.find<VisitsCalendarController>().refreshVisits();
        } catch (_) {}
      }

      // Ensure loading flag cleared before navigation to avoid any lingering absorber
      isLoading.value = false;

      // Force close any lingering GetX overlays before navigation
      if (Get.isSnackbarOpen == true) {
        try {
          Get.closeAllSnackbars();
        } catch (_) {}
      }

      // Close any open dialogs
      if (Get.isDialogOpen == true) {
        try {
          Get.until((route) => !Get.isDialogOpen!);
        } catch (_) {}
      }

      // Close any bottom sheets
      if (Get.isBottomSheetOpen == true) {
        try {
          Get.back();
        } catch (_) {}
      }

      // Small delay to ensure all overlays are closed
      await Future.delayed(const Duration(milliseconds: 150));

      // Navigate back to the previous screen (Clients Screen)
      // Using Get.back() preserves the existing Dashboard and ClientsController state
      debugPrint('[AddEditClientController] Navigating back to Clients Screen');
      Get.back();
    } catch (e) {
      AppNotifier.error('Failed to save client: $e');
      print('Save client error: $e');
    } finally {
      isLoading.value = false;
    }
  }
}
