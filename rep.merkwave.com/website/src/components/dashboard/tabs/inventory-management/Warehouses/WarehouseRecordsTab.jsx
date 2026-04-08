// src/components/dashboard/tabs/inventory-management/Warehouses/WarehouseRecordsTab.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { InboxArrowDownIcon, EyeIcon, CalendarIcon, PrinterIcon, XMarkIcon } from '@heroicons/react/24/outline';
import Loader from '../../../../common/Loader/Loader';
import Alert from '../../../../common/Alert/Alert';

export default function WarehouseRecordsTab({ 
  warehouses = [], 
  purchaseOrders = [], 
  products = [], 
  suppliers = [], 
  goodsReceipts = [],
  loading: propLoading = false, 
  error: propError = null, 
  setGlobalMessage, 
  onRefresh 
}) {
  const { setChildRefreshHandler } = useOutletContext();
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(propLoading);
  const [error, setError] = useState(propError);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [receiptDetails, setReceiptDetails] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const loadData = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);
      
      // Use the goodsReceipts data passed from the wrapper instead of making API call
      // Sort by date (new to old)
      const sortedReceipts = Array.isArray(goodsReceipts) 
        ? goodsReceipts.sort((a, b) => new Date(b.receipt_date || b.created_at) - new Date(a.receipt_date || a.created_at))
        : [];

      setReceipts(sortedReceipts);

    } catch (err) {
      console.error('Error processing receipts data:', err);
      setError(err.message || 'فشل في تحميل البيانات.');
      setGlobalMessage({ type: 'error', message: 'فشل في تحميل البيانات.' });
    } finally {
      setLoading(false);
    }
  }, [goodsReceipts, setGlobalMessage]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (setChildRefreshHandler) {
      setChildRefreshHandler(() => loadData);
    }
    return () => setChildRefreshHandler(null);
  }, [setChildRefreshHandler, loadData]);

  // Use prop loading and error states
  useEffect(() => {
    setLoading(propLoading);
  }, [propLoading]);

  useEffect(() => {
    setError(propError);
  }, [propError]);

  const handlePrint = async () => {
    const printContent = document.getElementById('receiving-history-table');
    
    const html = `
      <html dir="rtl">
        <head>
          <title>سجلات الاستلام</title>
          <style>
            body { font-family: Arial, sans-serif; direction: rtl; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .header { text-align: center; margin-bottom: 20px; }
            .print-date { text-align: left; margin-bottom: 10px; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="print-date">تاريخ الطباعة: ${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString('en-GB')}</div>
          <div class="header">
            <h1>سجلات الاستلام</h1>
            <p>إجمالي العمليات: ${receipts.length}</p>
          </div>
          ${printContent.outerHTML}
        </body>
      </html>
    `;
    try {
  const { printHtml } = await import('../../../../../utils/printUtils.js');
      await printHtml(html, { title: 'سجلات الاستلام', closeAfter: 700 });
    } catch (e) {
      console.error('Print error:', e);
      setGlobalMessage?.({ type: 'error', message: 'فشل في الطباعة.' });
    }
  };

  const handleViewDetails = async (receipt) => {
    try {
      setLoadingDetails(true);
      setSelectedReceipt(receipt);
      setShowDetailModal(true);
      
      // For now, just show the receipt data as details
      // In the future, you can add a separate API call for detailed receipt info
      setReceiptDetails(receipt);
    } catch (err) {
      console.error('Error loading receipt details:', err);
      setGlobalMessage({ type: 'error', message: 'فشل في تحميل تفاصيل الاستلام.' });
    } finally {
      setLoadingDetails(false);
    }
  };

  const handlePrintReceipt = async (receipt) => {
    try {
      const html = `
        <html dir="rtl">
          <head>
            <title>إيصال استلام رقم ${receipt.receipt_id}</title>
            <style>
              body { font-family: Arial, sans-serif; direction: rtl; padding: 20px; }
              .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
              .company-name { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
              .receipt-title { font-size: 18px; color: #666; }
              .receipt-info { margin: 20px 0; }
              .info-row { display: flex; justify-content: space-between; margin: 10px 0; }
              .info-label { font-weight: bold; }
              table { width: 100%; border-collapse: collapse; margin: 20px 0; }
              th, td { border: 1px solid #ddd; padding: 12px; text-align: right; }
              th { background-color: #f8f9fa; font-weight: bold; }
              .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="company-name">اسم الشركة</div>
              <div class="receipt-title">إيصال استلام رقم ${receipt.receipt_id}</div>
            </div>
            
            <div class="receipt-info">
              <div class="info-row">
                <span><span class="info-label">رقم الإيصال:</span> ${receipt.receipt_id}</span>
                <span><span class="info-label">التاريخ:</span> ${new Date(receipt.receipt_date || receipt.created_at).toLocaleDateString('ar-EG')}</span>
              </div>
              <div class="info-row">
                <span><span class="info-label">المخزن:</span> ${receipt.warehouse_name || 'غير محدد'}</span>
                <span><span class="info-label">المستلم:</span> ${receipt.received_by_user_name || 'غير محدد'}</span>
              </div>
              ${receipt.notes ? `<div class="info-row"><span class="info-label">ملاحظات:</span> ${receipt.notes}</div>` : ''}
            </div>

            <div class="footer">
              <p>تم الطباعة في: ${new Date().toLocaleDateString('ar-EG')} ${new Date().toLocaleTimeString('ar-EG')}</p>
            </div>
          </body>
        </html>
      `;
  const { printHtml } = await import('../../../../../utils/printUtils.js');
      await printHtml(html, { title: `إيصال استلام رقم ${receipt.receipt_id}`, closeAfter: 700 });
    } catch (err) {
      console.error('Error printing receipt:', err);
      setGlobalMessage({ type: 'error', message: 'فشل في طباعة الإيصال.' });
    }
  };

  if (loading) {
    return <Loader message="جاري تحميل سجلات الاستلام..." />;
  }

  if (error) {
    return <Alert type="error" message={error} />;
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <InboxArrowDownIcon className="h-8 w-8 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-800">سجلات الاستلام</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onRefresh}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <CalendarIcon className="h-5 w-5" />
            تحديث
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <PrinterIcon className="h-5 w-5" />
            طباعة
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {receipts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <InboxArrowDownIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg">لا توجد سجلات استلام</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table id="receiving-history-table" className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    رقم الإيصال
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    التاريخ
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    المخزن
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    المستلم
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ملاحظات
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {receipts.map((receipt) => (
                  <tr key={receipt.receipt_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {receipt.receipt_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(receipt.receipt_date || receipt.created_at).toLocaleDateString('ar-EG')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {receipt.warehouse_name || 'غير محدد'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {receipt.received_by_user_name || 'غير محدد'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {receipt.notes || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2 rtl:space-x-reverse">
                        <button
                          onClick={() => handleViewDetails(receipt)}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                          title="عرض التفاصيل"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handlePrintReceipt(receipt)}
                          className="text-gray-600 hover:text-gray-900 transition-colors"
                          title="طباعة الإيصال"
                        >
                          <PrinterIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Receipt Details Modal */}
      {showDetailModal && selectedReceipt && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                تفاصيل إيصال الاستلام رقم {selectedReceipt.receipt_id}
              </h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            {loadingDetails ? (
              <div className="text-center py-4">
                <Loader message="جاري تحميل التفاصيل..." />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">رقم الإيصال</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedReceipt.receipt_id}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">التاريخ</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {new Date(selectedReceipt.receipt_date || selectedReceipt.created_at).toLocaleDateString('ar-EG')}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">المخزن</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedReceipt.warehouse_name || 'غير محدد'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">المستلم</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedReceipt.received_by_user_name || 'غير محدد'}</p>
                  </div>
                </div>
                
                {selectedReceipt.notes && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">ملاحظات</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedReceipt.notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
