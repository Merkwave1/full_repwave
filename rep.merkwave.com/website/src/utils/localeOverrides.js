const DATE_PARTS = new Set(['day', 'month', 'year']);
const TIME_PARTS = new Set(['hour', 'minute', 'second']);
const SUPPORTED_PART_FORMATS = new Set(['numeric', '2-digit']);

const DEFAULT_NUMBER_LOCALE = 'en-US';
const DEFAULT_DATE_LOCALE = 'en-GB';

const originalNumberToLocaleString = Number.prototype.toLocaleString;
const originalDateToLocaleString = Date.prototype.toLocaleString;
const originalDateToLocaleDateString = Date.prototype.toLocaleDateString;
const originalDateToLocaleTimeString = Date.prototype.toLocaleTimeString;

function normalizeLocales(locales, fallback) {
  if (!locales) {
    return fallback;
  }

  if (typeof locales === 'string') {
    return locales.toLowerCase().startsWith('ar') ? fallback : locales;
  }

  if (Array.isArray(locales)) {
    const firstNonArabic = locales.find((locale) => typeof locale === 'string' && !locale.toLowerCase().startsWith('ar'));
    return firstNonArabic || fallback;
  }

  return fallback;
}

function isValidDate(value) {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

function normalizeOptions(type, options) {
  const provided = options ? { ...options } : {};
  const keys = provided ? Object.keys(provided) : [];
  const hasDatePart = keys.some((key) => DATE_PARTS.has(key));
  const hasTimePart = keys.some((key) => TIME_PARTS.has(key));

  if (!options || keys.length === 0) {
    if (type !== 'time') {
      provided.day = provided.day ?? 'numeric';
      provided.month = provided.month ?? 'numeric';
      provided.year = provided.year ?? 'numeric';
    }

    if (type !== 'date') {
      provided.hour = provided.hour ?? 'numeric';
      provided.minute = provided.minute ?? '2-digit';
      if (type === 'time') {
        provided.second = provided.second ?? '2-digit';
      }
    }
    return provided;
  }

  if (type === 'date' && !hasDatePart) {
    provided.day = provided.day ?? 'numeric';
    provided.month = provided.month ?? 'numeric';
    provided.year = provided.year ?? 'numeric';
  }

  if (type === 'time' && !hasTimePart) {
    provided.hour = provided.hour ?? 'numeric';
    provided.minute = provided.minute ?? '2-digit';
    provided.second = provided.second ?? '2-digit';
  }

  return provided;
}

function isSupportedOptions(options) {
  if (!options) return true;
  return Object.entries(options).every(([key, value]) => {
    if (key === 'hour12') return true;
    if (!DATE_PARTS.has(key) && !TIME_PARTS.has(key)) return false;
    if (value == null) return true;
    return SUPPORTED_PART_FORMATS.has(value);
  });
}

function formatPart(value, format, { isYear = false } = {}) {
  if (!format) return null;
  if (format === 'numeric') {
    return String(value);
  }
  if (format === '2-digit') {
    if (isYear) {
      const twoDigits = Math.abs(value) % 100;
      return String(twoDigits).padStart(2, '0');
    }
    return String(value).padStart(2, '0');
  }
  return null;
}

function manualDateFormat(date, type, options) {
  if (!isValidDate(date)) {
    return null;
  }

  const normalized = normalizeOptions(type, options);
  if (!isSupportedOptions(normalized)) {
    return null;
  }

  const parts = [];

  if (type !== 'time') {
    const day = normalized.day ? formatPart(date.getDate(), normalized.day) : null;
    const month = normalized.month ? formatPart(date.getMonth() + 1, normalized.month) : null;
    const year = normalized.year ? formatPart(date.getFullYear(), normalized.year, { isYear: true }) : null;

    const dateSegments = [day, month, year].filter(Boolean);
    if (dateSegments.length) {
      parts.push(dateSegments.join('/'));
    }
  }

  if (type !== 'date') {
    const use12Hour = normalized.hour12 === true;
    let hours = date.getHours();
    let suffix = '';

    if (use12Hour) {
      suffix = hours >= 12 ? ' PM' : ' AM';
      hours = hours % 12;
      if (hours === 0) hours = 12;
    }

    const hour = normalized.hour ? formatPart(hours, normalized.hour) : null;
    const minute = normalized.minute ? formatPart(date.getMinutes(), normalized.minute) : null;
    const second = normalized.second ? formatPart(date.getSeconds(), normalized.second) : null;

    const timeSegments = [];
    if (hour != null) timeSegments.push(hour);
    if (minute != null) timeSegments.push(minute.padStart(2, '0'));
    if (second != null) timeSegments.push(second.padStart(2, '0'));

    if (timeSegments.length) {
      const timeString = timeSegments.join(':') + suffix;
      parts.push(timeString.trim());
    }
  }

  if (!parts.length) {
    return null;
  }

  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

function patchNumberPrototype() {
  Number.prototype.toLocaleString = function patchedNumberToLocaleString(locales, options) {
    const resolvedLocale = normalizeLocales(locales, DEFAULT_NUMBER_LOCALE);
    const resolvedOptions = options ? { ...options } : {};
    if (resolvedOptions.useGrouping === undefined) {
      resolvedOptions.useGrouping = true;
    }
    return originalNumberToLocaleString.call(this, resolvedLocale, resolvedOptions);
  };
}

function patchDatePrototype() {
  Date.prototype.toLocaleString = function patchedDateToLocaleString(locales, options) {
    const resolvedLocale = normalizeLocales(locales, DEFAULT_DATE_LOCALE);
    const manual = manualDateFormat(this, 'datetime', options);
    if (manual != null) {
      return manual;
    }
    const resolvedOptions = options ? { ...options } : {};
    if (resolvedOptions.hour12 === undefined) {
      resolvedOptions.hour12 = false;
    }
    return originalDateToLocaleString.call(this, resolvedLocale, resolvedOptions);
  };

  Date.prototype.toLocaleDateString = function patchedDateToLocaleDateString(locales, options) {
    const resolvedLocale = normalizeLocales(locales, DEFAULT_DATE_LOCALE);
    const manual = manualDateFormat(this, 'date', options);
    if (manual != null) {
      return manual;
    }
    const resolvedOptions = options ? { ...options } : {};
    return originalDateToLocaleDateString.call(this, resolvedLocale, resolvedOptions);
  };

  Date.prototype.toLocaleTimeString = function patchedDateToLocaleTimeString(locales, options) {
    const resolvedLocale = normalizeLocales(locales, DEFAULT_DATE_LOCALE);
    const manual = manualDateFormat(this, 'time', options);
    if (manual != null) {
      return manual;
    }
    const resolvedOptions = options ? { ...options } : {};
    if (resolvedOptions.hour12 === undefined) {
      resolvedOptions.hour12 = false;
    }
    return originalDateToLocaleTimeString.call(this, resolvedLocale, resolvedOptions);
  };
}

if (typeof globalThis !== 'undefined') {
  if (!globalThis.__MERKWAVE_LOCALE_PATCHED__) {
    globalThis.__MERKWAVE_LOCALE_PATCHED__ = true;
    patchNumberPrototype();
    patchDatePrototype();
  }
}
