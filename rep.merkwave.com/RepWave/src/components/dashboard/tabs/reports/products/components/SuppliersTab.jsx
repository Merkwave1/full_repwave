import React from "react";
import {
  TruckIcon,
  PhoneIcon,
  EnvelopeIcon,
} from "@heroicons/react/24/outline";

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
          <h3 className="text-lg font-semibold text-gray-900">
            نظرة عامة على الموردين
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-600">
              {suppliers.total_suppliers || 0}
            </p>
            <p className="text-sm text-gray-600">إجمالي الموردين</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-2xl font-bold text-green-600">
              {suppliers.suppliers?.reduce(
                (sum, supplier) => sum + supplier.product_count,
                0,
              ) || 0}
            </p>
            <p className="text-sm text-gray-600">إجمالي المنتجات</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <p className="text-2xl font-bold text-purple-600">
              {suppliers.suppliers?.reduce(
                (sum, supplier) => sum + supplier.active_products,
                0,
              ) || 0}
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
            <h3 className="text-lg font-semibold text-gray-900">
              تفاصيل الموردين
            </h3>
          </div>
          <div className="sm:grid flex flex-col gap-4 items-center sm:grid-cols-2 xl:grid-cols-3">
            {suppliers.suppliers.map((supplier, index) => {
              const activePercentage =
                supplier.product_count > 0
                  ? Math.round(
                      (supplier.active_products / supplier.product_count) * 100,
                    )
                  : 0;

              return (
                <div
                  key={supplier.supplier_id}
                  className="bg-white border border-gray-200 rounded-2xl p-3 sm:p-5 shadow-sm hover:shadow-md transition-all duration-200"
                >
                  {/* ===== Header ===== */}
                  <div className="flex justify-between items-start mb-3 sm:mb-4 gap-2">
                    <div className="min-w-0">
                      <h4 className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                        {supplier.supplier_name || "مورد غير محدد"}
                      </h4>

                      <div className="mt-1.5 space-y-1">
                        {supplier.supplier_phone && (
                          <div className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-600">
                            <PhoneIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 shrink-0" />
                            <span className="truncate">
                              {supplier.supplier_phone}
                            </span>
                          </div>
                        )}

                        {supplier.supplier_email && (
                          <div className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-600">
                            <EnvelopeIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 shrink-0" />
                            <span className="truncate">
                              {supplier.supplier_email}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Rank Badge */}
                    <span className="text-xs font-semibold bg-blue-50 text-blue-600 px-2 sm:px-3 py-1 rounded-full shrink-0">
                      #{index + 1}
                    </span>
                  </div>

                  {/* ===== Stats ===== */}
                  <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-3 sm:mb-5">
                    <div className="bg-blue-50 rounded-xl p-2 sm:p-3 text-center">
                      <p className="text-base sm:text-lg font-semibold text-blue-600">
                        {supplier.product_count}
                      </p>
                      <p className="text-xs text-gray-500 leading-tight mt-0.5">
                        إجمالي المنتجات
                      </p>
                    </div>

                    <div className="bg-green-50 rounded-xl p-2 sm:p-3 text-center">
                      <p className="text-base sm:text-lg font-semibold text-green-600">
                        {supplier.active_products}
                      </p>
                      <p className="text-xs text-gray-500 leading-tight mt-0.5">
                        منتجات نشطة
                      </p>
                    </div>

                    <div className="bg-purple-50 rounded-xl p-2 sm:p-3 text-center">
                      <p className="text-base sm:text-lg font-semibold text-purple-600">
                        {supplier.total_inventory || 0}
                      </p>
                      <p className="text-xs text-gray-500 leading-tight mt-0.5">
                        وحدات المخزون
                      </p>
                    </div>
                  </div>

                  {/* ===== Progress ===== */}
                  <div>
                    <div className="flex justify-between text-xs sm:text-sm mb-1.5 sm:mb-2">
                      <span className="text-gray-600">
                        نسبة المنتجات النشطة
                      </span>
                      <span className="font-semibold text-gray-900">
                        {activePercentage}%
                      </span>
                    </div>

                    <div className="w-full bg-gray-100 rounded-full h-2 sm:h-2.5 overflow-hidden">
                      <div
                        className="bg-green-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${activePercentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {(!suppliers.suppliers || suppliers.suppliers.length === 0) && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="text-center py-8">
            <TruckIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              لا يوجد موردين
            </h3>
            <p className="text-gray-500">لم يتم العثور على أي موردين</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuppliersTab;
