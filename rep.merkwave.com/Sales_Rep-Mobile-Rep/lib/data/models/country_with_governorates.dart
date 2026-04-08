// lib/data/models/country_with_governorates.dart
import 'package:collection/collection.dart';

class Governorate {
  final int id;
  final String nameAr;
  final String nameEn;
  final int sortOrder;

  const Governorate({
    required this.id,
    required this.nameAr,
    required this.nameEn,
    required this.sortOrder,
  });

  factory Governorate.fromJson(Map<String, dynamic> json) {
    return Governorate(
      id: _parseInt(json['governorates_id']),
      nameAr: (json['governorates_name_ar'] ?? '').toString(),
      nameEn: (json['governorates_name_en'] ?? '').toString(),
      sortOrder: _parseInt(json['governorates_sort_order']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'governorates_id': id,
      'governorates_name_ar': nameAr,
      'governorates_name_en': nameEn,
      'governorates_sort_order': sortOrder,
    };
  }

  static int _parseInt(dynamic value) {
    if (value is int) return value;
    if (value is String) return int.tryParse(value) ?? 0;
    return 0;
  }
}

class CountryWithGovernorates {
  final int id;
  final String nameAr;
  final String nameEn;
  final int sortOrder;
  final int governoratesCount;
  final List<Governorate> governorates;

  const CountryWithGovernorates({
    required this.id,
    required this.nameAr,
    required this.nameEn,
    required this.sortOrder,
    required this.governoratesCount,
    required this.governorates,
  });

  String get displayName {
    final candidates = <String>{
      if (nameEn.trim().isNotEmpty) nameEn.trim(),
      if (nameAr.trim().isNotEmpty) nameAr.trim(),
    };
    return candidates.isEmpty ? 'Country #$id' : candidates.join(' – ');
  }

  Governorate? findGovernorateByName(String? name) {
    if (name == null || name.trim().isEmpty) {
      return null;
    }
    final normalized = name.trim();
    return governorates.firstWhereOrNull(
      (gov) => gov.nameAr.trim() == normalized || gov.nameEn.trim() == normalized,
    );
  }

  factory CountryWithGovernorates.fromJson(Map<String, dynamic> json) {
    final rawGovernorates = json['governorates'];
    final List<Governorate> parsedGovernorates;
    if (rawGovernorates is List) {
      parsedGovernorates = rawGovernorates.whereType<Map>().map((gov) => Governorate.fromJson(Map<String, dynamic>.from(gov))).toList();
    } else {
      parsedGovernorates = const [];
    }

    return CountryWithGovernorates(
      id: _parseInt(json['countries_id']),
      nameAr: (json['countries_name_ar'] ?? '').toString(),
      nameEn: (json['countries_name_en'] ?? '').toString(),
      sortOrder: _parseInt(json['countries_sort_order']),
      governoratesCount: _parseInt(json['governorates_count']),
      governorates: parsedGovernorates,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'countries_id': id,
      'countries_name_ar': nameAr,
      'countries_name_en': nameEn,
      'countries_sort_order': sortOrder,
      'governorates_count': governoratesCount,
      'governorates': governorates.map((gov) => gov.toJson()).toList(),
    };
  }

  static int _parseInt(dynamic value) {
    if (value is int) return value;
    if (value is String) return int.tryParse(value) ?? 0;
    return 0;
  }
}
