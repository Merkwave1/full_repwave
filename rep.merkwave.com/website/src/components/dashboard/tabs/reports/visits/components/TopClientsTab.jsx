import React, { useState } from 'react';
import { 
  BuildingOfficeIcon, 
  MapPinIcon, 
  CheckCircleIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  CalendarDaysIcon,
  TrophyIcon,
  StarIcon
} from '@heroicons/react/24/outline';
import useCurrency from '../../../../../../hooks/useCurrency';

const TopClientsTab = ({ data }) => {
  const { formatCurrency: formatAppCurrency } = useCurrency();
  const [sortBy, setSortBy] = useState('total_visits');
  const [sortOrder, setSortOrder] = useState('desc');

  if (!data || !Array.isArray(data)) {
    return (
      <div className="p-6 text-center text-gray-500">
        لا توجد بيانات عملاء متاحة
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

  const formatDate = (dateString) => {
    if (!dateString) return 'لم يتم تحديد';
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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

  const getCompletionRate = (completed, total) => {
    if (!total || total === 0) return 0;
    return ((completed / total) * 100).toFixed(1);
  };

  const getClientRank = (index) => {
    if (index === 0) return { icon: TrophyIcon, color: 'text-yellow-500', bg: 'bg-yellow-50' };
    if (index === 1) return { icon: StarIcon, color: 'text-gray-400', bg: 'bg-gray-50' };
    if (index === 2) return { icon: StarIcon, color: 'text-orange-400', bg: 'bg-orange-50' };
    return { icon: StarIcon, color: 'text-blue-400', bg: 'bg-blue-50' };
  };

  const getTotalStats = () => {
    return {
      totalVisits: data.reduce((sum, client) => sum + (client.total_visits || 0), 0),
      totalCompleted: data.reduce((sum, client) => sum + (client.completed_visits || 0), 0),
      totalOrders: data.reduce((sum, client) => sum + (client.total_orders || 0), 0),
  totalRevenue: data.reduce((sum, client) => sum + toNumber(client.total_revenue), 0)
    };
  };

  const totalStats = getTotalStats();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <h2 className="text-xl font-semibold text-gray-900">أهم العملاء</h2>
        
        <div className="flex items-center space-x-4 space-x-reverse">
          {/* Sort Options */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="total_visits">عدد الزيارات</option>
            <option value="completed_visits">الزيارات المكتملة</option>
            <option value="total_orders">إجمالي الطلبات</option>
            <option value="total_revenue">إجمالي المبيعات</option>
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
        <h3 className="text-lg font-medium text-gray-900 mb-4">إحصائيات إجمالية</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {data.length}
            </div>
            <div className="text-sm text-gray-600">عدد العملاء</div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">
              {formatNumber(totalStats.totalVisits)}
            </div>
            <div className="text-sm text-gray-600">إجمالي الزيارات</div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">
              {formatNumber(totalStats.totalOrders)}
            </div>
            <div className="text-sm text-gray-600">إجمالي الطلبات</div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600 mb-2">
              {formatCurrency(totalStats.totalRevenue, { withSymbol: true })}
            </div>
            <div className="text-sm text-gray-600">إجمالي المبيعات</div>
          </div>
        </div>
      </div>

      {/* Top 3 Clients Highlight */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">أفضل 3 عملاء</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {sortedData.slice(0, 3).map((client, index) => {
            const rank = getClientRank(index);
            const Icon = rank.icon;
            const completionRate = getCompletionRate(client.completed_visits, client.total_visits);
            
            return (
              <div key={client.clients_id} className={`${rank.bg} border-2 ${
                index === 0 ? 'border-yellow-200' : 
                index === 1 ? 'border-gray-200' : 
                'border-orange-200'
              } rounded-lg p-4`}>
                <div className="flex items-center justify-between mb-3">
                  <Icon className={`h-8 w-8 ${rank.color}`} />
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900">#{index + 1}</div>
                  </div>
                </div>
                
                <h4 className="font-semibold text-gray-900 mb-2 truncate">
                  {client.clients_company_name || 'غير محدد'}
                </h4>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">الزيارات:</span>
                    <span className="font-medium">{formatNumber(client.total_visits || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">المكتملة:</span>
                    <span className="font-medium text-green-600">{formatNumber(client.completed_visits || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">الطلبات:</span>
                    <span className="font-medium">{formatNumber(client.total_orders || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">الإيراد:</span>
                    <span className="font-medium">{formatCurrency(client.total_revenue)}</span>
                  </div>
                </div>
                
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex justify-between text-xs mb-1">
                    <span>معدل الإنجاز</span>
                    <span>{completionRate}%</span>
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
      </div>

      {/* All Clients Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">جميع العملاء</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الترتيب
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  العميل
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  إجمالي الزيارات
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  مكتملة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  معدل الإنجاز
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الطلبات
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  إجمالي المبيعات
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  آخر زيارة
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedData.map((client, index) => {
                const completionRate = getCompletionRate(client.completed_visits, client.total_visits);
                const rank = getClientRank(index);
                const Icon = rank.icon;
                
                return (
                  <tr key={client.clients_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`p-1 rounded-full ${rank.bg} ml-2`}>
                          <Icon className={`h-4 w-4 ${rank.color}`} />
                        </div>
                        <span className="text-sm font-medium text-gray-900">#{index + 1}</span>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <BuildingOfficeIcon className="h-5 w-5 text-gray-400 ml-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {client.clients_company_name || 'غير محدد'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {client.clients_contact_name || 'لا يوجد اسم اتصال'}
                          </div>
                          {client.clients_city && (
                            <div className="flex items-center text-xs text-gray-500 mt-1">
                              <MapPinIcon className="h-3 w-3 ml-1" />
                              {client.clients_city}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatNumber(client.total_visits || 0)}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <CheckCircleIcon className="h-4 w-4 text-green-500 ml-2" />
                        <span className="text-sm text-gray-900">
                          {formatNumber(client.completed_visits || 0)}
                        </span>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        completionRate >= 80 ? 'bg-green-100 text-green-800' :
                        completionRate >= 60 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {completionRate}%
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <DocumentTextIcon className="h-4 w-4 text-blue-500 ml-2" />
                        <span className="text-sm text-gray-900">
                          {formatNumber(client.total_orders || 0)}
                        </span>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <CurrencyDollarIcon className="h-4 w-4 text-green-500 ml-2" />
                        <span className="text-sm text-gray-900">
                          {formatCurrency(client.total_revenue)}
                        </span>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <CalendarDaysIcon className="h-4 w-4 text-gray-400 ml-2" />
                        <span className="text-sm text-gray-900">
                          {formatDate(client.last_visit)}
                        </span>
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
            لا توجد بيانات عملاء متاحة
          </div>
        )}
      </div>

      {/* Client Performance Insights */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">تحليل أداء العملاء</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Most Visited Client */}
          {sortedData.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">الأكثر زيارة</h4>
              <p className="text-sm text-blue-700 truncate">
                {[...data].sort((a, b) => (b.total_visits || 0) - (a.total_visits || 0))[0]?.clients_company_name || 'غير محدد'}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                {[...data].sort((a, b) => (b.total_visits || 0) - (a.total_visits || 0))[0]?.total_visits || 0} زيارة
              </p>
            </div>
          )}
          
          {/* Highest Revenue Client */}
          {sortedData.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-800 mb-2">أعلى إيراد</h4>
              <p className="text-sm text-green-700 truncate">
                {[...data].sort((a, b) => (b.total_revenue || 0) - (a.total_revenue || 0))[0]?.clients_company_name || 'غير محدد'}
              </p>
              <p className="text-xs text-green-600 mt-1">
                {formatCurrency([...data].sort((a, b) => (b.total_revenue || 0) - (a.total_revenue || 0))[0]?.total_revenue || 0)}
              </p>
            </div>
          )}
          
          {/* Most Orders Client */}
          {sortedData.length > 0 && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h4 className="font-medium text-purple-800 mb-2">أكثر طلبات</h4>
              <p className="text-sm text-purple-700 truncate">
                {[...data].sort((a, b) => (b.total_orders || 0) - (a.total_orders || 0))[0]?.clients_company_name || 'غير محدد'}
              </p>
              <p className="text-xs text-purple-600 mt-1">
                {[...data].sort((a, b) => (b.total_orders || 0) - (a.total_orders || 0))[0]?.total_orders || 0} طلب
              </p>
            </div>
          )}
          
          {/* Average Stats */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h4 className="font-medium text-orange-800 mb-2">المتوسط</h4>
            <p className="text-sm text-orange-700">
              {data.length > 0 ? Math.round(totalStats.totalVisits / data.length) : 0} زيارة/عميل
            </p>
            <p className="text-xs text-orange-600 mt-1">
              {data.length > 0 ? formatCurrency(totalStats.totalRevenue / data.length) : formatCurrency(0)} /عميل
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopClientsTab;
