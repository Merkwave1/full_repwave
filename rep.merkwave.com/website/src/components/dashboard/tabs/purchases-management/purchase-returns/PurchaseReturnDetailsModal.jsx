// src/components/dashboard/tabs/purchases-management/purchase-returns/PurchaseReturnDetailsModal.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FaTimes, FaPrint } from 'react-icons/fa';
import Loader from '../../../../common/Loader/Loader';
import { getPurchaseReturnDetails } from '../../../../../apis/purchase_returns';
import useCurrency from '../../../../../hooks/useCurrency';

export default function PurchaseReturnDetailsModal({
  purchaseReturn,
  suppliers,
  onClose,
  onPrint
}) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const detailsData = await getPurchaseReturnDetails(purchaseReturn.purchase_returns_id);
        setDetails(detailsData);
      } catch (err) {
        console.error('Error loading purchase return details:', err);
        setError('فشل في تحميل تفاصيل مرتجع الشراء');
      } finally {
        setLoading(false);
      }
    };

    if (purchaseReturn?.purchase_returns_id) {
      loadDetails();
    }
  }, [purchaseReturn]);

  const { formatCurrency: formatMoney } = useCurrency();

  const calculateItemTotal = useCallback((item) => {
    const quantity = parseFloat(item.purchase_return_items_quantity) || 0;
    const unitPrice = parseFloat(item.purchase_return_items_unit_cost) || 0;
    const total = quantity * unitPrice;
    return { total };
  }, []);

  const supplierName = useMemo(() => {
    const sid = details?.purchase_returns_supplier_id;
    const s = suppliers?.find(x => x.supplier_id == sid);
    return s?.supplier_name || details?.supplier_name || 'غير محدد';
  }, [details, suppliers]);

  const formattedReturnData = useMemo(() => {
    if (!details) return null;
    return {
      ...details,
      formatted_date: details.purchase_returns_date ? new Date(details.purchase_returns_date).toLocaleDateString('en-GB') + ' ' + new Date(details.purchase_returns_date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '-',
      items: (details.items || []).map(it => ({
        ...it,
        display_name: it.products_name || it.variant_name || 'غير محدد',
        packaging_type_name: it.packaging_types_name || 'غير محدد',
        calculated: calculateItemTotal(it)
      }))
    };
  }, [details, calculateItemTotal]);

  const returnTotals = useMemo(() => {
    if (!formattedReturnData?.items) return { grandTotal: 0 };
    const itemsTotal = formattedReturnData.items.reduce((s, it) => s + (parseFloat(it.calculated.total) || 0), 0);
    // Try explicit fields first, otherwise try to parse a discount value from notes (e.g. "(خصم إرجاع: 3000)")
    let orderDiscount = parseFloat(formattedReturnData.purchase_returns_order_discount || formattedReturnData.purchase_return_order_discount || 0) || 0;
    if (!orderDiscount && formattedReturnData.purchase_returns_notes) {
      const notes = String(formattedReturnData.purchase_returns_notes || '');
      // Regex to catch Arabic 'خصم إرجاع' or generic 'discount' patterns followed by a number
      const reArabic = /خصم\s*إرجاع\s*[:：]?\s*([0-9.,]+)/i;
      const reGeneric = /discount\s*[:：]?\s*([0-9.,]+)/i;
      let m = notes.match(reArabic) || notes.match(reGeneric);
      if (m && m[1]) {
        // Remove commas and parse
        const cleaned = m[1].replace(/,/g, '');
        const parsed = parseFloat(cleaned);
        if (!isNaN(parsed)) orderDiscount = parsed;
      }
    }
    const grandTotal = Math.max(itemsTotal - orderDiscount, 0);
    return { itemsTotal, orderDiscount, grandTotal };
  }, [formattedReturnData]);

  const statusColors = {
    'Draft': 'bg-gray-100 text-gray-800',
    'Pending': 'bg-yellow-100 text-yellow-800',
    'Approved': 'bg-green-100 text-green-800',
    'Rejected': 'bg-red-100 text-red-800',
    'Processed': 'bg-blue-100 text-blue-800',
    'Cancelled': 'bg-red-100 text-red-800'
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
          <Loader className="mt-8" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
          <div className="p-6">
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!formattedReturnData) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-4 rtl:space-x-reverse">
            <h2 className="text-xl font-semibold text-gray-900">
              تفاصيل مرتجع الشراء #{formattedReturnData.purchase_returns_id}
            </h2>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[formattedReturnData.purchase_returns_status] || 'bg-gray-100 text-gray-800'}`}>
              {formattedReturnData.purchase_returns_status || 'غير محدد'}
            </span>
          </div>
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <button
              onClick={() => onPrint?.(details)}
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
          <div className="p-6 space-y-6">
            {/* Return Information Card */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">معلومات المرتجع</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <span className="text-sm font-medium text-gray-500">رقم المرتجع:</span>
                  <p className="text-gray-900">{formattedReturnData.purchase_returns_id}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">المورد:</span>
                  <p className="text-gray-900">{supplierName}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">التاريخ:</span>
                  <p className="text-gray-900">{formattedReturnData.formatted_date}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">الحالة:</span>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${statusColors[formattedReturnData.purchase_returns_status] || 'bg-gray-100 text-gray-800'}`}>
                    {formattedReturnData.purchase_returns_status || 'غير محدد'}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">أمر الشراء المرتبط:</span>
                  <p className="text-gray-900">{formattedReturnData.purchase_returns_purchase_order_id ? `#${formattedReturnData.purchase_returns_purchase_order_id}` : 'غير مرتبط'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">إجمالي المرتجع:</span>
                  <p className="text-lg font-semibold text-green-600">{formatMoney(returnTotals.grandTotal)}</p>
                </div>
              </div>
              {(formattedReturnData.purchase_returns_reason || formattedReturnData.purchase_returns_notes) && (
                <div className="mt-4">
                  {formattedReturnData.purchase_returns_reason && (
                    <div className="mb-2">
                      <span className="text-sm font-medium text-gray-500">سبب المرتجع:</span>
                      <p className="text-gray-900 mt-1">{formattedReturnData.purchase_returns_reason}</p>
                    </div>
                  )}
                  {formattedReturnData.purchase_returns_notes && (
                    <div>
                      <span className="text-sm font-medium text-gray-500">ملاحظات:</span>
                      <p className="text-gray-900 mt-1">{formattedReturnData.purchase_returns_notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Items Table */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">عناصر المرتجع</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">المنتج</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الكمية</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">سعر الوحدة</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {formattedReturnData.items.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-gray-500">لا توجد عناصر في هذا المرتجع</td>
                      </tr>
                    ) : (
                      formattedReturnData.items.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{item.display_name}</div>
                            <div className="text-xs text-gray-500">{item.packaging_type_name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {parseFloat(item.purchase_return_items_quantity).toLocaleString('en-GB')}
                          </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {formatMoney(item.purchase_return_items_unit_cost)}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {formatMoney(item.calculated.total)}
                                  </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">ملخص المرتجع</h3>
              <div className="space-y-2">
                { /* Show breakdown: items total, order discount (if any), grand total */ }
                <div className="flex justify-between">
                  <span className="text-gray-600">المجموع الفرعي:</span>
                  <span className="font-medium">{formatMoney(returnTotals.itemsTotal || 0)}</span>
                </div>
                {returnTotals.orderDiscount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">خصم على الطلب:</span>
                    <span className="font-medium text-red-600">-{formatMoney(returnTotals.orderDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-semibold pt-2 border-t border-gray-300">
                  <span>الإجمالي النهائي:</span>
                  <span className="text-green-600">{formatMoney(returnTotals.grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>
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
}
