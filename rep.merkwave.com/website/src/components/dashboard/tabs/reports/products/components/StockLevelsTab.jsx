import React from 'react';
import { 
  ExclamationTriangleIcon,
  ChartBarIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

const StockLevelsTab = ({ data, loading }) => {
  if (loading || !data) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500"></div>
      </div>
    );
  }

  const stockLevels = data;

  return (
    <div className="space-y-6">
      {/* Stock Status Summary */}
      {stockLevels.stock_summary && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center space-x-3 space-x-reverse mb-6">
            <div className="p-2 rounded-lg bg-red-100 text-red-600">
              <ChartBarIcon className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">ملخص مستويات المخزون</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">
                {stockLevels.stock_summary['In Stock'] || 0}
              </p>
              <p className="text-sm text-gray-600">عناصر متوفرة</p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <p className="text-2xl font-bold text-yellow-600">
                {stockLevels.stock_summary['Low Stock'] || 0}
              </p>
              <p className="text-sm text-gray-600">مخزون منخفض</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-2xl font-bold text-red-600">
                {stockLevels.stock_summary['Out of Stock'] || 0}
              </p>
              <p className="text-sm text-gray-600">نفد المخزون</p>
            </div>
          </div>
        </div>
      )}

      {/* Low Stock Alert */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center space-x-3 space-x-reverse mb-6">
          <div className="p-2 rounded-lg bg-yellow-100 text-yellow-600">
            <ExclamationTriangleIcon className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">تنبيهات المخزون</h3>
          <div className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded">
            {stockLevels.total_low_stock || 0} عنصر يحتاج انتباه
          </div>
        </div>
        
        {stockLevels.low_stock_items && stockLevels.low_stock_items.length > 0 ? (
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
                    المستودع
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الكمية
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الحالة
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    آخر حركة
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stockLevels.low_stock_items.map((item, index) => (
                  <tr key={index} className={item.inventory_status === 'Out of Stock' ? 'bg-red-50' : 'bg-yellow-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.products_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.variant_name || 'المنتج الأساسي'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.warehouse_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.inventory_quantity?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        item.inventory_status === 'Out of Stock' 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {item.inventory_status === 'Out of Stock' ? 'نفد المخزون' : 'مخزون منخفض'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center space-x-1 space-x-reverse">
                        <ClockIcon className="w-4 h-4" />
                        <span>
                          {item.inventory_last_movement_at 
                            ? new Date(item.inventory_last_movement_at).toLocaleDateString('ar-EG')
                            : 'غير محدد'
                          }
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <ExclamationTriangleIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد تنبيهات مخزون</h3>
            <p className="text-gray-500">جميع المنتجات لديها مستويات مخزون مناسبة</p>
          </div>
        )}
      </div>

      {/* Action Recommendations */}
      {stockLevels.low_stock_items && stockLevels.low_stock_items.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center space-x-3 space-x-reverse mb-6">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
              <ChartBarIcon className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">توصيات الإجراءات</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-semibold text-red-800 mb-2">منتجات نفد مخزونها</h4>
              <p className="text-sm text-red-700 mb-3">
                {stockLevels.stock_summary['Out of Stock'] || 0} منتج نفد مخزونه ويحتاج إعادة طلب فورية
              </p>
              <button className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700 transition-colors">
                عرض قائمة إعادة الطلب
              </button>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-semibold text-yellow-800 mb-2">منتجات مخزونها منخفض</h4>
              <p className="text-sm text-yellow-700 mb-3">
                {stockLevels.stock_summary['Low Stock'] || 0} منتج لديه مخزون منخفض ويحتاج مراقبة
              </p>
              <button className="bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-yellow-700 transition-colors">
                جدولة إعادة الطلب
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockLevelsTab;
