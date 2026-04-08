// src/components/dashboard/tabs/visit-plans-management/VisitPlanListView.jsx
import React, { useState } from 'react';
import {
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';
import Loader from '../../../common/Loader/Loader';
import Alert from '../../../common/Alert/Alert';

export default function VisitPlanListView({
  visitPlans,
  loading,
  error,
  searchTerm = '', 
  onEdit,
  onDelete,
  onViewDetails,
  users, // For representative names
}) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Day names in Arabic (1=Saturday to 7=Friday)
  const dayNames = {
    1: 'السبت',
    2: 'الأحد', 
    3: 'الاثنين',
    4: 'الثلاثاء',
    5: 'الأربعاء',
    6: 'الخميس',
    7: 'الجمعة'
  };

  // Helper to get user name by ID
  const getUserNameById = (userId) => {
    if (!Array.isArray(users)) return '–';
    const user = users.find(u => u.users_id === userId);
    return user ? user.users_name : 'غير معروف';
  };

  // Format selected days
  const formatSelectedDays = (days) => {
    if (!days) return 'غير محدد';
    
    try {
      let daysArray = days;
      
      if (typeof days === 'string') {
        daysArray = JSON.parse(days);
      }
      
      if (!Array.isArray(daysArray) || daysArray.length === 0) {
        return 'غير محدد';
      }
      
      return daysArray.map(day => dayNames[day] || day).join(', ');
    } catch (error) {
      console.error('Error formatting selected days:', error, days);
      return 'غير محدد';
    }
  };

  const sortedPlans = React.useMemo(() => {
    if (!sortConfig.key) return visitPlans;
    return [...visitPlans].sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      // Handle numeric sorting for repeat_every
      if (sortConfig.key === 'visit_plan_repeat_every') {
        aValue = parseInt(aValue);
        bValue = parseInt(bValue);
      }
      
      // Special handling for user_name sorting
      if (sortConfig.key === 'user_name') {
        aValue = getUserNameById(a.user_id);
        bValue = getUserNameById(b.user_id);
      }

      if (aValue === null || aValue === undefined) aValue = '';
      if (bValue === null || bValue === undefined) bValue = '';

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [visitPlans, sortConfig, users]);

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
        <span className="select-none">{title}</span>
        <div className="flex flex-col items-center ml-1">
          {sortConfig.key === sortKey ? (
            sortConfig.direction === 'asc' ? (
              <ChevronUpIcon className="h-5 w-5 text-indigo-600 font-bold" />
            ) : (
              <ChevronDownIcon className="h-5 w-5 text-indigo-600 font-bold" />
            )
          ) : (
            <div className="flex flex-col">
              <ChevronUpIcon className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              <ChevronDownIcon className="h-4 w-4 text-gray-400 hover:text-gray-600 -mt-1" />
            </div>
          )}
        </div>
      </div>
    </th>
  );

  if (loading) return <Loader className="mt-8" />;
  if (error) return <Alert message={error} type="error" className="mb-4" />;

  return (
    <>
      {!loading && !error && sortedPlans.length === 0 && (
        <div className="bg-white rounded-xl shadow border border-gray-200 p-12 text-center animate-fadeIn">
          <div className="text-4xl mb-4 text-blue-300">📅</div>
          <p className="text-gray-700 text-lg font-semibold">لا توجد خطط زيارات لعرضها</p>
          <p className="text-gray-500 text-sm mt-2">جرب البحث بكلمات مختلفة أو أضف خطة زيارة جديدة</p>
        </div>
      )}

      {!loading && !error && sortedPlans.length > 0 && (
        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden animate-fadeIn">
          <div className="bg-gradient-to-r from-blue-100 to-indigo-100 px-6 py-4 border-b border-gray-300">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-800">
                إجمالي خطط الزيارات:
                <span className="font-bold text-indigo-600 ml-1">{sortedPlans.length}</span>
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
                  <SortableHeader title="اسم الخطة" sortKey="visit_plan_name" className="min-w-[200px] border-r border-gray-200" />
                  <SortableHeader title="المندوب" sortKey="user_name" className="min-w-[150px] border-r border-gray-200" />
                  <SortableHeader title="تاريخ البداية" sortKey="visit_plan_start_date" className="min-w-[120px] border-r border-gray-200" />
                  <SortableHeader title="تاريخ النهاية" sortKey="visit_plan_end_date" className="min-w-[120px] border-r border-gray-200" />
                  <SortableHeader title="التكرار" sortKey="visit_plan_repeat_every" className="min-w-[100px] border-r border-gray-200" />
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase min-w-[150px] border-r border-gray-200">الأيام المحددة</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase min-w-[100px] border-r border-gray-200">العملاء</th>
                  <SortableHeader title="الحالة" sortKey="visit_plan_status" className="min-w-[100px] border-r border-gray-200" />
                  <th className="w-32 px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase border-r border-gray-200">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {sortedPlans.map((plan, idx) => (
                  <tr key={plan.visit_plan_id} className="hover:bg-gray-50 transition-all duration-150">
                    {/* # */}
                    <td className="text-center px-4 py-3 border-r border-gray-200">
                      <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-1 rounded-full font-semibold">
                        {idx + 1}
                      </span>
                    </td>
                    {/* اسم الخطة */}
                    <td className="px-4 py-3 text-gray-900 font-medium border-r border-gray-200">
                      <div className="line-clamp-2 font-bold text-blue-800" style={{
                        display: '-webkit-box',
                        WebkitBoxOrient: 'vertical',
                        WebkitLineClamp: 2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        wordBreak: 'break-word',
                      }}>
                        {plan.visit_plan_name || '–'}
                      </div>
                      {plan.visit_plan_description && (
                        <div className="text-xs text-gray-500 mt-1 line-clamp-1">
                          {plan.visit_plan_description}
                        </div>
                      )}
                    </td>
                    {/* المندوب */}
                    <td className="px-4 py-3 text-gray-600 border-r border-gray-200">
                      <div className="line-clamp-2" style={{
                        display: '-webkit-box',
                        WebkitBoxOrient: 'vertical',
                        WebkitLineClamp: 2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        wordBreak: 'break-word',
                      }}>
                        {getUserNameById(plan.user_id) || '–'}
                      </div>
                    </td>
                    {/* تاريخ البداية */}
                    <td className="px-4 py-3 text-gray-600 border-r border-gray-200">
                      <div className="line-clamp-2" style={{
                        display: '-webkit-box',
                        WebkitBoxOrient: 'vertical',
                        WebkitLineClamp: 2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        wordBreak: 'break-word',
                      }}>
                        {plan.visit_plan_start_date || 'غير محدد'}
                      </div>
                    </td>
                    {/* تاريخ النهاية */}
                    <td className="px-4 py-3 text-gray-600 border-r border-gray-200">
                      <div className="line-clamp-2" style={{
                        display: '-webkit-box',
                        WebkitBoxOrient: 'vertical',
                        WebkitLineClamp: 2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        wordBreak: 'break-word',
                      }}>
                        {plan.visit_plan_end_date || 'غير محدد'}
                      </div>
                    </td>
                    {/* التكرار */}
                    <td className="px-4 py-3 text-gray-600 border-r border-gray-200 text-center">
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-semibold">
                        كل {plan.visit_plan_repeat_every} أسبوع
                      </span>
                    </td>
                    {/* الأيام المحددة */}
                    <td className="px-4 py-3 text-gray-600 border-r border-gray-200">
                      <div className="line-clamp-2 text-xs" style={{
                        display: '-webkit-box',
                        WebkitBoxOrient: 'vertical',
                        WebkitLineClamp: 2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        wordBreak: 'break-word',
                      }}>
                        {formatSelectedDays(plan.visit_plan_selected_days)}
                      </div>
                    </td>
                    {/* العملاء */}
                    <td className="px-4 py-3 text-center border-r border-gray-200">
                      <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full font-semibold">
                        {plan.clients_count || 0}
                      </span>
                    </td>
                    {/* الحالة */}
                    <td className="px-4 py-3 text-center border-r border-gray-200">
                      <span className={`font-semibold text-xs px-2 py-1 rounded-full ${
                        plan.visit_plan_status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {plan.visit_plan_status === 'Active' ? 'نشطة' : 'متوقفة'}
                      </span>
                    </td>
                    {/* الإجراءات */}
                    <td className="px-4 py-3 text-sm text-gray-500 text-center border-r border-gray-200">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => onViewDetails(plan)}
                          className="group p-1.5 text-blue-600 hover:text-white hover:bg-blue-600 rounded-full transition-all"
                          title="عرض"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onEdit(plan)}
                          className="group p-1.5 text-green-600 hover:text-white hover:bg-green-600 rounded-full transition-all"
                          title="تعديل"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onDelete(plan)}
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
