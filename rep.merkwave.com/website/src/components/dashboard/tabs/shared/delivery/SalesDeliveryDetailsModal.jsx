import React from 'react';
import { TruckIcon, CalendarIcon, PrinterIcon, XMarkIcon } from '@heroicons/react/24/outline';
import Loader from '../../../../common/Loader/Loader';

/**
 * Reusable delivery details modal (visual clone of the one used in DeliveryHistoryTab)
 * Props:
 *  - open: boolean
 *  - delivery: base delivery object (may be null while loading)
 *  - details: full details object (expected to contain items array) - optional
 *  - loading: show loading spinner instead of content
 *  - onClose: function
 *  - onPrint: function (print current delivery)
 *  - warehouses: array (optional) used to resolve warehouse name by id
 *  - clients: array (optional) used to resolve client name by id
 */
export default function SalesDeliveryDetailsModal({
  open,
  delivery,
  details,
  loading = false,
  onClose,
  onPrint,
  warehouses = [],
  clients = []
}) {
  if (!open || !delivery) return null;

  const resolveWarehouseName = () => {
    const id = delivery.sales_deliveries_warehouse_id || delivery.warehouse_id;
    if (warehouses?.length) {
      return warehouses.find(w => (w.warehouse_id === id))?.warehouse_name || 'غير محدد';
    }
    return delivery.warehouse_name || delivery.warehouses_name || 'غير محدد';
  };

  const resolveClientName = () => {
    const id = delivery.sales_deliveries_client_id || delivery.client_id || delivery.clients_id;
    if (clients?.length) {
      return clients.find(c => (c.client_id === id))?.client_name || 'غير محدد';
    }
    return delivery.client_name || delivery.clients_company_name || 'غير محدد';
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return { date: '-', time: '-', full: '-' };
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-GB'),
      time: date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      full: date.toLocaleString('en-GB')
    };
  };


  const dateVal = delivery.sales_deliveries_delivery_date || delivery.delivery_date || delivery.created_at;
  const dateParts = formatDateTime(dateVal);
  const notes = delivery.sales_deliveries_notes || delivery.sales_deliveries_delivery_notes || delivery.delivery_notes || 'لا توجد ملاحظات';
  const items = details?.items || [];

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" dir="rtl">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-4/5 lg:w-3/4 xl:w-2/3 shadow-lg rounded-md bg-white max-h-[80vh] overflow-y-auto">
        <div className="mt-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="bg-blue-100 rounded-full p-2 ml-3">
                <TruckIcon className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">تفاصيل التسليم #{delivery.sales_deliveries_id || delivery.delivery_id}</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onPrint && onPrint(delivery)}
                className="text-blue-600 hover:text-blue-800 flex items-center px-2 py-1 rounded hover:bg-blue-50"
                title="طباعة سند التسليم"
              >
                <PrinterIcon className="h-5 w-5 ml-1" /> طباعة
              </button>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><Loader /></div>
          ) : (
            <>
              {/* Basic Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <InfoBlock label="رقم التسليم" value={`#${delivery.sales_deliveries_id || delivery.delivery_id}`} />
                <InfoBlock label="رقم الطلب" value={`#${delivery.sales_deliveries_sales_order_id || delivery.sales_order_id || '—'}`} />
                <InfoBlock label="المستودع" value={resolveWarehouseName()} />
                <InfoBlock label="العميل" value={resolveClientName()} />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ التسليم الكامل</label>
                  <div className="bg-gray-50 p-2 rounded">
                    <p className="text-sm text-gray-900">{dateParts.full}</p>
                    <div className="flex items-center mt-2 text-xs text-gray-500">
                      <CalendarIcon className="h-4 w-4 ml-1" />
                      <span>التاريخ: {dateParts.date}</span>
                      <span className="mx-2">•</span>
                      <span>الوقت: {dateParts.time}</span>
                    </div>
                  </div>
                </div>
                {/* delivery status removed as per request */}
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded min-h-[60px] whitespace-pre-wrap">{notes}</p>
                </div>
              </div>

              {items && items.length > 0 ? (
                <div className="border-t pt-6">
                  <h4 className="text-lg font-medium text-gray-800 mb-4">المنتجات المُسلَّمة ({items.length})</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <Th>#</Th>
                          <Th>اسم الصنف</Th>
                          <Th>كود الصنف</Th>
                          <Th>نوع العبوة</Th>
                          <Th>الكمية المُسلَّمة</Th>
                          <Th>ملاحظات</Th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {items.map((item, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <Td center>{index + 1}</Td>
                            <Td>
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-gray-900">{item.variant_name || item.products_name || 'غير محدد'}</span>
                                {item.products_name && item.variant_name && item.products_name !== item.variant_name && (
                                  <span className="text-gray-500 text-xs">({item.products_name})</span>
                                )}
                              </div>
                            </Td>
                            <Td center>{item.variant_sku || item.sales_order_items_variant_id || '-'}</Td>
                            <Td center>{item.packaging_types_name || 'غير محدد'}</Td>
                            <Td center className="font-medium text-green-600">{parseFloat(item.sales_delivery_items_quantity_delivered || 0).toFixed(2)}</Td>
                            <Td center>{item.sales_delivery_items_notes || '-'}</Td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="border-t pt-6">
                  <div className="text-center text-gray-500 py-8">لا توجد تفاصيل إضافية متاحة لهذا التسليم</div>
                </div>
              )}
            </>
          )}

          {/* Footer */}
          <div className="flex justify-between items-center mt-6 pt-4 border-t">
            <button
              onClick={() => onPrint && onPrint(delivery)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
            >
              <PrinterIcon className="h-4 w-4 ml-1" /> طباعة سند التسليم
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const InfoBlock = ({ label, value }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{value}</p>
  </div>
);

const Th = ({ children }) => (
  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">{children}</th>
);

const Td = ({ children, center }) => (
  <td className={`px-6 py-4 ${center ? 'text-center' : ''} text-sm text-gray-500`}>{children}</td>
);
