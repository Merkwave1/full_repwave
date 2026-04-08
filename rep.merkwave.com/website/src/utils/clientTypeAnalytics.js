export const LEGACY_TYPE_LABELS = {
  store: 'متاجر',
  distributor: 'موزعون',
  importer: 'مستوردون',
  factory: 'مصانع',
  vip: 'عملاء VIP',
};

export const TYPE_COLOR_CLASSES = [
  { bar: 'bg-blue-600', track: 'bg-blue-100', cardBg: 'bg-blue-50', cardBorder: 'border-blue-200', cardText: 'text-blue-600' },
  { bar: 'bg-green-600', track: 'bg-green-100', cardBg: 'bg-green-50', cardBorder: 'border-green-200', cardText: 'text-green-600' },
  { bar: 'bg-purple-600', track: 'bg-purple-100', cardBg: 'bg-purple-50', cardBorder: 'border-purple-200', cardText: 'text-purple-600' },
  { bar: 'bg-orange-600', track: 'bg-orange-100', cardBg: 'bg-orange-50', cardBorder: 'border-orange-200', cardText: 'text-orange-600' },
  { bar: 'bg-pink-600', track: 'bg-pink-100', cardBg: 'bg-pink-50', cardBorder: 'border-pink-200', cardText: 'text-pink-600' },
  { bar: 'bg-teal-600', track: 'bg-teal-100', cardBg: 'bg-teal-50', cardBorder: 'border-teal-200', cardText: 'text-teal-600' },
  { bar: 'bg-indigo-600', track: 'bg-indigo-100', cardBg: 'bg-indigo-50', cardBorder: 'border-indigo-200', cardText: 'text-indigo-600' },
  { bar: 'bg-amber-600', track: 'bg-amber-100', cardBg: 'bg-amber-50', cardBorder: 'border-amber-200', cardText: 'text-amber-600' },
];

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const clampPercentage = (value) => {
  const num = toNumber(value);
  if (!Number.isFinite(num)) return 0;
  if (num < 0) return 0;
  if (num > 100) return 100;
  return num;
};

export const formatNumber = (value, options = {}) => {
  const numberValue = toNumber(value);
  return numberValue.toLocaleString(undefined, options);
};

const slugifyClientType = (value) => {
  if (!value) return 'type';
  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[\s]+/g, '_')
    .replace(/[^a-z0-9_\u0600-\u06FF]/g, '') || 'type';
};

const compareTypes = (a, b) => {
  if (b.count === a.count) {
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  }
  return b.count - a.count;
};

export const normalizeTypeAnalysis = (analysis) => {
  if (!analysis) return [];

  const normalizeItem = (item) => {
    const baseName = item?.name
      || (item?.slug ? LEGACY_TYPE_LABELS[item.slug] : null)
      || (typeof item?.id === 'string' && LEGACY_TYPE_LABELS[item.id])
      || item?.slug
      || 'غير مصنف';

    const count = toNumber(item?.count);
    const percentage = toNumber(item?.percentage);
    const slug = item?.slug ? item.slug : slugifyClientType(baseName);

    return {
      id: item?.id ?? null,
      slug,
      name: baseName,
      count,
      percentage,
    };
  };

  if (Array.isArray(analysis)) {
    return analysis.map(normalizeItem).sort(compareTypes);
  }

  return Object.entries(analysis)
    .filter(([key]) => !key.endsWith('_percentage'))
    .map(([key, value]) => normalizeItem({
      id: null,
      slug: key,
      name: LEGACY_TYPE_LABELS[key] || key,
      count: value,
      percentage: analysis?.[`${key}_percentage`],
    }))
    .sort(compareTypes);
};
