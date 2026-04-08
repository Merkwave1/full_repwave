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
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const overview = data;
  const typeEntries = normalizeTypeAnalysis(overview?.type_analysis);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Total Clients */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center space-x-3 space-x-reverse mb-4">
          <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
            <UserGroupIcon className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">إجمالي العملاء</h3>
        </div>
        <p className="text-3xl font-bold text-blue-600 mb-2">{overview.total_clients?.toLocaleString() || 0}</p>
        <div className="flex items-center">
          {overview.growth_rate > 0 ? (
            <ArrowUpIcon className="w-4 h-4 text-green-500 ml-1" />
          ) : overview.growth_rate < 0 ? (
            <ArrowDownIcon className="w-4 h-4 text-red-500 ml-1" />
          ) : null}
          <p className="text-gray-600 text-sm">
            {overview.growth_rate > 0 ? '+' : ''}{overview.growth_rate}% من الشهر الماضي
          </p>
        </div>
      </div>

      {/* Active Clients */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center space-x-3 space-x-reverse mb-4">
          <div className="p-2 rounded-lg bg-green-100 text-green-600">
            <UserGroupIcon className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">العملاء النشطون</h3>
        </div>
        <p className="text-3xl font-bold text-green-600 mb-2">{overview.active_clients?.toLocaleString() || 0}</p>
        <p className="text-gray-600 text-sm">{overview.active_percentage || 0}% من إجمالي العملاء</p>
      </div>

      {/* New Clients This Month */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center space-x-3 space-x-reverse mb-4">
          <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
            <CalendarDaysIcon className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">عملاء جدد هذا الشهر</h3>
        </div>
        <p className="text-3xl font-bold text-purple-600 mb-2">{overview.new_this_month?.toLocaleString() || 0}</p>
        <p className="text-gray-600 text-sm">
          مقارنة بـ {overview.new_clients_last_month || 0} الشهر الماضي
        </p>
      </div>

      {/* Client Types Distribution */}
      <div className="bg-white rounded-lg shadow-sm border p-6 md:col-span-2">
        <div className="flex items-center space-x-3 space-x-reverse mb-4">
          <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600">
            <ChartBarIcon className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">توزيع أنواع العملاء</h3>
        </div>
        <div className="space-y-3">
          {typeEntries.length > 0 ? (
            typeEntries.map((type, index) => {
              const palette = TYPE_COLOR_CLASSES[index % TYPE_COLOR_CLASSES.length];
              return (
                <div key={type.slug || `${type.id || 'type'}-${index}`} className="flex justify-between items-center">
                  <span className="text-gray-600">{type.name}</span>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <div className={`w-32 ${palette.track} rounded-full h-2`}>
                      <div
                        className={`${palette.bar} h-2 rounded-full`}
                        style={{ width: `${clampPercentage(type.percentage)}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium">
                      {formatNumber(clampPercentage(type.percentage), { maximumFractionDigits: 1 })}%
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-gray-500">لا توجد بيانات متاحة لأنواع العملاء.</p>
          )}
        </div>
      </div>

      {/* Client Statistics Summary */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center space-x-3 space-x-reverse mb-4">
          <div className="p-2 rounded-lg bg-orange-100 text-orange-600">
            <ChartBarIcon className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">إحصائيات سريعة</h3>
        </div>
        <div className="space-y-2">
          {typeEntries.length > 0 ? (
            typeEntries.map((type, index) => (
              <div key={`${type.slug || type.id || 'type'}-summary-${index}`} className="flex justify-between">
                <span className="text-gray-600">{type.name}</span>
                <span className="text-sm font-medium">{formatNumber(type.count)}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500">لا توجد أنواع عملاء مسجلة حالياً.</p>
          )}
          {overview.status_analysis && (
            <div className="flex justify-between">
              <span className="text-gray-600">غير نشط</span>
              <span className="text-sm font-medium">{formatNumber(overview.status_analysis.inactive)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;
