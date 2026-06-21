import React, { useState, useEffect } from "react";
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
  ArchiveBoxIcon, // For packaging
  BuildingOffice2Icon, // For warehouses
} from "@heroicons/react/24/outline";
import { isOdooIntegrationEnabled } from "../../../../utils/odooIntegration";
import { getAppInventory, getAppWarehouses } from "../../../../apis/auth";

// Reusable Modal component
const Modal = ({
  isOpen,
  onClose,
  dir = "rtl",
  modalWidthClass = "max-w-3xl",
  children,
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/40 flex justify-center items-center p-2 sm:p-4 z-50">
      <div
        className={`bg-white rounded-xl shadow-2xl p-0 ${modalWidthClass} w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col`}
        dir={dir}
      >
        {children}
      </div>
    </div>
  );
};

// Reusable DetailItem component
const DetailItem = ({
  icon,
  label,
  value,
  valueClassName = "text-slate-800",
  children,
}) => (
  <div className="flex items-start justify-between py-3 px-4 bg-white rounded-lg border border-gray-200">
    <div className="flex items-center gap-3">
      {React.cloneElement(icon, { className: "h-5 w-5 text-blue-500" })}
      <span className="font-medium text-gray-700">{label}:</span>
    </div>
    {children || (
      <span
        className={`font-semibold break-words text-right ${valueClassName}`}
      >
        {value ?? "غير متوفر"}
      </span>
    )}
  </div>
);

// This component fetches fresh inventory/warehouse data from the .NET API on open.
export default function ProductDetailsModal({
  isOpen,
  onClose,
  product,
  categories = [],
  suppliers = [],
}) {
  const [odooEnabled] = useState(() => isOdooIntegrationEnabled());
  const [warehouseInventory, setWarehouseInventory] = useState([]);
  const [warehouseList, setWarehouseList] = useState([]);

  // Fetch fresh inventory + warehouses from the API whenever the modal opens
  useEffect(() => {
    if (!isOpen || !product) return;
    let cancelled = false;
    const variantIds = (product.variants ?? []).map((v) => v.variant_id);
    Promise.all([
      getAppInventory().catch(() => []),
      getAppWarehouses().catch(() => []),
    ]).then(([invData, whData]) => {
      if (cancelled) return;
      const invArr = Array.isArray(invData) ? invData : (invData?.data ?? invData?.inventory_items ?? []);
      const whArr = Array.isArray(whData) ? whData : (whData?.data ?? whData?.warehouses ?? []);
      // Filter inventory to only rows belonging to this product's variants
      // PHP uses `variant_id` (not `inventory_variant_id`) in its API response
      setWarehouseInventory(invArr.filter((item) => variantIds.includes(item.variant_id)));
      setWarehouseList(whArr);
    });
    return () => { cancelled = true; };
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  // Helper to get category name by ID
  const getCategoryName = (categoryId) => {
    if (!categoryId) return "–";
    const category = categories.find((cat) => cat.categories_id == categoryId);
    return category ? category.categories_name : "–";
  };

  // Helper to get supplier name by ID
  const getSupplierName = (supplierId) => {
    if (!supplierId) return "–";
    const supplier = suppliers.find((sup) => sup.supplier_id == supplierId);
    return supplier ? supplier.supplier_name : "–";
  };

  const srcUrl = product.products_image_url || null;

  // Compute warehouse availability (read-only) from fresh API data
  // PHP API returns `variant_id` and `warehouse_id` (not `inventory_variant_id` / `inventory_warehouse_id`)
  const warehouseGroups = {};
  warehouseInventory.forEach((item) => {
    const wh = warehouseList.find((w) => w.warehouse_id === item.warehouse_id);
    const whName = wh?.warehouse_name ?? `مخزن #${item.warehouse_id}`;
    if (!warehouseGroups[whName]) warehouseGroups[whName] = 0;
    warehouseGroups[whName] += Number(item.inventory_quantity ?? 0);
  });
  const warehouseEntries = Object.entries(warehouseGroups);

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white rounded-t-xl sticky top-0 z-10">
        <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Bars3BottomLeftIcon className="h-7 w-7 text-[#8B5FD6]" />
          تفاصيل المنتج
        </h3>
        <button
          onClick={onClose}
          className="p-2 rounded-full text-gray-500 hover:bg-red-100 hover:text-red-600 transition-colors"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>
      </div>

      {/* Body */}
      <div className="p-6 flex-grow overflow-y-auto bg-gray-50">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 flex flex-col md:flex-row items-center md:items-start gap-6">
          <div className="flex-shrink-0">
            {srcUrl ? (
              <img
                src={srcUrl}
                alt={product.products_name || "Product Image"}
                className="w-32 h-32 md:w-48 md:h-48 object-cover rounded-lg shadow-inner border border-gray-200"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  e.currentTarget.nextSibling?.style?.removeProperty("display");
                  e.currentTarget.onerror = null;
                }}
              />
            ) : null}
            {!srcUrl && (
              <div className="w-32 h-32 md:w-48 md:h-48 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-200 flex items-center justify-center shadow-inner border border-gray-200">
                <span className="text-5xl font-extrabold text-indigo-500 select-none">
                  {product.products_name?.charAt(0)?.toUpperCase() ?? "?"}
                </span>
              </div>
            )}
          </div>
          <div className="flex-grow text-center md:text-right">
            <h4 className="text-3xl font-extrabold text-gray-900 mb-2 break-words">
              {product.products_name}
            </h4>
            <p className="text-gray-600 text-base leading-relaxed">
              {product.products_description || "لا يوجد وصف مفصل لهذا المنتج."}
            </p>
            <div className="mt-4 flex flex-wrap justify-center md:justify-end gap-3">
              <span
                className={`text-sm font-semibold px-3 py-1 rounded-full ${product.products_is_active ? "bg-[#EDE7FF] text-[#2D1B69]" : "bg-red-100 text-red-800"}`}
              >
                الحالة: {product.products_is_active ? "نشط" : "غير نشط"}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h5 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2 border-b pb-2">
            <InformationCircleIcon className="h-6 w-6 text-[#8B5FD6]" />
            معلومات عامة
          </h5>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DetailItem
              icon={<TagIcon />}
              label="الفئة"
              value={getCategoryName(product.products_category_id)}
            />
            <DetailItem
              icon={<BuildingStorefrontIcon />}
              label="العلامة التجارية"
              value={product.products_brand}
            />
            <DetailItem
              icon={<TruckIcon />}
              label="المورد"
              value={getSupplierName(product.products_supplier_id)}
            />
            <DetailItem
              icon={<CalendarDaysIcon />}
              label="فترة الصلاحية"
              value={
                product.products_expiry_period_in_days
                  ? `${product.products_expiry_period_in_days} يوم`
                  : "غير محدد"
              }
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h5 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2 border-b pb-2">
            <ArchiveBoxIcon className="h-6 w-6 text-[#8B5FD6]" />
            التعبئة المفضلة
          </h5>
          {Array.isArray(product.preferred_packaging) &&
          product.preferred_packaging.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {product.preferred_packaging.map((pkg) => (
                <span
                  key={pkg.packaging_types_id}
                  className="bg-teal-100 text-teal-800 text-sm font-medium px-3 py-1 rounded-full"
                >
                  {pkg.packaging_types_name}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-600 mt-4">
              لا توجد أنواع تعبئة مفضلة لهذا المنتج.
            </p>
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
                <div
                  key={variant.variant_id ?? idx}
                  className="bg-gray-50 p-4 rounded-md border border-gray-200 shadow-sm"
                >
                  <div className="flex items-center gap-4 mb-3 pb-3 border-b border-gray-200">
                    {variant.variant_image_url ? (
                      <img
                        src={variant.variant_image_url}
                        alt={variant.variant_name || `Variant ${idx + 1}`}
                        className="w-16 h-16 object-cover rounded-md shadow-sm border border-gray-200"
                        onError={(e) => {
                          e.currentTarget.src =
                            "https://placehold.co/64x64/E2E8F0/64748B?text=No+Image";
                          e.currentTarget.onerror = null;
                        }}
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
                      <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                        ID: {variant.variant_id}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">SKU:</span>
                      <span className="font-medium text-gray-800">
                        {variant.variant_sku || "–"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">الباركود:</span>
                      <span className="font-medium text-gray-800">
                        {variant.variant_barcode || "–"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">السعر:</span>
                      <span className="font-medium text-green-600">
                        {variant.variant_unit_price || "–"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">التكلفة:</span>
                      <span className="font-medium text-yellow-600">
                        {variant.variant_cost_price || "–"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">الضريبة:</span>
                      <span className="font-medium text-purple-600">
                        {variant.variant_has_tax && variant.variant_tax_rate
                          ? `${variant.variant_tax_rate}%`
                          : "0%"}
                      </span>
                    </div>
                    {odooEnabled && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Odoo ID:</span>
                        <span
                          className={`font-medium ${variant.variant_odoo_product_id ? "text-purple-600" : "text-gray-400"}`}
                        >
                          {variant.variant_odoo_product_id || "غير متزامن"}
                        </span>
                      </div>
                    )}
                  </div>
                  {Array.isArray(variant.attributes) &&
                    variant.attributes.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="font-semibold text-gray-700 mb-2">
                          السمات:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {variant.attributes.map((attr, i) => (
                            <span
                              key={attr.attribute_value_id ?? i}
                              className="bg-purple-100 text-purple-800 rounded-full px-3 py-1 text-xs shadow-sm flex items-center gap-1"
                            >
                              <span className="font-medium">
                                {attr.attribute_name || "غير محدد"}:
                              </span>
                              <span className="font-bold">
                                {attr.attribute_value_value || "غير متوفر"}
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-600 mt-4">
              لا توجد خيارات لهذا المنتج.
            </p>
          )}
        </div>

        {/* Warehouse Availability – read-only */}
        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          <h5 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2 border-b pb-2">
            <BuildingOffice2Icon className="h-6 w-6 text-orange-600" />
            توفر المنتج في المخازن
          </h5>
          {warehouseEntries.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {warehouseEntries.map(([whName, qty]) => (
                <div
                  key={whName}
                  className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-lg px-4 py-3"
                >
                  <div className="flex items-center gap-2">
                    <BuildingOffice2Icon className="h-5 w-5 text-orange-500" />
                    <span className="font-medium text-gray-700">{whName}</span>
                  </div>
                  <span className="font-bold text-orange-700 bg-orange-100 px-3 py-1 rounded-full text-sm">
                    {qty.toLocaleString("ar-EG")} وحدة
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 mt-2">
              لا تتوفر بيانات مخزون لهذا المنتج.
            </p>
          )}
        </div>
      </div>

      <div className="p-4 bg-gray-100 border-t border-gray-200 rounded-b-xl sticky bottom-0">
        <div className="flex justify-center">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-3 sm:px-6 sm:py-2.5 bg-[#8B5FD6] text-white rounded-md hover:bg-[#7A52C2] text-base sm:text-sm"
          >
            إغلاق
          </button>
        </div>
      </div>
    </Modal>
  );
}
