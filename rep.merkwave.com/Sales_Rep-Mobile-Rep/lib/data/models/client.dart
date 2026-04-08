// lib/data/models/client.dart
class Client {
  final int id;
  final String companyName;
  final int? repUserId;
  final String? email;
  final String? website;
  final String? vatNumber;
  final String? description;
  final String? image;
  final String? address;
  final String? street2;
  final String? buildingNumber;
  final String? city;
  final String? state;
  final String? zip;
  final String? country;
  final int? countryId;
  final int? governorateId;
  final double? latitude;
  final double? longitude;
  final int? areaTagId;
  final String? areaTagName;
  final String? contactName;
  final String? contactJobTitle;
  final String? contactPhone1;
  final String? contactPhone2;
  final double creditBalance;
  final double creditLimit;
  final String? paymentTerms;
  final int? industryId;
  final String? industryName;
  final String? source;
  final String status;
  final String type;
  final int? clientTypeId;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final DateTime? lastVisit;
  final DateTime? lastOrderDate;
  final int totalOrders;
  final double totalRevenue;
  final String? referenceNote;

  Client({
    required this.id,
    required this.companyName,
    this.repUserId,
    this.email,
    this.website,
    this.vatNumber,
    this.description,
    this.image,
    this.address,
    this.street2,
    this.buildingNumber,
    this.city,
    this.state,
    this.zip,
    this.country,
    this.countryId,
    this.governorateId,
    this.latitude,
    this.longitude,
    this.areaTagId,
    this.areaTagName,
    this.contactName,
    this.contactJobTitle,
    this.contactPhone1,
    this.contactPhone2,
    this.creditBalance = 0.0,
    this.creditLimit = 0.0,
    this.paymentTerms,
    this.industryId,
    this.industryName,
    this.source,
    this.status = 'active',
    this.type = 'store',
    this.clientTypeId,
    this.createdAt,
    this.updatedAt,
    this.lastVisit,
    this.lastOrderDate,
    this.totalOrders = 0,
    this.totalRevenue = 0.0,
    this.referenceNote,
  });

  // ** NEW METHOD ADDED **
  // This method creates a new Client instance, copying all existing values
  // but allowing specific fields to be overridden.
  Client copyWith({
    int? id,
    String? companyName,
    int? repUserId,
    String? email,
    String? website,
    String? vatNumber,
    String? description,
    String? image,
    String? address,
    String? street2,
    String? buildingNumber,
    String? city,
    String? state,
    String? zip,
    String? country,
    int? countryId,
    int? governorateId,
    double? latitude,
    double? longitude,
    int? areaTagId,
    String? areaTagName,
    String? contactName,
    String? contactJobTitle,
    String? contactPhone1,
    String? contactPhone2,
    double? creditBalance,
    double? creditLimit,
    String? paymentTerms,
    int? industryId,
    String? industryName,
    String? source,
    String? status,
    String? type,
    int? clientTypeId,
    DateTime? createdAt,
    DateTime? updatedAt,
    DateTime? lastVisit,
    DateTime? lastOrderDate,
    int? totalOrders,
    double? totalRevenue,
    String? referenceNote,
  }) {
    return Client(
      id: id ?? this.id,
      companyName: companyName ?? this.companyName,
      repUserId: repUserId ?? this.repUserId,
      email: email ?? this.email,
      website: website ?? this.website,
      vatNumber: vatNumber ?? this.vatNumber,
      description: description ?? this.description,
      image: image ?? this.image,
      address: address ?? this.address,
      street2: street2 ?? this.street2,
      buildingNumber: buildingNumber ?? this.buildingNumber,
      city: city ?? this.city,
      state: state ?? this.state,
      zip: zip ?? this.zip,
      country: country ?? this.country,
      countryId: countryId ?? this.countryId,
      governorateId: governorateId ?? this.governorateId,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      areaTagId: areaTagId ?? this.areaTagId,
      areaTagName: areaTagName ?? this.areaTagName,
      contactName: contactName ?? this.contactName,
      contactJobTitle: contactJobTitle ?? this.contactJobTitle,
      contactPhone1: contactPhone1 ?? this.contactPhone1,
      contactPhone2: contactPhone2 ?? this.contactPhone2,
      creditBalance: creditBalance ?? this.creditBalance,
      creditLimit: creditLimit ?? this.creditLimit,
      paymentTerms: paymentTerms ?? this.paymentTerms,
      industryId: industryId ?? this.industryId,
      industryName: industryName ?? this.industryName,
      source: source ?? this.source,
      status: status ?? this.status,
      type: type ?? this.type,
      clientTypeId: clientTypeId ?? this.clientTypeId,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      lastVisit: lastVisit ?? this.lastVisit,
      lastOrderDate: lastOrderDate ?? this.lastOrderDate,
      totalOrders: totalOrders ?? this.totalOrders,
      totalRevenue: totalRevenue ?? this.totalRevenue,
      referenceNote: referenceNote ?? this.referenceNote,
    );
  }

  factory Client.fromJson(Map<String, dynamic> json) {
    // Helper function to safely parse DateTime from String
    DateTime? parseDateTime(dynamic value) {
      if (value is String && value.isNotEmpty) {
        // Handle potential 'YYYY-MM-DD HH:MM:SS' format from SQL DATETIME
        final cleanedValue = value.replaceAll(' ', 'T'); // Replace space with T for ISO 8601
        return DateTime.tryParse(cleanedValue);
      }
      return null;
    }

    // Helper function to safely parse double from String or num
    double parseDouble(dynamic value) {
      if (value is num) {
        return value.toDouble();
      } else if (value is String && value.isNotEmpty) {
        return double.tryParse(value) ?? 0.0;
      }
      return 0.0;
    }

    return Client(
      id: json['clients_id'] as int,
      companyName: json['clients_company_name'] as String,
      repUserId: json['clients_rep_user_id'] as int?,
      email: json['clients_email'] as String?,
      website: json['clients_website'] as String?,
      vatNumber: json['clients_vat_number'] as String?,
      description: json['clients_description'] as String?,
      image: json['clients_image'] as String?,
      address: json['clients_address'] as String?,
      street2: json['clients_street2'] as String?,
      buildingNumber: json['clients_building_number'] as String?,
      city: json['clients_city'] as String?,
      state: json['clients_state'] as String?,
      zip: json['clients_zip'] as String?,
      country: json['clients_country'] as String?,
      countryId: json['clients_country_id'] as int?,
      governorateId: json['clients_governorate_id'] as int?,
      latitude: parseDouble(json['clients_latitude']), // Use helper
      longitude: parseDouble(json['clients_longitude']), // Use helper
      areaTagId: json['clients_area_tag_id'] as int?,
      areaTagName: json['client_area_tag_name'] as String?,
      contactName: json['clients_contact_name'] as String?,
      contactJobTitle: json['clients_contact_job_title'] as String?,
      contactPhone1: json['clients_contact_phone_1'] as String?,
      contactPhone2: json['clients_contact_phone_2'] as String?,
      creditBalance: parseDouble(json['clients_credit_balance']), // Use helper
      creditLimit: parseDouble(json['clients_credit_limit']), // Use helper
      paymentTerms: json['clients_payment_terms'] as String?,
      industryId: json['clients_industry_id'] as int?,
      industryName: json['client_industries_name'] as String?,
      source: json['clients_source'] as String?,
      status: json['clients_status'] as String? ?? 'active',
      type: json['clients_type'] as String? ?? 'store',
      clientTypeId: json['clients_client_type_id'] as int?,
      createdAt: parseDateTime(json['clients_created_at']), // Use helper
      updatedAt: parseDateTime(json['clients_updated_at']), // Use helper
      lastVisit: parseDateTime(json['clients_last_visit']), // Use helper
      lastOrderDate: parseDateTime(json['clients_last_order_date']), // Use helper
      totalOrders: json['clients_total_orders'] as int? ?? 0,
      totalRevenue: parseDouble(json['clients_total_revenue']), // Use helper
      referenceNote: json['clients_reference_note'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'clients_id': id,
      'clients_company_name': companyName,
      'clients_rep_user_id': repUserId,
      'clients_email': email,
      'clients_website': website,
      'clients_vat_number': vatNumber,
      'clients_description': description,
      'clients_image': image,
      'clients_address': address,
      'clients_street2': street2,
      'clients_building_number': buildingNumber,
      'clients_city': city,
      'clients_state': state,
      'clients_zip': zip,
      'clients_country': country,
      'clients_country_id': countryId,
      'clients_governorate_id': governorateId,
      'clients_latitude': latitude?.toString(),
      'clients_longitude': longitude?.toString(),
      'clients_area_tag_id': areaTagId,
      'clients_contact_name': contactName,
      'clients_contact_job_title': contactJobTitle,
      'clients_contact_phone_1': contactPhone1,
      'clients_contact_phone_2': contactPhone2,
      'clients_credit_balance': creditBalance.toString(),
      'clients_credit_limit': creditLimit.toString(),
      'clients_payment_terms': paymentTerms,
      'clients_industry_id': industryId,
      'clients_source': source,
      'clients_status': status,
      'clients_type': type,
      'clients_client_type_id': clientTypeId,
      'clients_created_at': createdAt?.toIso8601String(),
      'clients_updated_at': updatedAt?.toIso8601String(),
      'clients_last_visit': lastVisit?.toIso8601String(),
      'clients_last_order_date': lastOrderDate?.toIso8601String(),
      'clients_total_orders': totalOrders,
      'clients_total_revenue': totalRevenue.toString(),
      'clients_reference_note': referenceNote,
    };
  }
}
