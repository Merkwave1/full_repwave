// src/components/dashboard/tabs/product-management/units/UnitListView.jsx
import React from 'react';
import { PencilIcon, TrashIcon, EyeIcon } from '@heroicons/react/24/outline';
import Loader from '../../../../common/Loader/Loader';
import Alert from '../../../../common/Alert/Alert';
import GlobalTable from '../../../../common/GlobalTable/GlobalTable';

export default function UnitListView({
  units,
  loading,
  error,
  searchTerm = '',
  onEditClick,
  onViewClick,
  onDeleteClick,
}) {

  const columns = [
    {
      key: 'index',
      title: '#',
      headerAlign: 'center',
      align: 'center',
      render: (item, idx) => (
        <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-1 rounded-full font-semibold">{idx + 1}</span>
      ),
      sortable: false,
      className: 'w-16',
    },
    {
      key: 'base_units_name',
      title: 'اسم الوحدة',
      headerAlign: 'right',
      align: 'right',
      render: (item) => (
        <div className="line-clamp-2" style={{ display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden', textOverflow: 'ellipsis', wordBreak: 'break-word' }}>{item.base_units_name}</div>
      ),
      sortable: true,
    },
    {
      key: 'actions',
      title: 'الإجراءات',
      headerAlign: 'center',
      align: 'center',
      render: (item) => (
        <div className="flex items-center justify-center gap-2">
          <button onClick={(e) => { e.stopPropagation(); onViewClick(item); }} className="group p-1.5 text-blue-600 hover:text-white hover:bg-blue-600 rounded-full transition-all" title="عرض">
            <EyeIcon className="h-4 w-4" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onEditClick(item); }} className="group p-1.5 text-green-600 hover:text-white hover:bg-green-600 rounded-full transition-all" title="تعديل">
            <PencilIcon className="h-4 w-4" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDeleteClick(item); }} className="group p-1.5 text-red-600 hover:text-white hover:bg-red-600 rounded-full transition-all" title="حذف">
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      ),
      sortable: false,
      className: 'w-32'
    }
  ];

  return (
    <>
      {loading && <Loader className="mt-8" />}
      {error && <Alert message={error} type="error" className="mb-4" />}

      <GlobalTable
        data={units}
        loading={loading}
        error={error}
        columns={columns}
        rowKey="base_units_id"
        searchTerm={searchTerm}
        emptyState={{ icon: '📂', title: 'لا توجد وحدات للعرض', description: 'جرب البحث بكلمات مختلفة أو أضف وحدة جديدة' }}
      />
    </>
  );
}
