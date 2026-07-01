import React from 'react';
import { 
  UserGroupIcon, 
  CalendarDaysIcon, 
  ChartBarIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline';
import {
  TYPE_COLOR_CLASSES,
  clampPercentage,
  formatNumber,
  normalizeTypeAnalysis,
} from '../../../../../../utils/clientTypeAnalytics.js';

const OverviewTab = ({ data, loading }) => {
  if (loading || !data) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#8B5FD6]"></div>
      </div>
    );
  }

  const overview = data;
  const typeEntries = normalizeTypeAnalysis(overview?.type_analysis);

  return (
    <div className="space-y-5">
      {/* Top stat row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total */}
        <div className="rounded-2xl p-5 text-white" style={{ background: 'linear-gradient(135deg, #8B5FD6 0%, #6B45B0 100%)' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-xl bg-white/20">
              <UserGroupIcon className="w-5 h-5 text-white" />
            </div>
            <div className="flex items-center gap-1 text-xs bg-white/20 rounded-full px-2.5 py-1">
              {overview.growth_rate > 0 ? <ArrowUpIcon className="w-3 h-3" /> : overview.growth_rate < 0 ? <ArrowDownIcon className="w-3 h-3" /> : null}
              {overview.growth_rate > 0 ? '+' : ''}{overview.growth_rate}%
            </div>
          </div>
          <p className="text-3xl font-bold">{(overview.total_clients || 0).toLocaleString()}</p>
          <p className="text-sm opacity-80 mt-1">إجمالي العملاء</p>
        </div>

        {/* Active */}
        <div className="rounded-2xl p-5 text-white" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-xl bg-white/20">
              <UserGroupIcon className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs bg-white/20 rounded-full px-2.5 py-1">{overview.active_percentage || 0}%</span>
          </div>
          <p className="text-3xl font-bold">{(overview.active_clients || 0).toLocaleString()}</p>
          <p className="text-sm opacity-80 mt-1">العملاء النشطون</p>
        </div>

        {/* New this month */}
        <div className="rounded-2xl p-5 text-white" style={{ background: 'linear-gradient(135deg, #F97366 0%, #d45a4e 100%)' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-xl bg-white/20">
              <CalendarDaysIcon className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs bg-white/20 rounded-full px-2.5 py-1">vs {overview.new_clients_last_month || 0}</span>
          </div>
          <p className="text-3xl font-bold">{(overview.new_this_month || 0).toLocaleString()}</p>
          <p className="text-sm opacity-80 mt-1">جدد هذا الشهر</p>
        </div>
      </div>

      {/* Types breakdown + quick stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Type distribution — takes 2 cols */}
        <div className="md:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="p-2 rounded-xl bg-[#EDE7FF]">
              <ChartBarIcon className="w-4 h-4 text-[#8B5FD6]" />
            </div>
            <h3 className="text-sm font-bold text-gray-800">توزيع أنواع العملاء</h3>
          </div>
          <div className="space-y-4">
            {typeEntries.length > 0 ? (
              typeEntries.map((type, index) => {
                const palette = TYPE_COLOR_CLASSES[index % TYPE_COLOR_CLASSES.length];
                const pctVal = clampPercentage(type.percentage);
                return (
                  <div key={type.slug || `${type.id || 'type'}-${index}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-gray-700">{type.name}</span>
                      <span className="text-xs font-bold text-gray-500">{formatNumber(type.count)} ({formatNumber(pctVal, { maximumFractionDigits: 1 })}%)</span>
                    </div>
                    <div className={`${palette.track} rounded-full h-2.5`}>
                      <div
                        className={`${palette.bar} h-2.5 rounded-full transition-all duration-500`}
                        style={{ width: `${pctVal}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">لا توجد بيانات لأنواع العملاء</p>
            )}
          </div>
        </div>

        {/* Quick status summary */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="p-2 rounded-xl bg-[#EDE7FF]">
              <ChartBarIcon className="w-4 h-4 text-[#8B5FD6]" />
            </div>
            <h3 className="text-sm font-bold text-gray-800">الحالة</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50">
              <span className="text-sm text-emerald-700 font-medium">نشط</span>
              <span className="text-sm font-bold text-emerald-700">{(overview.active_clients || 0).toLocaleString()}</span>
            </div>
            {overview.status_analysis?.prospect > 0 && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50">
                <span className="text-sm text-amber-700 font-medium">محتمل</span>
                <span className="text-sm font-bold text-amber-700">{(overview.status_analysis.prospect || 0).toLocaleString()}</span>
              </div>
            )}
            {overview.status_analysis?.inactive > 0 && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-red-50">
                <span className="text-sm text-red-700 font-medium">غير نشط</span>
                <span className="text-sm font-bold text-red-700">{(overview.status_analysis.inactive || 0).toLocaleString()}</span>
              </div>
            )}
            {typeEntries.slice(0, 3).map((type, i) => (
              <div key={`qs-${i}`} className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                <span className="text-sm text-gray-600">{type.name}</span>
                <span className="text-sm font-bold text-gray-700">{formatNumber(type.count)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;
