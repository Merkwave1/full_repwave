// src/components/dashboard/tabs/inventory-management/Warehouses/WarehouseListView.jsx
import React, { useState } from 'react';
import {
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';
import Loader from '../../../../common/Loader/Loader';
import Alert from '../../../../common/Alert/Alert';

export default function WarehouseListView({
  warehouses, // This will be the already filtered warehouses from WarehousesTab
  loading,
  error,
  searchTerm = '', // Passed from WarehousesTab for display
  onEdit,
  onDelete,
  onViewDetails,
  getUserName, // Helper function to get user name by ID
}) {
  // Default to sorting by warehouse_id ascending so newest/lowest ids appear in order
  const [sortConfig, setSortConfig] = useState({ key: 'warehouse_id', direction: 'asc' });

  const sortedWarehouses = React.useMemo(() => {
    if (!sortConfig.key) return warehouses;
    return [...warehouses].sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [warehouses, sortConfig]);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const SortableHeader = ({ title, sortKey, className = "" }) => (
    <th
      className={`px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors ${className}`}
      onClick={() => handleSort(sortKey)}
    >
      <div className="flex items-center justify-between">
        <span>{title}</span>
        {sortConfig.key === sortKey && (
          sortConfig.direction === 'asc' ?
            <ChevronUpIcon className="h-4 w-4 text-gray-500" /> :
            <ChevronDownIcon className="h-4 w-4 text-gray-500" />
        )}
      </div>
    </th>
  );

  if (loading) return <Loader className="mt-8" />;
  if (error) return <Alert message={error} type="error" className="mb-4" />;

  return (
    <>
      {!loading && !error && warehouses.length === 0 && (
        <div className="bg-white rounded-xl shadow border border-gray-200 p-12 text-center animate-fadeIn">
          <div className="text-4xl mb-4 text-blue-300">📂</div>
          <p className="text-gray-700 text-lg font-semibold">لا توجد مخازن لعرضها</p>
          <p className="text-gray-500 text-sm mt-2">جرب البحث بكلمات مختلفة أو أضف مخزنًا جديدًا</p>
        </div>
      )}

      {!loading && !error && warehouses.length > 0 && (
        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden animate-fadeIn">
          <div className="bg-gradient-to-r from-blue-100 to-indigo-100 px-6 py-4 border-b border-gray-300">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-800">
                إجمالي المخازن:
                <span className="font-bold text-indigo-600 ml-1">{warehouses.length}</span>
              </div>
              {searchTerm && (
                <div className="text-sm text-gray-500">
                  نتائج البحث عن: "<span className="font-medium">{searchTerm}</span>"
                </div>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <SortableHeader title="ID" sortKey="warehouse_id" className="w-16 text-center border-r border-gray-200" />
                  <SortableHeader title="الاسم" sortKey="warehouse_name" className="min-w-[150px] border-r border-gray-200" />
                  <SortableHeader title="النوع" sortKey="warehouse_type" className="min-w-[100px] border-r border-gray-200" />
                  <SortableHeader title="الكود" sortKey="warehouse_code" className="min-w-[100px] border-r border-gray-200" />
                  <SortableHeader title="العنوان" sortKey="warehouse_address" className="min-w-[200px] border-r border-gray-200" />
                  <SortableHeader title="الشخص المسؤول" sortKey="warehouse_contact_person" className="min-w-[150px] border-r border-gray-200" />
                  <SortableHeader title="الحالة" sortKey="warehouse_status" className="min-w-[80px] border-r border-gray-200" />
                  <th className="w-32 px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {sortedWarehouses.map((warehouse, idx) => (
                  <tr key={warehouse.warehouse_id} className="hover:bg-gray-50 transition-all duration-150">
                    <td className="text-center px-4 py-3 border-r border-gray-200">
                      <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-1 rounded-full font-semibold">
                        {warehouse.warehouse_id}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-900 font-medium border-r border-gray-200">
                      <div className="line-clamp-2" style={{
                        display: '-webkit-box',
                        WebkitBoxOrient: 'vertical',
                        WebkitLineClamp: 2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        wordBreak: 'break-word',
                      }}>
                        {warehouse.warehouse_name}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 border-r border-gray-200">
                      <div className="line-clamp-2" style={{
                        display: '-webkit-box',
                        WebkitBoxOrient: 'vertical',
                        WebkitLineClamp: 2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        wordBreak: 'break-word',
                      }}>
                        {warehouse.warehouse_type || '–'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 border-r border-gray-200">
                      <div className="line-clamp-2" style={{
                        display: '-webkit-box',
                        WebkitBoxOrient: 'vertical',
                        WebkitLineClamp: 2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        wordBreak: 'break-word',
                      }}>
                        {warehouse.warehouse_code || '–'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 border-r border-gray-200">
                      <div className="line-clamp-2" style={{
                        display: '-webkit-box',
                        WebkitBoxOrient: 'vertical',
                        WebkitLineClamp: 2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        wordBreak: 'break-word',
                      }}>
                        {warehouse.warehouse_address || '–'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 border-r border-gray-200">
                      <div className="line-clamp-2" style={{
                        display: '-webkit-box',
                        WebkitBoxOrient: 'vertical',
                        WebkitLineClamp: 2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        wordBreak: 'break-word',
                      }}>
                        {getUserName ? getUserName(warehouse.warehouse_representative_user_id) : '–'}
                      </div>
                    </td>
                    <td className="px-4 py-3 border-r border-gray-200"> {/* Removed text-center */}
                      <span className={`font-semibold text-xs px-2 py-1 rounded-full ${
                        warehouse.warehouse_status === 'Active' 
                          ? 'bg-green-100 text-green-700' 
                          : warehouse.warehouse_status === 'Inactive'
                          ? 'bg-red-100 text-red-700'
                          : warehouse.warehouse_status === 'Under Maintenance'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {warehouse.warehouse_status === 'Active' 
                          ? 'نشط' 
                          : warehouse.warehouse_status === 'Inactive'
                          ? 'غير نشط'
                          : warehouse.warehouse_status === 'Under Maintenance'
                          ? 'تحت الصيانة'
                          : warehouse.warehouse_status || '–'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => onViewDetails(warehouse)}
                          className="group p-1.5 text-blue-600 hover:text-white hover:bg-blue-600 rounded-full transition-all"
                          title="عرض"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onEdit(warehouse)}
                          className="group p-1.5 text-green-600 hover:text-white hover:bg-green-600 rounded-full transition-all"
                          title="تعديل"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onDelete(warehouse)}
                          className="group p-1.5 text-red-600 hover:text-white hover:bg-red-600 rounded-full transition-all"
                          title="حذف"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
