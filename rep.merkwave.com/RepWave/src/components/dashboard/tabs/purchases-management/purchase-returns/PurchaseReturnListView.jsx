// src/components/dashboard/tabs/purchases-management/purchase-returns/PurchaseReturnListView.jsx
import React from 'react';
import { EyeIcon, PrinterIcon } from '@heroicons/react/24/outline';
import Loader from '../../../../common/Loader/Loader';
import Alert from '../../../../common/Alert/Alert';
import useCurrency from '../../../../../hooks/useCurrency';

const formatDate = (dateString) => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  } catch {
    return dateString;
  }
};

// use centralized currency formatter from hook

export default function PurchaseReturnListView({ 
  returns, 
  loading, 
  error, 
  searchTerm,
  onViewDetails,
  onPrint
}) {
  const { formatCurrency: formatMoney } = useCurrency();
  if (loading) return <Loader className="mt-8" />;
  if (error) return <Alert message={error} type="error" className="mb-4" />;

  const filteredReturns = returns
    .filter(item =>
      item.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.purchase_returns_reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.purchase_returns_notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.purchase_returns_id?.toString().includes(searchTerm)
    )
    .sort((a,b)=>{
      const da = new Date(a.purchase_returns_date||0).getTime();
      const db = new Date(b.purchase_returns_date||0).getTime();
      if (db !== da) return db - da;
      return (b.purchase_returns_id||0)-(a.purchase_returns_id||0);
    });

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden animate-fadeIn">
      <div className="bg-gradient-to-r from-blue-100 to-indigo-100 px-6 py-4 border-b border-gray-300">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-800">
            إجمالي مرتجعات الشراء:
            <span className="font-bold text-indigo-600 ml-1">{filteredReturns.length}</span>
          </div>
          {searchTerm && (
            <div className="text-sm text-gray-500">
              نتائج البحث عن: "<span className="font-medium">{searchTerm}</span>"
            </div>
          )}
        </div>
      </div>

      {filteredReturns.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-lg mb-2">لا توجد مرتجعات شراء</div>
          <div className="text-gray-500 text-sm">
            {searchTerm ? 'لم يتم العثور على نتائج للبحث المحدد' : 'لم يتم إنشاء أي مرتجعات شراء بعد'}
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-16 px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase border-r border-gray-200">
                  رقم المرتجع
                </th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase border-r border-gray-200">
                  المورد
                </th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase border-r border-gray-200">
                  التاريخ
                </th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase border-r border-gray-200">
                  إجمالي المبلغ
                </th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase border-r border-gray-200">
                  السبب
                </th>
                <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filteredReturns.map((returnItem) => (
                <tr key={returnItem.purchase_returns_id} className="hover:bg-gray-50 transition-all duration-150">
                  <td className="text-center px-4 py-3 border-r border-gray-200">
                    <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-1 rounded-full font-semibold">
                      #{returnItem.purchase_returns_id}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-900 font-medium border-r border-gray-200">
                    <div className="line-clamp-2">
                      {returnItem.supplier_name || 'غير محدد'}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 border-r border-gray-200">
                    {formatDate(returnItem.purchase_returns_date)}
                  </td>
                  <td className="px-4 py-3 text-gray-600 border-r border-gray-200 font-medium">
                    {formatMoney(returnItem.purchase_returns_total_amount)}
                  </td>
                  <td className="px-4 py-3 text-gray-600 border-r border-gray-200">
                    <div className="line-clamp-2" title={returnItem.purchase_returns_reason}>
                      {returnItem.purchase_returns_reason || 'لا يوجد سبب محدد'}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => onViewDetails?.(returnItem)}
                        className="group p-1.5 text-blue-600 hover:text-white hover:bg-blue-600 rounded-full transition-all"
                        title="عرض التفاصيل"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onPrint?.(returnItem)}
                        className="group p-1.5 text-green-600 hover:text-white hover:bg-green-600 rounded-full transition-all"
                        title="طباعة"
                      >
                        <PrinterIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
