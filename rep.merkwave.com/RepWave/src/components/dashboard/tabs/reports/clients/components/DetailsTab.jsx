import React from 'react';
import { 
  UserGroupIcon, 
  ChartBarIcon,
  PhoneIcon,
  CalendarDaysIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

const DetailsTab = ({ data, loading }) => {
  if (loading || !data) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const details = data;

  return (
    <div className="space-y-6">
      {/* Contact Analysis */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center space-x-3 space-x-reverse mb-6">
          <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
            <PhoneIcon className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">تحليل معلومات الاتصال</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600 mb-2">{details.phone_count?.toLocaleString() || 0}</p>
            <p className="text-gray-600">أرقام هواتف مسجلة</p>
            <p className="text-xs text-gray-500 mt-1">
              {details.total_clients > 0 
                ? ((details.phone_count / details.total_clients) * 100).toFixed(1)
                : 0
              }% من إجمالي العملاء
            </p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600 mb-2">{details.email_count?.toLocaleString() || 0}</p>
            <p className="text-gray-600">عناوين بريد إلكتروني</p>
            <p className="text-xs text-gray-500 mt-1">
              {details.total_clients > 0 
                ? ((details.email_count / details.total_clients) * 100).toFixed(1)
                : 0
              }% من إجمالي العملاء
            </p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-600 mb-2">{details.complete_profile_count?.toLocaleString() || 0}</p>
            <p className="text-gray-600">ملفات شخصية مكتملة</p>
            <p className="text-xs text-gray-500 mt-1">
              {details.total_clients > 0 
                ? ((details.complete_profile_count / details.total_clients) * 100).toFixed(1)
                : 0
              }% من إجمالي العملاء
            </p>
          </div>
        </div>
      </div>

      {/* Registration Timeline */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center space-x-3 space-x-reverse mb-6">
          <div className="p-2 rounded-lg bg-green-100 text-green-600">
            <CalendarDaysIcon className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">الجدول الزمني للتسجيل</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-xl font-bold text-blue-600">{details.today_registrations?.toLocaleString() || 0}</p>
            <p className="text-sm text-gray-600">اليوم</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-green-600">{details.week_registrations?.toLocaleString() || 0}</p>
            <p className="text-sm text-gray-600">هذا الأسبوع</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-purple-600">{details.month_registrations?.toLocaleString() || 0}</p>
            <p className="text-sm text-gray-600">هذا الشهر</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-orange-600">{details.year_registrations?.toLocaleString() || 0}</p>
            <p className="text-sm text-gray-600">هذا العام</p>
          </div>
        </div>
      </div>

      {/* Client Status */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center space-x-3 space-x-reverse mb-6">
          <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600">
            <ChartBarIcon className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">تفاصيل حالة العملاء</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-2xl font-bold text-green-600 mb-2">{details.active_clients?.toLocaleString() || 0}</p>
            <p className="text-gray-600">عملاء نشطون</p>
            <p className="text-xs text-gray-500 mt-1">
              {details.total_clients > 0 
                ? ((details.active_clients / details.total_clients) * 100).toFixed(1)
                : 0
              }% من الإجمالي
            </p>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <p className="text-2xl font-bold text-yellow-600 mb-2">{details.pending_clients?.toLocaleString() || 0}</p>
            <p className="text-gray-600">عملاء محتملون</p>
            <p className="text-xs text-gray-500 mt-1">
              {details.total_clients > 0 
                ? ((details.pending_clients / details.total_clients) * 100).toFixed(1)
                : 0
              }% من الإجمالي
            </p>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <p className="text-2xl font-bold text-red-600 mb-2">{details.inactive_clients?.toLocaleString() || 0}</p>
            <p className="text-gray-600">عملاء غير نشطين</p>
            <p className="text-xs text-gray-500 mt-1">
              {details.total_clients > 0 
                ? ((details.inactive_clients / details.total_clients) * 100).toFixed(1)
                : 0
              }% من الإجمالي
            </p>
          </div>
        </div>
      </div>

      {/* Profile Completeness Summary */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center space-x-3 space-x-reverse mb-6">
          <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
            <DocumentTextIcon className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">ملخص اكتمال الملفات الشخصية</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600 mb-2">{details.complete_profile_count?.toLocaleString() || 0}</p>
            <p className="text-gray-600">ملفات مكتملة</p>
            <p className="text-xs text-gray-500 mt-1">
              {details.total_clients > 0 
                ? ((details.complete_profile_count / details.total_clients) * 100).toFixed(1)
                : 0
              }% من الإجمالي
            </p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600 mb-2">
              {(details.total_clients - details.complete_profile_count)?.toLocaleString() || 0}
            </p>
            <p className="text-gray-600">ملفات غير مكتملة</p>
            <p className="text-xs text-gray-500 mt-1">
              {details.total_clients > 0 
                ? (((details.total_clients - details.complete_profile_count) / details.total_clients) * 100).toFixed(1)
                : 0
              }% من الإجمالي
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailsTab;
