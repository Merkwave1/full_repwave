// src/components/dashboard/tabs/sales-management/sales-returns/SalesReturnListView.jsx
import React, { useMemo, useState } from 'react';
import { EyeIcon, PencilIcon, PrinterIcon, ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import useCurrency from '../../../../../hooks/useCurrency.js';
import { formatCurrency } from '../../../../../utils/currency.js';

export default function SalesReturnListView({ 
  returns, 
  onEdit, 
  onViewDetails, 
  onPrint,
  statusOptions,
  clients = [],
  searchTerm
}) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const { symbol } = useCurrency();

  const getStatusDisplay = (status) => {
    const statusOption = statusOptions.find(opt => opt.value === status);
    return statusOption ? statusOption.label : status;
  };

  const getStatusColor = (status) => {
    const colors = {
      'Draft': 'bg-gray-100 text-gray-800',
      'Pending': 'bg-yellow-100 text-yellow-800',
      'Approved': 'bg-blue-100 text-blue-800',
      'Rejected': 'bg-red-100 text-red-800',
      'Processed': 'bg-green-100 text-green-800',
      'Cancelled': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // Build a map from client id -> company name from cached clients (stored in localStorage and provided via props)
  const clientNameMap = useMemo(() => {
    const map = new Map();
    (clients || []).forEach(c => {
      const id = c.clients_id || c.id;
      const name = c.clients_company_name || c.company_name || c.name;
      if (id && name) map.set(Number(id), name);
    });
    return map;
  }, [clients]);

  const getClientName = (item) => {
    // Prefer direct name from API if provided
    if (item.clients_company_name) return item.clients_company_name;
    if (item.returns_client_name) return item.returns_client_name;
    if (item.client_name) return item.client_name;

    // Fallback: lookup by client id from cached clients
    const id = Number(item.returns_client_id || item.client_id);
    if (id && clientNameMap.has(id)) return clientNameMap.get(id);

    return 'غير محدد';
  };

  // Sort functionality similar to SalesOrderListView
  const sortedReturns = React.useMemo(() => {
    if (!sortConfig.key) return returns;
    return [...returns].sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      if (aValue === null || aValue === undefined) aValue = '';
      if (bValue === null || bValue === undefined) bValue = '';

      // Special handling for numeric fields like amounts
      if (sortConfig.key === 'returns_total_amount') {
        const aNum = parseFloat(aValue) || 0;
        const bNum = parseFloat(bValue) || 0;
        return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [returns, sortConfig]);

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

  if (!returns.length) {
    return (
      <div className="bg-white rounded-xl shadow border border-gray-200 p-12 text-center animate-fadeIn">
        <div className="text-4xl mb-4 text-blue-300">📋</div>
        <p className="text-gray-700 text-lg font-semibold">لا توجد مرتجعات بيع لعرضها</p>
        <p className="text-gray-500 text-sm mt-2">جرب البحث بكلمات مختلفة أو أضف مرتجع بيع جديد</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden animate-fadeIn">
      <div className="bg-gradient-to-r from-blue-100 to-indigo-100 px-6 py-4 border-b border-gray-300">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-800">
            إجمالي المرتجعات:
            <span className="font-bold text-indigo-600 ml-1">{returns.length}</span>
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
              <SortableHeader title="رقم المرتجع" sortKey="returns_id" className="min-w-[100px] border-r border-gray-200" />
              <SortableHeader title="العميل" sortKey="client_name" className="min-w-[160px] border-r border-gray-200" />
              <SortableHeader title="عدد المنتجات" sortKey="items_count" className="min-w-[100px] border-r border-gray-200" />
              <SortableHeader title="التاريخ" sortKey="returns_return_date" className="min-w-[100px] border-r border-gray-200" />
              <SortableHeader title="الحالة" sortKey="returns_status" className="min-w-[100px] border-r border-gray-200" />
              <SortableHeader title={`الإجمالي (${symbol})`} sortKey="returns_total_amount" className="min-w-[120px] border-r border-gray-200" />
              <th className="w-56 px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {sortedReturns.map((returnItem, index) => (
              <tr key={returnItem.returns_id || returnItem.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-4 text-center text-sm text-gray-500 font-medium border-r border-gray-100">
                  {index + 1}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border-r border-gray-100">
                  #{returnItem.returns_return_number || returnItem.return_number || returnItem.returns_id}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-100">
                  <div className="font-medium">{getClientName(returnItem)}</div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-100">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {returnItem.items_count || returnItem.total_items || 0} منتج
                  </span>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 border-r border-gray-100">
                  {new Date(returnItem.returns_return_date || returnItem.return_date).toLocaleDateString('en-GB')}
                </td>
                <td className="px-4 py-4 whitespace-nowrap border-r border-gray-100">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(returnItem.returns_status || returnItem.status)}`}>
                    {getStatusDisplay(returnItem.returns_status || returnItem.status)}
                  </span>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-100">
                  <div className="font-medium text-green-600">
                    {formatCurrency(returnItem.returns_total_amount || returnItem.total_amount || 0)}
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex items-center justify-center space-x-2 space-x-reverse">
                    <button
                      onClick={() => onViewDetails(returnItem)}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                      title="عرض التفاصيل"
                    >
                      <EyeIcon className="h-4 w-4 ml-1" />
                      عرض
                    </button>
                    {/* Hide edit button if status is "Processed" (مُعالج) */}
                    {(returnItem.returns_status !== 'Processed' && returnItem.status !== 'Processed') && (
                      <button
                        onClick={() => onEdit(returnItem)}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                        title="تعديل"
                      >
                        <PencilIcon className="h-4 w-4 ml-1" />
                        تعديل
                      </button>
                    )}
                    {onPrint && (
                      <button
                        onClick={() => onPrint(returnItem)}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                        title="طباعة"
                      >
                        <PrinterIcon className="h-4 w-4 ml-1" />
                        طباعة
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
