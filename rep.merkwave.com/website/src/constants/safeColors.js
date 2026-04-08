// src/constants/safeColors.js
// Safe color options matching the database enum values

export const SAFE_COLORS = [
  { value: 'white', label: 'أبيض', hex: '#FFFFFF', bgClass: 'bg-white', textClass: 'text-gray-800', borderClass: 'border-gray-300' },
  { value: 'black', label: 'أسود', hex: '#000000', bgClass: 'bg-gray-900', textClass: 'text-white', borderClass: 'border-gray-900' },
  { value: 'lightgray', label: 'رمادي فاتح', hex: '#D1D5DB', bgClass: 'bg-gray-300', textClass: 'text-gray-800', borderClass: 'border-gray-400' },
  { value: 'gray', label: 'رمادي', hex: '#6B7280', bgClass: 'bg-gray-500', textClass: 'text-white', borderClass: 'border-gray-600' },
  { value: 'blue', label: 'أزرق', hex: '#3B82F6', bgClass: 'bg-blue-500', textClass: 'text-white', borderClass: 'border-blue-600' },
  { value: 'green', label: 'أخضر', hex: '#10B981', bgClass: 'bg-green-500', textClass: 'text-white', borderClass: 'border-green-600' },
  { value: 'red', label: 'أحمر', hex: '#EF4444', bgClass: 'bg-red-500', textClass: 'text-white', borderClass: 'border-red-600' },
  { value: 'yellow', label: 'أصفر', hex: '#F59E0B', bgClass: 'bg-yellow-500', textClass: 'text-white', borderClass: 'border-yellow-600' },
  { value: 'orange', label: 'برتقالي', hex: '#F97316', bgClass: 'bg-orange-500', textClass: 'text-white', borderClass: 'border-orange-600' },
  { value: 'beige', label: 'بيج', hex: '#D4C5B9', bgClass: 'bg-amber-200', textClass: 'text-gray-800', borderClass: 'border-amber-300' }
];

export const getSafeColorConfig = (colorValue) => {
  return SAFE_COLORS.find(color => color.value === colorValue) || SAFE_COLORS[0];
};

export const DEFAULT_SAFE_COLOR = 'white';
