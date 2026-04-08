// src/components/dashboard/tabs/sales-management/sales-orders/SalesOrderListView.jsx
import React from 'react';
import { 
  EyeIcon, 
  PencilIcon, 
  TruckIcon, 
  PrinterIcon,
  ChevronUpIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';
import { formatCurrency } from '../../../../../utils/currency';
import useCurrency from '../../../../../hooks/useCurrency';
import GlobalTable from '../../../../common/GlobalTable/GlobalTable';

export default function SalesOrderListView({ 
  orders = [], 
  onEdit, 
  onViewDetails, 
  onDeliver,
  onPrint,
  statusOptions = [],
  searchTerm = '',
  odooEnabled = false
}) {
  const { symbol } = useCurrency();

  const getStatusDisplay = React.useCallback((status) => {
    const statusOption = statusOptions?.find(opt => opt.value === status);
    if (statusOption) return statusOption.label;
    const translations = {
      'Draft': 'مسودة',
      'Pending': 'في الانتظار',
      'Approved': 'مُعتمد',
      'Invoiced': 'تم إصدار الفاتورة',
      'Cancelled': 'ملغي'
    };
    return translations[status] || status;
  }, [statusOptions]);

  const getDeliveryStatusDisplay = React.useCallback((deliveryStatus) => {
    const translations = {
      'Not_Delivered': 'لم يتم التسليم',
      'Processing_Delivery': 'جارى معالجة التسليم',
      'Shipped': 'تم الشحن',
      'Partially_Delivered': 'تم التسليم الجزئى',
      'Delivered': 'تم التسليم',
      'لم يتم التسليم': 'لم يتم التسليم',
      'جارى معالجة التسليم': 'جارى معالجة التسليم',
      'تم التسليم الجزئى': 'تم التسليم الجزئى',
      'تم التسليم': 'تم التسليم'
    };
    return translations[deliveryStatus] || deliveryStatus || 'لم يتم التسليم';
  }, []);

  const getDeliveryStatusColor = React.useCallback((deliveryStatus) => {
    const colors = {
      'Not_Delivered': 'bg-yellow-100 text-yellow-800',
      'Processing_Delivery': 'bg-orange-100 text-orange-800',
      'Shipped': 'bg-purple-100 text-purple-800',
      'Partially_Delivered': 'bg-blue-100 text-blue-800',
      'Delivered': 'bg-green-100 text-green-800',
      'لم يتم التسليم': 'bg-yellow-100 text-yellow-800',
      'جارى معالجة التسليم': 'bg-orange-100 text-orange-800',
      'تم التسليم الجزئى': 'bg-blue-100 text-blue-800',
      'تم التسليم': 'bg-green-100 text-green-800'
    };
    return colors[deliveryStatus] || 'bg-yellow-100 text-yellow-800';
  }, []);

  const getStatusColor = React.useCallback((status) => {
    const colors = {
      'Draft': 'bg-gray-100 text-gray-800',
      'Pending': 'bg-yellow-100 text-yellow-800',
      'Approved': 'bg-blue-100 text-blue-800',
      'Invoiced': 'bg-indigo-100 text-indigo-800',
      'Cancelled': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  }, []);

  const columns = React.useMemo(() => ([
  { key: 'index', title: 'ID', sortable: true, sortAccessor: (it) => Number(it.sales_orders_id || it.id || 0), headerAlign: 'center', align: 'center', render: (item) => <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{item.sales_orders_id || item.id || '—'}</span>, className: 'w-20' },
    ...(odooEnabled ? [{ key: 'sales_orders_odoo_invoice_id', title: 'ODOO ID', sortable: true, headerAlign: 'center', align: 'center', className: 'w-20', render: (it) => (
      <span className="font-mono text-xs text-gray-600">{it.sales_orders_odoo_invoice_id || '-'}</span>
    ) }] : []),
    { key: 'clients_company_name', title: 'العميل', sortable: true, className: 'min-w-[160px]' },
    { key: 'representative_name', title: 'المندوب', sortable: true, className: 'min-w-[120px]' },
    { key: 'warehouse_name', title: 'المستودع', sortable: true, className: 'min-w-[120px]' },
    { key: 'items_count', title: 'عدد المنتجات', sortable: true, sortAccessor: (it) => Number(it.items_count || it.total_items || (Array.isArray(it.items) ? it.items.length : 0) || 0), className: 'min-w-[100px]', render: (it) => <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{it.items_count || it.total_items || (Array.isArray(it.items) ? it.items.length : 0) || 0} منتج</span> },
    { key: 'sales_orders_order_date', title: 'التاريخ', sortable: true, sortAccessor: (it) => new Date(it.sales_orders_order_date || it.order_date).getTime() || 0, className: 'min-w-[100px]', render: (it) => <div className="text-sm text-gray-700">{it.sales_orders_order_date || it.order_date ? new Date(it.sales_orders_order_date || it.order_date).toLocaleDateString('en-GB') : '—'}</div> },
    { key: 'sales_orders_status', title: 'الحالة', sortable: true, className: 'min-w-[100px]', render: (it) => <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(it.sales_orders_status || it.status)}`}>{getStatusDisplay(it.sales_orders_status || it.status)}</span> },
    { key: 'sales_orders_delivery_status', title: 'حالة التسليم', sortable: true, className: 'min-w-[120px]', render: (it) => <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getDeliveryStatusColor(it.sales_orders_delivery_status || it.delivery_status)}`}>{getDeliveryStatusDisplay(it.sales_orders_delivery_status || it.delivery_status)}</span> },
  { key: 'sales_orders_total_amount', title: `الإجمالي (${symbol})`, sortable: true, sortAccessor: (it) => Number(it.sales_orders_total_amount || it.total_amount || 0), className: 'min-w-[120px]', render: (it) => <div className="text-green-600 font-semibold">{formatCurrency(parseFloat(it.sales_orders_total_amount || it.total_amount || 0))}</div> },
    { key: 'actions', title: 'الإجراءات', sortable: false, headerAlign: 'center', align: 'center', className: 'w-56', render: (it) => {
      const orderStatus = it.sales_orders_status || it.status;
      const deliveryStatus = it.sales_orders_delivery_status || it.delivery_status;
      const canDeliver = orderStatus === 'Invoiced' && deliveryStatus !== 'Delivered';
      return (
        <div className="flex items-center justify-center space-x-reverse space-x-2">
          <button onClick={() => onViewDetails(it)} className="text-blue-600 hover:text-blue-900 hover:bg-blue-50 p-2 rounded-full transition-colors" title="عرض التفاصيل"><EyeIcon className="h-5 w-5" /></button>
          <button onClick={() => onEdit(it)} disabled={orderStatus === 'Cancelled' || orderStatus === 'Invoiced'} className={`p-2 rounded-full transition-colors ${orderStatus === 'Cancelled' || orderStatus === 'Invoiced' ? 'text-gray-400 cursor-not-allowed bg-gray-100' : 'text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50'}`} title={orderStatus === 'Cancelled' || orderStatus === 'Invoiced' ? 'لا يمكن تعديل أمر ملغي أو مفوتر' : 'تعديل'}><PencilIcon className="h-5 w-5" /></button>
          {canDeliver && <button onClick={() => onDeliver(it)} className="text-green-600 hover:text-green-900 hover:bg-green-50 p-2 rounded-full transition-colors" title="تسليم المنتجات"><TruckIcon className="h-5 w-5" /></button>}
          <button onClick={() => onPrint(it)} className="text-purple-600 hover:text-purple-900 hover:bg-purple-50 p-2 rounded-full transition-colors" title="طباعة"><PrinterIcon className="h-5 w-5" /></button>
        </div>
      );
    } },
  ]), [symbol, onEdit, onViewDetails, onDeliver, onPrint, getStatusColor, getStatusDisplay, getDeliveryStatusColor, getDeliveryStatusDisplay, odooEnabled]);

  return (
    <GlobalTable
      data={orders}
      columns={columns}
      rowKey={'sales_orders_id'}
      totalCount={orders.length}
      searchTerm={searchTerm}
      tableClassName="text-sm"
      headerClassName="text-xs"
    />
  );
}
