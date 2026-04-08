// lib/data/datasources/company_settings_remote_datasource.dart
import '/services/api_service.dart';
import '/data/models/company_setting.dart';
import '/core/app_constants.dart';

class CompanySettingsRemoteDataSource {
  final ApiService apiService;

  CompanySettingsRemoteDataSource({required this.apiService});

  Future<CompanySettings> getCompanySettings() async {
    try {
      final response = await apiService.get(AppConstants.apiCompanySettingsEndpoint);

      if (response['status'] == 'success') {
        return CompanySettings.fromJson(response);
      } else {
        throw Exception('Failed to load company settings: ${response['message']}');
      }
    } catch (e) {
      throw Exception('Error fetching company settings: $e');
    }
  }
}
