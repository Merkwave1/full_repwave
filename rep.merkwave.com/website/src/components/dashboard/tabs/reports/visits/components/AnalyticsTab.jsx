import React from 'react';
import { 
  ChartBarIcon, 
  ClockIcon, 
  CalendarDaysIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline';

const AnalyticsTab = ({ dailyData, hourlyData }) => {
  if (!dailyData && !hourlyData) {
    return (
      <div className="p-6 text-center text-gray-500">
        لا توجد بيانات تحليلية متاحة
      </div>
    );
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ar-EG', {
      month: 'short',
      day: 'numeric'
    });
  };
  const getHourLabel = (hour) => {
  ArrowTrendingUpIcon
    if (hour === 0) return '12 ص';
    if (hour < 12) return `${hour} ص`;
    if (hour === 12) return '12 م';
    return `${hour - 12} م`;
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">تحليلات الزيارات</h2>

            <ArrowTrendingUpIcon className="h-6 w-6 text-purple-600 ml-2" />
      {dailyData && dailyData.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <CalendarDaysIcon className="h-6 w-6 text-blue-600 ml-2" />
            <h3 className="text-lg font-medium text-gray-900">الزيارات اليومية (آخر 30 يوم)</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">التاريخ</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">إجمالي الزيارات</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">مكتملة</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">ملغاة</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">متوسط المدة</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dailyData.slice(0, 10).map((day) => (
                  <tr key={day.visit_date} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatDate(day.visit_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {day.total_visits || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                      {day.completed_visits || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                      {day.cancelled_visits || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {day.avg_duration ? `${Math.round(day.avg_duration)}د` : 'غ/م'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Hourly Analytics */}
      {hourlyData && hourlyData.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <ClockIcon className="h-6 w-6 text-green-600 ml-2" />
            <h3 className="text-lg font-medium text-gray-900">توزيع الزيارات حسب الساعة (آخر 7 أيام)</h3>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {hourlyData.map((hour) => (
              <div key={hour.visit_hour} className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-lg font-bold text-blue-600">
                  {hour.total_visits || 0}
                </div>
                <div className="text-sm text-gray-600 mb-1">
                  {getHourLabel(hour.visit_hour)}
                </div>
                <div className="text-xs text-green-600">
                  {hour.completed_visits || 0} مكتملة
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {dailyData && dailyData.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <ArrowTrendingUpIcon className="h-6 w-6 text-purple-600 ml-2" />
              <h3 className="text-lg font-medium text-gray-900">إحصائيات الفترة</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">إجمالي الزيارات:</span>
                <span className="font-semibold">
                  {dailyData.reduce((sum, day) => sum + (day.total_visits || 0), 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">الزيارات المكتملة:</span>
                <span className="font-semibold text-green-600">
                  {dailyData.reduce((sum, day) => sum + (day.completed_visits || 0), 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">الزيارات الملغاة:</span>
                <span className="font-semibold text-red-600">
                  {dailyData.reduce((sum, day) => sum + (day.cancelled_visits || 0), 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">متوسط الزيارات اليومية:</span>
                <span className="font-semibold">
                  {Math.round(dailyData.reduce((sum, day) => sum + (day.total_visits || 0), 0) / dailyData.length)}
                </span>
              </div>
            </div>
          </div>
        )}

        {hourlyData && hourlyData.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <ChartBarIcon className="h-6 w-6 text-orange-600 ml-2" />
              <h3 className="text-lg font-medium text-gray-900">أوقات الذروة</h3>
            </div>
            
            <div className="space-y-4">
              {hourlyData
                .sort((a, b) => (b.total_visits || 0) - (a.total_visits || 0))
                .slice(0, 5)
                .map((hour, index) => (
                  <div key={hour.visit_hour} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                        index === 0 ? 'bg-yellow-500' : 
                        index === 1 ? 'bg-gray-400' : 
                        index === 2 ? 'bg-orange-400' : 'bg-blue-400'
                      }`}>
                        {index + 1}
                      </div>
                      <span className="mr-3">{getHourLabel(hour.visit_hour)}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{hour.total_visits || 0} زيارة</div>
                      <div className="text-sm text-green-600">{hour.completed_visits || 0} مكتملة</div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsTab;
