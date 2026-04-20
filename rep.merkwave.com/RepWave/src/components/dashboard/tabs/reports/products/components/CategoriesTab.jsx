import React from 'react';
import { 
  TagIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

const CategoriesTab = ({ data, loading }) => {
  if (loading || !data) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500"></div>
      </div>
    );
  }

  const categories = data;

  return (
    <div className="space-y-6">
      {/* Categories Overview */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center space-x-3 space-x-reverse mb-6">
          <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
            <TagIcon className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">نظرة عامة على الفئات</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-600">{categories.total_categories || 0}</p>
            <p className="text-sm text-gray-600">إجمالي الفئات</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-2xl font-bold text-green-600">
              {categories.categories?.reduce((sum, cat) => sum + cat.active_count, 0) || 0}
            </p>
            <p className="text-sm text-gray-600">منتجات نشطة</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <p className="text-2xl font-bold text-purple-600">
              {categories.categories?.reduce((sum, cat) => sum + cat.total_inventory, 0) || 0}
            </p>
            <p className="text-sm text-gray-600">إجمالي وحدات المخزون</p>
          </div>
        </div>
      </div>

      {/* Categories Details */}
      {categories.categories && categories.categories.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center space-x-3 space-x-reverse mb-6">
            <div className="p-2 rounded-lg bg-green-100 text-green-600">
              <ChartBarIcon className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">تفاصيل الفئات</h3>
          </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {categories.categories.map((category, index) => (
            <div
              key={index}
              className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200"
            >
              {/* ===== Header ===== */}
              <div className="flex items-start justify-between mb-4 gap-3">
                <h4 className="text-base font-semibold text-gray-900 leading-snug">
                  {category.category_name}
                </h4>

                <span className="text-xs font-medium text-gray-500">
                  {category.percentage || 0}%
                </span>
              </div>

              {/* ===== Progress Bar ===== */}
              <div className="w-full bg-gray-100 rounded-full h-2.5 mb-5 overflow-hidden">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${category.percentage || 0}%` }}
                />
              </div>

              {/* ===== Stats Grid ===== */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-semibold text-blue-600">
                    {category.product_count}
                  </p>
                  <p className="text-xs text-gray-500">إجمالي المنتجات</p>
                </div>

                <div className="bg-green-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-semibold text-green-600">
                    {category.active_count}
                  </p>
                  <p className="text-xs text-gray-500">منتجات نشطة</p>
                </div>

                <div className="bg-red-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-semibold text-red-600">
                    {category.inactive_count}
                  </p>
                  <p className="text-xs text-gray-500">منتجات غير نشطة</p>
                </div>

                <div className="bg-purple-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-semibold text-purple-600">
                    {category.total_inventory}
                  </p>
                  <p className="text-xs text-gray-500">وحدات المخزون</p>
                </div>
              </div>

              {/* ===== Footer ===== */}
              <div className="mt-5 pt-4 border-t flex justify-between items-center">
                <span className="text-sm text-gray-600">إجمالي المخزون</span>

                <span className="text-sm font-semibold text-gray-900">
                  {category.total_inventory?.toLocaleString()} وحدة
                </span>
              </div>
            </div>
          ))}
        </div>
        </div>
      )}

      {/* Empty State */}
      {(!categories.categories || categories.categories.length === 0) && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="text-center py-8">
            <TagIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد فئات</h3>
            <p className="text-gray-500">لم يتم العثور على أي فئات منتجات</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoriesTab;
