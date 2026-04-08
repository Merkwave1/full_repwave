import React from 'react';
import { 
  TruckIcon,
  PhoneIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline';

const SuppliersTab = ({ data, loading }) => {
  if (loading || !data) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500"></div>
      </div>
    );
  }

  const suppliers = data;

  return (
    <div className="space-y-6">
      {/* Suppliers Overview */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center space-x-3 space-x-reverse mb-6">
          <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
            <TruckIcon className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">نظرة عامة على الموردين</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-600">{suppliers.total_suppliers || 0}</p>
            <p className="text-sm text-gray-600">إجمالي الموردين</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-2xl font-bold text-green-600">
              {suppliers.suppliers?.reduce((sum, supplier) => sum + supplier.product_count, 0) || 0}
            </p>
            <p className="text-sm text-gray-600">إجمالي المنتجات</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <p className="text-2xl font-bold text-purple-600">
              {suppliers.suppliers?.reduce((sum, supplier) => sum + supplier.active_products, 0) || 0}
            </p>
            <p className="text-sm text-gray-600">منتجات نشطة</p>
          </div>
        </div>
      </div>

      {/* Suppliers List */}
      {suppliers.suppliers && suppliers.suppliers.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center space-x-3 space-x-reverse mb-6">
            <div className="p-2 rounded-lg bg-green-100 text-green-600">
              <TruckIcon className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">تفاصيل الموردين</h3>
          </div>
          <div className="space-y-4">
            {suppliers.suppliers.map((supplier, index) => (
              <div key={supplier.supplier_id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">
                      {supplier.supplier_name || 'مورد غير محدد'}
                    </h4>
                    <div className="space-y-1">
                      {supplier.supplier_phone && (
                        <div className="flex items-center space-x-2 space-x-reverse text-sm text-gray-600">
                          <PhoneIcon className="w-4 h-4" />
                          <span>{supplier.supplier_phone}</span>
                        </div>
                      )}
                      {supplier.supplier_email && (
                        <div className="flex items-center space-x-2 space-x-reverse text-sm text-gray-600">
                          <EnvelopeIcon className="w-4 h-4" />
                          <span>{supplier.supplier_email}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
                      المرتبة #{index + 1}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-lg font-bold text-blue-600">{supplier.product_count}</p>
                    <p className="text-xs text-gray-500">إجمالي المنتجات</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-lg font-bold text-green-600">{supplier.active_products}</p>
                    <p className="text-xs text-gray-500">منتجات نشطة</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-lg font-bold text-purple-600">{supplier.total_inventory || 0}</p>
                    <p className="text-xs text-gray-500">وحدات المخزون</p>
                  </div>
                </div>

                {/* Progress bar for product percentage */}
                <div className="mt-4">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-600">نسبة المنتجات النشطة</span>
                    <span className="text-sm font-medium">
                      {supplier.product_count > 0 
                        ? Math.round((supplier.active_products / supplier.product_count) * 100) 
                        : 0}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{
                        width: `${supplier.product_count > 0 
                          ? (supplier.active_products / supplier.product_count) * 100 
                          : 0}%`
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {(!suppliers.suppliers || suppliers.suppliers.length === 0) && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="text-center py-8">
            <TruckIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">لا يوجد موردين</h3>
            <p className="text-gray-500">لم يتم العثور على أي موردين</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuppliersTab;
