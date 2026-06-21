// src/data/countries.js
// Central list of countries and their cities (Arabic + optional English names)
// Currently includes Egypt and its major governorates/cities.

export const countries = [
  {
    code: 'EG',
    name: 'مصر',
    englishName: 'Egypt',
    cities: [
      'القاهرة', 'الجيزة', 'الإسكندرية', 'الدقهلية', 'البحر الأحمر', 'البحيرة', 'الفيوم', 'الغربية', 'الإسماعيلية',
      'المنوفية', 'المنيا', 'القليوبية', 'الوادي الجديد', 'السويس', 'أسوان', 'أسيوط', 'بني سويف', 'بورسعيد',
      'دمياط', 'الشرقية', 'جنوب سيناء', 'كفر الشيخ', 'مطروح', 'الأقصر', 'قنا', 'شمال سيناء', 'سوهاج'
    ]
  }
];

export function getCountryByCode(code) {
  return countries.find(c => c.code === code);
}

export function getCitiesByCountryCode(code) {
  const country = getCountryByCode(code);
  return country ? country.cities : [];
}
