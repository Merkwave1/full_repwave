// lib/data/models/company_setting.dart
class CompanySetting {
  final int settingsId;
  final String settingsKey;
  final String settingsValue;
  final String? settingsDescription;
  final String settingsType;

  CompanySetting({
    required this.settingsId,
    required this.settingsKey,
    required this.settingsValue,
    this.settingsDescription,
    required this.settingsType,
  });

  factory CompanySetting.fromJson(Map<String, dynamic> json) {
    return CompanySetting(
      settingsId: json['settings_id'] as int,
      settingsKey: json['settings_key'] as String,
      settingsValue: json['settings_value'] as String,
      settingsDescription: json['settings_description'] as String?,
      settingsType: json['settings_type'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'settings_id': settingsId,
      'settings_key': settingsKey,
      'settings_value': settingsValue,
      'settings_description': settingsDescription,
      'settings_type': settingsType,
    };
  }

  @override
  String toString() {
    return 'CompanySetting(settingsId: $settingsId, settingsKey: $settingsKey, settingsValue: $settingsValue, settingsDescription: $settingsDescription, settingsType: $settingsType)';
  }
}

// Helper class to manage company settings
class CompanySettings {
  final List<CompanySetting> settings;

  CompanySettings({required this.settings});

  factory CompanySettings.fromJson(Map<String, dynamic> json) {
    var settingsList = json['data'] as List;
    List<CompanySetting> settings = settingsList.map((settingJson) => CompanySetting.fromJson(settingJson)).toList();

    return CompanySettings(settings: settings);
  }

  // Get company name from settings
  String? get companyName {
    try {
      return settings.firstWhere((setting) => setting.settingsKey == 'company_name').settingsValue;
    } catch (e) {
      return null;
    }
  }

  // Get company logo URL from settings
  String? get companyLogo {
    try {
      return settings.firstWhere((setting) => setting.settingsKey == 'company_logo').settingsValue;
    } catch (e) {
      return null;
    }
  }

  // Get setting by key
  String? getSettingValue(String key) {
    try {
      return settings.firstWhere((setting) => setting.settingsKey == key).settingsValue;
    } catch (e) {
      return null;
    }
  }

  // Get all settings as a map for easy access
  Map<String, String> get settingsMap {
    Map<String, String> map = {};
    for (var setting in settings) {
      map[setting.settingsKey] = setting.settingsValue;
    }
    return map;
  }

  @override
  String toString() {
    return 'CompanySettings(settings: $settings)';
  }
}
