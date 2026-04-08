// src/components/dashboard/tabs/sales-management/sales-orders/SalesOrderDetailsModal.jsx
import React, { useState, useEffect } from 'react';
import { XMarkIcon, PrinterIcon } from '@heroicons/react/24/outline';
import { getSalesOrderDetails } from '../../../../../apis/sales_orders';
import { formatCurrency } from '../../../../../utils/currency';

export default function SalesOrderDetailsModal({ 
  order, 
  onClose
}) {
  const [orderDetails, setOrderDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  const getStatusDisplay = (status) => {
    const translations = {
      'Draft': 'مسودة',
      'Pending': 'في الانتظار',
      'Approved': 'مُعتمد',
      'Invoiced': 'تم إصدار الفاتورة',
      'Cancelled': 'ملغي'
    };
    return translations[status] || status;
  };

  const getStatusColor = (status) => {
    const colors = {
      'Draft': 'bg-gray-100 text-gray-800',
      'Pending': 'bg-yellow-100 text-yellow-800',
      'Approved': 'bg-blue-100 text-blue-800',
      'Invoiced': 'bg-indigo-100 text-indigo-800',
      'Cancelled': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // Load order details when modal opens
  useEffect(() => {
    const loadOrderDetails = async () => {
      try {
        setLoading(true);
        const details = await getSalesOrderDetails(order.sales_orders_id || order.id);
        setOrderDetails(details);
      } catch (error) {
        console.error('Error loading order details:', error);
      } finally {
        setLoading(false);
      }
    };

    if (order) {
      loadOrderDetails();
    }
  }, [order]);

  const currentOrder = orderDetails || order || {};
  const orderIdDisplay = currentOrder.sales_orders_id || currentOrder.id || '—';
  // Precompute discount/tax breakdowns for UI
  const itemsArray = Array.isArray(currentOrder.items) ? currentOrder.items : [];
  // Helper: normalize stored discount to a per-line absolute amount.
  // Some historical records store a per-unit discount value instead of a line total.
  // Heuristic: if stored raw discount looks like a per-unit value AND raw*qty <= subtotal, treat as per-unit.
  const getItemDiscount = (it) => {
    // Use the stored discount amount as the definitive line discount.
    // The forms submit `sales_order_items_discount_amount` as the line total (discount_per_unit * qty),
    // so the backend should have the line total. Avoid assumptions here to prevent double-multiplication.
    return parseFloat(it.sales_order_items_discount_amount ?? it.discount_amount ?? 0) || 0;
  };
  // Sum item discounts (fallbacks included) - some records may store per-line total or per-unit * qty
  const itemsDiscountTotal = itemsArray.reduce((sum, it) => sum + getItemDiscount(it), 0);
  const orderLevelDiscount = parseFloat(currentOrder.sales_orders_discount_amount ?? currentOrder.discount_amount ?? 0) || 0;
  const combinedDiscount = itemsDiscountTotal + orderLevelDiscount;
  const subtotalValue = parseFloat(currentOrder.sales_orders_subtotal ?? 0) || 0;
  // If backend didn't provide a total tax, compute it from items fallback
  const totalTaxValue = (() => {
    const backendTax = parseFloat(currentOrder.sales_orders_tax_amount ?? 0) || 0;
    if (backendTax > 0) return backendTax;
    // derive from item tax rates/amounts
    return itemsArray.reduce((s, it) => {
      const qty = parseFloat(it.sales_order_items_quantity || 0);
      const unitPrice = parseFloat(it.sales_order_items_unit_price || 0);
      const taxRate = parseFloat(it.sales_order_items_tax_rate || it.sales_order_items_tax_percent || it.sales_order_items_tax || 0) || 0;
      const explicitTax = parseFloat(it.sales_order_items_tax_amount || it.tax_amount || 0) || 0;
      if (explicitTax > 0) return s + explicitTax;
      if (taxRate > 0) return s + (qty * unitPrice * (taxRate / 100));
      return s;
    }, 0);
  })();

  const handlePrint = async () => {
    try {
      const o = currentOrder || {};
      const items = Array.isArray(o.items) ? o.items : [];
      const itemsForPrint = items.map((item, idx) => {
        const orderedQuantity = parseFloat(item.sales_order_items_quantity || 0);
        const deliveredQuantity = parseFloat(item.delivered_quantity || 0);
        const returnedQuantity = parseFloat(item.returned_quantity || item.sales_order_items_quantity_returned || 0);
        const remainingQuantity = Math.max(0, orderedQuantity - deliveredQuantity - returnedQuantity);
        const unitPrice = parseFloat(item.sales_order_items_unit_price || 0);
        // Normalize discount to per-line total for printing
        const discount = getItemDiscount(item);
        const taxRate = parseFloat(item.sales_order_items_tax_rate || item.sales_order_items_tax_percent || item.sales_order_items_tax || 0) || 0;
        // If tax amount stored use it, otherwise derive from unitPrice * qty * rate
        let taxAmount = parseFloat(item.sales_order_items_tax_amount || item.tax_amount || 0) || 0;
        if (!taxAmount && taxRate > 0) {
          taxAmount = (unitPrice * orderedQuantity) * (taxRate / 100);
        }
        const totalPrice = parseFloat(item.sales_order_items_total_price || ((orderedQuantity * unitPrice) - discount + taxAmount) || 0);
        return {
          serial: idx + 1,
          name: item.variant_name || item.product_name || 'غير محدد',
          sku: item.variant_sku || item.product_sku || '—',
            packaging: item.packaging_types_name || '—',
          quantity: orderedQuantity,
          delivered: deliveredQuantity,
          returned: returnedQuantity,
          remaining: remainingQuantity,
          unit_price: unitPrice,
          discount: discount,
          tax_rate: taxRate,
          tax_amount: taxAmount,
          total: totalPrice
        };
      });
    const subtotal = itemsForPrint.reduce((s,i)=> s + (i.quantity * i.unit_price),0);
  const totalDiscount = itemsForPrint.reduce((s,i)=> s + i.discount,0); // خصم المنتجات
  const orderDiscount = parseFloat(o.sales_orders_discount_amount || o.discount_amount || 0) || 0; // خصم الطلب
  const combined = totalDiscount + orderDiscount; // إجمالي الخصم
  const totalTax = itemsForPrint.reduce((s,i)=> s + i.tax_amount,0);
      const grandTotal = parseFloat(o.sales_orders_total_amount || o.total_amount || (subtotal - totalDiscount + totalTax) || 0);
      const currentDate = new Date();
      const printContent = `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8" /><title>أمر بيع #${o.sales_orders_id || o.id}</title>
      <style>
        body { font-family: Arial, 'Tajawal', sans-serif; margin:20px; direction:rtl; }
        .order-container { max-width: 1000px; margin:auto; }
        .header { text-align:center; margin-bottom:25px; }
        h1 { margin:0; font-size:24px; }
        .order-info { display:flex; flex-wrap:wrap; gap:20px; margin-bottom:25px; }
        .info-section { flex:1 1 300px; border:2px solid #000; padding:15px; }
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
          <div class="header"><h1>أمر بيع رقم #${o.sales_orders_id || o.id}</h1></div>
          <div class="order-info">
            <div class="info-section">
              <h3>معلومات الطلب</h3>
              <div class="info-row"><span class="info-label">رقم الطلب:</span><span>#${o.sales_orders_id || o.id}</span></div>
              <div class="info-row"><span class="info-label">تاريخ الطلب:</span><span>${o.sales_orders_order_date ? new Date(o.sales_orders_order_date).toLocaleDateString('en-GB') : '—'}</span></div>
              <div class="info-row"><span class="info-label">حالة الطلب:</span><span>${o.sales_orders_status || o.status || '—'}</span></div>
              <div class="info-row"><span class="info-label">المندوب:</span><span>${o.representative_name || 'غير محدد'}</span></div>
            </div>
            <div class="info-section">
              <h3>معلومات العميل</h3>
              <div class="info-row"><span class="info-label">اسم العميل:</span><span>${o.clients_company_name || o.clients_contact_name || 'غير محدد'}</span></div>
              <div class="info-row"><span class="info-label">المخزن:</span><span>${o.warehouse_name || o.warehouses_name || 'غير محدد'}</span></div>
              <div class="info-row"><span class="info-label">عنوان العميل:</span><span>${o.clients_address || 'غير محدد'}</span></div>
              <div class="info-row"><span class="info-label">هاتف العميل:</span><span>${o.clients_phone || 'غير محدد'}</span></div>
            </div>
          </div>
          ${itemsForPrint.length ? `<table class="items-table"><thead><tr><th>م</th><th>اسم المنتج</th><th>كود المنتج</th><th>نوع التعبئة</th><th>الكمية المطلوبة</th><th>الكمية المُسلَّمة</th><th>الكمية المرتجعة</th><th>المتبقي</th><th>سعر الوحدة</th><th>الخصم</th><th>الضريبة</th><th>المجموع</th></tr></thead><tbody>${itemsForPrint.map(i=>`<tr><td>${i.serial}</td><td>${i.name}</td><td>${i.sku}</td><td>${i.packaging}</td><td>${i.quantity}</td><td>${i.delivered}</td><td>${i.returned}</td><td>${i.remaining}</td><td>${formatCurrency(i.unit_price)}</td><td>${formatCurrency(i.discount)}</td><td>${i.tax_rate>0?`${i.tax_rate}% (${formatCurrency(i.tax_amount)})`:'لا يوجد'}</td><td>${formatCurrency(i.total)}</td></tr>`).join('')}</tbody></table>`: ''}
          <div class="totals-section">
            <h3 style="margin-bottom:15px;">ملخص المبالغ</h3>
            <div class="totals-row"><span>المجموع الفرعي:</span><span>${formatCurrency(subtotal)}</span></div>
            <div class="totals-row"><span>خصم المنتجات:</span><span>${formatCurrency(totalDiscount)}</span></div>
            <div class="totals-row"><span>خصم الطلب:</span><span>${formatCurrency(orderDiscount)}</span></div>
            <div class="totals-row"><span>إجمالي الخصم:</span><span>${formatCurrency(combined)}</span></div>
            <div class="totals-row"><span>إجمالي الضريبة:</span><span>${formatCurrency(totalTax)}</span></div>
            <div class="totals-row grand-total"><span>المبلغ الإجمالي:</span><span>${formatCurrency(grandTotal)}</span></div>
          </div>
          ${o.sales_orders_notes ? `<div class="status-section"><h3>ملاحظات الطلب</h3><p>${o.sales_orders_notes}</p></div>` : ''}
          <div class="footer"><div class="signature-box"><div class="signature-label">توقيع العميل</div></div><div class="signature-box"><div class="signature-label">توقيع المندوب</div></div><div class="signature-box"><div class="signature-label">ختم الشركة</div></div></div>
          <div class="print-date">تم إنشاء هذا الأمر بتاريخ: ${currentDate.toLocaleDateString('en-GB')} ${currentDate.toLocaleTimeString('en-US')}</div>
        </div>
      </body></html>`;
  const { printHtml } = await import('../../../../../utils/printUtils.js');
  await printHtml(printContent, { title: 'تفاصيل أمر بيع', closeAfter: 700 });
    } catch(err){
      console.error('Print failed', err);
    }
  };

  // Debug hook removed

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" dir="rtl">
      <style>{`@media print {  body { background: #fff !important; }  body * { visibility: hidden; }  .order-details-print, .order-details-print * { visibility: visible; }  .order-details-print { position: absolute; inset: 0; width: 100% !important; max-height: none !important; overflow: visible !important; box-shadow: none !important; border: none !important; background: #fff !important; }  .no-print { display: none !important; } }`}</style>
  <div className="order-details-print relative top-10 mx-auto p-5 border w-11/12 md:w-4/5 lg:w-3/4 shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto flex flex-col">
        {/* Sticky Header */}
        <div className="sticky top-0 -mx-5 px-5 pt-4 pb-3 mb-4 bg-white border-b border-gray-200 z-20 shadow-sm flex items-center justify-between">
          <h3 className="text-lg md:text-xl font-bold text-gray-900 truncate">
            تفاصيل أمر البيع رقم #{orderIdDisplay}
          </h3>
          <div className="flex items-center gap-2 no-print">
            <button
              onClick={handlePrint}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-indigo-600 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              aria-label="طباعة أمر البيع"
            >
              <PrinterIcon className="w-4 h-4" />
              <span>طباعة</span>
            </button>
            <button
              onClick={onClose}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400"
              aria-label="إغلاق"
            >
              <XMarkIcon className="w-4 h-4" />
              <span>إغلاق</span>
            </button>
          </div>
        </div>

  <div className="flex-1">
        {loading ? (
          <div className="flex justify-center items-center h-full py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            <span className="mr-3 text-gray-600">جاري تحميل التفاصيل...</span>
          </div>
        ) : (
          <div className="space-y-8 pb-8">
            {/* Top Summary Cards */}
            <section id="summary" className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                <SummaryCard label="رقم الطلب" value={`#${orderIdDisplay}`} accent="indigo" />
                <SummaryCard label="العميل" value={currentOrder.clients_company_name || currentOrder.client_name || '—'} />
                <SummaryCard label="المستودع" value={currentOrder.warehouse_name || 'غير محدد'} />
                <SummaryCard label="التاريخ" value={currentOrder.sales_orders_order_date ? new Date(currentOrder.sales_orders_order_date).toLocaleDateString('en-GB') : '—'} />
                <SummaryCard label="عدد البنود" value={(currentOrder.items?.length || 0).toLocaleString('en-US')} />
                <SummaryCard label="الحالة" value={getStatusDisplay(currentOrder.sales_orders_status || currentOrder.status)} badgeColor={getStatusColor(currentOrder.sales_orders_status || currentOrder.status)} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
                <SummaryCard label="الإجمالي الفرعي" value={formatCurrency(subtotalValue)} compact />
                <SummaryCard label="خصم المنتجات" value={formatCurrency(itemsDiscountTotal)} compact />
                <SummaryCard label="خصم الطلب" value={formatCurrency(orderLevelDiscount)} compact />
                <SummaryCard label="إجمالي الخصم" value={formatCurrency(combinedDiscount)} compact />
                <SummaryCard label="الضريبة" value={formatCurrency(totalTaxValue)} compact />
                <SummaryCard label="الإجمالي" value={formatCurrency(parseFloat(currentOrder.sales_orders_total_amount || currentOrder.total_amount || 0))} accent="green" compact />
              </div>
              {/* Anchor Nav */}
              <nav className="no-print flex flex-wrap gap-2 text-xs font-medium mt-2" aria-label="أقسام التفاصيل">
                <a href="#items" className="px-3 py-1 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition">المنتجات</a>
                <a href="#financial" className="px-3 py-1 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition">الملخص المالي</a>
                {currentOrder.sales_orders_notes && <a href="#notes" className="px-3 py-1 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition">ملاحظات</a>}
              </nav>
            </section>

            {/* Order Items */}
            {currentOrder.items && currentOrder.items.length > 0 && (
              <section id="items" className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-gray-900">منتجات الطلب <span className="text-sm font-normal text-gray-500">({currentOrder.items.length} منتج)</span></h4>
                  <span className="hidden sm:inline text-xs text-gray-500">تم التحديث: {currentOrder.sales_orders_updated_at ? new Date(currentOrder.sales_orders_updated_at).toLocaleDateString('en-GB') : '—'}</span>
                </div>
                <div className="overflow-x-auto rounded-md border">
                  <table className="min-w-full text-xs md:text-sm">
                    <thead className="bg-gray-100 text-gray-700">
                      <tr>
                        <th className="px-3 py-2 text-right font-semibold">#</th>
                        <th className="px-3 py-2 text-right font-semibold">المنتج</th>
                        <th className="px-3 py-2 text-right font-semibold">التعبئة</th>
                        <th className="px-3 py-2 text-right font-semibold">المطلوب</th>
                        <th className="px-3 py-2 text-right font-semibold">المُسلَّم</th>
                        <th className="px-3 py-2 text-right font-semibold">المرتجع</th>
                        <th className="px-3 py-2 text-right font-semibold">المتبقي</th>
                        <th className="px-3 py-2 text-right font-semibold">سعر الوحدة</th>
                        <th className="px-3 py-2 text-right font-semibold">الخصم</th>
                        <th className="px-3 py-2 text-right font-semibold">الضريبة</th>
                        <th className="px-3 py-2 text-right font-semibold">المجموع</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {currentOrder.items.map((item, index) => {
                        const orderedQuantity = parseFloat(item.sales_order_items_quantity || 0);
                        const deliveredQuantity = parseFloat(item.delivered_quantity || 0);
                        const returnedQuantity = parseFloat(item.returned_quantity || item.sales_order_items_quantity_returned || 0);
                        const remainingQuantity = Math.max(0, orderedQuantity - deliveredQuantity - returnedQuantity);
                        return (
                          <tr key={index} className="hover:bg-indigo-50/40">
                            <td className="px-3 py-2 text-gray-500 font-medium">{index+1}</td>
                            <td className="px-3 py-2 text-gray-900 font-medium">{item.variant_name || 'غير محدد'}</td>
                            <td className="px-3 py-2 text-gray-600">{item.packaging_types_name || '—'}</td>
                            <td className="px-3 py-2 text-gray-900 font-semibold">{orderedQuantity}</td>
                            <td className="px-3 py-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                deliveredQuantity > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
                              }`}>
                                {deliveredQuantity}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                returnedQuantity > 0 ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-500'
                              }`}>
                                {returnedQuantity}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                remainingQuantity === 0 ? 'bg-green-100 text-green-800' : 
                                remainingQuantity < orderedQuantity ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {remainingQuantity}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-gray-900">{formatCurrency(parseFloat(item.sales_order_items_unit_price || 0))}</td>
                            <td className="px-3 py-2 text-gray-500">{formatCurrency(parseFloat(item.sales_order_items_discount_amount || item.discount_amount || 0))}</td>
                            <td className="px-3 py-2 text-gray-500">
                              {(() => {
                                const taxRate = parseFloat(item.sales_order_items_tax_rate || item.sales_order_items_tax_percent || item.sales_order_items_tax || 0) || 0;
                                const hasTax = (item.sales_order_items_has_tax || item.sales_order_items_has_tax === 1) || taxRate > 0;
                                let taxAmount = parseFloat(item.sales_order_items_tax_amount || item.tax_amount || 0) || 0;
                                if (!taxAmount && hasTax && taxRate > 0) {
                                  const qty = parseFloat(item.sales_order_items_quantity || 0);
                                  const up = parseFloat(item.sales_order_items_unit_price || 0);
                                  taxAmount = qty * up * (taxRate / 100);
                                }
                                return hasTax ? `${taxRate}% (${formatCurrency(taxAmount)})` : 'لا يوجد';
                              })()}
                            </td>
                            <td className="px-3 py-2 font-semibold text-gray-900">{formatCurrency(parseFloat(item.sales_order_items_total_price || 0))}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
            {/* Additional & Financial Section */}
            <section id="financial" className="bg-gray-50 border border-gray-200 rounded-lg p-5">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">الملخص المالي</h4>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
                <InfoStat label="المجموع الفرعي" value={formatCurrency(subtotalValue)} />
                <InfoStat label="خصم المنتجات" value={formatCurrency(itemsDiscountTotal)} />
                <InfoStat label="خصم الطلب" value={formatCurrency(orderLevelDiscount)} />
                <InfoStat label="إجمالي الخصم" value={formatCurrency(combinedDiscount)} />
                <InfoStat label="الضريبة" value={formatCurrency(totalTaxValue)} />
                <InfoStat label="الإجمالي" value={formatCurrency(parseFloat(currentOrder.sales_orders_total_amount || currentOrder.total_amount || 0))} highlight />
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <InfoStat label="تاريخ الإنشاء" value={currentOrder.sales_orders_created_at ? new Date(currentOrder.sales_orders_created_at).toLocaleString('ar-EG') : '—'} />
                <InfoStat label="آخر تحديث" value={currentOrder.sales_orders_updated_at ? new Date(currentOrder.sales_orders_updated_at).toLocaleString('ar-EG') : '—'} />
              </div>
            </section>

            {currentOrder.sales_orders_notes && (
              <section id="notes" className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                <h4 className="text-lg font-semibold text-gray-900 mb-3">ملاحظات</h4>
                <p className="text-sm leading-relaxed text-gray-800 whitespace-pre-line">{currentOrder.sales_orders_notes}</p>
              </section>
            )}
          </div>
        )}
        </div>

  {/* Footer */}
  <div className="flex justify-end pt-4 mt-2 border-t border-gray-200 no-print">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Small Presentational Components ---
function SummaryCard({ label, value, accent, badgeColor, compact }) {
  const containerCls = `rounded-lg border border-gray-200 bg-white p-3 flex flex-col gap-1 ${compact ? 'min-h-[70px]' : 'min-h-[90px]'}`;
  if (badgeColor) {
    return (
      <div className={containerCls}>
        <span className="text-[11px] text-gray-500 font-medium">{label}</span>
        <span className={`inline-flex w-fit px-2 py-1 rounded-full text-xs font-semibold mt-1 ${badgeColor}`}>{value}</span>
      </div>
    );
  }
  const accentColor = accent === 'green' ? 'text-green-600' : accent === 'indigo' ? 'text-indigo-600' : 'text-gray-800';
  return (
    <div className={containerCls}>
      <span className="text-[11px] text-gray-500 font-medium">{label}</span>
      <span className={`text-sm font-semibold ${accentColor}`}>{value}</span>
    </div>
  );
}

function InfoStat({ label, value, highlight }) {
  return (
    <div className={`rounded-md border bg-white p-3 flex flex-col gap-1 ${highlight ? 'ring-1 ring-green-200' : ''}`}> 
      <span className="text-[11px] text-gray-500 font-medium">{label}</span>
      <span className={`text-sm font-semibold ${highlight ? 'text-green-600' : 'text-gray-800'}`}>{value}</span>
    </div>
  );
}
