// lib/data/datasources/location_remote_datasource.dart
import '/services/api_service.dart';
import '/core/app_constants.dart';

class LocationRemoteDataSource {
  final ApiService apiService;

  LocationRemoteDataSource({required this.apiService});

  Future<List<Map<String, dynamic>>> fetchCountriesWithGovernorates() async {
    final response = await apiService.get(AppConstants.apiCountriesWithGovernoratesEndpoint);

    final status = response['status']?.toString().toLowerCase();
    final payload = response['data'];

    if (status == 'success') {
      if (payload is Map<String, dynamic>) {
        final countries = payload['countries'];
        if (countries is List) {
          return countries.whereType<Map>().map((raw) => Map<String, dynamic>.from(raw)).toList();
        }
      }

      if (payload is List) {
        return payload.whereType<Map>().map((raw) => Map<String, dynamic>.from(raw)).toList();
      }
    }

    final data = response['data'];
    if (status == 'success' && data is List) {
      return data.whereType<Map>().map((raw) => Map<String, dynamic>.from(raw)).toList();
    }

    throw Exception(response['message'] ?? 'Failed to fetch countries with governorates.');
  }
}
