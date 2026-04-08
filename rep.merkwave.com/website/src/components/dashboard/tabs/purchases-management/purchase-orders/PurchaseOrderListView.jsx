// src/components/dashboard/tabs/purchases-management/purchase-orders/PurchaseOrderListView.jsx
import React from 'react';
import { EyeIcon, PencilIcon, PrinterIcon } from '@heroicons/react/24/outline';
import Loader from '../../../../common/Loader/Loader';
import Alert from '../../../../common/Alert/Alert';
import GlobalTable from '../../../../common/GlobalTable/GlobalTable';
import useCurrency from '../../../../../hooks/useCurrency';
import { formatLocalDateTime } from '../../../../../utils/dateUtils';

export default function PurchaseOrderListView({ purchaseOrders = [], loading = false, error = null, onEdit, onViewDetails, onPrint, suppliers = [], warehouses = [], odooEnabled = false }) {
  const { formatCurrency: formatMoney } = useCurrency();

  const getSupplierNameById = React.useCallback((supplierId) => {
    if (!Array.isArray(suppliers)) return '–';
    const supplier = suppliers.find(s => s.supplier_id === supplierId);
    return supplier ? supplier.supplier_name : 'غير معروف';
  }, [suppliers]);

  const getWarehouseNameById = React.useCallback((warehouseId) => {
    if (!Array.isArray(warehouses)) return '–';
    const warehouse = warehouses.find(w => w.warehouse_id === warehouseId);
    return warehouse ? warehouse.warehouse_name : 'غير معروف';
  }, [warehouses]);

  const columns = [
    { key: 'purchase_orders_id', title: 'رقم الأمر', render: (item) => (<span className="bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full font-bold">#{item.purchase_orders_id}</span>), sortable: true, headerAlign: 'center', align: 'center', className: 'w-24' },
    ...(odooEnabled ? [{ key: 'purchase_orders_odoo_id', title: 'Odoo ID', render: (item) => item.purchase_orders_odoo_id ? (<span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full font-semibold">{item.purchase_orders_odoo_id}</span>) : (<span className="text-gray-400">-</span>), sortable: true, headerAlign: 'center', align: 'center', className: 'w-24' }] : []),
    { key: 'supplier', title: 'المورد', render: (item) => getSupplierNameById(item.purchase_orders_supplier_id), sortable: true, sortAccessor: (it) => getSupplierNameById(it.purchase_orders_supplier_id) },
  { key: 'date', title: 'التاريخ', render: (item) => (item.purchase_orders_order_date ? formatLocalDateTime(item.purchase_orders_order_date) : '–'), sortable: true, sortKey: 'purchase_orders_order_date' },
  { key: 'total', title: 'الإجمالي', render: (item) => formatMoney(item.purchase_orders_total_amount ?? 0), sortable: true, sortKey: 'purchase_orders_total_amount', align: 'right', headerAlign: 'right', className: 'whitespace-nowrap font-semibold text-slate-700' },
    { key: 'status', title: 'الحالة', render: (item) => (<span className={`font-semibold text-xs px-2 py-1 rounded-full ${
      item.purchase_orders_status === 'Ordered' ? 'bg-yellow-100 text-yellow-800' :
      item.purchase_orders_status === 'Received' ? 'bg-green-100 text-green-800' :
      item.purchase_orders_status === 'Partially Received' ? 'bg-green-100 text-green-800' :
      'bg-red-100 text-red-800'
    }`}>{item.purchase_orders_status}</span>), align: 'center' },
    { key: 'warehouse', title: 'المخزن', render: (item) => getWarehouseNameById(item.purchase_orders_warehouse_id), sortable: true, sortAccessor: (it) => getWarehouseNameById(it.purchase_orders_warehouse_id) },
    { key: 'notes', title: 'ملاحظات', render: (item) => item.purchase_orders_notes || '–' },
    { key: 'actions', title: 'الإجراءات', render: (item) => (
      <div className="flex items-center justify-center gap-2">
        <button onClick={(e)=>{ e.stopPropagation(); onViewDetails(item); }} className="group p-1.5 text-blue-600 hover:text-white hover:bg-blue-600 rounded-full transition-all" title="عرض"><EyeIcon className="h-4 w-4" /></button>
        {item.purchase_orders_status === 'Draft' && (<button onClick={(e)=>{ e.stopPropagation(); onEdit(item); }} className="group p-1.5 text-green-600 hover:text-white hover:bg-green-600 rounded-full transition-all" title="تعديل"><PencilIcon className="h-4 w-4" /></button>)}
        <button onClick={(e)=>{ e.stopPropagation(); onPrint && onPrint(item); }} className="group p-1.5 text-purple-600 hover:text-white hover:bg-purple-600 rounded-full transition-all" title="طباعة"><PrinterIcon className="h-4 w-4" /></button>
      </div>
    ), align: 'center', headerAlign: 'center' },
  ];

  if (loading) return <Loader className="mt-8" />;
  if (error) return <Alert message={error} type="error" className="mb-4" />;

  return (
    <GlobalTable
      data={purchaseOrders}
      loading={loading}
      error={error}
      columns={columns}
      rowKey="purchase_orders_id"
    />
  );
}
