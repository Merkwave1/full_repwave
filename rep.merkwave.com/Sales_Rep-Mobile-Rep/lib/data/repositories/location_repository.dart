// lib/data/repositories/location_repository.dart
import 'package:get/get.dart';
import '/data/datasources/location_remote_datasource.dart';
import '/data/models/country_with_governorates.dart';
import '/services/data_cache_service.dart';

class LocationRepository {
  final LocationRemoteDataSource remoteDataSource;

  LocationRepository({required this.remoteDataSource});

  Future<List<CountryWithGovernorates>> getCountriesWithGovernorates({bool forceRefresh = false}) async {
    if (!forceRefresh && Get.isRegistered<DataCacheService>()) {
      final cached = DataCacheService.instance.getCachedCountriesWithGovernorates();
      if (cached.isNotEmpty) {
        return cached.whereType<Map>().map((raw) => CountryWithGovernorates.fromJson(Map<String, dynamic>.from(raw))).toList();
      }
    }

    final response = await remoteDataSource.fetchCountriesWithGovernorates();
    final countries = response.map((raw) => CountryWithGovernorates.fromJson(raw)).toList();

    if (Get.isRegistered<DataCacheService>()) {
      await DataCacheService.instance.cacheCountriesWithGovernorates(
        response.map((raw) => Map<String, dynamic>.from(raw)).toList(),
      );
    }

    return countries;
  }
}
