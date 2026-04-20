// src/components/dashboard/tabs/inventory-management/Transfers/RequestDetailsModal.jsx
import React, { useMemo, useState, useEffect } from "react";
import {
  XMarkIcon,
  BuildingOffice2Icon,
  CalendarDaysIcon,
  InformationCircleIcon,
  ChatBubbleBottomCenterTextIcon,
  CheckCircleIcon,
  TrashIcon,
  PencilSquareIcon,
  PlusCircleIcon,
} from "@heroicons/react/24/outline";
import SearchableSelect from "../../../../common/SearchableSelect/SearchableSelect";

// Theme tokens
const THEME_DARK = "#1F2937";
const THEME_ACCENT = "#8DD8F5";

/* Minimal glass/modal wrapper with premium styling */
const Modal = ({
  isOpen,
  onClose,
  dir = "rtl",
  modalWidthClass = "max-w-6xl",
  children,
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-2 sm:px-4">
      {/* backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0"
        style={{ background: `${THEME_DARK}B3`, backdropFilter: "blur(6px)" }}
      />

      <div
        dir={dir}
        className={`${modalWidthClass} w-full relative bg-white rounded-3xl overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.28)] border border-white/30`}
        style={{ maxHeight: "92vh" }}
      >
        {children}
      </div>
    </div>
  );
};

export default function RequestDetailsModal({
  isOpen,
  onClose,
  request,
  warehouses,
  products = [],
  packagingTypes = [],
  allInventoryItems = [],
  onApproveAllocate,
  onReject,
  setGlobalMessage,
  refreshData,
}) {
  // states (kept same names/roles as before)
  const [adminNote, setAdminNote] = useState("");
  const [localItems, setLocalItems] = useState([]);
  const [editRow, setEditRow] = useState(null); // request_item_id being edited
  const [addForm, setAddForm] = useState({
    variant_id: "",
    packaging_type_id: "",
    requested_quantity: "",
  });
  const [selectedSourceWarehouseId, setSelectedSourceWarehouseId] =
    useState(null);
  const [allocInventoryByItem, setAllocInventoryByItem] = useState({}); // { request_item_id: inventory_id }

  // Dropdown styles for SearchableSelect (kept, for layering)
  const dropdownStyles = {
    menuPortal: (base) => ({ ...base, zIndex: 10000, position: "fixed" }),
    menu: (base, { placement }) => ({
      ...base,
      zIndex: 10000,
      position: "fixed",
      maxHeight: "220px",
      overflow: "auto",
      boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
      border: "1px solid #e5e7eb",
      transform: placement === "bottom" ? "translateY(-100%)" : "translateY(0)",
    }),
    control: (base) => ({ ...base, minHeight: "40px", fontSize: "14px" }),
    option: (base) => ({ ...base, fontSize: "14px", padding: "8px 12px" }),
  };

  // init local items + selected source warehouse + default batch allocation
  useEffect(() => {
    setLocalItems(Array.isArray(request?.items) ? request.items : []);
    setSelectedSourceWarehouseId(request?.request_source_warehouse_id || null);
  }, [request]);

  useEffect(() => {
    // Auto-select default batch for existing items (biggest quantity) when source is known
    if (!Array.isArray(request?.items) || !selectedSourceWarehouseId) return;
    const defaultAllocations = {};
    request.items.forEach((item) => {
      const batches = allInventoryItems.filter(
        (inv) =>
          inv.warehouse_id === Number(selectedSourceWarehouseId) &&
          inv.variant_id === Number(item.variant_id) &&
          inv.packaging_type_id === Number(item.packaging_type_id),
      );
      batches.sort(
        (a, b) => Number(b.inventory_quantity) - Number(a.inventory_quantity),
      );
      if (batches[0])
        defaultAllocations[item.request_item_id] = batches[0].inventory_id;
    });
    setAllocInventoryByItem(defaultAllocations);
  }, [request, selectedSourceWarehouseId, allInventoryItems]);

  const sourceWarehouse = warehouses.find(
    (w) => w.warehouse_id === request?.request_source_warehouse_id,
  );
  const destWarehouse = warehouses.find(
    (w) => w.warehouse_id === request?.request_destination_warehouse_id,
  );

  const items = localItems;

  // Options and helpers (kept same logic)
  const warehouseOptions = useMemo(
    () =>
      (warehouses || []).map((w) => ({
        value: String(w.warehouse_id),
        label: w.warehouse_name,
      })),
    [warehouses],
  );

  const productVariantOptions = useMemo(() => {
    if (!selectedSourceWarehouseId || !Array.isArray(allInventoryItems))
      return [];
    const availableVariants = new Set();
    allInventoryItems.forEach((inv) => {
      if (inv.warehouse_id === Number(selectedSourceWarehouseId))
        availableVariants.add(inv.variant_id);
    });
    const opts = [];
    (products || []).forEach((p) => {
      (p.variants || []).forEach((v) => {
        if (availableVariants.has(v.variant_id))
          opts.push({
            value: String(v.variant_id),
            label: `${p.products_name} - ${v.variant_name}`,
          });
      });
    });
    return opts;
  }, [products, selectedSourceWarehouseId, allInventoryItems]);

  const packagingOptionsForVariant = useMemo(() => {
    if (
      !selectedSourceWarehouseId ||
      !addForm.variant_id ||
      !Array.isArray(allInventoryItems)
    )
      return [];
    const packagingWithQuantity = new Map();
    allInventoryItems.forEach((inv) => {
      if (
        inv.warehouse_id === Number(selectedSourceWarehouseId) &&
        inv.variant_id === Number(addForm.variant_id)
      ) {
        const current = packagingWithQuantity.get(inv.packaging_type_id) || 0;
        packagingWithQuantity.set(
          inv.packaging_type_id,
          current + Number(inv.inventory_quantity || 0),
        );
      }
    });
    return (packagingTypes || [])
      .filter((pt) => packagingWithQuantity.has(pt.packaging_types_id))
      .map((pt) => ({
        value: String(pt.packaging_types_id),
        label: pt.packaging_types_name,
        totalQuantity: packagingWithQuantity.get(pt.packaging_types_id),
      }))
      .sort((a, b) => b.totalQuantity - a.totalQuantity);
  }, [
    packagingTypes,
    selectedSourceWarehouseId,
    addForm.variant_id,
    allInventoryItems,
  ]);

  const batchOptionsForAddForm = useMemo(() => {
    if (
      !selectedSourceWarehouseId ||
      !addForm.variant_id ||
      !addForm.packaging_type_id ||
      !Array.isArray(allInventoryItems)
    )
      return [];
    const batches = allInventoryItems.filter(
      (inv) =>
        inv.warehouse_id === Number(selectedSourceWarehouseId) &&
        inv.variant_id === Number(addForm.variant_id) &&
        inv.packaging_type_id === Number(addForm.packaging_type_id),
    );
    batches.sort(
      (a, b) => Number(b.inventory_quantity) - Number(a.inventory_quantity),
    );
    return batches.map((b) => ({
      value: String(b.inventory_id),
      label: new Date(b.inventory_production_date).toLocaleDateString("en-GB"),
      inventory_id: b.inventory_id,
      quantity: b.inventory_quantity,
    }));
  }, [
    selectedSourceWarehouseId,
    addForm.variant_id,
    addForm.packaging_type_id,
    allInventoryItems,
  ]);

  const getMatchingBatches = (row) => {
    if (!Array.isArray(allInventoryItems)) return [];
    let list = allInventoryItems.filter(
      (inv) =>
        inv.warehouse_id === Number(selectedSourceWarehouseId) &&
        inv.variant_id === Number(row.variant_id) &&
        inv.packaging_type_id === Number(row.packaging_type_id),
    );
    list.sort(
      (a, b) => Number(b.inventory_quantity) - Number(a.inventory_quantity),
    );
    return list;
  };

  const getPackagingOptionsForEdit = (variantId) => {
    if (
      !selectedSourceWarehouseId ||
      !variantId ||
      !Array.isArray(allInventoryItems)
    )
      return [];
    const packagingWithQuantity = new Map();
    allInventoryItems.forEach((inv) => {
      if (
        inv.warehouse_id === Number(selectedSourceWarehouseId) &&
        inv.variant_id === Number(variantId)
      ) {
        const current = packagingWithQuantity.get(inv.packaging_type_id) || 0;
        packagingWithQuantity.set(
          inv.packaging_type_id,
          current + Number(inv.inventory_quantity || 0),
        );
      }
    });
    return (packagingTypes || [])
      .filter((pt) => packagingWithQuantity.has(pt.packaging_types_id))
      .map((pt) => ({
        value: String(pt.packaging_types_id),
        label: pt.packaging_types_name,
        totalQuantity: packagingWithQuantity.get(pt.packaging_types_id),
      }))
      .sort((a, b) => b.totalQuantity - a.totalQuantity);
  };

  const getAvailableForRow = (row) => {
    if (!Array.isArray(allInventoryItems)) return 0;
    const invId = allocInventoryByItem[row.request_item_id];
    const baseFilter = (x) =>
      x.warehouse_id === Number(selectedSourceWarehouseId) &&
      x.variant_id === Number(row.variant_id) &&
      x.packaging_type_id === Number(row.packaging_type_id);
    if (invId) {
      const inv = allInventoryItems.find(
        (x) => x.inventory_id === Number(invId),
      );
      return Number(inv?.inventory_quantity || 0);
    }
    const list = allInventoryItems.filter((x) => baseFilter(x));
    return list.reduce((sum, x) => sum + Number(x.inventory_quantity || 0), 0);
  };

  // keep handlers but UI enhanced
  const handleSaveEdit = async (row) => {
    setEditRow(null);
    setGlobalMessage?.({
      type: "info",
      message: "تم تعديل العنصر محلياً للتخصيص.",
    });
  };

  const handleDeleteItem = async (row) => {
    setLocalItems((prev) =>
      prev.filter((x) => x.request_item_id !== row.request_item_id),
    );
  };

  const handleAddItem = async () => {
    const variant_id = addForm.variant_id ? Number(addForm.variant_id) : null;
    const packaging_type_id = addForm.packaging_type_id
      ? Number(addForm.packaging_type_id)
      : null;
    const requested_quantity = Number(addForm.requested_quantity || 0);
    if (
      !variant_id ||
      !packaging_type_id ||
      !requested_quantity ||
      !addForm.batch_inventory_id
    ) {
      setGlobalMessage?.({
        type: "warning",
        message: "من فضلك أكمل بيانات العنصر واختر الدفعة.",
      });
      return;
    }

    const selectedBatchInventoryId = Number(addForm.batch_inventory_id);
    const isDuplicate = items.some((item) => {
      const itemBatchId = allocInventoryByItem[item.request_item_id];
      return (
        item.variant_id === variant_id &&
        item.packaging_type_id === packaging_type_id &&
        itemBatchId === selectedBatchInventoryId
      );
    });

    if (isDuplicate) {
      setGlobalMessage?.({
        type: "warning",
        message: "هذا العنصر موجود بالفعل بنفس المنتج ونوع التعبئة والدفعة!",
      });
      return;
    }

    const newItemId = Math.floor(Math.random() * 1e9);
    const newItem = {
      request_item_id: newItemId,
      variant_id,
      packaging_type_id,
      requested_quantity,
      variant_name:
        productVariantOptions.find((o) => o.value === String(variant_id))
          ?.label || "Variant",
      packaging_types_name:
        packagingOptionsForVariant.find(
          (o) => o.value === String(packaging_type_id),
        )?.label || "Packaging",
    };
    setLocalItems((prev) => [...prev, newItem]);

    setAllocInventoryByItem((prev) => ({
      ...prev,
      [newItemId]: selectedBatchInventoryId,
    }));

    setAddForm({
      variant_id: "",
      packaging_type_id: "",
      requested_quantity: "",
      batch_inventory_id: "",
    });
  };

  if (!isOpen || !request) return null;

  // UI: premium header + info grid + cards (editable) + add form + actions
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      dir="rtl"
      modalWidthClass="max-w-6xl flex flex-col"
    >
      {/* Header */}
      <div
        className="relative px-6 py-5 bg-gradient-to-r from-[#8DD8F5]/35 to-white border-b"
        style={{ borderBottomColor: "rgba(0,0,0,0.04)" }}
      >
        <div className="absolute inset-0 blur-xl bg-[#8DD8F5]/30 -z-10" />
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-extrabold text-[#1F2937]">
              تفاصيل الطلب رقم REQ-{request.request_id}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              مراجعة الطلب، تخصيص دفعات وإنشاء التحويل
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white shadow hover:scale-105 transition flex items-center justify-center"
          >
            <XMarkIcon className="h-6 w-6 text-[#1F2937]" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div
        className="p-3 sm:p-6 bg-[#F8FAFC] space-y-5"
        style={{ maxHeight: "calc(95vh - 120px)", overflowY: "auto" }}
      >
        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white rounded-2xl p-5 shadow border">
          <div>
            <p className="text-xs text-gray-500">المخزن المصدر</p>
            <p className="font-bold text-[#1F2937]">
              {sourceWarehouse?.warehouse_name || "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">المخزن الوجهة</p>
            <p className="font-bold text-[#1F2937]">
              {destWarehouse?.warehouse_name || "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">الحالة</p>
            <p className="font-bold text-[#1F2937]">{request.request_status}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">التاريخ</p>
            <p className="font-bold text-[#1F2937]">
              {request.request_created_at}
            </p>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-2xl p-4 shadow border">
          <div className="flex items-start gap-3">
            <ChatBubbleBottomCenterTextIcon className="h-5 w-5 text-[#8DD8F5] mt-1" />
            <div>
              <p className="text-sm font-medium">ملاحظات</p>
              <p className="text-gray-700 mt-1">
                {request.request_notes || "لا يوجد"}
              </p>
            </div>
          </div>
        </div>

        {/* Items list - premium card layout while preserving edit capabilities */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-semibold text-[#1F2937]">
              العناصر المطلوبة
            </h4>
            <div className="text-sm text-gray-500">{items.length} عنصر</div>
          </div>

          {/* Warning if some items unavailable */}
          {selectedSourceWarehouseId &&
            items.some((item) => {
              return !allInventoryItems.some(
                (inv) =>
                  inv.warehouse_id === Number(selectedSourceWarehouseId) &&
                  inv.variant_id === Number(item.variant_id) &&
                  inv.packaging_type_id === Number(item.packaging_type_id),
              );
            }) && (
              <div className="mb-2 p-3 rounded-lg bg-red-50 border border-red-200">
                <p className="text-red-700 text-sm">
                  ⚠️ بعض العناصر غير متوفرة في المخزن المصدر المحدد
                </p>
              </div>
            )}

          {/* Items */}
          {items.map((it) => (
            <div
              key={it.request_item_id}
              className="bg-white rounded-2xl p-4 shadow hover:shadow-xl transition grid grid-cols-1 md:grid-cols-5 gap-3 items-center border"
            >
              {/* Product / Variant display or editable select */}
              <div className="font-semibold text-[#1F2937]">
                {editRow === it.request_item_id ? (
                  <SearchableSelect
                    options={productVariantOptions}
                    value={String(it.variant_id)}
                    onChange={(val) => {
                      if (!val) return;
                      // compute packaging options and auto select best batch
                      const packagingWithQuantity = new Map();
                      allInventoryItems.forEach((inv) => {
                        if (
                          inv.warehouse_id ===
                            Number(selectedSourceWarehouseId) &&
                          inv.variant_id === Number(val)
                        ) {
                          const current =
                            packagingWithQuantity.get(inv.packaging_type_id) ||
                            0;
                          packagingWithQuantity.set(
                            inv.packaging_type_id,
                            current + Number(inv.inventory_quantity || 0),
                          );
                        }
                      });
                      const availablePackaging = (packagingTypes || [])
                        .filter((pt) =>
                          packagingWithQuantity.has(pt.packaging_types_id),
                        )
                        .map((pt) => ({
                          value: String(pt.packaging_types_id),
                          label: pt.packaging_types_name,
                          totalQuantity: packagingWithQuantity.get(
                            pt.packaging_types_id,
                          ),
                        }))
                        .sort((a, b) => b.totalQuantity - a.totalQuantity);

                      const bestPackaging = availablePackaging[0]?.value || "";
                      let bestBatch = "";
                      if (bestPackaging) {
                        const batches = allInventoryItems.filter(
                          (inv) =>
                            inv.warehouse_id ===
                              Number(selectedSourceWarehouseId) &&
                            inv.variant_id === Number(val) &&
                            inv.packaging_type_id === Number(bestPackaging),
                        );
                        batches.sort(
                          (a, b) =>
                            Number(b.inventory_quantity) -
                            Number(a.inventory_quantity),
                        );
                        bestBatch = batches[0] ? batches[0].inventory_id : "";
                      }

                      setLocalItems((prev) =>
                        prev.map((x) =>
                          x.request_item_id === it.request_item_id
                            ? {
                                ...x,
                                variant_id: Number(val),
                                packaging_type_id: Number(bestPackaging) || "",
                              }
                            : x,
                        ),
                      );
                      if (bestBatch) {
                        setAllocInventoryByItem((prev) => ({
                          ...prev,
                          [it.request_item_id]: Number(bestBatch),
                        }));
                      } else {
                        setAllocInventoryByItem((prev) => {
                          const n = { ...prev };
                          delete n[it.request_item_id];
                          return n;
                        });
                      }
                    }}
                    placeholder="المنتج/الخيار"
                    menuPortalTarget={document.body}
                    menuPosition="auto"
                    styles={dropdownStyles}
                  />
                ) : (
                  <div>
                    {it.products_name
                      ? `${it.products_name} - ${it.variant_name}`
                      : it.variant_name}
                  </div>
                )}
              </div>

              {/* Packaging */}
              <div>
                {editRow === it.request_item_id ? (
                  <SearchableSelect
                    options={getPackagingOptionsForEdit(it.variant_id)}
                    value={String(it.packaging_type_id)}
                    onChange={(val) => {
                      if (!val) return;
                      const batches = allInventoryItems.filter(
                        (inv) =>
                          inv.warehouse_id ===
                            Number(selectedSourceWarehouseId) &&
                          inv.variant_id === Number(it.variant_id) &&
                          inv.packaging_type_id === Number(val),
                      );
                      batches.sort(
                        (a, b) =>
                          Number(b.inventory_quantity) -
                          Number(a.inventory_quantity),
                      );
                      const bestBatch = batches[0]
                        ? batches[0].inventory_id
                        : "";

                      setLocalItems((prev) =>
                        prev.map((x) =>
                          x.request_item_id === it.request_item_id
                            ? { ...x, packaging_type_id: Number(val) }
                            : x,
                        ),
                      );
                      if (bestBatch) {
                        setAllocInventoryByItem((prev) => ({
                          ...prev,
                          [it.request_item_id]: Number(bestBatch),
                        }));
                      } else {
                        setAllocInventoryByItem((prev) => {
                          const n = { ...prev };
                          delete n[it.request_item_id];
                          return n;
                        });
                      }
                    }}
                    placeholder="نوع التعبئة"
                    menuPortalTarget={document.body}
                    menuPosition="auto"
                    styles={dropdownStyles}
                  />
                ) : (
                  <div className="text-gray-600">{it.packaging_types_name}</div>
                )}
              </div>

              {/* Batch selection */}
              <div>
                {selectedSourceWarehouseId ? (
                  <div className="relative">
                    <select
                      value={allocInventoryByItem[it.request_item_id] || ""}
                      onChange={(e) =>
                        setAllocInventoryByItem((prev) => ({
                          ...prev,
                          [it.request_item_id]: e.target.value
                            ? Number(e.target.value)
                            : undefined,
                        }))
                      }
                      className="
                        w-full appearance-none
                        rounded-xl px-4 py-2.5 pr-10
                        bg-white
                        border border-gray-200
                        text-sm font-medium text-[#1F2937]
                        shadow-sm
                        hover:border-[#8DD8F5]
                        focus:outline-none focus:ring-2 focus:ring-[#8DD8F5]/60
                        transition
                      "
                    >
                      <option value="">اختر الدفعة</option>

                      {getMatchingBatches(it).map((b) => (
                        <option key={b.inventory_id} value={b.inventory_id}>
                          {new Date(
                            b.inventory_production_date,
                          ).toLocaleDateString("en-GB")}
                          {"  •  "}
                          متاح {b.inventory_quantity}
                        </option>
                      ))}
                    </select>

                    {/* Chevron icon */}
                    <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400">
                      <svg
                        className="h-4 w-4"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.38a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
                        />
                      </svg>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-400 italic">
                    اختر المخزن أولاً
                  </div>
                )}
              </div>

              {/* Quantity + availability */}
              <div>
                {editRow === it.request_item_id ? (
                  <input
                    type="number"
                    min="0"
                    className="w-full rounded-xl border px-3 py-2"
                    value={it.requested_quantity}
                    onChange={(e) =>
                      setLocalItems((prev) =>
                        prev.map((x) =>
                          x.request_item_id === it.request_item_id
                            ? {
                                ...x,
                                requested_quantity: Number(e.target.value),
                              }
                            : x,
                        ),
                      )
                    }
                  />
                ) : (
                  <div className="font-semibold">{it.requested_quantity}</div>
                )}
                {selectedSourceWarehouseId && (
                  <div
                    className={`text-xs mt-1 ${getAvailableForRow(it) >= Number(it.requested_quantity || 0) ? "text-green-600" : "text-red-600"}`}
                  >
                    المتاح: {getAvailableForRow(it)}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-center gap-3">
                {editRow === it.request_item_id ? (
                  <>
                    <button
                      title="حفظ"
                      onClick={() => handleSaveEdit(it)}
                      className="p-2 rounded-md hover:bg-green-50"
                    >
                      <CheckCircleIcon className="h-5 w-5 text-green-600" />
                    </button>
                    <button
                      title="إلغاء"
                      onClick={() => setEditRow(null)}
                      className="p-2 rounded-md hover:bg-gray-50"
                    >
                      إلغاء
                    </button>
                  </>
                ) : (
                  <button
                    title="تعديل"
                    onClick={() => setEditRow(it.request_item_id)}
                    className="p-2 rounded-md hover:bg-gray-50"
                  >
                    <PencilSquareIcon className="h-5 w-5 text-[#1F2937]" />
                  </button>
                )}
                <button
                  title="إزالة"
                  onClick={() => handleDeleteItem(it)}
                  className="p-2 rounded-md hover:bg-red-50"
                >
                  <TrashIcon className="h-5 w-5 text-red-600" />
                </button>
              </div>
            </div>
          ))}

          {/* ADD FORM  */}
          <div className="bg-white rounded-2xl p-4 shadow border">
            <div className="mb-3">
              <h4 className="text-base font-semibold text-[#1F2937]">
                إضافة عنصر جديد
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
              <div>
                <label className="text-xs text-gray-600 block mb-1">
                  المنتج/الخيار
                </label>
                <SearchableSelect
                  options={productVariantOptions}
                  value={addForm.variant_id}
                  onChange={(v) => {
                    if (!v) {
                      setAddForm((f) => ({
                        ...f,
                        variant_id: "",
                        packaging_type_id: "",
                        batch_inventory_id: "",
                      }));
                      return;
                    }
                    // compute packaging options + auto-select best batch
                    const packagingWithQuantity = new Map();
                    allInventoryItems.forEach((inv) => {
                      if (
                        inv.warehouse_id ===
                          Number(selectedSourceWarehouseId) &&
                        inv.variant_id === Number(v)
                      ) {
                        const current =
                          packagingWithQuantity.get(inv.packaging_type_id) || 0;
                        packagingWithQuantity.set(
                          inv.packaging_type_id,
                          current + Number(inv.inventory_quantity || 0),
                        );
                      }
                    });
                    const availablePackaging = (packagingTypes || [])
                      .filter((pt) =>
                        packagingWithQuantity.has(pt.packaging_types_id),
                      )
                      .map((pt) => ({
                        value: String(pt.packaging_types_id),
                        label: pt.packaging_types_name,
                        totalQuantity: packagingWithQuantity.get(
                          pt.packaging_types_id,
                        ),
                      }))
                      .sort((a, b) => b.totalQuantity - a.totalQuantity);
                    const bestPackaging = availablePackaging[0]?.value || "";

                    let bestBatch = "";
                    if (bestPackaging) {
                      const batches = allInventoryItems.filter(
                        (inv) =>
                          inv.warehouse_id ===
                            Number(selectedSourceWarehouseId) &&
                          inv.variant_id === Number(v) &&
                          inv.packaging_type_id === Number(bestPackaging),
                      );
                      batches.sort(
                        (a, b) =>
                          Number(b.inventory_quantity) -
                          Number(a.inventory_quantity),
                      );
                      bestBatch = batches[0]
                        ? String(batches[0].inventory_id)
                        : "";
                    }

                    setAddForm((f) => ({
                      ...f,
                      variant_id: v,
                      packaging_type_id: bestPackaging,
                      batch_inventory_id: bestBatch,
                    }));
                  }}
                  placeholder="اختر المنتج/الخيار"
                  menuPortalTarget={document.body}
                  menuPosition="auto"
                  styles={dropdownStyles}
                />
              </div>

              <div>
                <label className="text-xs text-gray-600 block mb-1">
                  نوع التعبئة
                </label>
                <SearchableSelect
                  options={packagingOptionsForVariant}
                  value={addForm.packaging_type_id}
                  onChange={(v) => {
                    if (!v) {
                      setAddForm((f) => ({
                        ...f,
                        packaging_type_id: "",
                        batch_inventory_id: "",
                      }));
                      return;
                    }
                    const batches = allInventoryItems.filter(
                      (inv) =>
                        inv.warehouse_id ===
                          Number(selectedSourceWarehouseId) &&
                        inv.variant_id === Number(addForm.variant_id) &&
                        inv.packaging_type_id === Number(v),
                    );
                    batches.sort(
                      (a, b) =>
                        Number(b.inventory_quantity) -
                        Number(a.inventory_quantity),
                    );
                    const bestBatch = batches[0]
                      ? String(batches[0].inventory_id)
                      : "";
                    setAddForm((f) => ({
                      ...f,
                      packaging_type_id: v,
                      batch_inventory_id: bestBatch,
                    }));
                  }}
                  placeholder="اختر التعبئة"
                  menuPortalTarget={document.body}
                  menuPosition="auto"
                  styles={dropdownStyles}
                />
              </div>

              <div>
                <label className="text-xs text-gray-600 block mb-1">
                  اختيار الدفعة
                </label>
                <SearchableSelect
                  options={batchOptionsForAddForm}
                  value={addForm.batch_inventory_id || ""}
                  onChange={(v) =>
                    setAddForm((f) => ({ ...f, batch_inventory_id: v }))
                  }
                  placeholder="اختر الدفعة"
                  menuPortalTarget={document.body}
                  menuPosition="auto"
                  styles={dropdownStyles}
                />
              </div>

              <div>
                <label className="text-xs text-gray-600 block mb-1">
                  الكمية المتاح
                </label>
                <input
                  type="number"
                  min="0"
                  className="border rounded px-3 py-2 w-full"
                  value={addForm.requested_quantity}
                  onChange={(e) =>
                    setAddForm((f) => ({
                      ...f,
                      requested_quantity: e.target.value,
                    }))
                  }
                />
                {addForm.batch_inventory_id &&
                  (() => {
                    const batch = batchOptionsForAddForm.find(
                      (b) => b.value === addForm.batch_inventory_id,
                    );
                    const available = batch ? batch.quantity : 0;
                    const enough =
                      available >= Number(addForm.requested_quantity || 0);
                    return (
                      <div
                        className={`text-[11px] mt-1 ${enough ? "text-green-600" : "text-red-600"}`}
                      >
                        المتاح: {available}
                      </div>
                    );
                  })()}
              </div>

              <div className="flex-shrink-0">
                <label className="text-xs text-gray-600 block mb-1 opacity-0">
                  .
                </label>
                <button
                  onClick={handleAddItem}
                  className="w-10 h-10 flex items-center justify-center bg-[#1F2937] text-white rounded hover:scale-105 transition"
                >
                  <PlusCircleIcon className="h-6 w-6" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* admin note */}
        <div className="bg-white rounded-2xl p-4 shadow border">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ملاحظة إدارية (اختياري)
          </label>
          <textarea
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
            rows={2}
            className="w-full border rounded-md p-2"
            placeholder="أضف ملاحظة..."
          />
        </div>
      {/* Validation warnings  */}
      {(() => {
        const insufficientItems = items.filter((item) => {
          const available = getAvailableForRow(item);
          return available < Number(item.requested_quantity || 0);
        });
        if (insufficientItems.length > 0) {
          return (
            <div className="px-6 pb-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-700 text-sm font-medium mb-2">
                  ⚠️ لا يمكن إنشاء التحويل - الكميات المطلوبة تتجاوز المتاح:
                </p>
                <ul className="text-red-600 text-xs space-y-1">
                  {insufficientItems.map((item) => (
                    <li key={item.request_item_id}>
                      •{" "}
                      {item.products_name
                        ? `${item.products_name} - ${item.variant_name}`
                        : item.variant_name}
                      ({item.packaging_types_name}): مطلوب{" "}
                      {item.requested_quantity} - متاح{" "}
                      {getAvailableForRow(item)}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        }
        return null;
      })()}

      {/* Action bar */}
      <div className=" bg-white/95 backdrop-blur-md border-t px-6 py-4 flex justify-center gap-4 shadow-[0_-10px_40px_rgba(0,0,0,0.06)]">
        <button
          onClick={() => {
            const allocations = items
              .filter((it) => allocInventoryByItem[it.request_item_id])
              .map((it) => ({
                request_item_id: it.request_item_id,
                inventory_id: allocInventoryByItem[it.request_item_id],
                quantity: it.requested_quantity,
              }));
            onApproveAllocate(request.request_id, allocations, adminNote);
          }}
          className="px-2 py-2 text-xs md:text-base md:px-8 md:py-3 rounded-xl font-bold text-white"
          style={{
            background: THEME_DARK,
            boxShadow: `0 8px 30px ${THEME_ACCENT}33`,
          }}
        >
          إنشاء التحويل
        </button>

        <button
          onClick={() => onReject?.(request.request_id, adminNote)}
          className="px-2 py-2 text-xs md:text-base md:px-8 md:py-3 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 shadow"
        >
          رفض الطلب
        </button>
      </div>
      </div>

    </Modal>
  );
}
