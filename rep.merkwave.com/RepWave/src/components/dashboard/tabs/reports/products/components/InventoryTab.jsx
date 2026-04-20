import React from "react";
import {
  CubeIcon,
  BuildingStorefrontIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";

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
          <h3 className="text-lg font-semibold text-gray-900">
            ملخص المستودعات
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {inventory.warehouses?.map((warehouse) => (
            <div
              key={warehouse.warehouse_id}
              className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-900 text-base">
                  {warehouse.warehouse_name}
                </h4>

                <span className="text-xs px-3 py-1 rounded-full bg-blue-50 text-blue-600 font-medium">
                  Warehouse
                </span>
              </div>

              {/* Main Stats */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">منتجات فريدة</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {warehouse.unique_products ||
                      warehouse.unique_variants ||
                      0}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">إجمالي الكمية</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {warehouse.total_quantity || 0}
                  </p>
                </div>
              </div>

              {/* Stock Status */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-green-50 p-3 text-center">
                  <p className="text-xs text-green-700">متوفر</p>
                  <p className="text-lg font-semibold text-green-600">
                    {warehouse.in_stock_count || 0}
                  </p>
                </div>

                <div className="rounded-xl bg-yellow-50 p-3 text-center">
                  <p className="text-xs text-yellow-700">قليل</p>
                  <p className="text-lg font-semibold text-yellow-600">
                    {warehouse.low_stock_count || 0}
                  </p>
                </div>

                <div className="rounded-xl bg-red-50 p-3 text-center">
                  <p className="text-xs text-red-700">نفد</p>
                  <p className="text-lg font-semibold text-red-600">
                    {warehouse.out_of_stock_count || 0}
                  </p>
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
            <h3 className="text-lg font-semibold text-gray-900">
              ملخص حالة المخزون
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">
                {inventory.status_summary["In Stock"]?.count || 0}
              </p>
              <p className="text-sm text-gray-600">عناصر متوفرة</p>
              <p className="text-xs text-gray-500 mt-1">
                الكمية: {inventory.status_summary["In Stock"]?.quantity || 0}
              </p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <p className="text-2xl font-bold text-yellow-600">
                {inventory.status_summary["Low Stock"]?.count || 0}
              </p>
              <p className="text-sm text-gray-600">مخزون قليل</p>
              <p className="text-xs text-gray-500 mt-1">
                الكمية: {inventory.status_summary["Low Stock"]?.quantity || 0}
              </p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-2xl font-bold text-red-600">
                {inventory.status_summary["Out of Stock"]?.count || 0}
              </p>
              <p className="text-sm text-gray-600">نفد المخزون</p>
              <p className="text-xs text-gray-500 mt-1">
                الكمية:{" "}
                {inventory.status_summary["Out of Stock"]?.quantity || 0}
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
            <h3 className="text-lg font-semibold text-gray-900">
              أعلى المنتجات من حيث المخزون
            </h3>
          </div>
          {/* ================= MOBILE CARDS ================= */}
          <div className="space-y-3 md:hidden">
            {inventory.top_products.map((product, index) => (
              <div
                key={index}
                className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
              >
                {/* Header */}
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold text-gray-900 text-sm leading-snug">
                    {product.products_name}
                  </h3>

                  <span className="text-xs text-gray-400 font-medium">
                    #{index + 1}
                  </span>
                </div>

                {/* Variant Badge */}
                <span className="inline-block mb-3 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                  {product.variant_name || "المنتج الأساسي"}
                </span>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500">إجمالي الكمية</p>
                    <p className="font-semibold text-gray-900">
                      {product.total_quantity?.toLocaleString()}
                    </p>
                  </div>

                  <div className="bg-blue-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-blue-600">المخازن</p>
                    <p className="font-semibold text-blue-700">
                      {product.warehouse_count}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ================= DESKTOP TABLE ================= */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    المنتج
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    النوع
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    إجمالي الكمية
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    عدد المخازن
                  </th>
                </tr>
              </thead>

              <tbody className="bg-white divide-y divide-gray-100">
                {inventory.top_products.map((product, index) => (
                  <tr
                    key={index}
                    className="hover:bg-gray-50 transition-colors duration-150"
                  >
                    {/* Product */}
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">
                        {product.products_name}
                      </div>
                    </td>

                    {/* Variant */}
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        {product.variant_name || "المنتج الأساسي"}
                      </span>
                    </td>

                    {/* Quantity */}
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">
                      {product.total_quantity?.toLocaleString()}
                    </td>

                    {/* Warehouses */}
                    <td className="px-6 py-4 text-center">
                      <span className="px-3 py-1 rounded-lg bg-blue-50 text-blue-600 text-sm font-medium">
                        {product.warehouse_count}
                      </span>
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
