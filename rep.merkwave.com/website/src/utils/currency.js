// src/utils/currency.js
// Utility helpers to read currency settings from localStorage and format amounts consistently.
// Reads from cached categorized settings keys: appSettingsCategorized OR appSettings (flat array fallback).

const SETTINGS_CATEGORIZED_KEY = 'appSettingsCategorized';
const SETTINGS_FLAT_KEY = 'appSettings';

function readRawSettings() {
  try {
    const cat = localStorage.getItem(SETTINGS_CATEGORIZED_KEY);
    if (cat) return JSON.parse(cat);
  } catch {
    // ignore parse error
  }
  try {
    const flat = localStorage.getItem(SETTINGS_FLAT_KEY);
    if (flat) return JSON.parse(flat);
  } catch {
    // ignore parse error
  }
  return null;
}

function flattenSettings(obj) {
  if (!obj) return {};
  if (Array.isArray(obj)) {
    return obj.reduce((acc, s) => { acc[s.settings_key] = s.settings_value; return acc; }, {});
  }
  // categorized: { company: [...], financial: [...], ... }
  return Object.values(obj).reduce((acc, arr) => {
    if (Array.isArray(arr)) {
      arr.forEach(s => { if (s && s.settings_key) acc[s.settings_key] = s.settings_value; });
    }
    return acc;
  }, {});
}

export function getSettingsMap() {
  return flattenSettings(readRawSettings());
}

export function getCurrencyCode() {
  const map = getSettingsMap();
  // preference order: default_currency -> company_currency -> company_currency (legacy) -> fallback
  return map.default_currency || map.company_currency || 'EGP';
}

export function getCurrencySymbol() {
  const map = getSettingsMap();
  // explicit stored symbol first
  if (map.currency_symbol) return map.currency_symbol;
  const code = getCurrencyCode();
  switch (code) {
    case 'EGP': return 'جنيه';
    case 'SAR': return 'ريال';
    case 'AED': return 'درهم';
    case 'USD': return '$';
    case 'EUR': return '€';
    case 'QAR': return 'ريال';
    case 'OMR': return 'ريال';
    case 'KWD': return 'دينار';
    case 'BHD': return 'دينار';
    case 'JOD': return 'دينار';
  default: return code; // fallback show code itself
  }
}

export function formatCurrency(amount, { withSymbol = true, fractionDigits } = {}) {
  if (amount == null || amount === '') return '';
  const symbol = getCurrencySymbol();
  const fd = typeof fractionDigits === 'number' ? fractionDigits : 2;
  const num = Number(amount);
  if (Number.isNaN(num)) return amount;
  // Basic formatting (English locale). Could refine later.
  const formatted = new Intl.NumberFormat('en-US', { minimumFractionDigits: fd, maximumFractionDigits: fd }).format(num);
  return withSymbol ? `${formatted} ${symbol}` : formatted; // code currently not appended; could use `${code}` if needed
}

// Provide a simple subscription mechanism so components without React context can subscribe.
const listeners = new Set();
export function subscribeCurrency(cb) { listeners.add(cb); return () => listeners.delete(cb); }
function notify() { listeners.forEach(cb => { try { cb(); } catch { /* ignore */ } }); }

// Listen to cross-tab storage & custom events from settings save.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === SETTINGS_CATEGORIZED_KEY || e.key === SETTINGS_FLAT_KEY) {
      notify();
    }
  });
  window.addEventListener('settings-updated', () => notify());
}
