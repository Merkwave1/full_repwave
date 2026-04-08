import React, { useMemo, useState } from 'react';
import Modal from '../../../../common/Modal/Modal';
import RepackModal from './RepackModal';
import DeleteConfirmationModal from '../../../../common/DeleteConfirmationModal';

export default function ProductInventoryDetailsModal({ isOpen, onClose, product, inventoryItems = [], packagingTypes = [], warehouses = [], baseUnits = [], filters = {}, onRepack, onDeleteInventory }) {
  const [repackContext, setRepackContext] = useState({ open: false, item: null, allowedIds: [] });
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null, label: '' });
  // Read thresholds from cached categorized settings (written on login and after saving settings)
  let lowThreshold, outThreshold;
  try {
    const cached = localStorage.getItem('appSettingsCategorized');
    if (cached) {
      const categorized = JSON.parse(cached);
      const inv = categorized?.inventory || [];
      const low = inv.find(s => s.settings_key === 'low_stock_threshold');
      const out = inv.find(s => s.settings_key === 'out_of_stock_threshold');
      lowThreshold = low?.settings_value !== undefined ? parseFloat(low.settings_value) : undefined;
      outThreshold = out?.settings_value !== undefined ? parseFloat(out.settings_value) : 0;
    } else {
      outThreshold = 0;
    }
  } catch {
    outThreshold = 0;
  }

  const data = useMemo(() => {
    if (!product) return { variants: [], totals: { base: 0 } };
    // If the caller passed a selected variant id on the product object (temporary property __selectedVariantId),
    // filter inventory items to that variant only. Otherwise include all variants for the product.
    const forcedVariantId = product.__selectedVariantId ?? null;
    const itemsForProduct = inventoryItems.filter(i => i.products_id === product.products_id && (forcedVariantId ? String(i.variant_id) === String(forcedVariantId) : true));
    const variantGroups = new Map();
    let grandTotalBase = 0;
    for (const item of itemsForProduct) {
      const variantId = item.variant_id || 0;
      if (!variantGroups.has(variantId)) variantGroups.set(variantId, []);
      variantGroups.get(variantId).push(item);
    }
    const variants = [];
    for (const [variantId, items] of variantGroups.entries()) {
      const variantObj = Array.isArray(product.variants) ? product.variants.find(v => v.variant_id === variantId) : null;
      const variantName = variantObj?.variant_name || product.products_name;
      // group by production date -> packaging -> warehouse
      const byDate = new Map();
      let variantTotalBase = 0;
      for (const it of items) {
        const dateKey = it.inventory_production_date ? it.inventory_production_date.split('T')[0] : 'بدون تاريخ إنتاج';
        if (!byDate.has(dateKey)) byDate.set(dateKey, []);
        byDate.get(dateKey).push(it);
      }
      const dateBlocks = [];
      for (const [dateKey, dateItems] of byDate.entries()) {
    const rows = dateItems.map(it => {
          const warehouse = warehouses.find(w => w.warehouse_id === it.warehouse_id);
          const packaging = packagingTypes.find(pt => pt.packaging_types_id === it.packaging_type_id);
          const factor = parseFloat(packaging?.packaging_types_default_conversion_factor) || 1;
          const qty = parseFloat(it.inventory_quantity) || 0;
          const totalBase = qty * factor;
          variantTotalBase += totalBase;
          // Derive status based on thresholds and totalBase
          let status = it.inventory_status;
          if (typeof totalBase === 'number' && !isNaN(totalBase)) {
            const outT = (outThreshold ?? 0);
            const lowT = (lowThreshold ?? undefined);
            if (totalBase <= outT) status = 'Out of Stock';
            else if (lowT !== undefined && totalBase <= lowT) status = 'Low Stock';
            else if (totalBase > (lowT ?? 0)) status = 'In Stock';
          }

          return {
            id: it.inventory_id,
            warehouse: warehouse ? `${warehouse.warehouse_name} (${warehouse.warehouse_code})` : 'مخزن غير معروف',
            packaging: packaging?.packaging_types_name || 'تعبئة غير معروفة',
            productionDate: dateKey,
            quantity: qty,
            factor,
            totalBase,
      status,
      raw: it
          };
        });
        dateBlocks.push({ date: dateKey, rows });
      }
      grandTotalBase += variantTotalBase;
      variants.push({ variantId, variantName, totalBase: variantTotalBase, dateBlocks });
    }
    return { variants, totals: { base: grandTotalBase } };
  }, [product, inventoryItems, packagingTypes, warehouses, lowThreshold, outThreshold]);

  if (!isOpen || !product) return null;
  const baseUnit = baseUnits.find(u => u.base_units_id === product.products_unit_of_measure_id)?.base_units_name || 'الوحدة';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`تفاصيل مخزون المنتج: ${product.products_name}`} dir="rtl" modalWidthClass="max-w-6xl">
      <div className="p-4 space-y-6 max-h-[75vh] overflow-y-auto">
        {/* Active Filters Notice */}
        {filters && (filters.warehouse || filters.variant || filters.status || filters.search) && (
          <div className="bg-yellow-50 border border-yellow-200 px-4 py-3 rounded-md text-[12px] leading-relaxed">
            <span className="font-bold text-yellow-700">الفلاتر المطبقة:</span>
            <ul className="mt-1 flex flex-wrap gap-2">
              {filters.warehouse && <li className="px-2 py-0.5 bg-white border border-yellow-300 rounded text-yellow-700">المخزن: {filters.warehouse}</li>}
              {filters.variant && <li className="px-2 py-0.5 bg-white border border-yellow-300 rounded text-yellow-700">الخيار: {filters.variant}</li>}
              {filters.status && <li className="px-2 py-0.5 bg-white border border-yellow-300 rounded text-yellow-700">الحالة: {filters.status}</li>}
              {filters.search && <li className="px-2 py-0.5 bg-white border border-yellow-300 rounded text-yellow-700">بحث: {filters.search}</li>}
            </ul>
          </div>
        )}
        {data.variants.map(variant => (
          <div key={variant.variantId} className="bg-white border rounded-lg shadow-sm">
            <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
              <h4 className="font-bold text-gray-800 text-sm">الخيار: {variant.variantName}</h4>
              <div className="text-xs font-semibold text-blue-600">إجمالي: {variant.totalBase.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {baseUnit}</div>
            </div>
            <div className="divide-y">
              {variant.dateBlocks.map(block => (
                <div key={block.date} className="p-3">
                  <div className="text-xs font-bold text-indigo-700 mb-2">تاريخ الإنتاج: {block.date}</div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-[11px] align-middle">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-2 py-1 text-center">المخزن</th>
                          <th className="px-2 py-1 text-center">التعبئة</th>
                          <th className="px-2 py-1 text-center">الكمية</th>
                          <th className="px-2 py-1 text-center">معامل</th>
                          <th className="px-2 py-1 text-center">الإجمالي ({baseUnit})</th>
                          <th className="px-2 py-1 text-center">الحالة</th>
                          <th className="px-2 py-1 text-center">إجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {block.rows.map(r => (
                          <tr key={r.id} className="hover:bg-gray-50">
                            <td className="px-2 py-1 text-center whitespace-nowrap">{r.warehouse}</td>
                            <td className="px-2 py-1 text-center whitespace-nowrap">{r.packaging} ({r.factor})</td>
                            <td className="px-2 py-1 font-semibold text-center">{r.quantity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td className="px-2 py-1 text-center">{r.factor}</td>
                            <td className="px-2 py-1 font-bold text-blue-600 text-center whitespace-nowrap">{r.totalBase.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td className="px-2 py-1 text-center whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${r.status==='In Stock'?'bg-green-100 text-green-700': r.status==='Low Stock'?'bg-yellow-100 text-yellow-700':'bg-red-100 text-red-700'}`}>{r.status}</span>
                            </td>
                            <td className="px-2 py-1 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  className="px-2 py-1 text-xs rounded-md bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
                                  onClick={() => {
                                    const preferred = Array.isArray(product?.preferred_packaging) ? product.preferred_packaging.map(p=>p.packaging_types_id) : [];
                                    setRepackContext({ open: true, item: r.raw, allowedIds: preferred });
                                  }}
                                  disabled={!onRepack}
                                >تحويل/تفكيك</button>
                                {r.quantity <= 0 && (
                                  <button
                                    className="px-2 py-1 text-xs rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                                    onClick={() => setDeleteConfirm({ open: true, id: r.id, label: `${r.warehouse} - ${r.packaging} - ${r.productionDate}` })}
                                  >حذف</button>
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

        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm font-bold text-blue-700">
          إجمالي المنتج ({product.products_name}): {data.totals.base.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {baseUnit}
        </div>
      </div>
      <div className="p-4 border-t bg-gray-50 flex justify-end">
        <button onClick={onClose} className="px-5 py-2 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-semibold">إغلاق</button>
      </div>

      {repackContext.open && (
        <RepackModal
          isOpen={repackContext.open}
          onClose={() => setRepackContext({ open:false, item:null, allowedIds: [] })}
          onRepackConfirm={async (payload) => {
            if (typeof onRepack === 'function') {
              await onRepack(payload);
            }
            setRepackContext({ open:false, item:null, allowedIds: [] });
          }}
          inventoryItem={repackContext.item}
          packagingTypes={packagingTypes}
          baseUnits={baseUnits}
          allowedTargetPackagingTypeIds={repackContext.allowedIds}
        />
      )}

      {/* Inline Delete Confirmation */}
      {deleteConfirm.open && (
        <DeleteConfirmationModal
          isOpen={deleteConfirm.open}
          onClose={() => setDeleteConfirm({ open: false, id: null, label: '' })}
          onConfirm={async () => {
            if (onDeleteInventory && deleteConfirm.id) {
              await onDeleteInventory(deleteConfirm.id);
            }
            setDeleteConfirm({ open: false, id: null, label: '' });
          }}
          title="تأكيد الحذف"
          message={`هل أنت متأكد من حذف هذا السطر؟\n${deleteConfirm.label}`}
        />
      )}
    </Modal>
  );
}
