// src/components/dashboard/tabs/clients-management/suppliers/SupplierListView.jsx
import React, { useState } from 'react';
import {
  PencilIcon,
  TrashIcon,
  EyeIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';
import Loader from '../../../../common/Loader/Loader';
import { formatCurrency } from '../../../../../utils/currency';
import Alert from '../../../../common/Alert/Alert';

export default function SupplierListView({
  suppliers,
  loading,
  error,
  searchTerm = '',
  onEditClick,
  onViewClick,
  onDeleteClick,
}) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const term = searchTerm.trim().toLowerCase();
  const filtered = suppliers.filter(supplier =>
    supplier.supplier_name?.toLowerCase().includes(term) ||
    supplier.supplier_contact_person?.toLowerCase().includes(term) ||
    supplier.supplier_phone?.toLowerCase().includes(term) ||
    supplier.supplier_email?.toLowerCase().includes(term) ||
    supplier.supplier_address?.toLowerCase().includes(term) ||
    supplier.supplier_notes?.toLowerCase().includes(term)
  );

  const sortedSuppliers = React.useMemo(() => {
    if (!sortConfig.key) return filtered;
    return [...filtered].sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      if (aValue === null || aValue === undefined) aValue = '';
      if (bValue === null || bValue === undefined) bValue = '';

      // Special handling for numeric fields
      if (sortConfig.key === 'supplier_balance') {
        const numA = parseFloat(aValue) || 0;
        const numB = parseFloat(bValue) || 0;
        return sortConfig.direction === 'asc' ? numA - numB : numB - numA;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filtered, sortConfig]);

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
      {!loading && !error && filtered.length === 0 && (
        <div className="bg-white rounded-xl shadow border border-gray-200 p-12 text-center animate-fadeIn">
          <div className="text-4xl mb-4 text-blue-300">📂</div>
          <p className="text-gray-700 text-lg font-semibold">لا توجد موردين للعرض</p>
          <p className="text-gray-500 text-sm mt-2">جرب البحث بكلمات مختلفة أو أضف موردًا جديدًا</p>
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden animate-fadeIn">
          <div className="bg-gradient-to-r from-blue-100 to-indigo-100 px-6 py-4 border-b border-gray-300">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-800">
                إجمالي الموردين:
                <span className="font-bold text-indigo-600 ml-1">{filtered.length}</span>
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
                  <th className="w-16 px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase border-r border-gray-200">#</th>
                  <SortableHeader title="اسم المورد" sortKey="supplier_name" className="min-w-[150px] border-r border-gray-200" />
                  <SortableHeader title="الشخص المسؤول" sortKey="supplier_contact_person" className="min-w-[150px] border-r border-gray-200" />
                  <SortableHeader title="الهاتف" sortKey="supplier_phone" className="min-w-[120px] border-r border-gray-200" />
                  <SortableHeader title="البريد الإلكتروني" sortKey="supplier_email" className="min-w-[200px] border-r border-gray-200" />
                  <SortableHeader title="الرصيد" sortKey="supplier_balance" className="min-w-[120px] border-r border-gray-200" />
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase min-w-[250px] border-r border-gray-200">العنوان</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase min-w-[200px] border-r border-gray-200">ملاحظات</th>
                  <th className="w-32 px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">إجراءات</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {sortedSuppliers.map((supplier, idx) => (
                  <tr key={supplier.supplier_id} className="hover:bg-gray-50 transition-all duration-150">
                    <td className="text-center px-4 py-3 border-r border-gray-200">
                      <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-1 rounded-full font-semibold">
                        {idx + 1}
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
                        {supplier.supplier_name}
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
                        {supplier.supplier_contact_person || '–'}
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
                        {supplier.supplier_phone || '–'}
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
                        {supplier.supplier_email || '–'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-900 font-semibold border-r border-gray-200">
                      <div className={`text-sm ${parseFloat(supplier.supplier_balance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(supplier.supplier_balance || 0)}
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
                        {supplier.supplier_address || '–'}
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
                        {supplier.supplier_notes || '–'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => onViewClick(supplier)}
                          className="group p-1.5 text-blue-600 hover:text-white hover:bg-blue-600 rounded-full transition-all"
                          title="عرض"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onEditClick(supplier)}
                          className="group p-1.5 text-green-600 hover:text-white hover:bg-green-600 rounded-full transition-all"
                          title="تعديل"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onDeleteClick(supplier)}
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
