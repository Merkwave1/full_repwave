const STATUS_META = {
  active: {
    value: 'active',
    label: 'نشط',
    badgeClass: 'bg-green-100 text-green-700',
    chipTone: 'green',
  },
  inactive: {
    value: 'inactive',
    label: 'غير نشط',
    badgeClass: 'bg-red-100 text-red-700',
    chipTone: 'red',
  },
  prospect: {
    value: 'prospect',
    label: 'عميل محتمل',
    badgeClass: 'bg-amber-100 text-amber-700',
    chipTone: 'amber',
  },
  archived: {
    value: 'archived',
    label: 'مؤرشف',
    badgeClass: 'bg-slate-200 text-slate-700',
    chipTone: 'gray',
  },
};

const STATUS_ORDER = ['active', 'inactive', 'prospect', 'archived'];

export const CLIENT_STATUS_OPTIONS = STATUS_ORDER.map((key) => ({
  value: STATUS_META[key].value,
  label: STATUS_META[key].label,
}));

export function getClientStatusMeta(status) {
  if (!status) {
    return {
      value: '',
      label: 'غير محدد',
      badgeClass: 'bg-gray-100 text-gray-700',
      chipTone: 'gray',
    };
  }
  const normalized = String(status).toLowerCase().trim();
  return STATUS_META[normalized] || {
    value: normalized,
    label: normalized || 'غير محدد',
    badgeClass: 'bg-gray-100 text-gray-700',
    chipTone: 'gray',
  };
}

export function getClientStatusLabel(status) {
  return getClientStatusMeta(status).label;
}

export function getClientStatusBadgeClass(status) {
  return getClientStatusMeta(status).badgeClass;
}

export function getClientStatusChipTone(status) {
  return getClientStatusMeta(status).chipTone;
}

const STATUS_ALIASES = {
  active: ['active', 'نشط', '1', 'true', 'مفعل'],
  inactive: ['inactive', 'غير نشط', '0', 'false', 'معطل'],
  prospect: ['prospect', 'عميل محتمل', 'محتمل', 'فرصة', 'opportunity'],
  archived: ['archived', 'مؤرشف', 'مغلق', 'محفوظ', 'منتهي'],
};

export function normalizeClientStatus(input, fallback = 'active') {
  const value = String(input ?? '').trim().toLowerCase();
  if (!value) return fallback;
  for (const [status, aliases] of Object.entries(STATUS_ALIASES)) {
    if (aliases.map((alias) => String(alias).trim().toLowerCase()).includes(value)) {
      return status;
    }
  }
  return STATUS_META[value] ? value : fallback;
}

export const CLIENT_STATUS_SET = new Set(STATUS_ORDER);
