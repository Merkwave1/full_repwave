/** Normalize .NET SettingDto → PHP-compatible shape and bucket by tab */

const TAB_DEFAULTS = {
  company: [
    'company_logo',
    'company_name',
    'company_description',
    'company_website',
    'company_email',
    'company_phone',
    'company_address',
    'company_lat',
    'company_lng',
    'company_commercial_register',
    'company_vat_number',
    'company_country',
    'company_currency',
  ],
  financial: [
    'default_currency',
    'currency_symbol',
    'decimal_places',
    'tax_rate',
    'defult_client_credit_limit',
    'payment_terms_days',
  ],
  inventory: [
    'low_stock_threshold',
    'out_of_stock_threshold',
    'allow_negative_inventory',
    'require_batch_tracking',
    'auto_reorder_enabled',
    'max_expiry_days_threshold',
  ],
};

function inferSettingType(key) {
  if (!key) return 'string';
  if (
    key.includes('threshold') ||
    key === 'decimal_places' ||
    key.includes('_limit') ||
    key.includes('_days') ||
    key.includes('_minutes') ||
    key.includes('_interval') ||
    key.includes('_sec')
  ) {
    return 'integer';
  }
  if (key.includes('rate') || key.includes('percentage') || key.includes('decimal')) {
    return 'decimal';
  }
  if (
    key.startsWith('allow_') ||
    key.includes('_enabled') ||
    key.includes('_required') ||
    key === 'maintenance_mode'
  ) {
    return 'boolean';
  }
  if (key.includes('expiration') || key.includes('_date')) {
    return 'datetime';
  }
  return 'string';
}

export function normalizeSetting(row) {
  if (!row || typeof row !== 'object') return null;
  const key = row.settings_key ?? row.settingsKey;
  if (!key) return null;

  return {
    settings_id: row.settings_id ?? row.settingsId ?? null,
    settings_key: key,
    settings_value: row.settings_value ?? row.settingsValue ?? '',
    settings_type:
      row.settings_type ??
      row.settingsType ??
      inferSettingType(key),
    settings_description:
      row.settings_description ??
      row.settingsDescription ??
      row.settings_label ??
      row.settingsLabel ??
      '',
    settings_category:
      row.settings_category ?? row.settingsCategory ?? 'general',
  };
}

function emptyBuckets() {
  return {
    company: [],
    system: [],
    financial: [],
    inventory: [],
    business: [],
    mobile: [],
    visit: [],
    safe: [],
    warehouse: [],
    client: [],
    notifications: [],
    security: [],
    backup: [],
    reports: [],
    product: [],
    ui: [],
    integration: [],
    performance: [],
    advanced: [],
  };
}

function bucketForKey(key, backendCategory) {
  const cat = String(backendCategory ?? '').toLowerCase();
  if (cat === 'financial') return 'financial';
  if (cat === 'inventory') return 'inventory';
  if (cat === 'company' || cat === 'general') {
    if (key.startsWith('company_')) return 'company';
  }

  const explicitFinancialKeys = new Set(['defult_client_credit_limit']);
  if (explicitFinancialKeys.has(key)) return 'financial';

  if (key.startsWith('company_')) return 'company';
  if (
    key.includes('users_limits') ||
    key.includes('expiration_date') ||
    key.includes('_limit') ||
    key.includes('timezone') ||
    key.includes('language') ||
    key.includes('date_format') ||
    key.includes('time_format') ||
    key.includes('fiscal_year')
  ) {
    return 'system';
  }
  if (
    key.includes('currency') ||
    key.includes('tax') ||
    key.includes('payment') ||
    key.includes('decimal')
  ) {
    return 'financial';
  }
  if (
    key.includes('stock') ||
    key.includes('inventory') ||
    key.includes('batch') ||
    key.includes('reorder') ||
    key.includes('expiry')
  ) {
    return 'inventory';
  }
  if (
    key.includes('approve') ||
    key.includes('credit') ||
    key.includes('order') ||
    key.includes('invoice') ||
    key.includes('return') ||
    key.includes('discount') ||
    key.includes('_prefix')
  ) {
    return 'business';
  }
  if (
    key.includes('gps') ||
    key.includes('mobile') ||
    key.includes('photo') ||
    key.includes('location') ||
    key.includes('offline') ||
    key.includes('check_in') ||
    key.includes('check_out')
  ) {
    return 'mobile';
  }
  if (key.includes('visit')) return 'visit';
  if (
    key.includes('safe') ||
    key.includes('expense') ||
    key.includes('collection') ||
    key.includes('deposit') ||
    key.includes('closing')
  ) {
    return 'safe';
  }
  if (
    key.includes('warehouse') ||
    key.includes('transfer') ||
    key.includes('goods_receipt') ||
    key.includes('adjustment') ||
    key.includes('van')
  ) {
    return 'warehouse';
  }
  if (key.includes('client') || key.includes('overdue')) return 'client';
  if (
    key.includes('notification') ||
    key.includes('email') ||
    key.includes('sms') ||
    key.includes('push')
  ) {
    return 'notifications';
  }
  if (
    key.includes('security') ||
    key.includes('password') ||
    key.includes('session') ||
    key.includes('login') ||
    key.includes('lockout') ||
    key.includes('authentication')
  ) {
    return 'security';
  }
  if (
    key.includes('backup') ||
    key.includes('maintenance') ||
    key.includes('retention')
  ) {
    return 'backup';
  }
  if (
    key.includes('report') ||
    key.includes('analytics') ||
    key.includes('dashboard')
  ) {
    return 'reports';
  }
  if (
    key.includes('product') ||
    key.includes('barcode') ||
    key.includes('variant') ||
    key.includes('packaging')
  ) {
    return 'product';
  }
  if (
    key.includes('theme') ||
    key.includes('items_per_page') ||
    key.includes('help') ||
    key.includes('tooltip')
  ) {
    return 'ui';
  }
  if (
    key.includes('api') ||
    key.includes('webhook') ||
    key.includes('integration')
  ) {
    return 'integration';
  }
  if (
    key.includes('cache') ||
    key.includes('performance') ||
    key.includes('optimization')
  ) {
    return 'performance';
  }
  return 'advanced';
}

function mergeTabDefaults(categorized) {
  Object.entries(TAB_DEFAULTS).forEach(([tab, keys]) => {
    if (!Array.isArray(categorized[tab])) categorized[tab] = [];
    const existing = new Set(categorized[tab].map((s) => s.settings_key));
    keys.forEach((key) => {
      if (existing.has(key)) return;
      categorized[tab].push({
        settings_id: null,
        settings_key: key,
        settings_value: key === 'company_country' ? 'EG' : key === 'company_currency' ? 'EGP' : '',
        settings_type: inferSettingType(key),
        settings_description: '',
        settings_category: tab,
        _isDefault: true,
      });
    });
  });
  return categorized;
}

export function categorizeSettings(rawSettings) {
  const categorized = emptyBuckets();
  const list = Array.isArray(rawSettings)
    ? rawSettings.map(normalizeSetting).filter(Boolean)
    : [];

  list.forEach((setting) => {
    const tab = bucketForKey(setting.settings_key, setting.settings_category);
    if (!categorized[tab]) categorized[tab] = [];
    categorized[tab].push(setting);
  });

  return mergeTabDefaults(categorized);
}

export function flattenCategorizedSettings(categorized) {
  if (!categorized || typeof categorized !== 'object') return [];
  return Object.values(categorized).flatMap((arr) =>
    Array.isArray(arr) ? arr : [],
  );
}
