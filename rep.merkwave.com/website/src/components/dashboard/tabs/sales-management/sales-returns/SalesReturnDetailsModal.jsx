// src/components/dashboard/tabs/sales-management/sales-returns/SalesReturnDetailsModal.jsx
import React from 'react';
import { XMarkIcon, PrinterIcon } from '@heroicons/react/24/outline';
import { formatCurrency } from '../../../../../utils/currency.js';

export default function SalesReturnDetailsModal({ 
  returnItem, 
  onClose, 
  clients = [], 
  // products = [],     // Currently unused
  // baseUnits = [],    // Currently unused
  // packagingTypes = [], // Currently unused 
  warehouses = [],
  onPrint,
  loading = false
}) {
  const getStatusDisplay = (status) => {
    const statusOptions = {
      pending: 'معلق',
      approved: 'موافق عليه',
      processed: 'تم المعالجة',
      completed: 'مكتمل',
      rejected: 'مرفوض'
    };
    return statusOptions[status] || status;
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-blue-100 text-blue-800',
      processed: 'bg-indigo-100 text-indigo-800',
      completed: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getReasonDisplay = (reason) => {
    const reasons = {
      damaged: 'منتج تالف',
      wrong_product: 'منتج خطأ',
      expired: 'منتج منتهي الصلاحية',
      quality_issues: 'مشاكل في الجودة',
      customer_request: 'طلب العميل',
      other: 'أخرى'
    };
    return reasons[reason] || reason;
  };

  // Normalization helpers
  const normalizeDate = (val) => {
    if (!val) return '-';
    // Handle potential "YYYY-MM-DD HH:MM:SS" by replacing space for Safari compatibility
    const d = new Date(String(val).replace(' ', 'T'));
    if (isNaN(d.getTime())) return '-';
    // Gregorian date (ISO part) or localized English
    return new Intl.DateTimeFormat('en-GB').format(d); // DD/MM/YYYY
  };
  const formatNumber = (num, opts={}) => {
    const n = Number(num);
    if (isNaN(n)) return '0';
    return n.toLocaleString('en-US', {minimumFractionDigits: opts.minFrac ?? 2, maximumFractionDigits: opts.maxFrac ?? 2});
  };

  // Unwrap if wrapped
  const data = returnItem && returnItem.data && (returnItem.data.returns_id || Array.isArray(returnItem.data.items)) ? returnItem.data : returnItem;

  const returnNumber = data.returns_return_number || data.return_number || data.returns_id || data.id || '-';
  const clientId = data.returns_client_id || data.client_id;
  const clientName = data.clients_company_name || data.returns_client_name || data.client_name || (clients.find(c => (c.clients_id || c.id) == clientId)?.clients_company_name) || 'غير محدد';
  const warehouseId = data.returns_warehouse_id || data.warehouse_id;
  const warehouseName = warehouseId ? (warehouses.find(w => (w.warehouses_id || w.id) == warehouseId)?.warehouses_name || warehouses.find(w => (w.id) == warehouseId)?.name) : null;
  const statusVal = data.returns_status || data.status;
  const reasonVal = data.returns_reason || data.reason;
  const notesVal = data.returns_notes || data.notes;
  const totalAmountVal = data.returns_total_amount || data.total_amount;
  const salesOrderId = data.returns_sales_order_id || data.sales_order_link_id; // from detailed endpoint
  const visitId = data.sales_returns_visit_id || data.visit_id;
  const createdBy = data.created_by_user_name || data.users_name;
  const dateVal = data.returns_date || data.return_date;
  const createdAtVal = data.returns_created_at || data.created_at;
  const updatedAtVal = data.returns_updated_at || data.updated_at;
  // Helper to compute tax for a return item in a consistent way.
  const computeItemTax = (it) => {
    const qty = Number(it.return_items_quantity || it.quantity || 0) || 0;
    const unitPrice = Number(it.return_items_unit_price || it.sales_order_items_unit_price || 0) || 0;
    const discountTotal = Number(it.return_items_discount_amount || it.sales_order_items_discount_amount || 0) || 0;
    const orderedQty = Number(it.ordered_quantity || it.sales_order_items_quantity || qty) || 1;
    const itemDiscount = qty > 0 ? (discountTotal / orderedQty) * qty : 0;

    const returnTaxRaw = it.return_items_tax_amount;
    const salesTaxTotal = Number(it.sales_order_items_tax_amount || 0) || 0;
    const salesTaxRate = Number(it.sales_order_items_tax_rate || it.return_items_tax_rate || 0) || 0;

    const hasExplicitReturnTax = returnTaxRaw !== undefined && returnTaxRaw !== null && String(returnTaxRaw).trim() !== '';
    const explicitReturnTaxValue = hasExplicitReturnTax ? Number(returnTaxRaw) || 0 : null;

    if (hasExplicitReturnTax && explicitReturnTaxValue > 0) {
      return explicitReturnTaxValue;
    }
    if (salesTaxTotal > 0 && orderedQty > 0) {
      return (salesTaxTotal * (qty / orderedQty));
    }
    if (salesTaxRate > 0) {
      return ((unitPrice * qty) - itemDiscount) * (salesTaxRate / 100);
    }
    return 0;
  };
  // Compute sums deterministically from item unit price, quantity, discount and tax fields.
  // Some older records may store ambiguous `total_price` (gross vs net). Prefer explicit fields
  // and derive the base (subtotal) as: unit_price * qty - prorated_item_discount.
  const sums = (() => {
    if (!Array.isArray(data.items)) return { base: 0, tax: 0, gross: 0 };
    let taxSum = 0;
    let baseSum = 0;
    let grossSum = 0;
    data.items.forEach(it => {
      const qty = Number(it.return_items_quantity || it.quantity || 0) || 0;
      const unitPrice = Number(it.return_items_unit_price || it.sales_order_items_unit_price || 0) || 0;
      const discountTotal = Number(it.return_items_discount_amount || it.sales_order_items_discount_amount || 0) || 0;
      const orderedQty = Number(it.ordered_quantity || it.sales_order_items_quantity || qty) || 1;
      const itemDiscount = qty > 0 ? (discountTotal / orderedQty) * qty : 0;
      const tax = computeItemTax(it);
      taxSum += tax;
      grossSum += (unitPrice * qty);
      baseSum += (unitPrice * qty) - itemDiscount;
    });
    return { base: baseSum, tax: taxSum, gross: grossSum };
  })();
  const derivedSubtotal = sums.base;
  const derivedTax = sums.tax;

  // Always rely on computed (derived) amounts; keep original header for reference only
  const headerReportedTotal = Number(totalAmountVal) || 0;
  const effectiveSubtotal = derivedSubtotal;
  const effectiveTax = derivedTax;
  
  // Calculate total discount from items (prorated by ordered quantity)
  const itemDiscountSum = Array.isArray(data.items) ? data.items.reduce((sum, it) => {
    const qty = Number(it.return_items_quantity || it.quantity || 0) || 0;
    const discount = Number(it.return_items_discount_amount || it.discount_amount || it.sales_order_items_discount_amount || 0) || 0;
    const orderedQty = Number(it.ordered_quantity || it.sales_order_items_quantity || 1) || 1;
    const itemDiscount = qty > 0 ? (discount / orderedQty) * qty : 0;
    return sum + itemDiscount;
  }, 0) : 0;

  // Order-level discount from the linked sales order (if provided by backend)
  const headerOrderDiscount = Number(data.sales_orders_discount_amount || data.sales_order_discount_amount || data.sales_orders_discount || 0) || 0;

  // Pro-rate order-level discount according to returned quantities vs ordered quantities
  const totalOrderedQty = Array.isArray(data.items) ? data.items.reduce((s, it) => s + (Number(it.ordered_quantity || it.sales_order_items_quantity || 0) || 0), 0) : 0;
  const totalReturnedQty = Array.isArray(data.items) ? data.items.reduce((s, it) => s + (Number(it.return_items_quantity || it.quantity || 0) || 0), 0) : 0;
  const proratedOrderDiscount = (headerOrderDiscount && totalOrderedQty > 0) ? (headerOrderDiscount * totalReturnedQty / totalOrderedQty) : 0;

  const totalDisplayedDiscount = itemDiscountSum + proratedOrderDiscount;

  const computedTotal = effectiveSubtotal + effectiveTax - proratedOrderDiscount;
  const showHeaderNote = headerReportedTotal > 0 && Math.abs(headerReportedTotal - computedTotal) > 0.01;

  const items = Array.isArray(data.items) ? data.items : [];

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" dir="rtl">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">تفاصيل مرتجع البيع - {returnNumber}</h3>
          <div className="flex items-center gap-2">
            {!loading && (
              <button
                onClick={() => onPrint && onPrint(returnItem)}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
                disabled={loading}
              >
                <PrinterIcon className="h-4 w-4" /> طباعة
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {loading && (
          <div className="py-10 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent mb-3" />
            <p className="text-sm text-gray-600">جاري تحميل التفاصيل الكاملة...</p>
          </div>
        )}

        {!loading && (
          <>
            {/* Content */}
            <div className="mt-4 space-y-4">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">رقم المرتجع</label>
              <p className="mt-1 text-sm text-gray-900">{returnNumber}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">العميل</label>
              <p className="mt-1 text-sm text-gray-900">{clientName}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">تاريخ المرتجع</label>
              <p className="mt-1 text-sm text-gray-900">
                {normalizeDate(dateVal)}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">الحالة</label>
              <div className="mt-1">
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(statusVal)}`}>
      {getStatusDisplay(statusVal)}
                </span>
              </div>
            </div>

    {warehouseId && (
              <div>
                <label className="block text-sm font-medium text-gray-700">المستودع</label>
        <p className="mt-1 text-sm text-gray-900">{warehouseName || 'غير محدد'}</p>
              </div>
            )}

    {salesOrderId && (
              <div>
                <label className="block text-sm font-medium text-gray-700">رقم أمر البيع المرتبط</label>
                <p className="mt-1 text-sm text-blue-700 font-medium">{salesOrderId}</p>
              </div>
            )}

  {computedTotal !== null && (
              <div>
                <label className="block text-sm font-medium text-gray-700">المبلغ الإجمالي</label>
  <p className="mt-1 text-sm text-gray-900">{formatCurrency(computedTotal)} { showHeaderNote && <span className="text-xs text-orange-500 ml-1">(القيمة الأصلية: {formatCurrency(headerReportedTotal)})</span> }</p>
              </div>
            )}
  {effectiveSubtotal !== null && effectiveTax !== null && (
              <div className="md:col-span-2">
                <div className="bg-white p-4 rounded-lg border">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                      <span className="text-gray-700">المجموع الفرعي:</span>
                      <span className="font-medium text-gray-900">{formatCurrency(effectiveSubtotal)}</span>
                    </div>
                    
                    {itemDiscountSum > 0 && (
                      <div className="flex justify-between items-center py-2">
                        <span className="text-gray-700">خصم الأصناف:</span>
                        <span className="font-medium text-gray-900">{formatCurrency(itemDiscountSum)}</span>
                      </div>
                    )}

                    {proratedOrderDiscount > 0 && (
                      <div className="flex justify-between items-center py-2">
                        <span className="text-gray-700">خصم الطلب الإجمالي:</span>
                        <span className="font-medium text-gray-900">{formatCurrency(proratedOrderDiscount)}</span>
                      </div>
                    )}

                    {(totalDisplayedDiscount > 0) && (
                      <div className="flex justify-between items-center py-2">
                        <span className="text-gray-700 font-medium">إجمالي الخصم:</span>
                        <span className="font-medium text-gray-900">{formatCurrency(totalDisplayedDiscount)}</span>
                      </div>
                    )}
                    
                    {effectiveTax > 0 && (
                      <div className="flex justify-between items-center py-2">
                        <span className="text-gray-700">إجمالي الضريبة:</span>
                        <span className="font-medium text-gray-900">{formatCurrency(effectiveTax)}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center py-3 border-t border-gray-300 bg-gray-50 -mx-4 px-4">
                      <span className="text-lg font-bold text-gray-900">الإجمالي النهائي:</span>
                      <span className="text-lg font-bold text-gray-900">{formatCurrency(computedTotal)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
    {createdBy && (
              <div>
                <label className="block text-sm font-medium text-gray-700">أنشئ بواسطة</label>
                <p className="mt-1 text-sm text-gray-900">{createdBy}</p>
              </div>
            )}
    {visitId && (
              <div>
                <label className="block text-sm font-medium text-gray-700">رقم الزيارة</label>
                <p className="mt-1 text-sm text-gray-900">{visitId}</p>
              </div>
            )}
          </div>

          {/* Reason */}
      {reasonVal && (
            <div>
              <label className="block text-sm font-medium text-gray-700">سبب الإرجاع</label>
              <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
        {getReasonDisplay(reasonVal)}
              </p>
            </div>
          )}

          {/* Notes */}
      {notesVal && (
            <div>
              <label className="block text-sm font-medium text-gray-700">ملاحظات</label>
              <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
        {notesVal}
              </p>
            </div>
          )}

          {/* Items */}
          {items.length > 0 && (
            <div className="pt-4 border-t border-gray-200">
              <h4 className="text-md font-semibold text-gray-800 mb-3">العناصر</h4>
              <div className="overflow-x-auto border rounded-lg">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-right font-medium text-gray-600">#</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-600">المنتج</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-600">التعبئة</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-600">الكمية</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-600">سعر الوحدة</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-600">الخصم</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-600">الضريبة</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-600">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
        {items.map((it, idx) => {
      const qty = Number(it.return_items_quantity || it.quantity || 0) || 0;
      const unitPrice = Number(it.return_items_unit_price || it.sales_order_items_unit_price || 0) || 0;
      const discountTotal = Number(it.return_items_discount_amount || it.sales_order_items_discount_amount || 0) || 0;
      const orderedQty = Number(it.ordered_quantity || it.sales_order_items_quantity || qty) || 1;
      const itemDiscount = qty > 0 ? (discountTotal / orderedQty) * qty : 0;
  const tax = computeItemTax(it);
  const lineBase = (unitPrice * qty) - itemDiscount; // net line (before tax)
  const lineTotal = lineBase + tax; // final line total after tax
                      return (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-3 py-2">{idx + 1}</td>
                          <td className="px-3 py-2">{it.product_name || it.variant_name || '-'}</td>
                          <td className="px-3 py-2">{it.packaging_type_name || it.packaging_types_name || '-'}</td>
              <td className="px-3 py-2">{formatNumber(qty, {minFrac:0, maxFrac:2})}</td>
              <td className="px-3 py-2">{formatNumber(unitPrice)}</td>
              <td className="px-3 py-2">{formatNumber(itemDiscount)}</td>
              <td className="px-3 py-2">{formatNumber(tax)}</td>
              <td className="px-3 py-2 font-medium">{formatNumber(lineTotal)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-700">تاريخ الإنشاء</label>
              <p className="mt-1 text-sm text-gray-500">
        {normalizeDate(createdAtVal)}
              </p>
            </div>
            
      {updatedAtVal && updatedAtVal !== createdAtVal && (
              <div>
                <label className="block text-sm font-medium text-gray-700">تاريخ آخر تحديث</label>
                <p className="mt-1 text-sm text-gray-500">
          {normalizeDate(updatedAtVal)}
                </p>
              </div>
            )}
          </div>
            </div>
            {/* Footer */}
            <div className="flex justify-end pt-4 mt-4 border-t border-gray-200">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                إغلاق
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
