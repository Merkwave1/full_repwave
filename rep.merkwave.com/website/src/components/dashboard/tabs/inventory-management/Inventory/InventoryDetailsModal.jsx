// src/components/dashboard/tabs/inventory-management/Inventory/InventoryDetailsModal.jsx
import React from 'react';
import Modal from '../../../../common/Modal/Modal'; // Assuming you have a reusable Modal component
import {
  CubeIcon,
  TagIcon,
  BuildingStorefrontIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
  Bars3BottomLeftIcon,
  SparklesIcon, // For variant details
  XMarkIcon // Corrected: Added XMarkIcon to the import list
} from '@heroicons/react/24/outline';
import { CubeIcon as PackageIcon } from '@heroicons/react/24/outline'; // Re-import CubeIcon as PackageIcon for clarity if desired, or just use CubeIcon directly

// Reusable DetailItem component
const DetailItem = ({ icon, label, value, valueClassName = 'text-slate-800', children }) => (
  <div className="flex items-start justify-between py-2 px-3 bg-white rounded-lg border border-gray-200">
    <div className="flex items-center gap-2">
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

function InventoryDetailsModal({ isOpen, onClose, inventory }) {
  if (!isOpen || !inventory) return null;

  // Derive status based on thresholds (using cached settings) for display consistency
  let displayStatus = inventory.inventory_status;
  try {
    const cached = localStorage.getItem('appSettingsCategorized');
    if (cached) {
      const categorized = JSON.parse(cached);
      const inv = categorized?.inventory || [];
      const low = inv.find(s => s.settings_key === 'low_stock_threshold');
      const out = inv.find(s => s.settings_key === 'out_of_stock_threshold');
      const lowT = low?.settings_value !== undefined ? parseFloat(low.settings_value) : undefined;
      const outT = out?.settings_value !== undefined ? parseFloat(out.settings_value) : 0;
      const qty = parseFloat(inventory.inventory_quantity) || 0;
      const conversion = parseFloat(inventory.packaging_types_default_conversion_factor || 1) || 1;
      const totalInBase = qty * conversion;
      if (!isNaN(totalInBase)) {
        if (totalInBase <= outT) displayStatus = 'Out of Stock';
        else if (lowT !== undefined && totalInBase <= lowT) displayStatus = 'Low Stock';
        else displayStatus = 'In Stock';
      }
    }
  } catch {}

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="تفاصيل عنصر المخزون" dir="rtl" modalWidthClass="max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white rounded-t-xl sticky top-0 z-10">
        <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Bars3BottomLeftIcon className="h-7 w-7 text-blue-600" />
          تفاصيل عنصر المخزون
        </h3>
        <button onClick={onClose} className="p-2 rounded-full text-gray-500 hover:bg-red-100 hover:text-red-600 transition-colors">
          <XMarkIcon className="h-6 w-6" />
        </button>
      </div>

      {/* Body */}
      <div className="p-6 flex-grow overflow-y-auto bg-gray-50">
        {/* Main Info Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h4 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2 border-b pb-2">
            <InformationCircleIcon className="h-6 w-6 text-blue-600" />
            معلومات عامة
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DetailItem icon={<BuildingStorefrontIcon />} label="المخزن" value={`${inventory.warehouse_name} (${inventory.warehouse_code})`} />
            <DetailItem icon={<TagIcon />} label="المنتج" value={inventory.products_name} />
            <DetailItem icon={<CubeIcon />} label="الكمية" value={inventory.inventory_quantity} />
            <DetailItem icon={<SparklesIcon />} label="الخيار" value={inventory.variant_name || 'المنتج الرئيسي'} /> {/* Display variant name */}
            {/* <DetailItem icon={<PackageIcon />} label="نوع التعبئة" value={inventory.packaging_types_name || 'غير متوفر'} /> Display packaging type name */}
            <DetailItem
              icon={displayStatus === 'In Stock' ? <CheckCircleIcon /> : <XCircleIcon />}
              label="الحالة"
            >
              <span
                className={`font-semibold px-3 py-1 rounded-full text-sm ${
                  displayStatus === 'In Stock'
                    ? 'bg-green-100 text-green-700'
                    : displayStatus === 'Low Stock'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-red-100 text-red-700'
                }`}
              >
                {displayStatus}
              </span>
            </DetailItem>
          </div>
        </div>

        {/* Additional Details (if any, e.g., dates, notes) */}
        {/* You can add more sections here if your inventory items have more fields */}

      </div>

      {/* Footer */}
      <div className="p-4 bg-gray-100 border-t border-gray-200 rounded-b-xl sticky bottom-0">
        <div className="flex justify-center">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out shadow-md"
          >
            إغلاق
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default InventoryDetailsModal;
