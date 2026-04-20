import React, { useMemo, useState } from "react";
import Modal from "../../../../common/Modal/Modal";
import RepackModal from "./RepackModal";
import DeleteConfirmationModal from "../../../../common/DeleteConfirmationModal";

export default function ProductInventoryDetailsModal({
  isOpen,
  onClose,
  product,
  inventoryItems = [],
  packagingTypes = [],
  warehouses = [],
  baseUnits = [],
  filters = {},
  onRepack,
  onDeleteInventory,
}) {
  const [repackContext, setRepackContext] = useState({
    open: false,
    item: null,
    allowedIds: [],
  });
  const [deleteConfirm, setDeleteConfirm] = useState({
    open: false,
    id: null,
    label: "",
  });

  let lowThreshold, outThreshold;
  try {
    const cached = localStorage.getItem("appSettingsCategorized");
    if (cached) {
      const categorized = JSON.parse(cached);
      const inv = categorized?.inventory || [];
      const low = inv.find((s) => s.settings_key === "low_stock_threshold");
      const out = inv.find((s) => s.settings_key === "out_of_stock_threshold");
      lowThreshold =
        low?.settings_value !== undefined
          ? parseFloat(low.settings_value)
          : undefined;
      outThreshold =
        out?.settings_value !== undefined ? parseFloat(out.settings_value) : 0;
    } else {
      outThreshold = 0;
    }
  } catch {
    outThreshold = 0;
  }

  const data = useMemo(() => {
    if (!product) return { variants: [], totals: { base: 0 } };

    const forcedVariantId = product.__selectedVariantId ?? null;

    const itemsForProduct = inventoryItems.filter(
      (i) =>
        i.products_id === product.products_id &&
        (forcedVariantId
          ? String(i.variant_id) === String(forcedVariantId)
          : true),
    );

    const variantGroups = new Map();
    let grandTotalBase = 0;

    for (const item of itemsForProduct) {
      const variantId = item.variant_id || 0;
      if (!variantGroups.has(variantId)) variantGroups.set(variantId, []);
      variantGroups.get(variantId).push(item);
    }

    const variants = [];

    for (const [variantId, items] of variantGroups.entries()) {
      const variantObj = Array.isArray(product.variants)
        ? product.variants.find((v) => v.variant_id === variantId)
        : null;

      const variantName = variantObj?.variant_name || product.products_name;

      const byDate = new Map();
      let variantTotalBase = 0;

      for (const it of items) {
        const dateKey = it.inventory_production_date
          ? it.inventory_production_date.split("T")[0]
          : "بدون تاريخ إنتاج";

        if (!byDate.has(dateKey)) byDate.set(dateKey, []);
        byDate.get(dateKey).push(it);
      }

      const dateBlocks = [];

      for (const [dateKey, dateItems] of byDate.entries()) {
        const rows = dateItems.map((it) => {
          const warehouse = warehouses.find(
            (w) => w.warehouse_id === it.warehouse_id,
          );
          const packaging = packagingTypes.find(
            (pt) => pt.packaging_types_id === it.packaging_type_id,
          );

          const factor =
            parseFloat(packaging?.packaging_types_default_conversion_factor) ||
            1;
          const qty = parseFloat(it.inventory_quantity) || 0;
          const totalBase = qty * factor;
          variantTotalBase += totalBase;

          let status = it.inventory_status;
          const outT = outThreshold ?? 0;
          const lowT = lowThreshold ?? undefined;

          if (totalBase <= outT) status = "Out of Stock";
          else if (lowT !== undefined && totalBase <= lowT)
            status = "Low Stock";
          else status = "In Stock";

          return {
            id: it.inventory_id,
            warehouse: warehouse
              ? `${warehouse.warehouse_name} (${warehouse.warehouse_code})`
              : "مخزن غير معروف",
            packaging: packaging?.packaging_types_name || "تعبئة غير معروفة",
            productionDate: dateKey,
            quantity: qty,
            factor,
            totalBase,
            status,
            raw: it,
          };
        });

        dateBlocks.push({ date: dateKey, rows });
      }

      grandTotalBase += variantTotalBase;
      variants.push({
        variantId,
        variantName,
        totalBase: variantTotalBase,
        dateBlocks,
      });
    }

    return { variants, totals: { base: grandTotalBase } };
  }, [
    product,
    inventoryItems,
    packagingTypes,
    warehouses,
    lowThreshold,
    outThreshold,
  ]);

  if (!isOpen || !product) return null;

  const baseUnit =
    baseUnits.find(
      (u) => u.base_units_id === product.products_unit_of_measure_id,
    )?.base_units_name || "الوحدة";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`تفاصيل مخزون المنتج: ${product.products_name}`}
      dir="rtl"
      modalWidthClass="max-w-6xl"
    >
      <div className="p-3 sm:p-6 space-y-6 bg-gray-50">
        {data.variants.map((variant) => (
          <div
            key={variant.variantId}
            className="bg-white rounded-2xl shadow-sm border"
          >
            <div className="px-3 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b rounded-t-2xl flex flex-wrap justify-between items-center gap-2">
              <h4 className="font-bold text-gray-800 text-sm">
                الخيار: {variant.variantName}
              </h4>
              <div className="text-sm font-bold text-blue-700">
                إجمالي:{" "}
                {variant.totalBase.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                {baseUnit}
              </div>
            </div>

            <div className="p-5 space-y-6">
              {variant.dateBlocks.map((block) => (
                <div key={block.date} className="bg-gray-50 rounded-xl p-4">
                  <div className="text-xs font-bold text-indigo-700 mb-3">
                    تاريخ الإنتاج: {block.date}
                  </div>

                  <div className="overflow-x-auto">
                    {/* Mobile cards */}
                    <div className="sm:hidden space-y-3">
                      {block.rows.map((r) => (
                        <div
                          key={r.id}
                          className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 space-y-2"
                        >
                          <div className="flex justify-between items-start">
                            <span className="text-xs font-semibold text-gray-500">
                              المخزن
                            </span>
                            <span className="text-xs font-bold text-gray-800 text-left max-w-[60%] break-words">
                              {r.warehouse}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-semibold text-gray-500">
                              التعبئة
                            </span>
                            <span className="text-xs text-gray-700">
                              {r.packaging} ({r.factor})
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-semibold text-gray-500">
                              الكمية
                            </span>
                            <span className="text-xs font-semibold text-gray-800">
                              {r.quantity.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-semibold text-gray-500">
                              الإجمالي ({baseUnit})
                            </span>
                            <span className="text-xs font-bold text-blue-700">
                              {r.totalBase.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-semibold text-gray-500">
                              الحالة
                            </span>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold
                              ${
                                r.status === "In Stock"
                                  ? "bg-green-50 text-green-700 ring-1 ring-green-200"
                                  : r.status === "Low Stock"
                                    ? "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200"
                                    : "bg-red-50 text-red-700 ring-1 ring-red-200"
                              }`}
                            >
                              {r.status}
                            </span>
                          </div>
                          <div className="flex gap-2 pt-1">
                            <button
                              className="flex-1 px-2 py-1.5 text-xs rounded-lg bg-[#8DD8F5] text-black hover:text-white hover:bg-blue-600 shadow-sm transition disabled:opacity-50"
                              onClick={() => {
                                const preferred = Array.isArray(
                                  product?.preferred_packaging,
                                )
                                  ? product.preferred_packaging.map(
                                      (p) => p.packaging_types_id,
                                    )
                                  : [];
                                setRepackContext({
                                  open: true,
                                  item: r.raw,
                                  allowedIds: preferred,
                                });
                              }}
                              disabled={!onRepack}
                            >
                              تحويل/تفكيك
                            </button>
                            {r.quantity <= 0 && (
                              <button
                                className="flex-1 px-2 py-1.5 text-xs rounded-lg bg-red-500 text-white hover:bg-red-600 shadow-sm transition"
                                onClick={() =>
                                  setDeleteConfirm({
                                    open: true,
                                    id: r.id,
                                    label: `${r.warehouse} - ${r.packaging} - ${r.productionDate}`,
                                  })
                                }
                              >
                                حذف
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop table */}
                    <table className="hidden sm:table min-w-full text-[13px] text-gray-700 border-separate border-spacing-y-2">
                      <thead>
                        <tr className="text-xs uppercase text-gray-500">
                          <th className="px-3 py-2 text-center">المخزن</th>
                          <th className="px-3 py-2 text-center">التعبئة</th>
                          <th className="px-3 py-2 text-center">الكمية</th>
                          <th className="px-3 py-2 text-center">المعامل</th>
                          <th className="px-3 py-2 text-center">
                            الإجمالي ({baseUnit})
                          </th>
                          <th className="px-3 py-2 text-center">الحالة</th>
                          <th className="px-3 py-2 text-center">إجراءات</th>
                        </tr>
                      </thead>

                      <tbody>
                        {block.rows.map((r) => (
                          <tr
                            key={r.id}
                            className="bg-white hover:bg-blue-50 transition rounded-xl shadow-sm"
                          >
                            <td className="px-3 py-3 text-center whitespace-nowrap">
                              {r.warehouse}
                            </td>

                            <td className="px-3 py-3 text-center whitespace-nowrap">
                              {r.packaging} ({r.factor})
                            </td>

                            <td className="px-3 py-3 font-semibold text-center">
                              {r.quantity.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </td>

                            <td className="px-3 py-3 text-center">
                              {r.factor}
                            </td>

                            <td className="px-3 py-3 font-bold text-blue-700 text-center whitespace-nowrap">
                              {r.totalBase.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </td>

                            <td className="px-3 py-3 text-center whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold
                                ${
                                  r.status === "In Stock"
                                    ? "bg-green-50 text-green-700 ring-1 ring-green-200"
                                    : r.status === "Low Stock"
                                      ? "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200"
                                      : "bg-red-50 text-red-700 ring-1 ring-red-200"
                                }`}
                              >
                                {r.status}
                              </span>
                            </td>

                            <td className="px-3 py-3 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  className="px-3 py-1 text-xs rounded-lg bg-[#8DD8F5]  text-black hover:text-white hover:bg-blue-600 shadow-md hover:shadow-md transition disabled:opacity-50"
                                  onClick={() => {
                                    const preferred = Array.isArray(
                                      product?.preferred_packaging,
                                    )
                                      ? product.preferred_packaging.map(
                                          (p) => p.packaging_types_id,
                                        )
                                      : [];
                                    setRepackContext({
                                      open: true,
                                      item: r.raw,
                                      allowedIds: preferred,
                                    });
                                  }}
                                  disabled={!onRepack}
                                >
                                  تحويل/تفكيك
                                </button>

                                {r.quantity <= 0 && (
                                  <button
                                    className="px-3 py-1 text-xs rounded-lg bg-red-500 text-white hover:bg-red-600 shadow-sm hover:shadow-md transition"
                                    onClick={() =>
                                      setDeleteConfirm({
                                        open: true,
                                        id: r.id,
                                        label: `${r.warehouse} - ${r.packaging} - ${r.productionDate}`,
                                      })
                                    }
                                  >
                                    حذف
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border rounded-2xl text-sm font-bold text-blue-700 text-center">
          إجمالي المنتج ({product.products_name}):{" "}
          {data.totals.base.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}{" "}
          {baseUnit}
        </div>
      </div>

      <div className="p-4 border-t bg-white flex justify-end">
        <button
          onClick={onClose}
          className="px-6 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-semibold transition"
        >
          إغلاق
        </button>
      </div>

      {repackContext.open && (
        <RepackModal
          isOpen={repackContext.open}
          onClose={() =>
            setRepackContext({ open: false, item: null, allowedIds: [] })
          }
          onRepackConfirm={async (payload) => {
            if (typeof onRepack === "function") await onRepack(payload);
            setRepackContext({ open: false, item: null, allowedIds: [] });
          }}
          inventoryItem={repackContext.item}
          packagingTypes={packagingTypes}
          baseUnits={baseUnits}
          allowedTargetPackagingTypeIds={repackContext.allowedIds}
        />
      )}

      {deleteConfirm.open && (
        <DeleteConfirmationModal
          isOpen={deleteConfirm.open}
          onClose={() => setDeleteConfirm({ open: false, id: null, label: "" })}
          onConfirm={async () => {
            if (onDeleteInventory && deleteConfirm.id)
              await onDeleteInventory(deleteConfirm.id);
            setDeleteConfirm({ open: false, id: null, label: "" });
          }}
          title="تأكيد الحذف"
          message={`هل أنت متأكد من حذف هذا السطر؟\n${deleteConfirm.label}`}
        />
      )}
    </Modal>
  );
}
