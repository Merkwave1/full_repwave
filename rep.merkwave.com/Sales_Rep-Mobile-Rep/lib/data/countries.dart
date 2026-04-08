class Country {
  final String code; // ISO country code, e.g., 'EG'
  final String nameEn; // English name, e.g., 'Egypt'
  final String nameAr; // Arabic name, e.g., 'مصر'
  const Country({required this.code, required this.nameEn, required this.nameAr});

  String get bilingualLabel => '$nameEn - $nameAr';
}

/// Minimal country list aligned with Website Admin (can be expanded)
const List<Country> kCountries = <Country>[
  Country(code: 'EG', nameEn: 'Egypt', nameAr: 'مصر'),
  Country(code: 'SA', nameEn: 'Saudi Arabia', nameAr: 'المملكة العربية السعودية'),
  Country(code: 'AE', nameEn: 'United Arab Emirates', nameAr: 'الإمارات العربية المتحدة'),
  Country(code: 'KW', nameEn: 'Kuwait', nameAr: 'الكويت'),
  Country(code: 'QA', nameEn: 'Qatar', nameAr: 'قطر'),
  Country(code: 'BH', nameEn: 'Bahrain', nameAr: 'البحرين'),
  Country(code: 'OM', nameEn: 'Oman', nameAr: 'عُمان'),
  Country(code: 'JO', nameEn: 'Jordan', nameAr: 'الأردن'),
  Country(code: 'LB', nameEn: 'Lebanon', nameAr: 'لبنان'),
  Country(code: 'IQ', nameEn: 'Iraq', nameAr: 'العراق'),
  Country(code: 'MA', nameEn: 'Morocco', nameAr: 'المغرب'),
  Country(code: 'DZ', nameEn: 'Algeria', nameAr: 'الجزائر'),
  Country(code: 'TN', nameEn: 'Tunisia', nameAr: 'تونس'),
  Country(code: 'LY', nameEn: 'Libya', nameAr: 'ليبيا'),
  Country(code: 'SD', nameEn: 'Sudan', nameAr: 'السودان'),
  Country(code: 'TR', nameEn: 'Turkey', nameAr: 'تركيا'),
  Country(code: 'US', nameEn: 'United States', nameAr: 'الولايات المتحدة'),
  Country(code: 'GB', nameEn: 'United Kingdom', nameAr: 'المملكة المتحدة'),
  Country(code: 'DE', nameEn: 'Germany', nameAr: 'ألمانيا'),
  Country(code: 'FR', nameEn: 'France', nameAr: 'فرنسا'),
  Country(code: 'IT', nameEn: 'Italy', nameAr: 'إيطاليا'),
  Country(code: 'ES', nameEn: 'Spain', nameAr: 'إسبانيا'),
];

/// Cities by ISO country code. Extend this map as needed.
final Map<String, List<String>> _citiesByCountry = <String, List<String>>{
  // Egypt: 27 governorates (Arabic), aligned with Website Admin
  'EG': [
    'القاهرة', 'الجيزة', 'الإسكندرية', 'الدقهلية', 'البحر الأحمر', 'البحيرة', 'الفيوم', 'الغربية', 'الإسماعيلية',
    'المنوفية', 'المنيا', 'القليوبية', 'الوادي الجديد', 'السويس', 'أسوان', 'أسيوط', 'بني سويف', 'بورسعيد',
    'دمياط', 'الشرقية', 'جنوب سيناء', 'كفر الشيخ', 'مطروح', 'الأقصر', 'قنا', 'شمال سيناء', 'سوهاج'
  ],
  'SA': ['Riyadh', 'Jeddah', 'Mecca', 'Medina', 'Dammam'],
  'AE': ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah', 'Fujairah'],
  'KW': ['Kuwait City'],
  'QA': ['Doha'],
  'BH': ['Manama'],
  'OM': ['Muscat'],
  'JO': ['Amman'],
  'LB': ['Beirut'],
  'IQ': ['Baghdad'],
  'MA': ['Casablanca', 'Rabat'],
  'DZ': ['Algiers'],
  'TN': ['Tunis'],
  'LY': ['Tripoli'],
  'SD': ['Khartoum'],
  'TR': ['Istanbul', 'Ankara', 'Izmir'],
  'US': ['New York', 'Los Angeles', 'Chicago'],
  'GB': ['London', 'Manchester', 'Birmingham'],
  'DE': ['Berlin', 'Munich', 'Hamburg'],
  'FR': ['Paris', 'Marseille', 'Lyon'],
  'IT': ['Rome', 'Milan', 'Naples'],
  'ES': ['Madrid', 'Barcelona', 'Valencia'],
};

List<String> getCitiesByCountryCode(String? code) {
  if (code == null) return const <String>[];
  return _citiesByCountry[code] ?? const <String>[];
}
