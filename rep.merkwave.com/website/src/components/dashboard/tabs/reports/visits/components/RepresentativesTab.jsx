import React, { useState } from 'react';
import { 
  UserIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  PlayCircleIcon,
  ClockIcon,
  UserGroupIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  CalendarDaysIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline';
import useCurrency from '../../../../../../hooks/useCurrency';

const RepresentativesTab = ({ data }) => {
  const { formatCurrency: formatAppCurrency } = useCurrency();
  const [sortBy, setSortBy] = useState('total_visits');
  const [sortOrder, setSortOrder] = useState('desc');

  if (!data || !Array.isArray(data)) {
    return (
      <div className="p-6 text-center text-gray-500">
        لا توجد بيانات مندوبين متاحة
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

  const toNumber = (v) => {
    const n = typeof v === 'string' ? parseFloat(v) : v;
    return Number.isFinite(n) ? n : 0;
  };
  const formatCurrency = (amount, options) => formatAppCurrency(toNumber(amount), options);

  const formatNumber = (value, { minimumFractionDigits, maximumFractionDigits } = {}) => {
    const numeric = toNumber(value);
    return numeric.toLocaleString(undefined, {
      minimumFractionDigits,
      maximumFractionDigits
    });
  };

  const getTotalVisits = () => {
    return data.reduce((sum, rep) => sum + (rep.total_visits || 0), 0);
  };

  const getTotalRevenue = () => {
    return data.reduce((sum, rep) => sum + toNumber(rep.total_sales_from_visits), 0);
  };

  const getOverallCompletionRate = () => {
    const totalVisits = getTotalVisits();
    const totalCompleted = data.reduce((sum, rep) => sum + (rep.completed_visits || 0), 0);
    return totalVisits > 0 ? ((totalCompleted / totalVisits) * 100).toFixed(1) : 0;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <h2 className="text-xl font-semibold text-gray-900">إحصائيات المندوبين</h2>
        
        <div className="flex items-center space-x-4 space-x-reverse">
          {/* Sort Options */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="total_visits">إجمالي الزيارات</option>
            <option value="completed_visits">الزيارات المكتملة</option>
            <option value="today_visits">زيارات اليوم</option>
            <option value="unique_clients_visited">العملاء المزارين</option>
            <option value="orders_from_visits">الطلبات من الزيارات</option>
            <option value="total_sales_from_visits">المبيعات من الزيارات</option>
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
        <h3 className="text-lg font-medium text-gray-900 mb-4">ملخص عام للمندوبين</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {data.length}
            </div>
            <div className="text-sm text-gray-600">عدد المندوبين</div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">
              {formatNumber(getTotalVisits())}
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
              {formatCurrency(getTotalRevenue())}
            </div>
            <div className="text-sm text-gray-600">إجمالي المبيعات</div>
          </div>
        </div>
      </div>

      {/* Representatives Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {sortedData.map((rep) => {
          const completionRate = getCompletionRate(rep.completed_visits, rep.total_visits);
          
          return (
            <div key={rep.users_id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
              {/* Rep Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <UserIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="mr-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {rep.users_name || 'غير محدد'}
                    </h3>
                    <div className="flex items-center text-sm text-gray-500">
                      <EnvelopeIcon className="h-4 w-4 ml-1" />
                      {rep.users_email || 'لا يوجد إيميل'}
                    </div>
                  </div>
                </div>
                
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                  completionRate >= 80 ? 'bg-green-100 text-green-800' :
                  completionRate >= 60 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {completionRate}% إنجاز
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-blue-600">
                        {formatNumber(rep.total_visits || 0)}
                      </p>
                      <p className="text-xs text-gray-600">إجمالي الزيارات</p>
                    </div>
                    <DocumentTextIcon className="h-8 w-8 text-blue-400" />
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-green-600">
                        {formatNumber(rep.completed_visits || 0)}
                      </p>
                      <p className="text-xs text-gray-600">مكتملة</p>
                    </div>
                    <CheckCircleIcon className="h-8 w-8 text-green-400" />
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-yellow-600">
                        {formatNumber(rep.ongoing_visits || 0)}
                      </p>
                      <p className="text-xs text-gray-600">جارية</p>
                    </div>
                    <PlayCircleIcon className="h-8 w-8 text-yellow-400" />
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-red-600">
                        {formatNumber(rep.cancelled_visits || 0)}
                      </p>
                      <p className="text-xs text-gray-600">ملغاة</p>
                    </div>
                    <XCircleIcon className="h-8 w-8 text-red-400" />
                  </div>
                </div>
              </div>

              {/* Additional Info */}
              <div className="space-y-3 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 flex items-center">
                    <UserGroupIcon className="h-4 w-4 ml-1" />
                    العملاء المزارين
                  </span>
                  <span className="font-medium text-gray-900">
                    {formatNumber(rep.unique_clients_visited || 0)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 flex items-center">
                    <ClockIcon className="h-4 w-4 ml-1" />
                    متوسط مدة الزيارة
                  </span>
                  <span className="font-medium text-gray-900">
                    {formatDuration(rep.avg_visit_duration)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 flex items-center">
                    <CalendarDaysIcon className="h-4 w-4 ml-1" />
                    زيارات اليوم
                  </span>
                  <span className="font-medium text-gray-900">
                    {formatNumber(rep.today_visits || 0)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 flex items-center">
                    <DocumentTextIcon className="h-4 w-4 ml-1" />
                    طلبات من الزيارات
                  </span>
                  <span className="font-medium text-gray-900">
                    {formatNumber(rep.orders_from_visits || 0)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 flex items-center">
                    <CurrencyDollarIcon className="h-4 w-4 ml-1" />
                    مبيعات من الزيارات
                  </span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(rep.total_sales_from_visits || 0)}
                  </span>
                </div>
              </div>

              {/* Performance Indicators */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span>معدل الإنجاز</span>
                  <span className="font-medium">{completionRate}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      completionRate >= 80 ? 'bg-green-500' :
                      completionRate >= 60 ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${completionRate}%` }}
                  ></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {sortedData.length === 0 && (
        <div className="text-center py-12 text-gray-500 bg-white rounded-lg border border-gray-200">
          لا توجد بيانات مندوبين متاحة
        </div>
      )}

      {/* Top Performers */}
      {data.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">أفضل المندوبين أداءً</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Most Visits */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">الأكثر زيارات</h4>
              {(() => {
                const topRep = [...data].sort((a, b) => (b.total_visits || 0) - (a.total_visits || 0))[0];
                return (
                  <div>
                    <p className="text-sm text-blue-700">{topRep?.users_name || 'غير محدد'}</p>
                    <p className="text-xs text-blue-600 mt-1">{topRep?.total_visits || 0} زيارة</p>
                  </div>
                );
              })()}
            </div>
            
            {/* Best Completion Rate */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-800 mb-2">أعلى معدل إنجاز</h4>
              {(() => {
                const topRep = [...data].sort((a, b) => {
                  const aRate = getCompletionRate(a.completed_visits, a.total_visits);
                  const bRate = getCompletionRate(b.completed_visits, b.total_visits);
                  return bRate - aRate;
                })[0];
                return (
                  <div>
                    <p className="text-sm text-green-700">{topRep?.users_name || 'غير محدد'}</p>
                    <p className="text-xs text-green-600 mt-1">
                      {getCompletionRate(topRep?.completed_visits, topRep?.total_visits)}% إنجاز
                    </p>
                  </div>
                );
              })()}
            </div>
            
            {/* Highest Sales */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h4 className="font-medium text-purple-800 mb-2">أعلى مبيعات</h4>
              {(() => {
                const topRep = [...data].sort((a, b) => (b.total_sales_from_visits || 0) - (a.total_sales_from_visits || 0))[0];
                return (
                  <div>
                    <p className="text-sm text-purple-700">{topRep?.users_name || 'غير محدد'}</p>
                    <p className="text-xs text-purple-600 mt-1">
                      {formatCurrency(topRep?.total_sales_from_visits || 0)}
                    </p>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RepresentativesTab;
