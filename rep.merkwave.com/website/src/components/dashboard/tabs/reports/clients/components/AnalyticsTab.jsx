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
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const analytics = data;
  const typeEntries = normalizeTypeAnalysis(analytics?.type_analysis);

  return (
    <div className="space-y-6">
      {/* Basic Analytics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
          <div className="p-2 rounded-lg bg-blue-100 text-blue-600 inline-block mb-3">
            <UserGroupIcon className="w-6 h-6" />
          </div>
          <p className="text-2xl font-bold text-blue-600 mb-2">{formatNumber(analytics.total_clients)}</p>
          <p className="text-gray-600 text-sm">إجمالي العملاء</p>
        </div>
      </div>

      {/* Client Status Analysis */}
      {analytics.status_analysis && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center space-x-3 space-x-reverse mb-6">
            <div className="p-2 rounded-lg bg-green-100 text-green-600">
              <ChartBarIcon className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">تحليل حالة العملاء</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-xl font-bold text-green-600">{formatNumber(analytics.status_analysis.active)}</p>
              <p className="text-sm text-gray-600">عملاء نشطون</p>
              <p className="text-xs text-gray-500 mt-1">{formatNumber(analytics.status_analysis.active_percentage, { maximumFractionDigits: 1 })}% من الإجمالي</p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <p className="text-xl font-bold text-yellow-600">{formatNumber(analytics.status_analysis.prospect)}</p>
              <p className="text-sm text-gray-600">عملاء محتملون</p>
              <p className="text-xs text-gray-500 mt-1">{formatNumber(analytics.status_analysis.prospect_percentage, { maximumFractionDigits: 1 })}% من الإجمالي</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-xl font-bold text-red-600">{formatNumber(analytics.status_analysis.inactive)}</p>
              <p className="text-sm text-gray-600">عملاء غير نشطين</p>
              <p className="text-xs text-gray-500 mt-1">{formatNumber(analytics.status_analysis.inactive_percentage, { maximumFractionDigits: 1 })}% من الإجمالي</p>
            </div>
          </div>
        </div>
      )}

      {/* Client Type Analysis */}
      {typeEntries.length > 0 ? (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center space-x-3 space-x-reverse mb-6">
            <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
              <UserGroupIcon className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">تحليل أنواع العملاء</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {typeEntries.map((type, index) => {
              const palette = TYPE_COLOR_CLASSES[index % TYPE_COLOR_CLASSES.length];
              return (
                <div
                  key={type.slug || `${type.id || 'type'}-${index}`}
                  className={`text-center p-4 rounded-lg border ${palette.cardBorder} ${palette.cardBg}`}
                >
                  <p className={`text-lg font-bold ${palette.cardText}`}>{formatNumber(type.count)}</p>
                  <p className="text-sm text-gray-600">{type.name}</p>
                  <p className="text-xs text-gray-500 mt-1">{formatNumber(type.percentage, { maximumFractionDigits: 1 })}%</p>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center space-x-3 space-x-reverse mb-6">
            <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
              <UserGroupIcon className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">تحليل أنواع العملاء</h3>
          </div>
          <p className="text-sm text-gray-500">لا توجد بيانات لأنواع العملاء.</p>
        </div>
      )}

      {/* Growth Analysis */}
      {analytics.growth_analysis && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center space-x-3 space-x-reverse mb-6">
            <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600">
              <CalendarDaysIcon className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">تحليل النمو</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 border rounded-lg">
              <p className="text-xl font-bold text-blue-600">{formatNumber(analytics.growth_analysis.this_month)}</p>
              <p className="text-sm text-gray-600">عملاء جدد هذا الشهر</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-xl font-bold text-green-600">{formatNumber(analytics.growth_analysis.last_month)}</p>
              <p className="text-sm text-gray-600">عملاء جدد الشهر الماضي</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="flex items-center justify-center mb-2">
                {analytics.growth_analysis.growth_rate > 0 ? (
                  <ArrowUpIcon className="w-5 h-5 text-green-500 ml-2" />
                ) : analytics.growth_analysis.growth_rate < 0 ? (
                  <ArrowDownIcon className="w-5 h-5 text-red-500 ml-2" />
                ) : null}
                <p className="text-xl font-bold text-indigo-600">
                  {analytics.growth_analysis.growth_rate > 0 ? '+' : ''}{formatNumber(analytics.growth_analysis.growth_rate, { maximumFractionDigits: 1 })}%
                </p>
              </div>
              <p className="text-sm text-gray-600">معدل النمو الشهري</p>
            </div>
          </div>
        </div>
      )}

      {/* Credit Analysis */}
      {analytics.credit_analysis && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center space-x-3 space-x-reverse mb-6">
            <div className="p-2 rounded-lg bg-yellow-100 text-yellow-600">
              <CreditCardIcon className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">تحليل الائتمان</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-xl font-bold text-yellow-600">{formatNumber(analytics.credit_analysis.clients_with_credit)}</p>
              <p className="text-sm text-gray-600">عملاء لديهم حد ائتماني</p>
              <p className="text-xs text-gray-500 mt-1">{formatNumber(analytics.credit_analysis.credit_coverage, { maximumFractionDigits: 1 })}% من الإجمالي</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-green-600">{formatNumber(analytics.credit_analysis.total_credit_limit)}</p>
              <p className="text-sm text-gray-600">إجمالي الحدود الائتمانية</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-blue-600">{formatNumber(analytics.credit_analysis.avg_credit_limit)}</p>
              <p className="text-sm text-gray-600">متوسط الحد الائتماني</p>
            </div>
          </div>
        </div>
      )}

      {/* Profile Completeness */}
      {analytics.profile_completeness && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center space-x-3 space-x-reverse mb-6">
            <div className="p-2 rounded-lg bg-teal-100 text-teal-600">
              <PhoneIcon className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">اكتمال الملفات الشخصية</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-xl font-bold text-blue-600">{formatNumber(analytics.profile_completeness.with_phone)}</p>
              <p className="text-sm text-gray-600">لديهم أرقام هواتف</p>
              <p className="text-xs text-gray-500 mt-1">{formatNumber(analytics.profile_completeness.phone_coverage, { maximumFractionDigits: 1 })}% من الإجمالي</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-xl font-bold text-green-600">{formatNumber(analytics.profile_completeness.with_email)}</p>
              <p className="text-sm text-gray-600">لديهم بريد إلكتروني</p>
              <p className="text-xs text-gray-500 mt-1">{formatNumber(analytics.profile_completeness.email_coverage, { maximumFractionDigits: 1 })}% من الإجمالي</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-xl font-bold text-purple-600">{formatNumber(analytics.profile_completeness.complete_profiles)}</p>
              <p className="text-sm text-gray-600">ملفات مكتملة</p>
              <p className="text-xs text-gray-500 mt-1">{formatNumber(analytics.profile_completeness.completeness_rate, { maximumFractionDigits: 1 })}% من الإجمالي</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsTab;
