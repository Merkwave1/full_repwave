// src/components/dashboard/tabs/inventory-management/Inventory/InventoryDetailsModal.jsx
import React from "react";
import AppModalShell, {
  modalPrimaryBtnClass,
  modalSectionClass,
} from "../../../../common/AppModalShell.jsx";
import {
  CubeIcon,
  TagIcon,
  BuildingStorefrontIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

const DetailItem = ({
  icon,
  label,
  value,
  valueClassName = "text-slate-800",
  children,
}) => (
  <div className="flex items-start justify-between py-2 px-3 bg-white rounded-lg border border-[#EDE7FF]">
    <div className="flex items-center gap-2">
      {React.cloneElement(icon, { className: "h-5 w-5 text-[#8B5FD6]" })}
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

function InventoryDetailsModal({ isOpen, onClose, inventory }) {
  if (!isOpen || !inventory) return null;

  let displayStatus = inventory.inventory_status;
  try {
    const cached = localStorage.getItem("appSettingsCategorized");
    if (cached) {
      const categorized = JSON.parse(cached);
      const inv = categorized?.inventory || [];
      const low = inv.find((s) => s.settings_key === "low_stock_threshold");
      const out = inv.find((s) => s.settings_key === "out_of_stock_threshold");
      const lowT =
        low?.settings_value !== undefined
          ? parseFloat(low.settings_value)
          : undefined;
      const outT =
        out?.settings_value !== undefined ? parseFloat(out.settings_value) : 0;
      const qty = parseFloat(inventory.inventory_quantity) || 0;
      const conversion =
        parseFloat(inventory.packaging_types_default_conversion_factor || 1) ||
        1;
      const totalInBase = qty * conversion;
      if (!isNaN(totalInBase)) {
        if (totalInBase <= outT) displayStatus = "Out of Stock";
        else if (lowT !== undefined && totalInBase <= lowT)
          displayStatus = "Low Stock";
        else displayStatus = "In Stock";
      }
    }
  } catch {}

  return (
    <AppModalShell
      open={isOpen}
      onClose={onClose}
      title="تفاصيل عنصر المخزون"
      subtitle={inventory.products_name}
      icon={CubeIcon}
      size="2xl"
      footer={
        <div className="flex justify-center">
          <button type="button" onClick={onClose} className={modalPrimaryBtnClass}>
            إغلاق
          </button>
        </div>
      }
    >
      <div className={`${modalSectionClass} p-4 sm:p-6`}>
        <h4 className="text-lg font-bold text-[#2D1B69] mb-4 flex items-center gap-2 border-b border-[#EDE7FF] pb-2">
          <InformationCircleIcon className="h-6 w-6 text-[#8B5FD6]" />
          معلومات عامة
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DetailItem
            icon={<BuildingStorefrontIcon />}
            label="المخزن"
            value={`${inventory.warehouse_name} (${inventory.warehouse_code})`}
          />
          <DetailItem
            icon={<TagIcon />}
            label="المنتج"
            value={inventory.products_name}
          />
          <DetailItem
            icon={<CubeIcon />}
            label="الكمية"
            value={inventory.inventory_quantity}
          />
          <DetailItem
            icon={<SparklesIcon />}
            label="الخيار"
            value={inventory.variant_name || "المنتج الرئيسي"}
          />
          <DetailItem
            icon={
              displayStatus === "In Stock" ? (
                <CheckCircleIcon />
              ) : (
                <XCircleIcon />
              )
            }
            label="الحالة"
          >
            <span
              className={`font-semibold px-3 py-1 rounded-full text-sm ${
                displayStatus === "In Stock"
                  ? "bg-[#EDE7FF] text-[#7A52C2]"
                  : displayStatus === "Low Stock"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-red-100 text-red-700"
              }`}
            >
              {displayStatus}
            </span>
          </DetailItem>
        </div>
      </div>
    </AppModalShell>
  );
}

export default InventoryDetailsModal;
