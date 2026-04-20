// src/components/dashboard/tabs/safe-management/safes/SafeListView.jsx
import React from 'react';
import { 
  PencilIcon, 
  TrashIcon,
  ArchiveBoxIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline';

import Loader from '../../../../common/Loader/Loader';
import Alert from '../../../../common/Alert/Alert';
import { PAYMENT_METHOD_ICONS, PAYMENT_METHOD_COLORS } from '../../../../../constants/paymentMethods';
import { getSafeColorConfig } from '../../../../../constants/safeColors';
import { formatLocalDateTime } from '../../../../../utils/dateUtils';

const SafeListView = ({ 
  safes, 
  loading, 
  error, 
  searchTerm, 
  onEdit, 
  onDelete, 
  formatCurrency 
}) => {
  const filtered = safes.filter(safe =>
    safe.safes_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    safe.safes_description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    safe.rep_user_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <Loader className="mt-8" />;
  if (error) return <Alert message={error} type="error" className="mb-4" />;

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200" dir="rtl">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                نوع الخزنة
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                اسم الخزنة
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                اللون
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                الوصف
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                الرصيد الحالي
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                مندوب المبيعات
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                طريقة الدفع
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                الحالة
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                تاريخ الإنشاء
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                الإجراءات
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filtered.map((safe) => (
              <tr key={safe.safes_id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-900 font-medium border-r border-gray-200">
                  <div className="flex items-center gap-2">
                    {safe.safes_type === 'company' ? (
                      <div className="flex items-center gap-2">
                        <ArchiveBoxIcon className="h-5 w-5 text-purple-600" />
                        <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2 py-1 rounded-full">
                          خزنة الشركة
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <ArchiveBoxIcon className="h-5 w-5 text-blue-600" />
                        <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                          خزنة مندوب
                        </span>
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-900 font-medium border-r border-gray-200">
                  <div className="flex items-center gap-2">
                    <ArchiveBoxIcon className="h-5 w-5 text-blue-600" />
                    {safe.safes_name}
                  </div>
                </td>
                <td className="px-4 py-3 border-r border-gray-200">
                  {(() => {
                    const colorConfig = getSafeColorConfig(safe.safes_color);
                    return (
                      <div className="flex items-center justify-center gap-2">
                        <div 
                          className={`w-8 h-8 rounded-lg ${colorConfig.bgClass} ${colorConfig.borderClass} border-2 shadow-sm`}
                          title={colorConfig.label}
                        />
                        <span className="text-xs text-gray-600">{colorConfig.label}</span>
                      </div>
                    );
                  })()}
                </td>
                <td className="px-4 py-3 text-gray-600 border-r border-gray-200">
                  {safe.safes_description || 'لا يوجد وصف'}
                </td>
                <td className="px-4 py-3 border-r border-gray-200">
                  <div className="flex items-center gap-2">
                    <BanknotesIcon className="h-4 w-4 text-green-600" />
                    <span className={`font-bold ${
                      parseFloat(safe.safes_balance || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(safe.safes_balance || 0)}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600 border-r border-gray-200">
                  {safe.rep_name || (safe.safes_type === 'company' ? 'الشركة الرئيسية' : 'غير محدد')}
                </td>
                <td className="px-4 py-3 border-r border-gray-200">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {PAYMENT_METHOD_ICONS[safe.payment_method_type] || '💳'}
                    </span>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      PAYMENT_METHOD_COLORS[safe.payment_method_type] || 'text-gray-600 bg-gray-100'
                    }`}>
                      {safe.payment_method_name || 'غير محدد'}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 border-r border-gray-200">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    safe.safes_is_active === 1 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {safe.safes_is_active === 1 ? 'نشط' : 'غير نشط'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600 border-r border-gray-200">
                  {safe.safes_created_at ? formatLocalDateTime(safe.safes_created_at) : '—'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button 
                      onClick={() => onEdit(safe)} 
                      className="group p-1.5 text-green-600 hover:text-white hover:bg-green-600 rounded-full transition-all" 
                      title="تعديل"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => onDelete(safe)} 
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
        {filtered.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            لا توجد خزائن
          </div>
        )}
      </div>
    </div>
  );
};

export default SafeListView;
