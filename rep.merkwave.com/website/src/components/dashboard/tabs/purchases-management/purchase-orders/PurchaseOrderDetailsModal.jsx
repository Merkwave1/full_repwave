import React, { useState, useCallback, useMemo } from 'react';
import { FaTimes, FaPrint, FaEdit } from 'react-icons/fa';
import useCurrency from '../../../../../hooks/useCurrency';

const PurchaseOrderDetailsModal = ({ 
  isOpen, 
  onClose, 
  purchaseOrder, 
  suppliers, 
  warehouses, 
  onEdit 
}) => {
  const { formatCurrency: formatMoney } = useCurrency();
  const [loading] = useState(false);
  const [error] = useState(null);

  // All hooks must be called before any early returns
  const handleEdit = useCallback(() => {
    if (onEdit && purchaseOrder) {
      onEdit(purchaseOrder);
    }
  }, [onEdit, purchaseOrder]);

  const getSupplierName = useCallback((supplierId) => {
    const supplier = suppliers?.find(s => s.supplier_id == supplierId);
    return supplier ? supplier.supplier_name : 'غير محدد';
  }, [suppliers]);

  const getWarehouseName = useCallback((warehouseId) => {
    const warehouse = warehouses?.find(w => w.warehouse_id == warehouseId);
    return warehouse ? warehouse.warehouse_name : 'غير محدد';
  }, [warehouses]);

  // useCurrency.formatCurrency is available as formatMoney

  const calculateItemTotal = useCallback((item) => {
    // Handle both old and new field names for backward compatibility
    const quantity = parseFloat(
      item.purchase_order_items_quantity_ordered || 
      item.purchase_order_items_quantity || 
      0
    );
    const unitPrice = parseFloat(
      item.purchase_order_items_unit_cost || 
      item.purchase_order_items_unit_price || 
      0
    );
    const total = quantity * unitPrice;

    return {
      subtotal: total,
      discountAmount: 0,
      taxAmount: 0,
      total: total
    };
  }, []);

  const orderTotals = useMemo(() => {
    if (!purchaseOrder?.items) return { subtotal: 0, totalDiscount: 0, totalTax: 0, orderDiscount: 0, grandTotal: 0 };

    let subtotal = 0;

    purchaseOrder.items.forEach(item => {
      const itemCalc = calculateItemTotal(item);
      subtotal += itemCalc.total;
    });

    // Add order-level discount
    const orderDiscount = parseFloat(purchaseOrder.purchase_orders_order_discount || purchaseOrder.purchase_order_order_discount || 0);
    const finalTotal = Math.max(0, subtotal - orderDiscount);

    return {
      subtotal,
      totalDiscount: 0,
      totalTax: 0,
      orderDiscount,
      grandTotal: finalTotal
    };
  }, [purchaseOrder?.items, purchaseOrder?.purchase_orders_order_discount, purchaseOrder?.purchase_order_order_discount, calculateItemTotal]);

  const formattedOrderData = useMemo(() => {
    if (!purchaseOrder) return null;

    // Debug: Log the raw data to see what fields are available
    console.log('Purchase Order Data:', purchaseOrder);
    if (purchaseOrder.items && purchaseOrder.items.length > 0) {
      console.log('First Item Data:', purchaseOrder.items[0]);
    }

    return {
      ...purchaseOrder,
      supplier_name: getSupplierName(purchaseOrder.purchase_order_supplier_id),
      warehouse_name: getWarehouseName(purchaseOrder.purchase_order_warehouse_id),
      formatted_date: (() => {
        try {
          const d = new Date(purchaseOrder.purchase_order_date);
          return `${d.toLocaleDateString('en-GB')} ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
        } catch {
          return purchaseOrder.purchase_order_date || '';
        }
      })(),
      items: purchaseOrder.items?.map(item => ({
        ...item,
        // Use variant name instead of product name
        display_name: item.product_variant_name || item.variant_name || 'غير محدد',
        packaging_name: item.packaging_type_name || 'غير محدد',
        calculated: calculateItemTotal(item)
      })) || []
    };
  }, [purchaseOrder, getSupplierName, getWarehouseName, calculateItemTotal]);

  // Move handlePrint after formattedOrderData is defined
  const handlePrint = useCallback(async () => {
    try {
      if (!formattedOrderData) return;
      
      const currentDate = new Date();
      const o = formattedOrderData;
      
      // Prepare items for print
      const itemsForPrint = o.items.map((item, index) => ({
        serial: index + 1,
        name: item.display_name,
        packaging: item.packaging_name,
        quantity: parseFloat(item.purchase_order_items_quantity_ordered || item.purchase_order_items_quantity || 0),
        unit_price: parseFloat(item.purchase_order_items_unit_cost || item.purchase_order_items_unit_price || 0),
        total: item.calculated.total
      }));

      const itemsRows = itemsForPrint.map(i => `
        <tr>
          <td>${i.serial}</td>
          <td>${i.name}</td>
          <td>${i.packaging}</td>
          <td>${i.quantity.toLocaleString('en-GB')}</td>
          <td>${formatMoney(i.unit_price)}</td>
          <td>${formatMoney(i.total)}</td>
        </tr>
      `).join('');

      const printContent = `<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>أمر شراء رقم #${o.purchase_order_id}</title><style>
        * { box-sizing:border-box; }
        body { font-family:Arial,sans-serif; margin:0; padding:20px; background:#fff; color:#000; direction:rtl; }
        .order-container { max-width:210mm; margin:0 auto; background:#fff; }
        .header { text-align:center; margin-bottom:30px; border-bottom:3px solid #000; padding-bottom:15px; }
        .header h1 { margin:0; font-size:24px; font-weight:bold; }
        .order-info { display:grid; grid-template-columns:1fr 1fr; gap:30px; margin-bottom:30px; }
        .info-section { border:2px solid #000; padding:15px; }
        .info-section h3 { margin-top:0; font-size:16px; margin-bottom:12px; }
        .info-row { display:flex; font-size:13px; margin-bottom:6px; }
        .info-label { font-weight:bold; min-width:110px; }
        table { width:100%; border-collapse:collapse; margin-bottom:25px; border:2px solid #000; }
        th, td { border:1px solid #000; padding:6px 5px; font-size:12px; text-align:right; }
        th { background:#f0f0f0; }
        tr:nth-child(even) { background:#f9f9f9; }
        .totals-section { border:2px solid #000; padding:15px; margin-bottom:30px; background:#f8f9fa; }
        .totals-row { display:flex; justify-content:space-between; margin-bottom:6px; font-size:14px; }
        .totals-row.grand-total { font-weight:bold; font-size:16px; border-top:1px solid #000; padding-top:8px; margin-top:10px; }
        .status-section { border:1px solid #000; padding:15px; margin-bottom:30px; }
        .footer { margin-top:40px; display:grid; grid-template-columns:1fr 1fr 1fr; gap:30px; text-align:center; }
        .signature-box { border:1px solid #000; padding:15px; height:60px; }
        .signature-label { font-weight:bold; margin-bottom:10px; }
        .print-date { text-align:center; margin-top:20px; font-size:12px; color:#555; }
        @media print { body { margin:0; padding:10px; } .order-container { border:none; box-shadow:none; margin:0; padding:0; } }
      </style></head><body>
        <div class="order-container">
          <div class="header"><h1>أمر شراء رقم #${o.purchase_order_id}</h1></div>
          <div class="order-info">
            <div class="info-section">
              <h3>معلومات الطلب</h3>
              <div class="info-row"><span class="info-label">رقم الطلب:</span><span>#${o.purchase_order_id}</span></div>
              <div class="info-row"><span class="info-label">تاريخ الطلب:</span><span>${o.formatted_date}</span></div>
              <div class="info-row"><span class="info-label">حالة الطلب:</span><span>${o.purchase_order_status}</span></div>
              <div class="info-row"><span class="info-label">المستودع:</span><span>${o.warehouse_name}</span></div>
            </div>
            <div class="info-section">
              <h3>معلومات المورد</h3>
              <div class="info-row"><span class="info-label">اسم المورد:</span><span>${o.supplier_name}</span></div>
              <div class="info-row"><span class="info-label">إجمالي الطلب:</span><span>${formatMoney(orderTotals.grandTotal)}</span></div>
            </div>
          </div>
          ${itemsForPrint.length ? `<table class="items-table"><thead><tr><th>م</th><th>اسم المنتج</th><th>نوع التعبئة</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th></tr></thead><tbody>${itemsRows}</tbody></table>`: ''}
          <div class="totals-section">
            <h3 style="margin-bottom:15px;">ملخص المبالغ</h3>
            <div class="totals-row"><span>المجموع الفرعي:</span><span>${formatMoney(orderTotals.subtotal)}</span></div>
            ${orderTotals.orderDiscount > 0 ? `<div class="totals-row"><span>خصم على الطلب:</span><span>${formatMoney(orderTotals.orderDiscount)}</span></div>` : ''}
            <div class="totals-row grand-total"><span>المبلغ الإجمالي:</span><span>${formatMoney(orderTotals.grandTotal)}</span></div>
          </div>
          ${o.purchase_order_notes ? `<div class="status-section"><h3>ملاحظات الطلب</h3><p>${o.purchase_order_notes}</p></div>` : ''}
          <div class="footer"><div class="signature-box"><div class="signature-label">توقيع المورد</div></div><div class="signature-box"><div class="signature-label">توقيع المستلم</div></div><div class="signature-box"><div class="signature-label">ختم الشركة</div></div></div>
          <div class="print-date">تم إنشاء هذا الأمر بتاريخ: ${currentDate.toLocaleDateString('en-GB')} ${currentDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
      </body></html>`;
      
      const { printHtml } = await import('../../../../../utils/printUtils.js');
      await printHtml(printContent, { title: 'تفاصيل أمر شراء', closeAfter: 700 });
    } catch(err){
      console.error('Print failed', err);
      // Fallback to window.print
      window.print();
    }
  }, [formattedOrderData, orderTotals, formatMoney]);

  // Early return after all hooks
  if (!isOpen || !purchaseOrder) return null;

  const statusColors = {
    'Draft': 'bg-gray-100 text-gray-800',
    'Ordered': 'bg-blue-100 text-blue-800',
    'Received': 'bg-green-100 text-green-800',
    'Cancelled': 'bg-red-100 text-red-800'
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-4 rtl:space-x-reverse">
            <h2 className="text-xl font-semibold text-gray-900">
              تفاصيل أمر الشراء #{formattedOrderData?.purchase_order_id}
            </h2>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[formattedOrderData?.purchase_order_status] || 'bg-gray-100 text-gray-800'}`}>
              {formattedOrderData?.purchase_order_status}
            </span>
          </div>
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            {formattedOrderData?.purchase_order_status === 'Draft' && (
              <button
                onClick={handleEdit}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="تعديل"
              >
                <FaEdit size={18} />
              </button>
            )}
            <button
              onClick={handlePrint}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors print:hidden"
              title="طباعة"
            >
              <FaPrint size={18} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors print:hidden"
            >
              <FaTimes size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}

          {error && (
            <div className="p-6">
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            </div>
          )}

          {!loading && !error && formattedOrderData && (
            <div className="p-6 space-y-6">
              {/* Order Information Card */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">معلومات الطلب</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <span className="text-sm font-medium text-gray-500">رقم الطلب:</span>
                    <p className="text-gray-900">{formattedOrderData.purchase_order_id}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">المورد:</span>
                    <p className="text-gray-900">{formattedOrderData.supplier_name}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">المستودع:</span>
                    <p className="text-gray-900">{formattedOrderData.warehouse_name}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">التاريخ:</span>
                    <p className="text-gray-900">{formattedOrderData.formatted_date}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">الحالة:</span>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${statusColors[formattedOrderData.purchase_order_status] || 'bg-gray-100 text-gray-800'}`}>
                      {formattedOrderData.purchase_order_status}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">إجمالي الطلب:</span>
                    <p className="text-lg font-semibold text-green-600">{formatMoney(orderTotals.grandTotal)}</p>
                  </div>
                </div>
                {formattedOrderData.purchase_order_notes && (
                  <div className="mt-4">
                    <span className="text-sm font-medium text-gray-500">ملاحظات:</span>
                    <p className="text-gray-900 mt-1">{formattedOrderData.purchase_order_notes}</p>
                  </div>
                )}
              </div>

              {/* Items Table */}
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">عناصر الطلب</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          المنتج
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          نوع التعبئة
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          الكمية
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          سعر الوحدة
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          الإجمالي
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {formattedOrderData.items.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {item.display_name}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.packaging_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {parseFloat(item.purchase_order_items_quantity_ordered || item.purchase_order_items_quantity || 0).toLocaleString('en-GB')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatMoney(item.purchase_order_items_unit_cost || item.purchase_order_items_unit_price || 0)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {formatMoney(item.calculated.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Order Summary */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">ملخص الطلب</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">المجموع الفرعي:</span>
                    <span className="font-medium">{formatMoney(orderTotals.subtotal)}</span>
                  </div>
                  {orderTotals.orderDiscount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">خصم على الطلب:</span>
                      <span className="font-medium text-red-600">-{formatMoney(orderTotals.orderDiscount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-semibold pt-2 border-t border-gray-300">
                    <span>الإجمالي النهائي:</span>
                    <span className="text-green-600">{formatMoney(orderTotals.grandTotal)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-4 rtl:space-x-reverse p-6 border-t border-gray-200 bg-gray-50 print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};

export default PurchaseOrderDetailsModal;
