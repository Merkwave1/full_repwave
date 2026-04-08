import React, { useState } from 'react';
import {
  TagIcon,
  ScaleIcon,
  CubeIcon,
  BuildingStorefrontIcon,
  TruckIcon,
  SparklesIcon,
  Bars3BottomLeftIcon,
  XMarkIcon,
  InformationCircleIcon,
  CalendarDaysIcon, // For expiry date
  ArchiveBoxIcon,   // For packaging
} from '@heroicons/react/24/outline';
import { isOdooIntegrationEnabled } from '../../../../utils/odooIntegration';

// Reusable Modal component
const Modal = ({ isOpen, onClose, dir = 'rtl', modalWidthClass = 'max-w-3xl', children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4 z-50">
      <div
        className={`bg-white rounded-xl shadow-2xl p-0 ${modalWidthClass} w-full max-h-[90vh] overflow-hidden flex flex-col`}
        dir={dir}
      >
        {children}
      </div>
    </div>
  );
};

// Reusable DetailItem component
const DetailItem = ({ icon, label, value, valueClassName = 'text-slate-800', children }) => (
  <div className="flex items-start justify-between py-3 px-4 bg-white rounded-lg border border-gray-200">
    <div className="flex items-center gap-3">
      {React.cloneElement(icon, { className: 'h-5 w-5 text-blue-500' })}
      <span className="font-medium text-gray-700">{label}:</span>
    </div>
    {children || (
      <span className={`font-semibold break-words text-right ${valueClassName}`}>
        {value ?? 'غير متوفر'}
      </span>
    )}
  </div>
);

// This component now receives `categories` and `suppliers` to look up names
export default function ProductDetailsModal({ isOpen, onClose, product, categories = [], suppliers = [] }) {
  const [odooEnabled] = useState(() => isOdooIntegrationEnabled());
  
  if (!isOpen || !product) return null;

  // Helper to get category name by ID
  const getCategoryName = (categoryId) => {
    if (!categoryId) return '–';
    const category = categories.find(cat => cat.categories_id == categoryId);
    return category ? category.categories_name : '–';
  };

  // Helper to get supplier name by ID
  const getSupplierName = (supplierId) => {
    if (!supplierId) return '–';
    const supplier = suppliers.find(sup => sup.supplier_id == supplierId);
    return supplier ? supplier.supplier_name : '–';
  };

  const srcUrl = product.products_image_url && product.products_image_url.startsWith('http')
    ? product.products_image_url
    : `https://placehold.co/256x256/E2E8F0/64748B?text=No+Image`;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white rounded-t-xl sticky top-0 z-10">
        <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Bars3BottomLeftIcon className="h-7 w-7 text-blue-600" />
          تفاصيل المنتج
        </h3>
        <button onClick={onClose} className="p-2 rounded-full text-gray-500 hover:bg-red-100 hover:text-red-600 transition-colors">
          <XMarkIcon className="h-6 w-6" />
        </button>
      </div>

      {/* Body */}
      <div className="p-6 flex-grow overflow-y-auto bg-gray-50">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 flex flex-col md:flex-row items-center md:items-start gap-6">
          <div className="flex-shrink-0">
            <img
              src={srcUrl}
              alt={product.products_name || 'Product Image'}
              className="w-32 h-32 md:w-48 md:h-48 object-cover rounded-lg shadow-inner border border-gray-200"
              onError={e => { e.currentTarget.src = 'https://placehold.co/192x192/E2E8F0/64748B?text=Image+Error'; e.currentTarget.onerror = null; }}
            />
          </div>
          <div className="flex-grow text-center md:text-right">
            <h4 className="text-3xl font-extrabold text-gray-900 mb-2 break-words">{product.products_name}</h4>
            <p className="text-gray-600 text-base leading-relaxed">{product.products_description || 'لا يوجد وصف مفصل لهذا المنتج.'}</p>
            <div className="mt-4 flex flex-wrap justify-center md:justify-end gap-3">
              <span className={`text-sm font-semibold px-3 py-1 rounded-full ${product.products_is_active ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}>
                الحالة: {product.products_is_active ? 'نشط' : 'غير نشط'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h5 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2 border-b pb-2">
            <InformationCircleIcon className="h-6 w-6 text-blue-600" />
            معلومات عامة
          </h5>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DetailItem icon={<TagIcon />} label="الفئة" value={getCategoryName(product.products_category_id)} />
            <DetailItem icon={<BuildingStorefrontIcon />} label="العلامة التجارية" value={product.products_brand} />
            <DetailItem icon={<TruckIcon />} label="المورد" value={getSupplierName(product.products_supplier_id)} />
            <DetailItem icon={<CalendarDaysIcon />} label="فترة الصلاحية" value={product.products_expiry_period_in_days ? `${product.products_expiry_period_in_days} يوم` : 'غير محدد'} />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h5 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2 border-b pb-2">
            <ArchiveBoxIcon className="h-6 w-6 text-teal-600" />
            التعبئة المفضلة
          </h5>
          {Array.isArray(product.preferred_packaging) && product.preferred_packaging.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {product.preferred_packaging.map(pkg => (
                <span key={pkg.packaging_types_id} className="bg-teal-100 text-teal-800 text-sm font-medium px-3 py-1 rounded-full">
                  {pkg.packaging_types_name}
                </span>
              ))}
            </div>
          ) : (
             <p className="text-center text-gray-600 mt-4">لا توجد أنواع تعبئة مفضلة لهذا المنتج.</p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h5 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2 border-b pb-2">
            <SparklesIcon className="h-6 w-6 text-purple-600" />
            الأنواع المتوفرة (Variants)
          </h5>
          {Array.isArray(product.variants) && product.variants.length > 0 ? (
            <div className="space-y-6 mt-4">
              {product.variants.map((variant, idx) => (
                <div key={variant.variant_id ?? idx} className="bg-gray-50 p-4 rounded-md border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-4 mb-3 pb-3 border-b border-gray-200">
                    {variant.variant_image_url ? (
                      <img
                        src={variant.variant_image_url}
                        alt={variant.variant_name || `Variant ${idx + 1}`}
                        className="w-16 h-16 object-cover rounded-md shadow-sm border border-gray-200"
                        onError={e => { e.currentTarget.src = 'https://placehold.co/64x64/E2E8F0/64748B?text=No+Image'; e.currentTarget.onerror = null; }}
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-200 rounded-md flex items-center justify-center text-gray-500 text-xs">
                        لا صورة
                      </div>
                    )}
                    <div className="flex-grow">
                      <p className="font-semibold text-gray-800 text-lg">
                        {variant.variant_name || `خيار #${idx + 1}`}
                      </p>
                      <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">ID: {variant.variant_id}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div className="flex justify-between"><span className="text-gray-600">SKU:</span><span className="font-medium text-gray-800">{variant.variant_sku || '–'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">الباركود:</span><span className="font-medium text-gray-800">{variant.variant_barcode || '–'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">السعر:</span><span className="font-medium text-green-600">{variant.variant_unit_price || '–'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">التكلفة:</span><span className="font-medium text-yellow-600">{variant.variant_cost_price || '–'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">الضريبة:</span><span className="font-medium text-purple-600">{variant.variant_has_tax && variant.variant_tax_rate ? `${variant.variant_tax_rate}%` : '0%'}</span></div>
                    {odooEnabled && <div className="flex justify-between"><span className="text-gray-600">Odoo ID:</span><span className={`font-medium ${variant.variant_odoo_product_id ? 'text-purple-600' : 'text-gray-400'}`}>{variant.variant_odoo_product_id || 'غير متزامن'}</span></div>}
                  </div>
                  {Array.isArray(variant.attributes) && variant.attributes.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="font-semibold text-gray-700 mb-2">السمات:</p>
                      <div className="flex flex-wrap gap-2">
                        {variant.attributes.map((attr, i) => (
                          <span key={attr.attribute_value_id ?? i} className="bg-purple-100 text-purple-800 rounded-full px-3 py-1 text-xs shadow-sm flex items-center gap-1">
                            <span className="font-medium">{attr.attribute_name || 'غير محدد'}:</span>
                            <span className="font-bold">{attr.attribute_value_value || 'غير متوفر'}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-600 mt-4">لا توجد خيارات لهذا المنتج.</p>
          )}
        </div>
      </div>

      <div className="p-4 bg-gray-100 border-t border-gray-200 rounded-b-xl sticky bottom-0">
        <div className="flex justify-center">
          <button onClick={onClose} className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">إغلاق</button>
        </div>
      </div>
    </Modal>
  );
}
