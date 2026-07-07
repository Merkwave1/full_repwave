const LABELS = {
  trial_active: { label: 'Trial', className: 'bg-emerald-100 text-emerald-700' },
  trial_expired: { label: 'Trial Expired', className: 'bg-amber-100 text-amber-800' },
  paid_active: { label: 'Paid', className: 'bg-brand-100 text-brand-700' },
  paid_expired: { label: 'Paid Expired', className: 'bg-orange-100 text-orange-800' },
  suspended: { label: 'Suspended', className: 'bg-red-100 text-red-700' },
};

export default function StatusBadge({ status }) {
  const cfg = LABELS[status] || { label: status, className: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}
