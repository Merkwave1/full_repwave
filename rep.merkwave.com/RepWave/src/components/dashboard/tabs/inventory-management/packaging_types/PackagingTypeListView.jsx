// src/components/dashboard/tabs/inventory-management/packaging_types/PackagingTypeListView.jsx
import React from 'react';
import { PencilIcon, TrashIcon, EyeIcon } from '@heroicons/react/24/outline';
import Loader from '../../../../common/Loader/Loader';
import Alert from '../../../../common/Alert/Alert';
import GlobalTable from '../../../../common/GlobalTable/GlobalTable';

export default function PackagingTypeListView({
  packagingTypes,
  loading,
  error,
  searchTerm = '',
  onEditClick,
  onViewClick,
  onDeleteClick,
  baseUnits // Passed to resolve compatible_base_unit_name
}) {

  const getBaseUnitName = (unitId) => {
    if (!Array.isArray(baseUnits)) return '–';
    const unit = baseUnits.find(u => u.base_units_id === unitId);
    return unit ? unit.base_units_name : '–';
  };

  const columns = [
    { key: 'index', title: '#', headerAlign: 'center', align: 'center', render: (item, idx) => (<span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-1 rounded-full font-semibold">{idx+1}</span>), className: 'w-16' },
    { key: 'name', title: 'الاسم', headerAlign: 'right', align: 'right', render: (item) => (<div className="line-clamp-2" style={{ display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden', textOverflow: 'ellipsis', wordBreak: 'break-word' }}>{item.packaging_types_name}</div>), sortable: true },
    { key: 'factor', title: 'معامل التحويل', headerAlign: 'right', align: 'right', render: (item) => item.packaging_types_default_conversion_factor ?? '–' },
    { key: 'compatible_unit', title: 'الوحدة المتوافقة', headerAlign: 'right', align: 'right', render: (item) => getBaseUnitName(item.packaging_types_compatible_base_unit_id) || '–' },
    { key: 'description', title: 'الوصف', headerAlign: 'right', align: 'right', render: (item) => (<div className="line-clamp-2" style={{ display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden', textOverflow: 'ellipsis', wordBreak: 'break-word' }}>{item.packaging_types_description || 'لا يوجد وصف.'}</div>) },
    { key: 'actions', title: 'الإجراءات', headerAlign: 'center', align: 'center', render: (item) => (
      <div className="flex items-center justify-center gap-2">
        <button onClick={(e) => { e.stopPropagation(); onViewClick(item); }}             className="p-1.5 rounded-full 
                   text-sky-700 bg-sky-100
                   hover:bg-sky-500 hover:text-white
                   hover:shadow-[0_0_12px_rgba(56,189,248,0.45)]
                   transition-all duration-200 hover:scale-110" title="عرض"><EyeIcon className="h-4 w-4" /></button>
        <button onClick={(e) => { e.stopPropagation(); onEditClick(item); }}             className="p-1.5 rounded-full 
                   text-emerald-700 bg-emerald-100
                   hover:bg-emerald-500 hover:text-white
                   hover:shadow-[0_0_12px_rgba(16,185,129,0.45)]
                   transition-all duration-200 hover:scale-110" title="تعديل"><PencilIcon className="h-4 w-4" /></button>
        <button onClick={(e) => { e.stopPropagation(); onDeleteClick(item); }}             className="p-1.5 rounded-full 
                   text-red-700 bg-red-100
                   hover:bg-red-500 hover:text-white
                   hover:shadow-[0_0_12px_rgba(239,68,68,0.45)]
                   transition-all duration-200 hover:scale-110" title="حذف"><TrashIcon className="h-4 w-4" /></button>
      </div>
    ), className: 'w-32' }
  ];

  return (
    <>
      {loading && <Loader className="mt-8" />}
      {error && <Alert message={error} type="error" className="mb-4" />}

      <GlobalTable
        data={packagingTypes}
        loading={loading}
        error={error}
        columns={columns}
        rowKey="packaging_types_id"
        searchTerm={searchTerm}
        emptyState={{ icon: '📂', title: 'لا توجد أنواع تعبئة للعرض', description: 'جرب البحث بكلمات مختلفة أو أضف نوع تعبئة جديد' }}
      />
    </>
  );
}
