/**
 * Date utility functions for handling local timezone issues
 */

/**
 * Get current local date and time formatted for datetime-local input
 * @returns {string} Local datetime in YYYY-MM-DDTHH:MM format
 */
export function getCurrentLocalDateTime() {
  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset() * 60000;
  const localTime = new Date(now.getTime() - timezoneOffset);
  return localTime.toISOString().slice(0, 16);
}

/**
 * Get current local date formatted for date input
 * @returns {string} Local date in YYYY-MM-DD format
 */
export function getCurrentLocalDate() {
  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset() * 60000;
  const localTime = new Date(now.getTime() - timezoneOffset);
  return localTime.toISOString().slice(0, 10);
}

const SECONDS_IN_MINUTE = 60;
const MILLIS_IN_SECOND = 1000;

const normalizeDateInput = (value) => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    // Handle "YYYY-MM-DD HH:mm:ss" by replacing the space with 'T'
    const normalized = trimmed.includes('T') ? trimmed : trimmed.replace(' ', 'T');
    const parsed = new Date(normalized);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
};

const formatDateToApiString = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

/**
 * Convert a datetime-local input value to ISO string for API
 * @param {string} localDateTimeString - datetime-local input value
 * @returns {string} ISO string for API
 */
export function localDateTimeToISOString(localDateTimeString) {
  const parsed = normalizeDateInput(localDateTimeString);
  if (!parsed) {
    return formatDateToApiString(new Date());
  }

  return formatDateToApiString(parsed);
}

export const formatDateTimeForApi = (value) => {
  const parsed = normalizeDateInput(value) || normalizeDateInput(getCurrentLocalDateTime());
  if (!parsed) {
    return formatDateToApiString(new Date());
  }
  return formatDateToApiString(parsed);
};

/**
 * Convert ISO string to datetime-local input value
 * @param {string} isoString - ISO date string
 * @returns {string} datetime-local formatted string
 */
export function isoStringToLocalDateTime(isoString) {
  if (!isoString) return getCurrentLocalDateTime();

  const parsed = normalizeDateInput(isoString);
  if (!parsed) {
    return getCurrentLocalDateTime();
  }

  const timezoneOffset = parsed.getTimezoneOffset() * SECONDS_IN_MINUTE * MILLIS_IN_SECOND;
  const localTime = new Date(parsed.getTime() - timezoneOffset);
  return localTime.toISOString().slice(0, 16);
}

/**
 * Format a date object or ISO string for local display
 * @param {Date|string} date - Date object or ISO string
 * @param {string} locale - Locale for formatting (default: 'en-GB')
 * @returns {string} Formatted local date string
 */
export function formatLocalDate(date, locale = 'en-GB') {
  const parsed = normalizeDateInput(date);
  if (!parsed) return '-';

  return parsed.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric'
  });
}

/**
 * Format a date object or ISO string for local datetime display
 * @param {Date|string} date - Date object or ISO string
 * @param {string} locale - Locale for formatting (default: 'en-GB')
 * @returns {string} Formatted local datetime string
 */
export function formatLocalDateTime(date, locale = 'en-GB') {
  const parsed = normalizeDateInput(date);
  if (!parsed) return '-';

  return parsed.toLocaleString(locale, {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}