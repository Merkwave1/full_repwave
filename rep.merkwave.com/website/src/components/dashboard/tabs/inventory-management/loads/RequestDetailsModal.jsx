// src/components/dashboard/tabs/inventory-management/loads/RequestDetailsModal.jsx
import React, { useMemo, useState, useEffect } from 'react';
import { XMarkIcon, BuildingOffice2Icon, CalendarDaysIcon, InformationCircleIcon, ChatBubbleBottomCenterTextIcon, CheckCircleIcon, TrashIcon, PencilSquareIcon, PlusCircleIcon } from '@heroicons/react/24/outline';
import SearchableSelect from '../../../../common/SearchableSelect/SearchableSelect';
// No extra API calls for inventory; use allInventoryItems passed from parent

const Modal = ({ isOpen, onClose, dir = 'rtl', modalWidthClass = 'max-w-3xl', children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4 z-40">
      <div className={`bg-white rounded-xl shadow-2xl p-6 ${modalWidthClass} w-full max-h-[90vh] flex flex-col`} dir={dir} style={{ overflow: 'visible' }}>
        {children}
      </div>
    </div>
  );
};

export default function RequestDetailsModal({ isOpen, onClose, request, warehouses, products = [], packagingTypes = [], allInventoryItems = [], onApproveAllocate, onReject, setGlobalMessage, refreshData }) {
  const [adminNote, setAdminNote] = useState('');
  const [localItems, setLocalItems] = useState([]);
  const [editRow, setEditRow] = useState(null); // request_item_id being edited
  const [addForm, setAddForm] = useState({ variant_id: '', packaging_type_id: '', requested_quantity: '' });
  const [selectedSourceWarehouseId, setSelectedSourceWarehouseId] = useState(null);
  const [allocInventoryByItem, setAllocInventoryByItem] = useState({}); // { request_item_id: inventory_id }

  // Dropdown styles for proper layering
  const dropdownStyles = {
    menuPortal: (base) => ({ 
      ...base, 
      zIndex: 10000,
      position: 'fixed'
    }),
    menu: (base, { placement }) => ({ 
      ...base, 
      zIndex: 10000,
      position: 'fixed',
      maxHeight: '200px',
      overflow: 'auto',
      boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
      border: '1px solid #e5e7eb',
      // Force menu to appear above the control when near bottom
      transform: placement === 'bottom' ? 'translateY(-100%)' : 'translateY(0)'
    }),
    control: (base) => ({
      ...base,
      minHeight: '38px',
      fontSize: '14px'
    }),
    option: (base, state) => ({
      ...base,
      fontSize: '14px',
      padding: '8px 12px'
    })
  };

  useEffect(() => {
    setLocalItems(Array.isArray(request?.items) ? request.items : []);
    setSelectedSourceWarehouseId(request?.request_source_warehouse_id || null);
    
    // Auto-select default batch for existing items (biggest quantity)
    if (Array.isArray(request?.items) && selectedSourceWarehouseId) {
      const defaultAllocations = {};
      request.items.forEach(item => {
        const batches = allInventoryItems.filter(inv =>
          inv.warehouse_id === Number(selectedSourceWarehouseId) &&
          inv.variant_id === Number(item.variant_id) &&
          inv.packaging_type_id === Number(item.packaging_type_id)
        );
        batches.sort((a,b) => Number(b.inventory_quantity) - Number(a.inventory_quantity));
        if (batches[0]) {
          defaultAllocations[item.request_item_id] = batches[0].inventory_id;
        }
      });
      setAllocInventoryByItem(defaultAllocations);
    }
  }, [request, selectedSourceWarehouseId, allInventoryItems]);
  const sourceWarehouse = warehouses.find(w => w.warehouse_id === request?.request_source_warehouse_id);
  const destWarehouse = warehouses.find(w => w.warehouse_id === request?.request_destination_warehouse_id);

  const items = localItems;

  const warehouseOptions = useMemo(() => (warehouses || []).map(w => ({ value: String(w.warehouse_id), label: w.warehouse_name })), [warehouses]);
  const productVariantOptions = useMemo(() => {
    if (!selectedSourceWarehouseId || !Array.isArray(allInventoryItems)) return [];
    const availableVariants = new Set();
    allInventoryItems.forEach(inv => {
      if (inv.warehouse_id === Number(selectedSourceWarehouseId)) {
        availableVariants.add(inv.variant_id);
      }
    });
    const opts = [];
    (products || []).forEach(p => {
      (p.variants || []).forEach(v => {
        if (availableVariants.has(v.variant_id)) {
          opts.push({ value: String(v.variant_id), label: `${p.products_name} - ${v.variant_name}` });
        }
      });
    });
    return opts;
  }, [products, selectedSourceWarehouseId, allInventoryItems]);

  const packagingOptionsForVariant = useMemo(() => {
    if (!selectedSourceWarehouseId || !addForm.variant_id || !Array.isArray(allInventoryItems)) return [];
    const packagingWithQuantity = new Map();
    allInventoryItems.forEach(inv => {
      if (inv.warehouse_id === Number(selectedSourceWarehouseId) && inv.variant_id === Number(addForm.variant_id)) {
        const current = packagingWithQuantity.get(inv.packaging_type_id) || 0;
        packagingWithQuantity.set(inv.packaging_type_id, current + Number(inv.inventory_quantity || 0));
      }
    });
    const options = (packagingTypes || [])
      .filter(pt => packagingWithQuantity.has(pt.packaging_types_id))
      .map(pt => ({ 
        value: String(pt.packaging_types_id), 
        label: pt.packaging_types_name,
        totalQuantity: packagingWithQuantity.get(pt.packaging_types_id)
      }))
      .sort((a, b) => b.totalQuantity - a.totalQuantity); // Sort by total quantity desc
    return options;
  }, [packagingTypes, selectedSourceWarehouseId, addForm.variant_id, allInventoryItems]);

  const batchOptionsForAddForm = useMemo(() => {
    if (!selectedSourceWarehouseId || !addForm.variant_id || !addForm.packaging_type_id || !Array.isArray(allInventoryItems)) return [];
    const batches = allInventoryItems.filter(inv =>
      inv.warehouse_id === Number(selectedSourceWarehouseId) &&
      inv.variant_id === Number(addForm.variant_id) &&
      inv.packaging_type_id === Number(addForm.packaging_type_id)
    );
    batches.sort((a,b) => Number(b.inventory_quantity) - Number(a.inventory_quantity)); // Sort by quantity desc
    return batches.map(b => ({
      value: String(b.inventory_id),
      label: new Date(b.inventory_production_date).toLocaleDateString('en-GB'),
      inventory_id: b.inventory_id,
      quantity: b.inventory_quantity
    }));
  }, [selectedSourceWarehouseId, addForm.variant_id, addForm.packaging_type_id, allInventoryItems]);

  const getMatchingBatches = (row) => {
    if (!Array.isArray(allInventoryItems)) return [];
    let list = allInventoryItems.filter(inv =>
      inv.warehouse_id === Number(selectedSourceWarehouseId) &&
      inv.variant_id === Number(row.variant_id) &&
      inv.packaging_type_id === Number(row.packaging_type_id)
    );
    // Sort by quantity desc (biggest quantity first)
    list.sort((a,b) => Number(b.inventory_quantity) - Number(a.inventory_quantity));
    return list;
  };

  const getPackagingOptionsForEdit = (variantId) => {
    if (!selectedSourceWarehouseId || !variantId || !Array.isArray(allInventoryItems)) return [];
    const packagingWithQuantity = new Map();
    allInventoryItems.forEach(inv => {
      if (inv.warehouse_id === Number(selectedSourceWarehouseId) && inv.variant_id === Number(variantId)) {
        const current = packagingWithQuantity.get(inv.packaging_type_id) || 0;
        packagingWithQuantity.set(inv.packaging_type_id, current + Number(inv.inventory_quantity || 0));
      }
    });
    return (packagingTypes || [])
      .filter(pt => packagingWithQuantity.has(pt.packaging_types_id))
      .map(pt => ({ 
        value: String(pt.packaging_types_id), 
        label: pt.packaging_types_name,
        totalQuantity: packagingWithQuantity.get(pt.packaging_types_id)
      }))
      .sort((a, b) => b.totalQuantity - a.totalQuantity);
  };

  const getAvailableForRow = (row) => {
    if (!Array.isArray(allInventoryItems)) return 0;
    const invId = allocInventoryByItem[row.request_item_id];
    const baseFilter = (x) => x.warehouse_id === Number(selectedSourceWarehouseId)
      && x.variant_id === Number(row.variant_id)
      && x.packaging_type_id === Number(row.packaging_type_id);
    if (invId) {
      const inv = allInventoryItems.find(x => x.inventory_id === Number(invId));
      return Number(inv?.inventory_quantity || 0);
    }
  const list = allInventoryItems.filter(x => baseFilter(x));
    return list.reduce((sum, x) => sum + Number(x.inventory_quantity || 0), 0);
  };

  const handleSaveEdit = async (row) => {
    // Per user request: no backend update for request items; keep local edits for allocation only
    setEditRow(null);
    setGlobalMessage?.({ type: 'info', message: 'تم تعديل العنصر محلياً للتخصيص.' });
  };

  const handleDeleteItem = async (row) => {
    // Local remove only
    setLocalItems(prev => prev.filter(x => x.request_item_id !== row.request_item_id));
  };

  const handleAddItem = async () => {
    const variant_id = addForm.variant_id ? Number(addForm.variant_id) : null;
    const packaging_type_id = addForm.packaging_type_id ? Number(addForm.packaging_type_id) : null;
    const requested_quantity = Number(addForm.requested_quantity || 0);
    if (!variant_id || !packaging_type_id || !requested_quantity || !addForm.batch_inventory_id) {
      setGlobalMessage?.({ type: 'warning', message: 'من فضلك أكمل بيانات العنصر واختر الدفعة.' });
      return;
    }

    // Check for duplicate item (same variant + packaging + batch)
    const selectedBatchInventoryId = Number(addForm.batch_inventory_id);
    const isDuplicate = items.some(item => {
      const itemBatchId = allocInventoryByItem[item.request_item_id];
      return item.variant_id === variant_id && 
             item.packaging_type_id === packaging_type_id && 
             itemBatchId === selectedBatchInventoryId;
    });

    if (isDuplicate) {
      setGlobalMessage?.({ type: 'warning', message: 'هذا العنصر موجود بالفعل بنفس المنتج ونوع التعبئة والدفعة!' });
      return;
    }

    // Push locally
    const newItemId = Math.floor(Math.random() * 1e9);
    const newItem = {
      request_item_id: newItemId,
      variant_id,
      packaging_type_id,
      requested_quantity,
      variant_name: productVariantOptions.find(o => o.value === String(variant_id))?.label || 'Variant',
      packaging_types_name: packagingOptionsForVariant.find(o => o.value === String(packaging_type_id))?.label || 'Packaging',
    };
    setLocalItems(prev => [...prev, newItem]);
    
    // Set the batch allocation for the new item
    setAllocInventoryByItem(prev => ({
      ...prev,
      [newItemId]: selectedBatchInventoryId
    }));
    
    setAddForm({ variant_id: '', packaging_type_id: '', requested_quantity: '', batch_inventory_id: '' });
  };

  if (!isOpen || !request) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} dir="rtl" modalWidthClass="max-w-6xl">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white rounded-t-xl sticky top-0 z-10">
        <h3 className="text-2xl font-bold text-gray-800">تفاصيل الطلب رقم REQ-{request.request_id}</h3>
        <button onClick={onClose} className="p-2 rounded-full text-gray-500 hover:bg-red-100 hover:text-red-600 transition-colors">
          <XMarkIcon className="h-6 w-6" />
        </button>
      </div>

      <div className="p-6 flex-grow bg-gray-50 space-y-4" style={{ maxHeight: 'calc(90vh - 200px)', overflowY: 'auto', position: 'relative' }}>
        <div className="bg-white rounded-lg p-4 border space-y-3">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <BuildingOffice2Icon className="h-5 w-5 text-blue-500" />
              <span className="font-medium">المخزن المصدر:</span>
              <span className="font-semibold">{sourceWarehouse?.warehouse_name || 'غير معروف'}</span>
            </div>
            <div className="flex items-center gap-2">
              <BuildingOffice2Icon className="h-5 w-5 text-blue-500" />
              <span className="font-medium">المخزن الوجهة:</span>
              <span className="font-semibold">{destWarehouse?.warehouse_name || 'غير معروف'}</span>
            </div>
            <div className="flex items-center gap-2">
              <InformationCircleIcon className="h-5 w-5 text-blue-500" />
              <span className="font-medium">الحالة:</span>
              <span className="font-semibold">{request.request_status}</span>
            </div>
            <div className="flex items-center gap-2">
              <CalendarDaysIcon className="h-5 w-5 text-blue-500" />
              <span className="font-medium">التاريخ:</span>
              <span className="font-semibold">{request.request_created_at}</span>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <ChatBubbleBottomCenterTextIcon className="h-5 w-5 text-blue-500 mt-1" />
            <div className="flex items-center gap-2">
              <span className="font-medium">ملاحظات:</span>
              <span className="text-gray-700">{request.request_notes || 'لا يوجد'}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border">
          <div className="mb-3">
            <h4 className="text-lg font-semibold text-gray-800">العناصر المطلوبة</h4>
          </div>
          
          {/* Warning for items not available in source warehouse */}
          {selectedSourceWarehouseId && items.some(item => {
            const available = allInventoryItems.some(inv => 
              inv.warehouse_id === Number(selectedSourceWarehouseId) &&
              inv.variant_id === Number(item.variant_id) &&
              inv.packaging_type_id === Number(item.packaging_type_id)
            );
            return !available;
          }) && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">
                ⚠️ بعض العناصر غير متوفرة في المخزن المصدر المحدد
              </p>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-right w-1/3">المنتج/الخيار</th>
                  <th className="px-4 py-2 text-right w-1/6">نوع التعبئة</th>
                  <th className="px-4 py-2 text-right w-1/6">اختيار الدفعة</th>
                  <th className="px-4 py-2 text-right w-1/6">الكمية المتاح</th>
                  <th className="px-4 py-2 text-center w-1/6">إجراءات</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {items.map(it => (
                  <tr key={it.request_item_id}>
                    <td className="px-4 py-2">
                      {editRow === it.request_item_id ? (
                        <SearchableSelect
                          options={productVariantOptions}
                          value={String(it.variant_id)}
                          onChange={(val) => {
                            if (val) {
                              // Calculate packaging options for the selected variant
                              const packagingWithQuantity = new Map();
                              allInventoryItems.forEach(inv => {
                                if (inv.warehouse_id === Number(selectedSourceWarehouseId) && inv.variant_id === Number(val)) {
                                  const current = packagingWithQuantity.get(inv.packaging_type_id) || 0;
                                  packagingWithQuantity.set(inv.packaging_type_id, current + Number(inv.inventory_quantity || 0));
                                }
                              });
                              
                              const availablePackaging = (packagingTypes || [])
                                .filter(pt => packagingWithQuantity.has(pt.packaging_types_id))
                                .map(pt => ({ 
                                  value: String(pt.packaging_types_id), 
                                  label: pt.packaging_types_name,
                                  totalQuantity: packagingWithQuantity.get(pt.packaging_types_id)
                                }))
                                .sort((a, b) => b.totalQuantity - a.totalQuantity);
                              
                              // Auto-select most available packaging
                              const bestPackaging = availablePackaging[0]?.value || '';
                              
                              // Calculate batch options for the auto-selected packaging
                              let bestBatch = '';
                              if (bestPackaging) {
                                const batches = allInventoryItems.filter(inv =>
                                  inv.warehouse_id === Number(selectedSourceWarehouseId) &&
                                  inv.variant_id === Number(val) &&
                                  inv.packaging_type_id === Number(bestPackaging)
                                );
                                batches.sort((a,b) => Number(b.inventory_quantity) - Number(a.inventory_quantity));
                                bestBatch = batches[0] ? batches[0].inventory_id : '';
                              }

                              // Update variant, packaging, and set auto-selected batch
                              setLocalItems(prev => prev.map(x => 
                                x.request_item_id === it.request_item_id 
                                  ? { ...x, variant_id: Number(val), packaging_type_id: Number(bestPackaging) || '' }
                                  : x
                              ));
                              
                              // Set batch allocation for the auto-selected batch
                              if (bestBatch) {
                                setAllocInventoryByItem(prev => ({
                                  ...prev,
                                  [it.request_item_id]: Number(bestBatch)
                                }));
                              } else {
                                // Clear batch allocation if no batch available
                                setAllocInventoryByItem(prev => {
                                  const newAlloc = { ...prev };
                                  delete newAlloc[it.request_item_id];
                                  return newAlloc;
                                });
                              }
                            }
                          }}
                          placeholder="المنتج/الخيار"
                          menuPortalTarget={document.body}
                          menuPosition="auto"
                          styles={dropdownStyles}
                        />
                      ) : (
                        <span>{it.products_name ? `${it.products_name} - ${it.variant_name}` : it.variant_name}</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {editRow === it.request_item_id ? (
                        <SearchableSelect
                          options={getPackagingOptionsForEdit(it.variant_id)}
                          value={String(it.packaging_type_id)}
                          onChange={(val) => {
                            if (val) {
                              // Auto-select biggest batch for this packaging
                              const batches = allInventoryItems.filter(inv =>
                                inv.warehouse_id === Number(selectedSourceWarehouseId) &&
                                inv.variant_id === Number(it.variant_id) &&
                                inv.packaging_type_id === Number(val)
                              );
                              batches.sort((a,b) => Number(b.inventory_quantity) - Number(a.inventory_quantity));
                              const bestBatch = batches[0] ? batches[0].inventory_id : '';

                              setLocalItems(prev => prev.map(x => 
                                x.request_item_id === it.request_item_id 
                                  ? { ...x, packaging_type_id: Number(val) }
                                  : x
                              ));
                              
                              // Set batch allocation for the auto-selected batch
                              if (bestBatch) {
                                setAllocInventoryByItem(prev => ({
                                  ...prev,
                                  [it.request_item_id]: Number(bestBatch)
                                }));
                              } else {
                                // Clear batch allocation if no batch available
                                setAllocInventoryByItem(prev => {
                                  const newAlloc = { ...prev };
                                  delete newAlloc[it.request_item_id];
                                  return newAlloc;
                                });
                              }
                            }
                          }}
                          placeholder="نوع التعبئة"
                          menuPortalTarget={document.body}
                          menuPosition="auto"
                          styles={dropdownStyles}
                        />
                      ) : (
                        <span>{it.packaging_types_name}</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {selectedSourceWarehouseId ? (
                        <select
                          className="border rounded px-2 py-1 w-full"
                          value={allocInventoryByItem[it.request_item_id] || ''}
                          onChange={e => setAllocInventoryByItem(prev => ({ ...prev, [it.request_item_id]: e.target.value ? Number(e.target.value) : undefined }))}
                        >
                          <option value="">اختر دفعة</option>
                          {getMatchingBatches(it).map(b => (
                            <option key={b.inventory_id} value={b.inventory_id}>
                              {new Date(b.inventory_production_date).toLocaleDateString('en-GB')}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-gray-400">اختر مخزن</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex flex-col">
                        {editRow === it.request_item_id ? (
                          <input type="number" min="0" className="border rounded px-2 py-1 w-full" value={it.requested_quantity}
                            onChange={e => setLocalItems(prev => prev.map(x => x.request_item_id === it.request_item_id ? { ...x, requested_quantity: Number(e.target.value) } : x))} />
                        ) : (
                          <span>{it.requested_quantity}</span>
                        )}
                        {selectedSourceWarehouseId && (
                          <div className={`text-xs mt-1 ${getAvailableForRow(it) >= Number(it.requested_quantity || 0) ? 'text-green-600' : 'text-red-600'}`}>
                            المتاح: {getAvailableForRow(it)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-center flex items-center gap-2 justify-center">
                      {editRow === it.request_item_id ? (
                        <>
                          <button className="text-green-600 hover:text-green-800" title="حفظ" onClick={() => handleSaveEdit(it)}>
                            <CheckCircleIcon className="h-5 w-5" />
                          </button>
                          <button className="text-gray-600 hover:text-gray-800" title="إلغاء" onClick={() => setEditRow(null)}>
                            إلغاء
                          </button>
                        </>
                      ) : (
                        <button className="text-blue-600 hover:text-blue-800" title="تعديل" onClick={() => setEditRow(it.request_item_id)}>
                          <PencilSquareIcon className="h-5 w-5" />
                        </button>
                      )}
                      <button onClick={() => handleDeleteItem(it)} className="text-red-600 hover:text-red-800 p-1" title="إزالة"><TrashIcon className="h-5 w-5" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 border-t pt-4">
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="text-xs text-gray-600 block mb-1">المنتج/الخيار</label>
                <SearchableSelect 
                  options={productVariantOptions} 
                  value={addForm.variant_id} 
                  onChange={(v) => {
                    if (!v) {
                      setAddForm(f => ({ ...f, variant_id: '', packaging_type_id: '', batch_inventory_id: '' }));
                      return;
                    }
                    
                    // Calculate packaging options for the selected variant
                    const packagingWithQuantity = new Map();
                    allInventoryItems.forEach(inv => {
                      if (inv.warehouse_id === Number(selectedSourceWarehouseId) && inv.variant_id === Number(v)) {
                        const current = packagingWithQuantity.get(inv.packaging_type_id) || 0;
                        packagingWithQuantity.set(inv.packaging_type_id, current + Number(inv.inventory_quantity || 0));
                      }
                    });
                    
                    const availablePackaging = (packagingTypes || [])
                      .filter(pt => packagingWithQuantity.has(pt.packaging_types_id))
                      .map(pt => ({ 
                        value: String(pt.packaging_types_id), 
                        label: pt.packaging_types_name,
                        totalQuantity: packagingWithQuantity.get(pt.packaging_types_id)
                      }))
                      .sort((a, b) => b.totalQuantity - a.totalQuantity);
                    
                    // Auto-select most available packaging
                    const bestPackaging = availablePackaging[0]?.value || '';
                    
                    // Calculate batch options for the auto-selected packaging
                    let bestBatch = '';
                    if (bestPackaging) {
                      const batches = allInventoryItems.filter(inv =>
                        inv.warehouse_id === Number(selectedSourceWarehouseId) &&
                        inv.variant_id === Number(v) &&
                        inv.packaging_type_id === Number(bestPackaging)
                      );
                      batches.sort((a,b) => Number(b.inventory_quantity) - Number(a.inventory_quantity));
                      bestBatch = batches[0] ? String(batches[0].inventory_id) : '';
                    }
                    
                    setAddForm(f => ({ 
                      ...f, 
                      variant_id: v, 
                      packaging_type_id: bestPackaging, 
                      batch_inventory_id: bestBatch 
                    }));
                  }} 
                  placeholder="اختر المنتج/الخيار"
                  menuPortalTarget={document.body}
                  menuPosition="auto"
                  styles={dropdownStyles}
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-600 block mb-1">نوع التعبئة</label>
                <SearchableSelect 
                  options={packagingOptionsForVariant} 
                  value={addForm.packaging_type_id} 
                  onChange={(v) => {
                    if (!v) {
                      setAddForm(f => ({ ...f, packaging_type_id: '', batch_inventory_id: '' }));
                      return;
                    }
                    
                    // Auto-select biggest batch for this packaging
                    const batches = allInventoryItems.filter(inv =>
                      inv.warehouse_id === Number(selectedSourceWarehouseId) &&
                      inv.variant_id === Number(addForm.variant_id) &&
                      inv.packaging_type_id === Number(v)
                    );
                    batches.sort((a,b) => Number(b.inventory_quantity) - Number(a.inventory_quantity));
                    const bestBatch = batches[0] ? String(batches[0].inventory_id) : '';
                    
                    setAddForm(f => ({ ...f, packaging_type_id: v, batch_inventory_id: bestBatch }));
                  }} 
                  placeholder="اختر التعبئة"
                  menuPortalTarget={document.body}
                  menuPosition="auto"
                  styles={dropdownStyles}
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-600 block mb-1">اختيار الدفعة</label>
                <SearchableSelect 
                  options={batchOptionsForAddForm} 
                  value={addForm.batch_inventory_id || ''} 
                  onChange={(v) => setAddForm(f => ({ ...f, batch_inventory_id: v }))} 
                  placeholder="اختر الدفعة"
                  menuPortalTarget={document.body}
                  menuPosition="auto"
                  styles={dropdownStyles}
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-600 block mb-1">الكمية المتاح</label>
                <input type="number" min="0" className="border rounded px-2 py-1 w-full" value={addForm.requested_quantity} onChange={e => setAddForm(f => ({ ...f, requested_quantity: e.target.value }))} />
                {addForm.batch_inventory_id && (
                  (() => {
                    const batch = batchOptionsForAddForm.find(b => b.value === addForm.batch_inventory_id);
                    const available = batch ? batch.quantity : 0;
                    const enough = available >= Number(addForm.requested_quantity || 0);
                    return (
                      <div className={`text-[11px] mt-1 ${enough ? 'text-green-600' : 'text-red-600'}`}>
                        المتاح: {available}
                      </div>
                    );
                  })()
                )}
              </div>
              <div className="flex-shrink-0">
                <label className="text-xs text-gray-600 block mb-1 opacity-0">.</label>
                <button onClick={handleAddItem} className="w-10 h-10 flex items-center justify-center bg-blue-600 text-white rounded hover:bg-blue-700">
                  <PlusCircleIcon className="h-6 w-6" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border">
          <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظة إدارية (اختياري)</label>
          <textarea value={adminNote} onChange={e => setAdminNote(e.target.value)} rows={2} className="w-full border rounded-md p-2" placeholder="أضف ملاحظة..." />
        </div>
      </div>

      {/* Validation warning before buttons */}
      {(() => {
        const insufficientItems = items.filter(item => {
          const available = getAvailableForRow(item);
          return available < Number(item.requested_quantity || 0);
        });
        
        const hasInsufficientQuantity = insufficientItems.length > 0;
        
        if (hasInsufficientQuantity) {
          return (
            <div className="px-4 pb-2">
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-700 text-sm font-medium mb-2">
                  ⚠️ لا يمكن إنشاء التحويل - الكميات المطلوبة تتجاوز المتاح:
                </p>
                <ul className="text-red-600 text-xs space-y-1">
                  {insufficientItems.map(item => (
                    <li key={item.request_item_id}>
                      • {item.products_name ? `${item.products_name} - ${item.variant_name}` : item.variant_name} 
                      ({item.packaging_types_name}): مطلوب {item.requested_quantity} - متاح {getAvailableForRow(item)}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        }
        return null;
      })()}

      <div className="p-4 bg-gray-100 border-t border-gray-200 rounded-b-xl sticky bottom-0 flex justify-center gap-3">
        <button 
          onClick={() => {
            // Build allocations for items with chosen inventory_id; fallback none means just approve
            const allocations = items
              .filter(it => allocInventoryByItem[it.request_item_id])
              .map(it => ({ request_item_id: it.request_item_id, inventory_id: allocInventoryByItem[it.request_item_id], quantity: it.requested_quantity }));
            onApproveAllocate?.(request.request_id, allocations, adminNote);
          }} 
          disabled={(() => {
            const insufficientItems = items.filter(item => {
              const available = getAvailableForRow(item);
              return available < Number(item.requested_quantity || 0);
            });
            return insufficientItems.length > 0;
          })()} 
          className={`px-6 py-2 rounded-md flex items-center gap-2 ${
            (() => {
              const insufficientItems = items.filter(item => {
                const available = getAvailableForRow(item);
                return available < Number(item.requested_quantity || 0);
              });
              return insufficientItems.length > 0 
                ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                : 'bg-green-600 text-white hover:bg-green-700';
            })()
          }`}
        >
          <CheckCircleIcon className="h-5 w-5" />
          تخصيص وإنشاء تحويل
        </button>
        <button onClick={() => onReject?.(request.request_id, adminNote)} className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">رفض الطلب</button>
      </div>
    </Modal>
  );
}
