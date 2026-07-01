import React from 'react';
import { 
  ChartBarIcon, 
  UserGroupIcon,
  CalendarDaysIcon,
  CreditCardIcon,
  PhoneIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline';
import {
  TYPE_COLOR_CLASSES,
  formatNumber,
  normalizeTypeAnalysis,
} from '../../../../../../utils/clientTypeAnalytics.js';

const AnalyticsTab = ({ data, loading }) => {
  if (loading || !data) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#8B5FD6]"></div>
      </div>
    );
  }

  const analytics = data;
  const typeEntries = normalizeTypeAnalysis(analytics?.type_analysis);

  return (
    <div className="space-y-5">
      {/* Status analysis */}
      {analytics.status_analysis && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="p-2 rounded-xl bg-[#EDE7FF]">
              <ChartBarIcon className="w-4 h-4 text-[#8B5FD6]" />
            </div>
            <h3 className="text-sm font-bold text-gray-800">تحليل حالة العملاء</h3>
            <span className="mr-auto text-xs text-gray-400">{formatNumber(analytics.total_clients)} إجمالي</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl p-4 text-white text-center" style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
              <p className="text-2xl font-bold">{formatNumber(analytics.status_analysis.active)}</p>
              <p className="text-xs opacity-80 mt-1">نشط</p>
              <p className="text-xs opacity-60 mt-0.5">{formatNumber(analytics.status_analysis.active_percentage, { maximumFractionDigits: 1 })}%</p>
            </div>
            <div className="rounded-2xl p-4 text-white text-center" style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>
              <p className="text-2xl font-bold">{formatNumber(analytics.status_analysis.prospect)}</p>
              <p className="text-xs opacity-80 mt-1">محتمل</p>
              <p className="text-xs opacity-60 mt-0.5">{formatNumber(analytics.status_analysis.prospect_percentage, { maximumFractionDigits: 1 })}%</p>
            </div>
            <div className="rounded-2xl p-4 text-white text-center" style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)' }}>
              <p className="text-2xl font-bold">{formatNumber(analytics.status_analysis.inactive)}</p>
              <p className="text-xs opacity-80 mt-1">غير نشط</p>
              <p className="text-xs opacity-60 mt-0.5">{formatNumber(analytics.status_analysis.inactive_percentage, { maximumFractionDigits: 1 })}%</p>
            </div>
          </div>
        </div>
      )}

      {/* Type distribution */}
      {typeEntries.length > 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="p-2 rounded-xl bg-[#EDE7FF]">
              <UserGroupIcon className="w-4 h-4 text-[#8B5FD6]" />
            </div>
            <h3 className="text-sm font-bold text-gray-800">تحليل أنواع العملاء</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {typeEntries.map((type, index) => {
              const palette = TYPE_COLOR_CLASSES[index % TYPE_COLOR_CLASSES.length];
              return (
                <div
                  key={type.slug || `${type.id || 'type'}-${index}`}
                  className={`text-center p-4 rounded-2xl border ${palette.cardBorder} ${palette.cardBg}`}
                >
                  <p className={`text-2xl font-bold ${palette.cardText}`}>{formatNumber(type.count)}</p>
                  <p className="text-xs text-gray-600 mt-1 font-medium">{type.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatNumber(type.percentage, { maximumFractionDigits: 1 })}%</p>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="p-2 rounded-xl bg-[#EDE7FF]">
              <UserGroupIcon className="w-4 h-4 text-[#8B5FD6]" />
            </div>
            <h3 className="text-sm font-bold text-gray-800">تحليل أنواع العملاء</h3>
          </div>
          <p className="text-sm text-gray-400 text-center py-4">لا توجد بيانات لأنواع العملاء</p>
        </div>
      )}

      {/* Growth */}
      {analytics.growth_analysis && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="p-2 rounded-xl bg-[#EDE7FF]">
              <CalendarDaysIcon className="w-4 h-4 text-[#8B5FD6]" />
            </div>
            <h3 className="text-sm font-bold text-gray-800">تحليل النمو</h3>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-[#EDE7FF] text-center">
              <p className="text-xl font-bold text-[#8B5FD6]">{formatNumber(analytics.growth_analysis.this_month)}</p>
              <p className="text-xs text-gray-600 mt-1">هذا الشهر</p>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-50 text-center">
              <p className="text-xl font-bold text-emerald-600">{formatNumber(analytics.growth_analysis.last_month)}</p>
              <p className="text-xs text-gray-600 mt-1">الشهر الماضي</p>
            </div>
            <div
              className="p-4 rounded-2xl text-center text-white"
              style={{ background: analytics.growth_analysis.growth_rate >= 0 ? 'linear-gradient(135deg,#10b981,#059669)' : 'linear-gradient(135deg,#ef4444,#dc2626)' }}
            >
              <div className="flex items-center justify-center gap-1 mb-1">
                {analytics.growth_analysis.growth_rate > 0 ? <ArrowUpIcon className="w-4 h-4" /> : analytics.growth_analysis.growth_rate < 0 ? <ArrowDownIcon className="w-4 h-4" /> : null}
                <p className="text-xl font-bold">
                  {analytics.growth_analysis.growth_rate > 0 ? '+' : ''}{formatNumber(analytics.growth_analysis.growth_rate, { maximumFractionDigits: 1 })}%
                </p>
              </div>
              <p className="text-xs opacity-80">معدل النمو</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsTab;
