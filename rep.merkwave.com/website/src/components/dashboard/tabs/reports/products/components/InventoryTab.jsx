import React from 'react';
import { 
  CubeIcon,
  BuildingStorefrontIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

const InventoryTab = ({ data, loading }) => {
  if (loading || !data) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500"></div>
      </div>
    );
  }

  const inventory = data;

  return (
    <div className="space-y-6">
      {/* Warehouse Summary */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center space-x-3 space-x-reverse mb-6">
          <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
            <BuildingStorefrontIcon className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">ملخص المستودعات</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {inventory.warehouses?.map((warehouse, index) => (
            <div key={warehouse.warehouse_id} className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">{warehouse.warehouse_name}</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600 text-sm">منتجات فريدة</span>
                  <span className="text-sm font-medium">{warehouse.unique_products || warehouse.unique_variants || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 text-sm">إجمالي الكمية</span>
                  <span className="text-sm font-medium">{warehouse.total_quantity || 0}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3">
                  <div className="text-center">
                    <p className="text-xs text-gray-500">متوفر</p>
                    <p className="text-sm font-medium text-green-600">{warehouse.in_stock_count || 0}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500">قليل</p>
                    <p className="text-sm font-medium text-yellow-600">{warehouse.low_stock_count || 0}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500">نفد</p>
                    <p className="text-sm font-medium text-red-600">{warehouse.out_of_stock_count || 0}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Inventory Status Summary */}
      {inventory.status_summary && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center space-x-3 space-x-reverse mb-6">
            <div className="p-2 rounded-lg bg-green-100 text-green-600">
              <ChartBarIcon className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">ملخص حالة المخزون</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">
                {inventory.status_summary['In Stock']?.count || 0}
              </p>
              <p className="text-sm text-gray-600">عناصر متوفرة</p>
              <p className="text-xs text-gray-500 mt-1">
                الكمية: {inventory.status_summary['In Stock']?.quantity || 0}
              </p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <p className="text-2xl font-bold text-yellow-600">
                {inventory.status_summary['Low Stock']?.count || 0}
              </p>
              <p className="text-sm text-gray-600">مخزون قليل</p>
              <p className="text-xs text-gray-500 mt-1">
                الكمية: {inventory.status_summary['Low Stock']?.quantity || 0}
              </p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-2xl font-bold text-red-600">
                {inventory.status_summary['Out of Stock']?.count || 0}
              </p>
              <p className="text-sm text-gray-600">نفد المخزون</p>
              <p className="text-xs text-gray-500 mt-1">
                الكمية: {inventory.status_summary['Out of Stock']?.quantity || 0}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Top Products by Inventory */}
      {inventory.top_products && inventory.top_products.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center space-x-3 space-x-reverse mb-6">
            <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
              <CubeIcon className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">أعلى المنتجات من حيث المخزون</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    المنتج
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الوصف
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    إجمالي الكمية
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    عدد المستودعات
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {inventory.top_products.map((product, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {product.products_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.variant_name || 'المنتج الأساسي'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.total_quantity?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.warehouse_count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryTab;
