import React from 'react';
import { 
  CubeIcon, 
  CalendarDaysIcon, 
  ChartBarIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline';

const OverviewTab = ({ data, loading }) => {
  if (loading || !data) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500"></div>
      </div>
    );
  }

  const overview = data;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Total Products */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center space-x-3 space-x-reverse mb-4">
          <div className="p-2 rounded-lg bg-green-100 text-green-600">
            <CubeIcon className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">إجمالي المنتجات</h3>
        </div>
        <p className="text-3xl font-bold text-green-600 mb-2">{overview.total_products?.toLocaleString() || 0}</p>
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

      {/* Active Products */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center space-x-3 space-x-reverse mb-4">
          <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
            <CubeIcon className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">المنتجات النشطة</h3>
        </div>
        <p className="text-3xl font-bold text-blue-600 mb-2">{overview.active_products?.toLocaleString() || 0}</p>
        <p className="text-gray-600 text-sm">{overview.active_percentage || 0}% من إجمالي المنتجات</p>
      </div>

      {/* Products in Stock */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center space-x-3 space-x-reverse mb-4">
          <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
            <CubeIcon className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">المنتجات المتوفرة</h3>
        </div>
        <p className="text-3xl font-bold text-purple-600 mb-2">{overview.products_in_stock?.toLocaleString() || 0}</p>
        <p className="text-gray-600 text-sm">{overview.stock_percentage || 0}% لديها مخزون</p>
      </div>

      {/* New Products Last 30 Days */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center space-x-3 space-x-reverse mb-4">
          <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600">
            <CalendarDaysIcon className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">منتجات جديدة (آخر 30 يوم)</h3>
        </div>
        <p className="text-3xl font-bold text-indigo-600 mb-2">{overview.new_this_month?.toLocaleString() || 0}</p>
        <p className="text-gray-600 text-sm">
          مقارنة بـ {overview.new_last_month || 0} في الـ30 يوم السابقة
        </p>
      </div>

      {/* Product Categories */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center space-x-3 space-x-reverse mb-4">
          <div className="p-2 rounded-lg bg-orange-100 text-orange-600">
            <ChartBarIcon className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">فئات المنتجات</h3>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">إجمالي الفئات</span>
            <span className="text-lg font-medium">{overview.total_categories?.toLocaleString() || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">العلامات التجارية</span>
            <span className="text-lg font-medium">{overview.total_brands?.toLocaleString() || 0}</span>
          </div>
        </div>
      </div>

      {/* Product Statistics Summary */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center space-x-3 space-x-reverse mb-4">
          <div className="p-2 rounded-lg bg-teal-100 text-teal-600">
            <ChartBarIcon className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">إحصائيات سريعة</h3>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">نفد المخزون</span>
            <span className="text-sm font-medium">{overview.out_of_stock?.toLocaleString() || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">غير نشط</span>
            <span className="text-sm font-medium">{overview.inactive_products?.toLocaleString() || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">قيمة المخزون الإجمالية</span>
            <span className="text-sm font-medium">{overview.total_inventory_value?.toLocaleString() || 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;
