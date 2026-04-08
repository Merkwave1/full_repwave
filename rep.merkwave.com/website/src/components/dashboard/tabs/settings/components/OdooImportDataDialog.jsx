// src/components/dashboard/tabs/settings/components/OdooImportDataDialog.jsx
// Dialog component for importing data from Odoo ERP

import React, { useState } from 'react';
import Modal from '../../../../common/Modal/Modal.jsx';
import Button from '../../../../common/Button/Button.jsx';
import Alert from '../../../../common/Alert/Alert.jsx';
import Loader from '../../../../common/Loader/Loader.jsx';
import { importFromOdoo, deleteOdooData } from '../../../../../apis/odoo.js';

// Data entities configuration with their order and metadata
const DATA_ENTITIES = [
  // Dependencies first (order matters!)
  { key: 'countries', label: 'الدول', icon: '🌍', description: 'استيراد قائمة الدول', enabled: true, order: 1 },
  { key: 'governorates', label: 'المحافظات/الولايات', icon: '🗺️', description: 'استيراد المحافظات والولايات', enabled: true, order: 2 },
  { key: 'client_area_tags', label: 'مناطق العملاء (Area Tags)', icon: '📍', description: 'استيراد مناطق العملاء', enabled: true, order: 3 },
  { key: 'client_industries', label: 'قطاعات العملاء', icon: '🏭', description: 'استيراد قطاعات وصناعات العملاء', enabled: true, order: 4 },
  { key: 'client_types', label: 'أنواع العملاء', icon: '📋', description: 'استيراد أنواع العملاء (Customer, Supplier, etc)', enabled: true, order: 5 },
  { key: 'users', label: 'المستخدمين', icon: '👤', description: 'استيراد الموظفين كمستخدمين', enabled: true, order: 6 },
  { key: 'clients', label: 'العملاء (جهات الاتصال)', icon: '👥', description: 'استيراد بيانات العملاء من Odoo Contacts', enabled: true, order: 7 },
  { key: 'client_balances', label: 'أرصدة العملاء', icon: '💳', description: 'تحديث أرصدة العملاء وحدود الائتمان من Odoo', enabled: true, order: 7.5 },
  { key: 'suppliers', label: 'الموردين', icon: '🚚', description: 'استيراد بيانات الموردين (الشركات المورّدة)', enabled: true, order: 8 },
  { key: 'base_units', label: 'وحدات القياس الأساسية', icon: '📏', description: 'استيراد فئات وحدات القياس (الوحدة الأساسية)', enabled: true, order: 9 },
  { key: 'packaging_types', label: 'وحدات التعبئة', icon: '📦', description: 'استيراد وحدات التعبئة والقياس', enabled: true, order: 10 },
  { key: 'categories', label: 'التصنيفات', icon: '📂', description: 'استيراد تصنيفات المنتجات', enabled: true, order: 11 },
  { key: 'product_attributes', label: 'خصائص المنتجات', icon: '🏷️', description: 'استيراد خصائص المنتجات (اللون، الحجم، الخ)', enabled: true, order: 12 },
  { key: 'product_attribute_values', label: 'قيم خصائص المنتجات', icon: '🎨', description: 'استيراد قيم الخصائص (أحمر، أزرق، كبير، صغير)', enabled: true, order: 13 },
  { key: 'products', label: 'المنتجات', icon: '🛍️', description: 'استيراد بيانات المنتجات', enabled: true, order: 14 },
  { key: 'product_variants', label: 'متغيرات المنتجات', icon: '🔄', description: 'استيراد متغيرات وخيارات المنتجات', enabled: true, order: 15 },
  { key: 'warehouse', label: 'المستودعات', icon: '🏪', description: 'استيراد بيانات المستودعات', enabled: true, order: 16 },
  { key: 'inventory', label: 'المخزون', icon: '📊', description: 'استيراد بيانات المخزون الحالي', enabled: true, order: 17 },
  // Sales related imports - from invoices/credit notes
  { key: 'customer_invoices', label: 'فواتير العملاء', icon: '🧾', description: 'استيراد فواتير العملاء من Odoo (طلبات البيع)', enabled: true, order: 18 },
  { key: 'credit_notes', label: 'إشعارات دائنة (مرتجعات)', icon: '📄', description: 'استيراد الإشعارات الدائنة (مرتجعات البيع)', enabled: true, order: 19 },
  { key: 'sales_deliveries', label: 'تسليمات البيع', icon: '🚛', description: 'استيراد تسليمات طلبات البيع', enabled: true, order: 20 },
  // Purchase related imports
  { key: 'purchase_orders', label: 'طلبات الشراء', icon: '📝', description: 'استيراد طلبات الشراء مع بنودها', enabled: true, order: 21 },
  { key: 'goods_receipts', label: 'استلامات الشراء', icon: '📦', description: 'استيراد استلامات طلبات الشراء', enabled: true, order: 22 },
  { key: 'purchase_returns', label: 'مرتجعات الشراء', icon: '↩️', description: 'استيراد مرتجعات الشراء', enabled: true, order: 23 },
  // Safes and payments
  { key: 'safes', label: 'الخزائن', icon: '🔐', description: 'استيراد الخزائن من Journals في Odoo', enabled: true, order: 24 },
  { key: 'safe_transactions', label: 'معاملات الخزائن', icon: '💰', description: 'استيراد معاملات الخزائن (المدفوعات) من Odoo', enabled: true, order: 25 },
];

// Reverse order for deletion (most dependent first)
const DELETE_ORDER = [
  'safe_transactions',
  'safes',
  'purchase_returns',
  'goods_receipts', 
  'purchase_orders',
  'credit_notes',
  'sales_deliveries',
  'customer_invoices',
  'inventory',
  'warehouse',
  'product_variants',
  'products',
  'product_attribute_values',
  'product_attributes',
  'categories',
  'packaging_types',
  'base_units',
  'suppliers',
  'clients',
  'users',
  'client_types',
  'client_industries',
  'client_area_tags',
  'governorates',
  'countries',
];

function OdooImportDataDialog({ isOpen, onClose, odooSettings }) {
  const [selectedEntities, setSelectedEntities] = useState([]);
  const [importMode, setImportMode] = useState('update'); // 'update' or 'replace'
  const [importing, setImporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [importProgress, setImportProgress] = useState(null);
  const [deleteProgress, setDeleteProgress] = useState(null);
  const [importResults, setImportResults] = useState([]);
  const [deleteResults, setDeleteResults] = useState([]);
  const [message, setMessage] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState('import'); // 'import' or 'delete'

  // Toggle entity selection
  const toggleEntity = (entityKey) => {
    const entity = DATA_ENTITIES.find(e => e.key === entityKey);
    if (!entity?.enabled) return; // Don't toggle disabled entities
    
    setSelectedEntities(prev => {
      if (prev.includes(entityKey)) {
        return prev.filter(k => k !== entityKey);
      } else {
        return [...prev, entityKey];
      }
    });
  };

  // Select all enabled entities
  const selectAll = () => {
    setSelectedEntities(DATA_ENTITIES.filter(e => e.enabled).map(e => e.key));
  };

  // Deselect all entities
  const deselectAll = () => {
    setSelectedEntities([]);
  };

  // Handle import
  const handleImport = async () => {
    if (selectedEntities.length === 0) {
      setMessage({ type: 'warning', text: 'يرجى اختيار البيانات المراد استيرادها' });
      return;
    }

    setImporting(true);
    setImportResults([]);
    setMessage(null);

    try {
      const results = [];
      
      for (let i = 0; i < selectedEntities.length; i++) {
        const entityKey = selectedEntities[i];
        const entity = DATA_ENTITIES.find(e => e.key === entityKey);
        
        setImportProgress({
          current: i + 1,
          total: selectedEntities.length,
          currentEntity: entity?.label || entityKey
        });

        try {
          // Call the actual import API for each entity
          const result = await importFromOdoo(entityKey, { mode: importMode, dry_run: false });
          
          results.push({
            entity: entityKey,
            label: entity?.label || entityKey,
            status: 'success',
            message: result.message || 'تم الاستيراد بنجاح',
            data: result.data
          });
        } catch (error) {
          results.push({
            entity: entityKey,
            label: entity?.label || entityKey,
            status: 'error',
            message: error.message || 'فشل الاستيراد'
          });
        }
      }

      setImportResults(results);
      
      const successCount = results.filter(r => r.status === 'success').length;
      const errorCount = results.filter(r => r.status === 'error').length;
      
      if (errorCount === 0) {
        setMessage({ type: 'success', text: `تم استيراد ${successCount} عنصر بنجاح` });
      } else if (successCount === 0) {
        setMessage({ type: 'error', text: `فشل استيراد جميع العناصر (${errorCount})` });
      } else {
        setMessage({ 
          type: 'warning', 
          text: `تم استيراد ${successCount} عنصر بنجاح، فشل ${errorCount} عنصر`
        });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'حدث خطأ أثناء الاستيراد: ' + error.message });
    } finally {
      setImporting(false);
      setImportProgress(null);
    }
  };

  // Handle delete - show confirmation first
  const handleDelete = () => {
    if (selectedEntities.length === 0) {
      setMessage({ type: 'warning', text: 'يرجى اختيار البيانات المراد حذفها' });
      return;
    }
    setShowDeleteConfirm(true);
  };

  // Handle delete after confirmation
  const handleDeleteConfirmed = async () => {
    setShowDeleteConfirm(false);
    setDeleting(true);
    setDeleteResults([]);
    setMessage(null);

    try {
      const results = [];
      
      // Sort selected entities by delete order (most dependent first)
      const sortedEntities = [...selectedEntities].sort((a, b) => {
        const orderA = DELETE_ORDER.indexOf(a);
        const orderB = DELETE_ORDER.indexOf(b);
        return (orderA === -1 ? 999 : orderA) - (orderB === -1 ? 999 : orderB);
      });
      
      for (let i = 0; i < sortedEntities.length; i++) {
        const entityKey = sortedEntities[i];
        const entity = DATA_ENTITIES.find(e => e.key === entityKey);
        
        setDeleteProgress({
          current: i + 1,
          total: sortedEntities.length,
          currentEntity: entity?.label || entityKey
        });

        try {
          const result = await deleteOdooData(entityKey);
          
          results.push({
            entity: entityKey,
            label: entity?.label || entityKey,
            status: 'success',
            message: result.message || 'تم الحذف بنجاح',
            data: result.data
          });
        } catch (error) {
          results.push({
            entity: entityKey,
            label: entity?.label || entityKey,
            status: 'error',
            message: error.message || 'فشل الحذف'
          });
        }
      }

      setDeleteResults(results);
      
      const successCount = results.filter(r => r.status === 'success').length;
      const errorCount = results.filter(r => r.status === 'error').length;
      
      if (errorCount === 0) {
        setMessage({ type: 'success', text: `تم حذف ${successCount} نوع بيانات بنجاح` });
      } else if (successCount === 0) {
        setMessage({ type: 'error', text: `فشل حذف جميع البيانات (${errorCount})` });
      } else {
        setMessage({ 
          type: 'warning', 
          text: `تم حذف ${successCount} نوع بنجاح، فشل ${errorCount}`
        });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'حدث خطأ أثناء الحذف: ' + error.message });
    } finally {
      setDeleting(false);
      setDeleteProgress(null);
    }
  };

  // Reset dialog state on close
  const handleClose = () => {
    if (!importing && !deleting) {
      setSelectedEntities([]);
      setImportMode('update');
      setImportResults([]);
      setDeleteResults([]);
      setMessage(null);
      setShowDeleteConfirm(false);
      setActiveTab('import');
      onClose();
    }
  };

  const isProcessing = importing || deleting;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="استيراد البيانات من Odoo"
      size="large"
    >
      <div className="space-y-4 max-h-[75vh] overflow-y-auto" dir="rtl">
        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => !isProcessing && setActiveTab('import')}
            disabled={isProcessing}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'import'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            📥 استيراد البيانات
          </button>
          <button
            onClick={() => !isProcessing && setActiveTab('delete')}
            disabled={isProcessing}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'delete'
                ? 'border-red-500 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            🗑️ حذف البيانات
          </button>
        </div>

        {/* Messages */}
        {message && (
          <Alert
            type={message.type}
            message={message.text}
            onClose={() => setMessage(null)}
          />
        )}

        {/* Import Progress */}
        {importing && importProgress && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <span className="animate-spin text-xl">⏳</span>
              <div className="flex-1">
                <p className="font-medium text-yellow-900">
                  جاري استيراد: {importProgress.currentEntity}
                </p>
                <div className="mt-2 bg-yellow-200 rounded-full h-2">
                  <div 
                    className="bg-yellow-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                  />
                </div>
                <p className="text-sm text-yellow-700 mt-1">
                  {importProgress.current} من {importProgress.total}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Delete Progress */}
        {deleting && deleteProgress && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <span className="animate-spin text-xl">🗑️</span>
              <div className="flex-1">
                <p className="font-medium text-red-900">
                  جاري حذف: {deleteProgress.currentEntity}
                </p>
                <div className="mt-2 bg-red-200 rounded-full h-2">
                  <div 
                    className="bg-red-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(deleteProgress.current / deleteProgress.total) * 100}%` }}
                  />
                </div>
                <p className="text-sm text-red-700 mt-1">
                  {deleteProgress.current} من {deleteProgress.total}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Import Mode Selection - Only show for import tab */}
        {activeTab === 'import' && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3">وضع الاستيراد</h4>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="importMode"
                  value="update"
                  checked={importMode === 'update'}
                  onChange={(e) => setImportMode(e.target.value)}
                  className="w-4 h-4 text-blue-600"
                  disabled={isProcessing}
                />
                <span className="text-sm">
                  <strong>تحديث</strong> - تحديث البيانات الموجودة وإضافة الجديدة
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="importMode"
                  value="replace"
                  checked={importMode === 'replace'}
                  onChange={(e) => setImportMode(e.target.value)}
                  className="w-4 h-4 text-red-600"
                  disabled={isProcessing}
                />
                <span className="text-sm">
                  <strong>استبدال</strong> - حذف البيانات الحالية واستبدالها بالجديدة
                </span>
              </label>
            </div>
          </div>
        )}

        {/* Selection Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">
              تم اختيار {selectedEntities.length} من {DATA_ENTITIES.filter(e => e.enabled).length} متاح
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={selectAll}
              disabled={isProcessing}
              className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
            >
              تحديد المتاح
            </button>
            <span className="text-gray-300">|</span>
            <button
              onClick={deselectAll}
              disabled={isProcessing}
              className="text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
            >
              إلغاء التحديد
            </button>
          </div>
        </div>

        {/* Entity Selection Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto p-1">
          {DATA_ENTITIES.map((entity, index) => {
            const isSelected = selectedEntities.includes(entity.key);
            const currentResults = activeTab === 'import' ? importResults : deleteResults;
            const result = currentResults.find(r => r.entity === entity.key);
            const isDisabled = !entity.enabled;
            
            return (
              <div
                key={entity.key}
                onClick={() => !isProcessing && !isDisabled && toggleEntity(entity.key)}
                className={`
                  relative p-3 rounded-lg border-2 transition-all duration-200
                  ${isDisabled ? 'cursor-not-allowed opacity-50 bg-gray-100' : 'cursor-pointer hover:shadow-md'}
                  ${isProcessing ? 'cursor-not-allowed opacity-70' : ''}
                  ${isSelected && !isDisabled
                    ? activeTab === 'delete' ? 'border-red-500 bg-red-50' : 'border-blue-500 bg-blue-50' 
                    : isDisabled ? 'border-gray-300' : 'border-gray-200 bg-white hover:border-gray-300'
                  }
                  ${result?.status === 'success' ? 'border-green-500 bg-green-50' : ''}
                  ${result?.status === 'error' ? 'border-red-500 bg-red-50' : ''}
                `}
              >
                {/* Order Number Badge */}
                <div className={`absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${isDisabled ? 'bg-gray-200 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
                  {index + 1}
                </div>

                {/* Status Badge for disabled */}
                {isDisabled && (
                  <div className="absolute top-2 left-10 px-1.5 py-0.5 rounded text-xs bg-gray-300 text-gray-600">
                    قريباً
                  </div>
                )}

                {/* Checkbox */}
                <div className="absolute top-2 right-2">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    disabled={isProcessing || isDisabled}
                    className={`w-4 h-4 rounded border-gray-300 focus:ring-blue-500 ${isDisabled ? 'text-gray-400' : activeTab === 'delete' ? 'text-red-600' : 'text-blue-600'}`}
                  />
                </div>

                {/* Content */}
                <div className="mt-4 text-center">
                  <span className="text-2xl">{entity.icon}</span>
                  <h5 className="font-medium text-gray-900 mt-2">{entity.label}</h5>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{entity.description}</p>
                </div>

                {/* Result Status */}
                {result && (
                  <div className={`
                    mt-2 text-xs text-center py-1 rounded
                    ${result.status === 'success' ? 'text-green-700 bg-green-100' : ''}
                    ${result.status === 'error' ? 'text-red-700 bg-red-100' : ''}
                    ${result.status === 'pending' ? 'text-yellow-700 bg-yellow-100' : ''}
                  `}>
                    {result.status === 'success' && '✓ تم بنجاح'}
                    {result.status === 'error' && '✗ فشل'}
                    {result.status === 'pending' && '⏳ في الانتظار'}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Results Summary */}
        {(activeTab === 'import' ? importResults : deleteResults).length > 0 && (
          <div className={`border rounded-lg p-3 ${activeTab === 'delete' ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
            <h4 className="font-semibold text-gray-900 mb-2 text-sm">
              {activeTab === 'import' ? 'نتائج الاستيراد' : 'نتائج الحذف'}
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {(activeTab === 'import' ? importResults : deleteResults).map((result, index) => {
                // Get failed and skipped items from details
                const failedItems = result.data?.details?.filter(d => d.action === 'failed') || [];
                const skippedItems = result.data?.details?.filter(d => d.action === 'skipped') || [];
                // Also get skipped_orders_log for sales orders
                const skippedOrdersLog = result.data?.skipped_orders_log || [];
                const hasIssues = failedItems.length > 0 || skippedItems.length > 0 || skippedOrdersLog.length > 0;
                
                return (
                  <div key={index} className="border rounded-lg overflow-hidden">
                    <div 
                      className={`
                        flex items-center justify-between p-2 text-sm
                        ${result.status === 'success' ? 'bg-green-100 text-green-800' : ''}
                        ${result.status === 'error' ? 'bg-red-100 text-red-800' : ''}
                        ${result.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''}
                      `}
                    >
                      <span className="font-medium">{result.label}</span>
                      <span className="text-xs">{result.message}</span>
                    </div>
                    
                    {/* Show failed items */}
                    {failedItems.length > 0 && (
                      <div className="bg-red-50 p-2 border-t border-red-200">
                        <p className="text-xs font-semibold text-red-700 mb-1">❌ فشل ({failedItems.length}):</p>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {failedItems.map((item, i) => (
                            <div key={i} className="text-xs text-red-600 bg-red-100 p-1 rounded">
                              <span className="font-medium">ID: {item.id}</span>
                              {item.name && <span> - {item.name}</span>}
                              {item.error && <span className="block text-red-800">السبب: {item.error}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Show skipped items */}
                    {skippedItems.length > 0 && (
                      <div className="bg-yellow-50 p-2 border-t border-yellow-200">
                        <p className="text-xs font-semibold text-yellow-700 mb-1">⚠️ تم تخطي ({skippedItems.length}):</p>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {skippedItems.map((item, i) => (
                            <div key={i} className="text-xs text-yellow-600 bg-yellow-100 p-1 rounded">
                              <span className="font-medium">ID: {item.id}</span>
                              {item.name && <span> - {item.name}</span>}
                              {item.reason && <span className="block text-yellow-800">السبب: {item.reason}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Show skipped orders log for sales orders */}
                    {skippedOrdersLog.length > 0 && (
                      <div className="bg-orange-50 p-2 border-t border-orange-200">
                        <p className="text-xs font-semibold text-orange-700 mb-1">⚠️ الطلبات المتخطاة ({skippedOrdersLog.length}):</p>
                        <div className="space-y-1 max-h-24 overflow-y-auto">
                          {skippedOrdersLog.map((log, i) => (
                            <div key={i} className="text-xs text-orange-700 bg-orange-100 p-1.5 rounded">
                              {log}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
              <div className="text-center">
                <div className="text-5xl mb-4">⚠️</div>
                <h3 className="text-xl font-bold text-red-600 mb-2">تأكيد الحذف</h3>
                <p className="text-gray-600 mb-4">
                  هل أنت متأكد من حذف البيانات المحددة؟
                  <br />
                  <strong className="text-red-600">هذا الإجراء لا يمكن التراجع عنه!</strong>
                </p>
                <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
                  <p className="text-sm text-red-700">
                    سيتم حذف: {selectedEntities.map(key => DATA_ENTITIES.find(e => e.key === key)?.label).join('، ')}
                  </p>
                </div>
                <div className="flex gap-3 justify-center">
                  <Button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="bg-gray-500 hover:bg-gray-600"
                  >
                    إلغاء
                  </Button>
                  <Button
                    onClick={handleDeleteConfirmed}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    تأكيد الحذف
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <Button
            onClick={handleClose}
            disabled={isProcessing}
            className="bg-gray-500 hover:bg-gray-600"
          >
            {isProcessing ? (activeTab === 'delete' ? 'جاري الحذف...' : 'جاري الاستيراد...') : 'إغلاق'}
          </Button>
          
          {activeTab === 'import' ? (
            <Button
              onClick={handleImport}
              disabled={isProcessing || selectedEntities.length === 0}
              className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
            >
              {importing ? (
                <>
                  <span className="animate-spin">⏳</span>
                  <span>جاري الاستيراد...</span>
                </>
              ) : (
                <>
                  <span>📥</span>
                  <span>بدء الاستيراد ({selectedEntities.length})</span>
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleDelete}
              disabled={isProcessing || selectedEntities.length === 0}
              className="bg-red-600 hover:bg-red-700 flex items-center gap-2"
            >
              {deleting ? (
                <>
                  <span className="animate-spin">⏳</span>
                  <span>جاري الحذف...</span>
                </>
              ) : (
                <>
                  <span>🗑️</span>
                  <span>حذف البيانات ({selectedEntities.length})</span>
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

export default OdooImportDataDialog;
