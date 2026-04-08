import React, { useState, useEffect } from 'react';
import { EyeIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

import Loader from '../../../common/Loader/Loader';
import Alert from '../../../common/Alert/Alert';
import GlobalTable from '../../../common/GlobalTable/GlobalTable';
import { isOdooIntegrationEnabled } from '../../../../utils/odooIntegration';

export default function ProductsListView({
  products,
  loading,
  error,
  searchTerm = '',
  onEdit,
  onDelete,
  onViewDetails,
  categories,
  suppliers, // Added suppliers prop
}) {
  const [odooEnabled, setOdooEnabled] = useState(false);
  
  useEffect(() => {
    setOdooEnabled(isOdooIntegrationEnabled());
  }, []);

  // Helper function to get category name by ID
  const getCategoryName = (categoryId) => {
    if (!Array.isArray(categories) || !categoryId) return '–';
    // Using loose equality to handle potential type mismatches
    const category = categories.find(cat => cat.categories_id == categoryId);
    return category ? category.categories_name : '–';
  };
  
  // Helper function to get supplier name by ID
  const getSupplierName = (supplierId) => {
    if (!Array.isArray(suppliers) || !supplierId) return '–';
    // CORRECTED: Using loose equality '==' to handle potential type mismatch (e.g., '2' vs 2)
    const supplier = suppliers.find(sup => sup.supplier_id == supplierId);
    return supplier ? supplier.supplier_name : '–';
  };

  

  if (loading) return <Loader className="mt-8" />;
  if (error) return <Alert message={error} type="error" className="mb-4" />;

  const columns = [
    { key: 'products_id', title: '#', sortable: true, headerAlign: 'center', align: 'center', headerClassName: 'w-20', render: (p) => (<span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-1 rounded-full font-semibold">{p.products_id}</span>) },
    { key: 'products_name', title: 'الاسم', sortable: true, headerClassName: 'min-w-[150px]', render: (p) => p.products_name },
    { key: 'products_category_id', title: 'الفئة', sortable: true, headerClassName: 'min-w-[90px]', render: (p) => getCategoryName(p.products_category_id) },
    { key: 'products_supplier_id', title: 'المورد', sortable: true, headerClassName: 'min-w-[90px]', render: (p) => getSupplierName(p.products_supplier_id) },
    { key: 'variants', title: 'الخيارات', headerClassName: 'min-w-[300px]', render: (p) => (Array.isArray(p.variants) && p.variants.length > 0 ? p.variants.map((v, idx) => (<div key={idx} className="text-xs text-gray-700 flex items-center gap-2 flex-wrap"><span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[10px]">#{v.variant_id}</span> {v.variant_name || `خيار ${idx+1}`} ({v.variant_unit_price}) {odooEnabled && v.variant_odoo_product_id && <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded text-[10px]">Odoo: {v.variant_odoo_product_id}</span>}</div> ) ) : (<span className="text-gray-500 italic">لا توجد خيارات</span>)) },
    { key: 'products_expiry_period_in_days', title: 'صلاحية (يوم)', sortable: true, headerClassName: 'min-w-[90px]', align: 'center' },
    { key: 'products_is_active', title: 'الحالة', sortable: true, headerClassName: 'min-w-[80px]', render: (p) => (<span className={`font-semibold text-xs px-2 py-1 rounded-full ${p.products_is_active === 1 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{p.products_is_active === 1 ? 'نشط' : 'غير نشط'}</span>) },
    { key: 'actions', title: 'إجراءات', headerAlign: 'center', align: 'center', className: 'w-32', render: (p) => (
      <div className="flex items-center justify-center gap-2">
        <button onClick={(e) => { e.stopPropagation(); onViewDetails(p); }} className="group p-1.5 text-blue-600 hover:text-white hover:bg-blue-600 rounded-full transition-all" title="عرض"><EyeIcon className="h-4 w-4" /></button>
        <button onClick={(e) => { e.stopPropagation(); onEdit(p); }} className="group p-1.5 text-green-600 hover:text-white hover:bg-green-600 rounded-full transition-all" title="تعديل"><PencilIcon className="h-4 w-4" /></button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(p); }} className="group p-1.5 text-red-600 hover:text-white hover:bg-red-600 rounded-full transition-all" title="حذف"><TrashIcon className="h-4 w-4" /></button>
      </div>
    ) },
  ];

  return (
    <GlobalTable
      data={products}
      columns={columns}
      rowKey="products_id"
      searchTerm={searchTerm}
      totalCount={products.length}
      initialSort={{ key: null, direction: 'asc' }}
      tableClassName="text-sm"
    />
  );
}
