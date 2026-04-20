// src/components/dashboard/tabs/inventory-management/records/ReceivingHistoryTab.jsx
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
} from "@heroicons/react/24/outline";
import { useOutletContext } from "react-router-dom";
import {
  InboxArrowDownIcon,
  EyeIcon,
  CalendarIcon,
  PrinterIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import {
  getGoodsReceiptsPaginated,
  getGoodsReceipt,
} from "../../../../../apis/goods_receipts";
import FilterBar from "../../../../common/FilterBar/FilterBar";
import { getAppWarehouses } from "../../../../../apis/auth";
import { getAllUsers } from "../../../../../apis/users";
import Loader from "../../../../common/Loader/Loader";
import Alert from "../../../../common/Alert/Alert";
import GlobalTable from "../../../../common/GlobalTable/GlobalTable";
import CustomPageHeader from "../../../../common/CustomPageHeader/CustomPageHeader";
import PaginationHeaderFooter from "../../../../common/PaginationHeaderFooter/PaginationHeaderFooter";
import { isOdooIntegrationEnabled } from "../../../../../utils/odooIntegration";
// formatDateTime is not exported from dateUtils; implement a tiny local helper
// that returns { date, time, full } using locale-aware formatting.

export default function ReceivingHistoryTab() {
  const { setChildRefreshHandler } = useOutletContext();
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [serverPagination, setServerPagination] = useState(null);
  const [warehouses, setWarehouses] = useState([]);
  const [filters, setFilters] = useState({
    search: "",
    date_from: "",
    date_to: "",
    warehouse_id: "",
    recipient_id: "",
  });
  const [odooEnabled, setOdooEnabled] = useState(false);
  const [recipients, setRecipients] = useState([]);

  const lastFetchKeyRef = useRef(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const resp = await getGoodsReceiptsPaginated({
        page: currentPage,
        limit: itemsPerPage,
        search: filters.search || undefined,
        date_from: filters.date_from || undefined,
        date_to: filters.date_to || undefined,
        warehouse_id: filters.warehouse_id || undefined,
        recipient_id: filters.recipient_id || undefined,
      });
      if (resp && resp.data) {
        setReceipts(resp.data || []);
        setServerPagination(resp.pagination || null);
      } else {
        setReceipts([]);
        setServerPagination(null);
      }
    } catch (e) {
      console.error("Load receipts error", e);
      setError("حدث خطأ أثناء تحميل سجلات الاستلام");
    } finally {
      setLoading(false);
    }
  }, [
    currentPage,
    itemsPerPage,
    filters.search,
    filters.date_from,
    filters.date_to,
    filters.warehouse_id,
    filters.recipient_id,
  ]);

  useEffect(() => {
    const key = `${currentPage}|${itemsPerPage}|${filters.search}|${filters.date_from}|${filters.date_to}|${filters.warehouse_id}|${filters.recipient_id}`;
    if (lastFetchKeyRef.current === key) return;
    lastFetchKeyRef.current = key;
    loadData();
    if (setChildRefreshHandler) {
      setChildRefreshHandler(() => () => loadData());
    }
    return () => {
      setChildRefreshHandler && setChildRefreshHandler(null);
    };
  }, [
    loadData,
    setChildRefreshHandler,
    currentPage,
    itemsPerPage,
    filters.search,
    filters.date_from,
    filters.date_to,
    filters.warehouse_id,
    filters.recipient_id,
  ]);

  useEffect(() => {
    // load warehouses and recipients for filters
    (async () => {
      try {
        const ws = await getAppWarehouses();
        const warehouseList = Array.isArray(ws?.data)
          ? ws.data
          : Array.isArray(ws)
            ? ws
            : [];
        setWarehouses(warehouseList);
      } catch (e) {
        console.warn("warehouses load err", e);
      }
      try {
        const r = await getAllUsers();
        const recipientList = Array.isArray(r?.data)
          ? r.data
          : Array.isArray(r)
            ? r
            : [];
        setRecipients(recipientList);
      } catch (e) {
        console.warn("recipients load err", e);
      }
    })();
  }, []);

  // Check if Odoo integration is enabled
  useEffect(() => {
    setOdooEnabled(isOdooIntegrationEnabled());
  }, []);

  const totalPages = useMemo(() => {
    const total = Number(serverPagination?.total ?? receipts.length ?? 0);
    return Math.max(
      1,
      Math.ceil(total / (serverPagination?.per_page || itemsPerPage || 10)),
    );
  }, [serverPagination, receipts.length, itemsPerPage]);

  const pagedReceipts = useMemo(() => receipts || [], [receipts]);

  const formatDateTime = (value) => {
    const d = value ? new Date(value) : new Date();
    if (!d || Number.isNaN(d.getTime()))
      return { date: "-", time: "-", full: "-" };
    const locale = "ar-EG";
    const date = d.toLocaleDateString(locale);
    const time = d.toLocaleTimeString(locale);
    return { date, time, full: `${date} ${time}` };
  };

  // Helper to extract purchase order ID from receipt
  const getPurchaseOrderId = (receipt) => {
    // First check if purchase_order_id is directly available on receipt
    if (receipt.purchase_order_id) {
      return receipt.purchase_order_id;
    }
    // Fallback: check items for purchase_order_id
    if (
      receipt.items &&
      Array.isArray(receipt.items) &&
      receipt.items.length > 0
    ) {
      const firstItem = receipt.items[0];
      return firstItem.purchase_order_id || null;
    }
    return null;
  };

  const handleViewDetails = async (r) => {
    try {
      setLoading(true);
      const full = await getGoodsReceipt(r.receipt_id);
      setSelectedReceipt(full || r);
      setShowDetailModal(true);
    } catch (e) {
      console.error("Failed to fetch receipt details", e);
      setSelectedReceipt(r);
      setShowDetailModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintReceipt = async (receipt) => {
    try {
      // fetch authoritative details first when possible
      let toPrint = receipt;
      try {
        const full = await getGoodsReceipt(receipt.receipt_id);
        if (full) toPrint = full;
      } catch {
        /* fallback to provided */
      }

      // build a simple HTML for printing; keep it as a plain string
      const rows =
        Array.isArray(toPrint.items) && toPrint.items.length > 0
          ? toPrint.items
              .map((item, i) => {
                const prodDateRaw =
                  item.production_date ||
                  item.goods_receipt_items_production_date ||
                  "";
                let prodDateDisplay = "-";
                try {
                  if (prodDateRaw)
                    prodDateDisplay = new Date(prodDateRaw).toLocaleDateString(
                      "ar-EG",
                    );
                } catch {
                  prodDateDisplay = prodDateRaw || "-";
                }
                const packaging =
                  item.packaging_type_name || item.packaging_name || "-";
                return `
          <tr>
            <td style="padding:8px;text-align:center">${i + 1}</td>
            <td style="padding:8px">${item.variant_name || item.product_name || "غير محدد"}</td>
            <td style="padding:8px;text-align:center">${item.variant_sku || "-"}</td>
            <td style="padding:8px;text-align:center">${packaging}</td>
            <td style="padding:8px;text-align:center">${parseFloat(item.quantity_received || 0).toFixed(2)}</td>
            <td style="padding:8px;text-align:center">${prodDateDisplay}</td>
          </tr>
        `;
              })
              .join("")
          : `<tr><td colspan="5" style="text-align:center;padding:12px">لا توجد أصناف</td></tr>`;

      const notesHtml = toPrint.notes
        ? `<div style="margin-top:10px;font-size:12px"><strong>ملاحظات:</strong> ${toPrint.notes}</div>`
        : "";

      const purchaseOrderId = getPurchaseOrderId(toPrint);
      const html = `<!doctype html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>إيصال استلام بضائع</title>
            <style>
              body { font-family: Arial, "Noto Naskh Arabic", sans-serif; direction: rtl; }
              table { border-collapse: collapse; width: 100%; }
              th, td { border: 1px solid #e5e7eb; }
              .signature-section { display:flex; gap:12px; margin-top:20px }
              .signature-box { flex:1; height:60px; border:1px solid #ddd; display:flex; align-items:center; justify-content:center }
              .footer-note { margin-top:12px; font-size:12px; color:#666 }
            </style>
          </head>
          <body>
            <h2 style="margin-bottom:6px">إيصال استلام بضائع - رقم: ${toPrint.receipt_id}</h2>
            ${purchaseOrderId ? `<div>رقم الطلب المرتبط: #${purchaseOrderId}</div>` : ""}
            <div>المخزن: ${toPrint.warehouse_name || "-"}</div>
            <div>المستلم: ${toPrint.received_by_user_name || "-"}</div>
            <div style="margin-bottom:12px">التاريخ: ${new Date(toPrint.receipt_date || toPrint.created_at).toLocaleDateString("en-GB")} ${new Date(toPrint.receipt_date || toPrint.created_at).toLocaleTimeString("en-GB")}</div>

            <table>
              <thead>
                <tr>
                  <th style="padding:8px">#</th>
                  <th style="padding:8px;text-align:right">اسم الصنف</th>
                  <th style="padding:8px;text-align:center">كود الصنف</th>
                  <th style="padding:8px;text-align:center">التعبئة</th>
                  <th style="padding:8px;text-align:center">الكمية المستلمة</th>
                  <th style="padding:8px;text-align:center">تاريخ الانتاج</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
            </table>

            ${notesHtml}

            <div class="signature-section">
              <div class="signature-box"><strong>توقيع المُسلِّم</strong></div>
              <div class="signature-box"><strong>توقيع المُستلم</strong></div>
              <div class="signature-box"><strong>ختم الشركة</strong></div>
            </div>
            <div class="footer-note">تم إنشاء هذا الإيصال بتاريخ ${new Date().toLocaleDateString("en-GB")} في ${new Date().toLocaleTimeString("en-GB")}</div>
          </body>
        </html>`;

      const { printHtml } = await import("../../../../../utils/printUtils.js");
      await printHtml(html, { title: "إيصال استلام بضائع", closeAfter: 700 });
    } catch (e) {
      console.error("Print error:", e);
    }
  };

  const handleFilterChange = useCallback(
    (key, value) => {
      setFilters((prev) => ({ ...prev, [key]: value ?? "" }));
      setCurrentPage(1);
    },
    [setFilters, setCurrentPage],
  );

  const handleClearAllFilters = useCallback(() => {
    setFilters({
      search: "",
      date_from: "",
      date_to: "",
      warehouse_id: "",
      recipient_id: "",
    });
    setCurrentPage(1);
  }, [setFilters, setCurrentPage]);

  const searchConfig = useMemo(
    () => ({
      value: filters.search,
      placeholder: "ابحث برقم الإيصال أو المستلم",
      onChange: (value) => handleFilterChange("search", value),
      onClear: () => handleFilterChange("search", ""),
      onSubmit: (value) => handleFilterChange("search", value),
    }),
    [filters.search, handleFilterChange],
  );

  const dateRangeConfig = useMemo(
    () => ({
      from: filters.date_from,
      to: filters.date_to,
      onChange: (fromVal, toVal) => {
        setFilters((prev) => ({
          ...prev,
          date_from: fromVal || "",
          date_to: toVal || "",
        }));
        setCurrentPage(1);
      },
      onClear: () => {
        setFilters((prev) => ({ ...prev, date_from: "", date_to: "" }));
        setCurrentPage(1);
      },
    }),
    [filters.date_from, filters.date_to, setFilters, setCurrentPage],
  );

  const selectFilters = useMemo(
    () => [
      {
        key: "warehouse",
        value: filters.warehouse_id,
        placeholder: "جميع المستودعات",
        options: [
          { value: "", label: "جميع المستودعات" },
          ...warehouses.map((w) => ({
            value: String(w.warehouses_id || w.warehouse_id),
            label: w.warehouses_name || w.warehouse_name,
          })),
        ],
        onChange: (value) => handleFilterChange("warehouse_id", value),
        wrapperClassName: "flex-1 min-w-[160px]",
      },
      {
        key: "recipient",
        value: filters.recipient_id,
        placeholder: "جميع المستلمين",
        options: [
          { value: "", label: "جميع المستلمين" },
          ...recipients.map((u) => ({
            value: String(u.users_id || u.id),
            label: u.users_name || u.users_full_name || u.name,
          })),
        ],
        onChange: (value) => handleFilterChange("recipient_id", value),
        wrapperClassName: "flex-1 min-w-[160px]",
      },
    ],
    [
      filters.warehouse_id,
      filters.recipient_id,
      warehouses,
      recipients,
      handleFilterChange,
    ],
  );

  const activeChips = useMemo(() => {
    const chips = [];
    if (filters.search) {
      chips.push({
        key: "search",
        label: "البحث",
        value: filters.search,
        tone: "blue",
        onRemove: () => handleFilterChange("search", ""),
      });
    }
    if (filters.date_from || filters.date_to) {
      chips.push({
        key: "date",
        label: "التاريخ",
        value: `${filters.date_from || "من البداية"} - ${filters.date_to || "حتى النهاية"}`,
        tone: "green",
        onRemove: () => {
          setFilters((prev) => ({ ...prev, date_from: "", date_to: "" }));
          setCurrentPage(1);
        },
      });
    }
    if (filters.warehouse_id) {
      const matchedWarehouse = warehouses.find(
        (w) =>
          String(w.warehouse_id || w.warehouses_id) ===
          String(filters.warehouse_id),
      );
      const warehouseLabel =
        matchedWarehouse?.warehouse_name ||
        matchedWarehouse?.warehouses_name ||
        "غير محدد";
      chips.push({
        key: "warehouse",
        label: "المستودع",
        value: warehouseLabel,
        tone: "indigo",
        onRemove: () => handleFilterChange("warehouse_id", ""),
      });
    }
    if (filters.recipient_id) {
      const matchedRecipient = recipients.find(
        (u) => String(u.users_id || u.id) === String(filters.recipient_id),
      );
      const recipientLabel =
        matchedRecipient?.users_name ||
        matchedRecipient?.users_full_name ||
        matchedRecipient?.name ||
        "غير محدد";
      chips.push({
        key: "recipient",
        label: "المستلم",
        value: recipientLabel,
        tone: "orange",
        onRemove: () => handleFilterChange("recipient_id", ""),
      });
    }
    return chips;
  }, [
    filters.search,
    filters.date_from,
    filters.date_to,
    filters.warehouse_id,
    filters.recipient_id,
    warehouses,
    recipients,
    handleFilterChange,
    setFilters,
    setCurrentPage,
  ]);

  if (loading) return <Loader />;
  if (error) return <Alert type="error" message={error} />;

  return (
    <div className="space-y-6" dir="rtl">
      <CustomPageHeader
        title="سجلات الاستلام"
        subtitle="مراجعة وإدارة عمليات الاستلام"
        icon={<InboxArrowDownIcon className="h-8 w-8 text-[#1F2937]" />}
        statValue={serverPagination?.total ?? receipts.length}
        statLabel="عملية استلام"
      />

      {/* FilterBar (contains its own floating label) */}
      <div className="mb-3">
        <FilterBar
          searchConfig={searchConfig}
          dateRangeConfig={dateRangeConfig}
          selectFilters={selectFilters}
          activeChips={activeChips}
          onClearAll={handleClearAllFilters}
        />
      </div>

      {/* Pagination header (top) - Sales Orders style */}
      {(serverPagination?.total ?? receipts.length) > 0 && (
        <PaginationHeaderFooter
          total={serverPagination?.total ?? receipts.length}
          currentPage={serverPagination?.page || currentPage}
          totalPages={totalPages}
          itemsPerPage={serverPagination?.per_page ?? itemsPerPage}
          onItemsPerPageChange={(n) => {
            setItemsPerPage(n);
            setCurrentPage(1);
          }}
          onFirst={() => setCurrentPage(1)}
          onPrev={() => setCurrentPage((p) => Math.max(1, p - 1))}
          onNext={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          onLast={() => setCurrentPage(totalPages)}
        />
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <GlobalTable
            data={pagedReceipts}
            loading={loading}
            error={error}
            columns={[
              {
                key: "receipt_id",
                title: "رقم الإيصال",
                headerClassName: "w-16 border-r border-gray-200",
                cellClassName: "w-16 border-r border-gray-200",
                sortable: true,
                render: (r) => (
                  <span className="font-medium text-blue-600">
                    #{r.receipt_id}
                  </span>
                ),
              },
              ...(odooEnabled
                ? [
                    {
                      key: "odoo_picking_id",
                      title: "Odoo ID",
                      headerClassName: "w-20 border-r border-gray-200",
                      cellClassName: "w-20 border-r border-gray-200",
                      sortable: true,
                      render: (r) =>
                        r.odoo_picking_id ? (
                          <span className="text-green-600 font-medium">
                            {r.odoo_picking_id}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        ),
                    },
                  ]
                : []),
              {
                key: "purchase_order_id",
                title: "رقم الطلب المرتبط",
                headerClassName: "border-r border-gray-200",
                cellClassName: "border-r border-gray-200",
                sortable: true,
                render: (r) => {
                  const id = getPurchaseOrderId(r);
                  return id ? (
                    <span className="font-medium">#{id}</span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  );
                },
              },
              {
                key: "warehouse_name",
                title: "المخزن",
                headerClassName: "min-w-[140px] border-r border-gray-200",
                cellClassName: "border-r border-gray-200",
                sortable: true,
                render: (r) => r.warehouse_name || "غير محدد",
              },
              {
                key: "received_by_user_name",
                title: "المستلم",
                headerClassName: "min-w-[140px] border-r border-gray-200",
                cellClassName: "border-r border-gray-200",
                sortable: true,
                render: (r) => r.received_by_user_name || "غير محدد",
              },
              {
                key: "receipt_datetime",
                title: "تاريخ / وقت الاستلام",
                headerClassName: "min-w-[180px] border-r border-gray-200",
                cellClassName: "border-r border-gray-200",
                sortable: true,
                render: (r) =>
                  formatDateTime(r.receipt_date || r.created_at).full,
              },
              {
                key: "notes",
                title: "ملاحظات",
                headerClassName: "min-w-[180px] border-r border-gray-200",
                cellClassName: "border-r border-gray-200",
                render: (r) => r.notes || "-",
              },
              {
                key: "actions",
                title: "الإجراءات",
                headerClassName: "w-32 text-center border-r border-gray-200",
                cellClassName: "text-center border-r border-gray-200",
                sortable: false,
                align: "center",
                mobileFullWidth: true,
                render: (r) => (
                  <div className="flex items-center justify-center gap-2">
                    <button
                      className="p-1.5 rounded-full text-amber-700 bg-amber-100 hover:bg-amber-500 hover:text-white hover:shadow-[0_0_12px_rgba(245,158,11,0.45)] transition-all duration-200 hover:scale-110"
                      onClick={() => handlePrintReceipt(r)}
                      title="طباعة"
                    >
                      <PrinterIcon className="h-4 w-4" />
                    </button>
                    <button
                      className="p-1.5 rounded-full text-sky-700 bg-sky-100 hover:bg-sky-500 hover:text-white hover:shadow-[0_0_12px_rgba(56,189,248,0.45)] transition-all duration-200 hover:scale-110"
                      onClick={() => handleViewDetails(r)}
                      title="عرض"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </button>
                  </div>
                ),
              },
            ]}
            rowKey="receipt_id"
            totalCount={serverPagination?.total ?? receipts.length}
            searchTerm={filters.search}
            initialSort={{ key: "receipt_id", direction: "desc" }}
            showSummary={false}
            renderRow={(r) => {
              const dt = formatDateTime(r.receipt_date || r.created_at);
              const purchaseOrderId = getPurchaseOrderId(r);
              return (
                <>
                  <td className="px-6 py-4 text-sm font-medium text-blue-600 ">
                    #{r.receipt_id}
                  </td>
                  {odooEnabled && (
                    <td className="px-6 py-4 text-sm text-gray-500 ">
                      {r.odoo_picking_id ? (
                        <span className="text-green-600 font-medium">
                          {r.odoo_picking_id}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                  )}
                  <td className="px-6 py-4 text-sm text-gray-500 ">
                    {purchaseOrderId ? `#${purchaseOrderId}` : "-"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 ">
                    <div
                      className="line-clamp-2"
                      style={{
                        display: "-webkit-box",
                        WebkitBoxOrient: "vertical",
                        WebkitLineClamp: 2,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        wordBreak: "break-word",
                      }}
                    >
                      {r.warehouse_name || "غير محدد"}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 ">
                    <div
                      className="line-clamp-2"
                      style={{
                        display: "-webkit-box",
                        WebkitBoxOrient: "vertical",
                        WebkitLineClamp: 2,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        wordBreak: "break-word",
                      }}
                    >
                      {r.received_by_user_name || "غير محدد"}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 ">
                    <div className="flex items-center">
                      <CalendarIcon className="h-4 w-4 ml-1 text-gray-400" />
                      {dt.full}
                    </div>
                  </td>
                  <td
                    className="px-6 py-4 text-sm text-gray-500  max-w-[180px] truncate"
                    title={r.notes}
                  >
                    {r.notes || "-"}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-center ">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        className="p-1.5 rounded-full 
text-amber-700 bg-amber-100
hover:bg-amber-500 hover:text-white
hover:shadow-[0_0_12px_rgba(245,158,11,0.45)]
transition-all duration-200 hover:scale-110"
                        onClick={() => handlePrintReceipt(r)}
                        title="طباعة"
                      >
                        <PrinterIcon className="h-4 w-4" />
                      </button>
                      <button
                        className="p-1.5 rounded-full 
                   text-sky-700 bg-sky-100
                   hover:bg-sky-500 hover:text-white
                   hover:shadow-[0_0_12px_rgba(56,189,248,0.45)]
                   transition-all duration-200 hover:scale-110"
                        onClick={() => handleViewDetails(r)}
                        title="عرض"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </>
              );
            }}
          />
        </div>
      </div>

      {/* Pagination footer (bottom) */}
      {(serverPagination?.total ?? receipts.length) > 0 && (
        <div className="mt-4">
          <PaginationHeaderFooter
            total={serverPagination?.total ?? receipts.length}
            currentPage={serverPagination?.page || currentPage}
            totalPages={totalPages}
            itemsPerPage={serverPagination?.per_page ?? itemsPerPage}
            onItemsPerPageChange={(n) => {
              setItemsPerPage(n);
              setCurrentPage(1);
            }}
            onFirst={() => setCurrentPage(1)}
            onPrev={() => setCurrentPage((p) => Math.max(1, p - 1))}
            onNext={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            onLast={() => setCurrentPage(totalPages)}
          />
        </div>
      )}

      {showDetailModal && selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="relative w-11/12 md:w-4/5 lg:w-3/4 xl:w-2/3 max-h-[85vh] overflow-y-auto rounded-2xl bg-white shadow-2xl border border-gray-100">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-[#8DD8F520] to-transparent rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-[#8DD8F5] text-[#1F2937] shadow-md">
                  <InboxArrowDownIcon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-[#1F2937]">
                  تفاصيل الاستلام #{selectedReceipt.receipt_id}
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedReceipt(null);
                }}
                className="p-2 rounded-full hover:bg-gray-100 transition"
              >
                <XMarkIcon className="h-6 w-6 text-gray-500" />
              </button>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
              {[
                ["رقم الإيصال", `#${selectedReceipt.receipt_id}`],
                [
                  "رقم الطلب المرتبط",
                  getPurchaseOrderId(selectedReceipt)
                    ? `#${getPurchaseOrderId(selectedReceipt)}`
                    : "غير محدد",
                ],
                ["المخزن", selectedReceipt.warehouse_name || "غير محدد"],
                [
                  "المستلم",
                  selectedReceipt.received_by_user_name || "غير محدد",
                ],
              ].map(([label, value], i) => (
                <div key={i} className="space-y-1">
                  <p className="text-xs font-medium text-gray-500">{label}</p>
                  <div className="bg-gray-50 rounded-xl px-3 py-2 font-medium text-[#1F2937] shadow-inner">
                    {value}
                  </div>
                </div>
              ))}

              {/* Date */}
              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-500">
                  تاريخ الاستلام
                </p>
                <div className="bg-gray-50 rounded-xl px-3 py-2 shadow-inner">
                  <p className="font-medium text-[#1F2937]">
                    {
                      formatDateTime(
                        selectedReceipt.receipt_date ||
                          selectedReceipt.created_at,
                      ).full
                    }
                  </p>
                  <div className="flex items-center text-xs text-gray-500 mt-1">
                    <CalendarIcon className="h-4 w-4 ml-1" />
                    {
                      formatDateTime(
                        selectedReceipt.receipt_date ||
                          selectedReceipt.created_at,
                      ).date
                    }
                    <span className="mx-2">•</span>
                    {
                      formatDateTime(
                        selectedReceipt.receipt_date ||
                          selectedReceipt.created_at,
                      ).time
                    }
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="md:col-span-3 space-y-1">
                <p className="text-xs font-medium text-gray-500">ملاحظات</p>
                <div className="bg-gray-50 rounded-xl px-3 py-3 min-h-[70px] shadow-inner">
                  {selectedReceipt.notes || "لا توجد ملاحظات"}
                </div>
              </div>
            </div>

            {/* Items Table */}
            {selectedReceipt.items && selectedReceipt.items.length > 0 ? (
              <div className="px-6 pb-6">
                <h4 className="text-lg font-semibold text-[#1F2937] mb-3">
                  الأصناف المستلمة ({selectedReceipt.items.length})
                </h4>

                <div className="overflow-hidden rounded-xl border border-gray-100 shadow-sm">
                  <table className="w-full text-sm">
                    <thead className="bg-[#f8fcfe] text-gray-500">
                      <tr>
                        <th className="py-3 text-center">#</th>
                        <th className="py-3 text-right">الصنف</th>
                        <th className="py-3 text-center">الكود</th>
                        <th className="py-3 text-center">التعبئة</th>
                        <th className="py-3 text-center">الكمية</th>
                        <th className="py-3 text-center">تاريخ الإنتاج</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedReceipt.items.map((item, index) => {
                        const prod =
                          item.production_date ||
                          item.goods_receipt_items_production_date ||
                          "";
                        const prodDisplay = prod
                          ? new Date(prod).toLocaleDateString("ar-EG")
                          : "-";
                        const packaging =
                          item.packaging_type_name ||
                          item.packaging_name ||
                          "-";

                        return (
                          <tr
                            key={index}
                            className="border-t hover:bg-[#f7fdff] transition"
                          >
                            <td className="py-3 text-center text-gray-500">
                              {index + 1}
                            </td>
                            <td className="py-3 font-medium text-[#1F2937]">
                              {item.variant_name ||
                                item.product_name ||
                                "غير محدد"}
                            </td>
                            <td className="py-3 text-center text-gray-500">
                              {item.variant_sku || "-"}
                            </td>
                            <td className="py-3 text-center text-gray-500">
                              {packaging}
                            </td>
                            <td className="py-3 text-center font-semibold text-emerald-600">
                              {parseFloat(item.quantity_received || 0).toFixed(
                                2,
                              )}
                            </td>
                            <td className="py-3 text-center text-gray-700">
                              {prodDisplay}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 text-gray-500 border-t">
                لا توجد أصناف مرتبطة بهذا الإيصال
              </div>
            )}

            {/* Footer */}
            <div className="flex justify-between items-center px-6 py-4 border-t bg-[#fbfdfe] rounded-b-2xl">
              <button
                onClick={() => handlePrintReceipt(selectedReceipt)}
                className="flex items-center  md:gap-2 px-2 md:px-5 py-2 rounded-xl text-sm md:text-base text-white font-medium shadow-lg transition hover:scale-[1.03]"
                style={{ background: "linear-gradient(90deg,#1F2937,#06202a)" }}
              >
                <PrinterIcon className="h-4 w-4" />
                طباعة الإيصال
              </button>

              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedReceipt(null);
                }}
                className="px-5 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 transition font-medium"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
