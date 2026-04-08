import React, { useState } from 'react';
import { 
  MapPinIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  ClockIcon,
  UserGroupIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

const AreasTab = ({ data }) => {
  const [sortBy, setSortBy] = useState('total_visits');
  const [sortOrder, setSortOrder] = useState('desc');

  if (!data || !Array.isArray(data)) {
    return (
      <div className="p-6 text-center text-gray-500">
        لا توجد بيانات مناطق متاحة
      </div>
    );
  }

  // Sort data
  const sortedData = [...data].sort((a, b) => {
    const aValue = a[sortBy] || 0;
    const bValue = b[sortBy] || 0;
    
    if (sortOrder === 'desc') {
      return bValue - aValue;
    }
    return aValue - bValue;
  });

  const formatDuration = (minutes) => {
  if (minutes === null || minutes === undefined) return '1د';
  const num = Number(minutes);
  if (Number.isNaN(num) || num < 1) return '1د';
    const hours = Math.floor(num / 60);
    const mins = Math.round(num % 60);
    if (hours > 0) return `${hours}س ${mins}د`;
    return `${mins}د`;
  };

  const getCompletionRate = (completed, total) => {
    if (!total || total === 0) return 0;
    return ((completed / total) * 100).toFixed(1);
  };

  const getCancellationRate = (cancelled, total) => {
    if (!total || total === 0) return 0;
    return ((cancelled / total) * 100).toFixed(1);
  };

  const getTotalVisits = () => {
    return data.reduce((sum, area) => sum + (area.total_visits || 0), 0);
  };

  const getTotalCompleted = () => {
    return data.reduce((sum, area) => sum + (area.completed_visits || 0), 0);
  };

  const getOverallCompletionRate = () => {
    const total = getTotalVisits();
    const completed = getTotalCompleted();
    return total > 0 ? ((completed / total) * 100).toFixed(1) : 0;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <h2 className="text-xl font-semibold text-gray-900">إحصائيات المناطق</h2>
        
        <div className="flex items-center space-x-4 space-x-reverse">
          {/* Sort Options */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="total_visits">إجمالي الزيارات</option>
            <option value="completed_visits">الزيارات المكتملة</option>
            <option value="cancelled_visits">الزيارات الملغاة</option>
            <option value="unique_clients_visited">العملاء المزارين</option>
            <option value="avg_visit_duration">متوسط المدة</option>
          </select>
          
          <button
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {sortOrder === 'desc' ? '↓ تنازلي' : '↑ تصاعدي'}
          </button>
        </div>
      </div>

      {/* Overall Statistics */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">ملخص عام للمناطق</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {data.length}
            </div>
            <div className="text-sm text-gray-600">عدد المناطق</div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">
              {getTotalVisits().toLocaleString('en-US')}
            </div>
            <div className="text-sm text-gray-600">إجمالي الزيارات</div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">
              {getOverallCompletionRate()}%
            </div>
            <div className="text-sm text-gray-600">معدل الإنجاز العام</div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600 mb-2">
              {data.reduce((sum, area) => sum + (area.unique_clients_visited || 0), 0)}
            </div>
            <div className="text-sm text-gray-600">العملاء المزارين</div>
          </div>
        </div>
      </div>

      {/* Areas Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  المنطقة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  إجمالي الزيارات
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  مكتملة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ملغاة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  العملاء المزارين
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  متوسط المدة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  معدل الإنجاز
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  معدل الإلغاء
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedData.map((area, index) => {
                const completionRate = getCompletionRate(area.completed_visits, area.total_visits);
                const cancellationRate = getCancellationRate(area.cancelled_visits, area.total_visits);
                
                return (
                  <tr key={area.client_area_tag_id || index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <MapPinIcon className="h-5 w-5 text-gray-400 ml-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {area.client_area_tag_name || 'منطقة غير محددة'}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {area.client_area_tag_id}
                          </div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <ChartBarIcon className="h-4 w-4 text-blue-500 ml-2" />
                        <span className="text-sm font-medium text-gray-900">
                          {(area.total_visits || 0).toLocaleString('en-US')}
                        </span>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <CheckCircleIcon className="h-4 w-4 text-green-500 ml-2" />
                        <span className="text-sm text-gray-900">
                          {(area.completed_visits || 0).toLocaleString('en-US')}
                        </span>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <XCircleIcon className="h-4 w-4 text-red-500 ml-2" />
                        <span className="text-sm text-gray-900">
                          {(area.cancelled_visits || 0).toLocaleString('en-US')}
                        </span>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <UserGroupIcon className="h-4 w-4 text-purple-500 ml-2" />
                        <span className="text-sm text-gray-900">
                          {(area.unique_clients_visited || 0).toLocaleString('en-US')}
                        </span>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <ClockIcon className="h-4 w-4 text-orange-500 ml-2" />
                        <span className="text-sm text-gray-900">
                          {formatDuration(area.avg_visit_duration)}
                        </span>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          completionRate >= 80 ? 'bg-green-100 text-green-800' :
                          completionRate >= 60 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {completionRate}%
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          cancellationRate <= 10 ? 'bg-green-100 text-green-800' :
                          cancellationRate <= 20 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {cancellationRate}%
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {sortedData.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            لا توجد بيانات مناطق متاحة
          </div>
        )}
      </div>

      {/* Performance Insights */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">رؤى الأداء</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Best Performing Area */}
          {sortedData.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-800 mb-2">أفضل منطقة أداءً</h4>
              <p className="text-sm text-green-700">
                {sortedData[0]?.client_area_tag_name || 'غير محدد'}
              </p>
              <p className="text-xs text-green-600 mt-1">
                {sortedData[0]?.total_visits || 0} زيارة
              </p>
            </div>
          )}
          
          {/* Most Active Area */}
          {data.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">أكثر المناطق نشاطاً</h4>
              <p className="text-sm text-blue-700">
                {[...data].sort((a, b) => (b.total_visits || 0) - (a.total_visits || 0))[0]?.client_area_tag_name || 'غير محدد'}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                {[...data].sort((a, b) => (b.total_visits || 0) - (a.total_visits || 0))[0]?.total_visits || 0} زيارة
              </p>
            </div>
          )}
          
          {/* Average Stats */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h4 className="font-medium text-purple-800 mb-2">المتوسط العام</h4>
            <p className="text-sm text-purple-700">
              {data.length > 0 ? Math.round(getTotalVisits() / data.length) : 0} زيارة/منطقة
            </p>
            <p className="text-xs text-purple-600 mt-1">
              {getOverallCompletionRate()}% معدل إنجاز
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AreasTab;
