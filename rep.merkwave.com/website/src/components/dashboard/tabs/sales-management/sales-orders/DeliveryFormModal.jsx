// src/components/dashboard/tabs/sales-management/sales-orders/DeliveryFormModal.jsx
import React, { useState, useEffect } from 'react';
import { XMarkIcon, TruckIcon, InformationCircleIcon, PrinterIcon } from '@heroicons/react/24/outline';
import { addSalesDelivery } from '../../../../../apis/sales_deliveries';
import NumberInput from '../../../../common/NumberInput/NumberInput.jsx';
import { getCurrentLocalDateTime, localDateTimeToISOString } from '../../../../../utils/dateUtils';

const parseNumber = (value) => {
  if (value === undefined || value === null || value === '') return 0;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const normalizeId = (value) => {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'number') {
    return Number.isNaN(value) ? null : value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const asNumber = Number(trimmed);
    return Number.isNaN(asNumber) ? trimmed : asNumber;
  }
  if (typeof value === 'object') {
    if ('value' in value) return normalizeId(value.value);
    if ('id' in value) return normalizeId(value.id);
    if ('packaging_type_id' in value) return normalizeId(value.packaging_type_id);
  }
  return value;
};

const safeReadJson = (key) => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage?.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    console.warn(`[DeliveryFormModal] Failed to parse localStorage key ${key}:`, error);
    return null;
  }
};

const readInventoryCache = (warehouseId) => {
  const prioritizedKeys = [];
  if (warehouseId) {
    prioritizedKeys.push(`inventory_${warehouseId}`);
  }
  prioritizedKeys.push('appInventory');

  for (const key of prioritizedKeys) {
    const parsed = safeReadJson(key);
    if (!parsed) continue;

    const list = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.data)
        ? parsed.data
        : [];

    if (!Array.isArray(list) || list.length === 0) continue;

    if (key === 'appInventory' && warehouseId) {
      const normalizedWarehouseId = normalizeId(warehouseId);
      return list.filter((item) => {
        const itemWarehouseId = normalizeId(
          item?.warehouse_id ??
          item?.warehouses_id ??
          item?.inventory_warehouse_id ??
          item?.inventory_warehouseid ??
          item?.warehouse?.warehouse_id
        );
        if (itemWarehouseId === null) return true;
        return itemWarehouseId === normalizedWarehouseId;
      });
    }

    return list;
  }

  return [];
};

const collectBatchesFromCache = (inventoryCache, variantId, packagingTypeId) => {
  if (!Array.isArray(inventoryCache) || !variantId) return [];

  const normalizedVariantId = normalizeId(variantId);
  const normalizedPackagingId = normalizeId(packagingTypeId);

  const batches = inventoryCache
    .filter((item) => {
      const itemVariantId = normalizeId(
        item?.variant_id ??
        item?.product_variant_id ??
        item?.inventory_variant_id ??
        item?.variant?.variant_id
      );
      if (itemVariantId !== normalizedVariantId) return false;

      if (normalizedPackagingId !== null) {
        const itemPackagingId = normalizeId(
          item?.packaging_type_id ??
          item?.packaging_types_id ??
          item?.packaging_type?.packaging_type_id
        );
        if (itemPackagingId !== normalizedPackagingId) return false;
      }

      const quantity = parseNumber(
        item?.inventory_quantity ??
        item?.quantity ??
        item?.available_quantity ??
        item?.qty_available
      );
      return quantity > 0;
    })
    .map((item) => ({
      inventory_id: item?.inventory_id ?? item?.id ?? `${normalizedVariantId}_${item?.inventory_production_date ?? 'unknown'}`,
      inventory_quantity: parseNumber(
        item?.inventory_quantity ??
        item?.quantity ??
        item?.available_quantity ??
        item?.qty_available
      ),
      inventory_production_date: item?.inventory_production_date ?? item?.production_date ?? item?.inventory_expiration_date ?? item?.batch_date ?? '',
      packaging_type_id: normalizeId(item?.packaging_type_id ?? item?.packaging_types_id) ?? normalizedPackagingId,
      packaging_type_name: item?.packaging_type_name ?? item?.packaging_types_name ?? item?.packaging_type ?? '',
    }));

  return batches.sort((a, b) => {
    const dateA = a.inventory_production_date ? new Date(a.inventory_production_date).getTime() : Number.POSITIVE_INFINITY;
    const dateB = b.inventory_production_date ? new Date(b.inventory_production_date).getTime() : Number.POSITIVE_INFINITY;
    return dateA - dateB;
  });
};

const DeliveryFormModal = ({ 
  isOpen, 
  onClose, 
  order, 
  onSuccess,
  setGlobalMessage 
}) => {
  const [deliveryData, setDeliveryData] = useState({
    delivery_date: getCurrentLocalDateTime(),
    delivery_address: '',
    delivery_notes: '',
    items: []
  });
  const [loading, setLoading] = useState(false);

  // Reset form state whenever modal closes to avoid stale data
  useEffect(() => {
    if (!isOpen) {
      setDeliveryData({
        delivery_date: getCurrentLocalDateTime(),
        delivery_address: '',
        delivery_notes: '',
        items: []
      });
    }
  }, [isOpen]);

  // Initialize delivery data from cached inventory when modal opens
  useEffect(() => {
    if (!isOpen || !order) {
      return;
    }

    const orderItems = order.items || order.sales_order_items || [];
    const warehouseId = order?.sales_orders_warehouse_id ||
      order?.warehouse_id ||
      order?.warehouses_id ||
      order?.warehouse?.warehouses_id ||
      null;

    const inventoryCache = readInventoryCache(warehouseId);

    setDeliveryData({
      delivery_date: getCurrentLocalDateTime(),
      delivery_address: order.clients_address || order.client_address || '',
      delivery_notes: '',
      items: orderItems.map((item) => {
        const productName = item.product_name ||
          item.products_name ||
          item.productName ||
          item.name ||
          'منتج غير محدد';

        const variantName = item.variant_name ||
          item.product_variant_name ||
          item.variantName ||
          '';

        const packagingType = item.packaging_type_name ||
          item.packaging_name ||
          item.packagingType ||
          item.packaging_types_name ||
          '';

        const totalOrderedQuantity = parseFloat(
          item.quantity ||
          item.sales_order_items_quantity ||
          item.ordered_quantity ||
          0
        );

        const alreadyDeliveredQuantity = parseFloat(
          item.quantity_delivered ||
          item.sales_order_items_quantity_delivered ||
          item.delivered_quantity ||
          0
        );

        const availableQuantity = Math.max(0, totalOrderedQuantity - alreadyDeliveredQuantity);

        const unitPrice = parseFloat(
          item.unit_price ||
          item.sales_order_items_unit_price ||
          item.price ||
          item.unitPrice ||
          item.item_price ||
          0
        );

        const variantId = item.product_variant_id ||
          item.productVariantId ||
          item.sales_order_items_variant_id ||
          item.variant_id;

        const packagingTypeId = item.sales_order_items_packaging_type_id ||
          item.packaging_type_id ||
          item.packagingTypeId;

        const availableBatches = collectBatchesFromCache(inventoryCache, variantId, packagingTypeId);

        return {
          sales_order_items_id: item.sales_order_items_id || item.id,
          product_variant_id: variantId,
          sales_order_items_packaging_type_id: packagingTypeId,
          quantity: 0,
          unit_price: unitPrice,
          product_name: productName,
          variant_name: variantName,
          packaging_type: packagingType,
          max_quantity: availableQuantity,
          total_ordered: totalOrderedQuantity,
          already_delivered: alreadyDeliveredQuantity,
          original_item: item,
          available_batches: availableBatches
        };
      })
    });
  }, [isOpen, order]);

  const handleInputChange = (field, value) => {
    setDeliveryData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleItemQuantityChange = (itemIndex, quantity) => {
    setDeliveryData(prev => ({
      ...prev,
      items: prev.items.map((item, index) => 
        index === itemIndex 
          ? { ...item, quantity: Math.min(Math.max(0, parseFloat(quantity) || 0), item.max_quantity) }
          : item
      )
    }));
  };

  const handleItemBatchChange = (itemIndex, batchDate) => {
    setDeliveryData(prev => ({
      ...prev,
      items: prev.items.map((item, index) => 
        index === itemIndex 
          ? { ...item, batch_date: batchDate }
          : item
      )
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const itemsToDeliver = deliveryData.items.filter(item => item.quantity > 0);

      if (itemsToDeliver.length === 0) {
        setGlobalMessage({
          type: 'error',
          message: 'يرجى تحديد كميات للتسليم'
        });
        return;
      }

      const deliveryPayload = {
        sales_order_id: order.sales_orders_id,
        warehouse_id: order.warehouse_id || order.sales_orders_warehouse_id || order.warehouses_id,
        delivery_date: localDateTimeToISOString(deliveryData.delivery_date),
        delivery_status: 'Preparing',
        delivery_notes: deliveryData.delivery_notes,
        delivery_address: deliveryData.delivery_address,
        items: itemsToDeliver.map(item => ({
          sales_order_items_id: item.sales_order_items_id,
          product_variant_id: item.product_variant_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          batch_date: item.batch_date || null
        }))
      };


      try {
        await addSalesDelivery(deliveryPayload);
        setGlobalMessage({
          type: 'success',
          message: 'تم إنشاء أمر التسليم بنجاح'
        });
        onSuccess?.();
        onClose();
      } catch (apiError) {
        console.error('API Error:', apiError);
        
        if (apiError.message.includes('Failed to fetch') || apiError.message.includes('CORS')) {
          setGlobalMessage({
            type: 'info',
            message: 'تم تحديد الأمر للتسليم. يرجى التأكد من رفع ملفات الـ Backend للخادم لإتمام العملية.'
          });
          onClose();
        } else {
          throw apiError;
        }
      }
    } catch (error) {
      console.error('Error creating delivery:', error);
      setGlobalMessage({
        type: 'error',
        message: 'فشل في إنشاء أمر التسليم: ' + (error.message || 'خطأ غير معروف')
      });
    } finally {
      setLoading(false);
    }
  };

  // Print delivery items function
  const handlePrintDeliveryItems = () => {
    const itemsToDeliver = deliveryData.items.filter(item => item.quantity > 0);
    
    if (itemsToDeliver.length === 0) {
      setGlobalMessage({
        type: 'warning',
        message: 'لا توجد منتجات محددة للطباعة'
      });
      return;
    }

    const currentDate = new Date();
    
    // Prepare items for print with batch information
    const itemsForPrint = itemsToDeliver.map((item, index) => ({
      serial: index + 1,
      name: item.variant_name || item.product_name || 'غير محدد',
      sku: item.original_item?.variant_sku || item.original_item?.products_sku || `ID: ${item.product_variant_id}` || 'غير محدد',
      packaging: item.packaging_type || 'غير محدد',
      quantity: item.quantity,
      batch_date: item.batch_date || 'غير محدد',
      notes: item.notes || ''
    }));

    // Create print content
    const printContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>إيصال تسليم بضائع</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #fff;
            direction: rtl;
            text-align: right;
          }
          
          .receipt-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border: 2px solid #000;
          }
          
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #000;
            padding-bottom: 20px;
          }
          
          .header h1 {
            font-size: 24px;
            font-weight: bold;
            margin: 0;
            color: #000;
          }
          
          .receipt-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
          }
          
          .info-section {
            border: 1px solid #000;
            padding: 15px;
          }
          
          .info-section h3 {
            margin: 0 0 10px 0;
            font-size: 16px;
            font-weight: bold;
            border-bottom: 1px solid #ccc;
            padding-bottom: 5px;
          }
          
          .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            font-size: 14px;
          }
          
          .info-label {
            font-weight: bold;
            min-width: 100px;
          }
          
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
            border: 2px solid #000;
          }
          
          .items-table th,
          .items-table td {
            border: 1px solid #000;
            padding: 12px 8px;
            text-align: right;
            font-size: 13px;
          }
          
          .items-table th {
            background-color: #f0f0f0;
            font-weight: bold;
          }
          
          .items-table tr:nth-child(even) {
            background-color: #f9f9f9;
          }
          
          .footer {
            margin-top: 40px;
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 30px;
            text-align: center;
          }
          
          .signature-box {
            border: 1px solid #000;
            padding: 15px;
            height: 60px;
          }
          
          .signature-label {
            font-weight: bold;
            margin-bottom: 10px;
          }
          
          .print-date {
            text-align: center;
            margin-top: 20px;
            font-size: 12px;
            color: #666;
          }
          
          @media print {
            body { margin: 0; padding: 10px; }
            .receipt-container { border: none; box-shadow: none; margin: 0; padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          <div class="header">
            <h1>إيصال تسليم بضائع</h1>
          </div>
          
          <div class="receipt-info">
            <div class="info-section">
              <h3>معلومات الطلب</h3>
              <div class="info-row">
                <span class="info-label">رقم الطلب:</span>
                <span>#${order.sales_orders_id}</span>
              </div>
              <div class="info-row">
                <span class="info-label">تاريخ الطلب:</span>
                <span>${order.sales_orders_order_date ? new Date(order.sales_orders_order_date).toLocaleDateString('en-GB') : 'غير محدد'}</span>
              </div>
              <div class="info-row">
                <span class="info-label">تاريخ التسليم:</span>
                <span>${deliveryData.delivery_date ? new Date(deliveryData.delivery_date).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB')}</span>
              </div>
            </div>
            
            <div class="info-section">
              <h3>معلومات العميل</h3>
              <div class="info-row">
                <span class="info-label">اسم العميل:</span>
                <span>${order.clients_company_name || order.clients_contact_name || 'غير محدد'}</span>
              </div>
              <div class="info-row">
                <span class="info-label">المخزن:</span>
                <span>${order.warehouse_name || order.warehouses_name || 'غير محدد'}</span>
              </div>
              <div class="info-row">
                <span class="info-label">عنوان التسليم:</span>
                <span>${deliveryData.delivery_address || order.clients_address || 'غير محدد'}</span>
              </div>
            </div>
          </div>
          
          <table class="items-table">
            <thead>
              <tr>
                <th>م</th>
                <th>اسم المنتج</th>
                <th>كود المنتج</th>
                <th>نوع التعبئة</th>
                <th>الكمية المُسلمة</th>
                <th>الدفعة</th>
                <th>ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              ${itemsForPrint.map(item => `
                <tr>
                  <td>${item.serial}</td>
                  <td>${item.name}</td>
                  <td>${item.sku}</td>
                  <td>${item.packaging}</td>
                  <td>${item.quantity}</td>
                  <td>${item.batch_date}</td>
                  <td>${item.notes}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          ${deliveryData.delivery_notes ? `
            <div class="info-section">
              <h3>ملاحظات التسليم</h3>
              <p>${deliveryData.delivery_notes}</p>
            </div>
          ` : ''}
          
          <div class="footer">
            <div class="signature-box">
              <div class="signature-label">توقيع المُستلم</div>
            </div>
            <div class="signature-box">
              <div class="signature-label">توقيع المُسلم</div>
            </div>
            <div class="signature-box">
              <div class="signature-label">ختم الشركة</div>
            </div>
          </div>
          
          <div class="print-date">
            تم إنشاء هذا الإيصال بتاريخ: ${currentDate.toLocaleDateString('ar-EG')} ${currentDate.toLocaleTimeString('ar-EG')}
          </div>
        </div>
      </body>
      </html>
    `;

    // Print robustly using utility
    const doPrint = async () => {
      try {
  const { printHtml } = await import('../../../../../utils/printUtils.js');
        const ok = await printHtml(printContent, { title: 'إيصال تسليم', closeAfter: 700 });
        if (!ok) {
          setGlobalMessage?.({ type: 'error', message: 'فشل في طباعة الأمر. يرجى التحقق من إعدادات المتصفح والسماح بالنوافذ المنبثقة.' });
        }
      } catch (err) {
        console.error('Print error:', err);
        setGlobalMessage?.({ type: 'error', message: 'فشل في طباعة الأمر (document). يرجى المحاولة مرة أخرى.' });
      }
    };
    doPrint();
  };

  if (!isOpen || !order) return null;

  const totalQuantityToDeliver = deliveryData.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
      <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-green-50">
          <div className="flex items-center">
            <div className="bg-green-100 rounded-full p-2 ml-3">
              <TruckIcon className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-green-900">تسليم المنتجات</h3>
              <p className="text-sm text-green-600">أمر بيع #{order.sales_orders_id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Order Info */}
        <div className="p-6 bg-gray-50 border-b">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-500">العميل:</span>
              <p className="font-medium text-gray-900">{order.clients_company_name}</p>
            </div>
            <div>
              <span className="text-gray-500">المستودع:</span>
              <p className="font-medium text-gray-900">{order.warehouse_name}</p>
            </div>
            <div>
              <span className="text-gray-500">تاريخ الأمر:</span>
              <p className="font-medium text-gray-900">
                {new Date(order.sales_orders_order_date).toLocaleDateString('ar-EG')}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Delivery Details */}
          <div className="p-6 border-b">
            <h4 className="text-md font-semibold text-gray-900 mb-4">تفاصيل التسليم</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  تاريخ التسليم
                </label>
                <input
                  type="datetime-local"
                  value={deliveryData.delivery_date}
                  onChange={(e) => handleInputChange('delivery_date', e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  عنوان التسليم
                </label>
                <input
                  type="text"
                  value={deliveryData.delivery_address}
                  onChange={(e) => handleInputChange('delivery_address', e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  placeholder="عنوان التسليم"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ملاحظات التسليم
                </label>
                <textarea
                  rows={3}
                  value={deliveryData.delivery_notes}
                  onChange={(e) => handleInputChange('delivery_notes', e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  placeholder="ملاحظات اختيارية..."
                />
              </div>
            </div>
          </div>

          {/* Products to Deliver */}
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-md font-semibold text-gray-900">المنتجات المطلوب تسليمها</h4>
              <button
                type="button"
                onClick={handlePrintDeliveryItems}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
              >
                <PrinterIcon className="h-4 w-4" />
                طباعة قائمة التسليم
              </button>
            </div>
            
            {deliveryData.items.length === 0 ? (
              <div className="text-center py-8">
                <InformationCircleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">لا توجد منتجات في هذا الأمر</p>
                <p className="text-xs text-gray-400 mt-2">يرجى التحقق من بيانات الأمر أو إعادة تحميل الصفحة</p>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          المنتج
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          نوع التغليف
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          الكمية المتبقية للتسليم
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          كمية التسليم
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          الدفعة
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {deliveryData.items.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {item.variant_name || item.product_name || 'منتج غير محدد'}
                              </div>
                              {item.total_ordered > 0 && (
                                <div className="text-xs text-gray-500 mt-1">
                                  مطلوب: {item.total_ordered} • مُسلَّم: {item.already_delivered}
                                </div>
                              )}
                              {item.max_quantity === 0 && (
                                <div className="text-xs text-red-500 mt-1">
                                  تم تسليم الكمية كاملة
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-sm text-gray-600">
                              {item.packaging_type || 'غير محدد'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`text-sm font-medium ${item.max_quantity === 0 ? 'text-red-600' : 'text-gray-900'}`}>
                              {item.max_quantity?.toLocaleString('en-US') || '0'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <NumberInput
                              value={item.quantity || ''}
                              onChange={(val) => handleItemQuantityChange(index, val)}
                              disabled={item.max_quantity === 0}
                              className={`w-24 text-center text-sm ${
                                item.max_quantity === 0 ? 'bg-gray-100 cursor-not-allowed' : ''
                              }`}
                              placeholder="0"
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <select
                              value={item.batch_date || ''}
                              onChange={(e) => handleItemBatchChange(index, e.target.value)}
                              disabled={item.max_quantity === 0 || !item.available_batches || item.available_batches.length === 0}
                              className={`w-32 rounded-md border-gray-300 shadow-sm text-center text-xs focus:border-green-500 focus:ring-green-500 ${
                                item.max_quantity === 0 ? 'bg-gray-100 cursor-not-allowed' : ''
                              }`}
                            >
                              <option value="">اختر دفعة</option>
                              {item.available_batches && item.available_batches.map(batch => (
                                <option key={batch.inventory_id} value={batch.inventory_production_date}>
                                  {batch.inventory_production_date || 'غير محدد'} ({batch.inventory_quantity})
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Enhanced Summary */}
            {totalQuantityToDeliver > 0 && (
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="text-sm text-green-600 font-medium">إجمالي الكمية</div>
                  <div className="text-2xl font-bold text-green-700">
                    {totalQuantityToDeliver.toLocaleString('en-US')}
                  </div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="text-sm text-blue-600 font-medium">عدد المنتجات</div>
                  <div className="text-2xl font-bold text-blue-700">
                    {deliveryData.items.filter(item => item.quantity > 0).length}
                  </div>
                </div>
              </div>
            )}

            {/* Debug Information (only show if no items have proper data) */}
            {deliveryData.items.length > 0 && deliveryData.items.every(item => (!item.variant_name && !item.product_name) || (item.product_name === 'منتج غير محدد')) && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start">
                  <InformationCircleIcon className="h-5 w-5 text-yellow-400 mt-0.5 ml-2" />
                  <div>
                    <h5 className="text-sm font-medium text-yellow-800">تحذير: بيانات المنتجات غير مكتملة</h5>
                    <p className="text-sm text-yellow-700 mt-1">
                      يبدو أن بيانات المنتجات غير مكتملة. يرجى التحقق من:
                    </p>
                    <ul className="text-sm text-yellow-700 mt-2 list-disc list-inside">
                      <li>أن الأمر يحتوي على منتجات</li>
                      <li>أن أسماء المنتجات محفوظة بشكل صحيح</li>
                      <li>أن الكميات المتاحة محدثة</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t bg-gray-50">
            <button
              type="button"
              onClick={handlePrintDeliveryItems}
              disabled={totalQuantityToDeliver === 0}
              className={`flex items-center gap-2 px-4 py-2 border rounded-md shadow-sm text-sm font-medium transition-colors ${
                totalQuantityToDeliver === 0
                  ? 'border-gray-300 text-gray-400 bg-gray-100 cursor-not-allowed'
                  : 'border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
              }`}
            >
              <PrinterIcon className="h-4 w-4" />
              طباعة التسليم
            </button>
            
            <div className="flex items-center space-x-3 space-x-reverse">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={loading || totalQuantityToDeliver === 0}
                className={`px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors ${
                  loading || totalQuantityToDeliver === 0
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                    جاري التسليم...
                  </div>
                ) : (
                  <>
                    <TruckIcon className="h-4 w-4 ml-2 inline" />
                    تأكيد التسليم
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DeliveryFormModal;
