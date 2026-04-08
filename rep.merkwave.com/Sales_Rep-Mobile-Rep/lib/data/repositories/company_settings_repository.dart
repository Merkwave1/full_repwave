// lib/data/repositories/company_settings_repository.dart
import '/data/datasources/company_settings_remote_datasource.dart';
import '/data/models/company_setting.dart';

class CompanySettingsRepository {
  final CompanySettingsRemoteDataSource remoteDataSource;

  CompanySettingsRepository({required this.remoteDataSource});

  Future<CompanySettings> getCompanySettings() async {
    try {
      return await remoteDataSource.getCompanySettings();
    } catch (e) {
      throw Exception('Repository error: $e');
    }
  }
}
