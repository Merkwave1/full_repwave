export default function StatCard({ title, value, subtitle, icon: Icon, accent = 'from-brand-400 to-brand-500' }) {
  return (
    <div className="rw-glass rounded-2xl p-5 transition hover:shadow-glow">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-brand-500/80">{title}</p>
          <p className="mt-2 text-3xl font-bold text-brand-800">{value}</p>
          {subtitle && <p className="mt-1 text-sm text-brand-500">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={`rounded-xl bg-gradient-to-br ${accent} p-2.5 text-white shadow-md`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
}
