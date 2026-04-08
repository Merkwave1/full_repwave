import React from 'react';
import { 
  BuildingOfficeIcon, 
  UserGroupIcon, 
  ChartBarIcon
} from '@heroicons/react/24/outline';

const IndustriesTab = ({ data, loading }) => {
  if (loading || !data) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const industries = data;

  return (
    <div className="space-y-6">
      {/* Industries Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
          <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600 inline-block mb-3">
            <BuildingOfficeIcon className="w-6 h-6" />
          </div>
          <p className="text-2xl font-bold text-indigo-600 mb-2">{industries.total_industries?.toLocaleString() || 0}</p>
          <p className="text-gray-600 text-sm">إجمالي الصناعات</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
          <div className="p-2 rounded-lg bg-green-100 text-green-600 inline-block mb-3">
            <UserGroupIcon className="w-6 h-6" />
          </div>
          <p className="text-2xl font-bold text-green-600 mb-2">{industries.clients_with_industries?.toLocaleString() || 0}</p>
          <p className="text-gray-600 text-sm">عملاء لديهم صناعات</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
          <div className="p-2 rounded-lg bg-orange-100 text-orange-600 inline-block mb-3">
            <ChartBarIcon className="w-6 h-6" />
          </div>
          <p className="text-2xl font-bold text-orange-600 mb-2">{industries.avg_clients_per_industry?.toFixed(1) || '0.0'}</p>
          <p className="text-gray-600 text-sm">متوسط العملاء لكل صناعة</p>
        </div>
      </div>

      {/* Industry Distribution */}
      {industries.industry_distribution && industries.industry_distribution.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center space-x-3 space-x-reverse mb-6">
            <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600">
              <BuildingOfficeIcon className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">توزيع العملاء حسب الصناعات</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {industries.industry_distribution.map((industry, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-gray-900">{industry.industry_name}</span>
                  <span className="text-sm font-bold text-indigo-600">{industry.client_count?.toLocaleString() || 0}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-indigo-600 h-2 rounded-full" 
                    style={{width: `${industry.percentage || 0}%`}}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 mt-1">{industry.percentage || 0}% من إجمالي العملاء</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Industry Analysis */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center space-x-3 space-x-reverse mb-6">
          <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
            <BuildingOfficeIcon className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">التحليل التفصيلي للصناعات</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <p className="text-xl font-bold text-purple-600">{industries.clients_with_industries?.toLocaleString() || 0}</p>
            <p className="text-sm text-gray-600">عملاء لديهم صناعات محددة</p>
            <p className="text-xs text-gray-500 mt-1">
              {industries.total_clients > 0 
                ? ((industries.clients_with_industries / industries.total_clients) * 100).toFixed(1)
                : 0
              }% من إجمالي العملاء
            </p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-orange-600">{industries.clients_without_industries?.toLocaleString() || 0}</p>
            <p className="text-sm text-gray-600">عملاء بدون صناعات</p>
            <p className="text-xs text-gray-500 mt-1">
              {industries.total_clients > 0 
                ? ((industries.clients_without_industries / industries.total_clients) * 100).toFixed(1)
                : 0
              }% من إجمالي العملاء
            </p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-blue-600">{industries.most_popular_industry || 'غير محدد'}</p>
            <p className="text-sm text-gray-600">الصناعة الأكثر شيوعاً</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IndustriesTab;
