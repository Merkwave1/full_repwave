import React from 'react';
import { 
  ChartBarIcon, 
  CubeIcon,
  CalendarDaysIcon,
  TagIcon,
  SparklesIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline';

const AnalyticsTab = ({ data, loading }) => {
  if (loading || !data) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500"></div>
      </div>
    );
  }

  const analytics = data;

  return (
    <div className="space-y-6">
      {/* Basic Analytics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
          <div className="p-2 rounded-lg bg-green-100 text-green-600 inline-block mb-3">
            <CubeIcon className="w-6 h-6" />
          </div>
          <p className="text-2xl font-bold text-green-600 mb-2">{analytics.total_products?.toLocaleString() || 0}</p>
          <p className="text-gray-600 text-sm">إجمالي المنتجات</p>
        </div>
      </div>

      {/* Product Status Analysis */}
      {analytics.status_analysis && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center space-x-3 space-x-reverse mb-6">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
              <ChartBarIcon className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">تحليل حالة المنتجات</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-xl font-bold text-green-600">{analytics.status_analysis.active?.toLocaleString() || 0}</p>
              <p className="text-sm text-gray-600">منتجات نشطة</p>
              <p className="text-xs text-gray-500 mt-1">{analytics.status_analysis.active_percentage || 0}% من الإجمالي</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-xl font-bold text-red-600">{analytics.status_analysis.inactive?.toLocaleString() || 0}</p>
              <p className="text-sm text-gray-600">منتجات غير نشطة</p>
              <p className="text-xs text-gray-500 mt-1">{analytics.status_analysis.inactive_percentage || 0}% من الإجمالي</p>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Analysis */}
      {analytics.inventory_analysis && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center space-x-3 space-x-reverse mb-6">
            <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
              <CubeIcon className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">تحليل المخزون</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-xl font-bold text-green-600">{analytics.inventory_analysis.in_stock?.toLocaleString() || 0}</p>
              <p className="text-sm text-gray-600">منتجات متوفرة</p>
              <p className="text-xs text-gray-500 mt-1">{analytics.inventory_analysis.stock_percentage || 0}% من الإجمالي</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-xl font-bold text-red-600">{analytics.inventory_analysis.out_of_stock?.toLocaleString() || 0}</p>
              <p className="text-sm text-gray-600">نفد المخزون</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-xl font-bold text-blue-600">{analytics.inventory_analysis.total_inventory_units?.toLocaleString() || 0}</p>
              <p className="text-sm text-gray-600">إجمالي وحدات المخزون</p>
            </div>
          </div>
        </div>
      )}

      {/* Category Analysis */}
      {analytics.category_analysis && analytics.category_analysis.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center space-x-3 space-x-reverse mb-6">
            <div className="p-2 rounded-lg bg-orange-100 text-orange-600">
              <TagIcon className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">أهم الفئات</h3>
          </div>
          <div className="space-y-4">
            {analytics.category_analysis.map((category, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">{category.category_name}</h4>
                  <p className="text-sm text-gray-600">{category.count} منتج</p>
                </div>
                <div className="flex items-center space-x-3 space-x-reverse">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-orange-600 h-2 rounded-full" 
                      style={{width: `${category.percentage}%`}}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-600">{category.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Brand Analysis */}
      {analytics.brand_analysis && analytics.brand_analysis.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center space-x-3 space-x-reverse mb-6">
            <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600">
              <SparklesIcon className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">أهم العلامات التجارية</h3>
          </div>
          <div className="space-y-4">
            {analytics.brand_analysis.map((brand, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">{brand.brand_name}</h4>
                  <p className="text-sm text-gray-600">{brand.count} منتج</p>
                </div>
                <div className="flex items-center space-x-3 space-x-reverse">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-indigo-600 h-2 rounded-full" 
                      style={{width: `${brand.percentage}%`}}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-600">{brand.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Growth Analysis */}
      {analytics.growth_analysis && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center space-x-3 space-x-reverse mb-6">
            <div className="p-2 rounded-lg bg-teal-100 text-teal-600">
              <CalendarDaysIcon className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">تحليل النمو</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 border rounded-lg">
              <p className="text-xl font-bold text-blue-600">{analytics.growth_analysis.this_month?.toLocaleString() || 0}</p>
              <p className="text-sm text-gray-600">منتجات جديدة (آخر 30 يوم)</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-xl font-bold text-green-600">{analytics.growth_analysis.last_month?.toLocaleString() || 0}</p>
              <p className="text-sm text-gray-600">منتجات جديدة (الـ30 يوم السابقة)</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="flex items-center justify-center mb-2">
                {analytics.growth_analysis.growth_rate > 0 ? (
                  <ArrowUpIcon className="w-5 h-5 text-green-500 ml-2" />
                ) : analytics.growth_analysis.growth_rate < 0 ? (
                  <ArrowDownIcon className="w-5 h-5 text-red-500 ml-2" />
                ) : null}
                <p className="text-xl font-bold text-teal-600">
                  {analytics.growth_analysis.growth_rate > 0 ? '+' : ''}{analytics.growth_analysis.growth_rate || 0}%
                </p>
              </div>
              <p className="text-sm text-gray-600">معدل النمو (30 يوم)</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsTab;
