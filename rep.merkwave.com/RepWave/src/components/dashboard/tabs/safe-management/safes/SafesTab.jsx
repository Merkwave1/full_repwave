// src/components/dashboard/tabs/safe-management/safes/SafesTab.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import {
  PencilIcon,
  TrashIcon,
  PlusIcon,
  ArchiveBoxIcon,
  BanknotesIcon,
  CreditCardIcon,
  UserCircleIcon,
  CalendarDaysIcon,
} from "@heroicons/react/24/outline";

import Loader from "../../../../common/Loader/Loader";
import Alert from "../../../../common/Alert/Alert";
import DeleteConfirmationModal from "../../../../common/DeleteConfirmationModal";
import CustomPageHeader from "../../../../common/CustomPageHeader/CustomPageHeader";
import GlobalTable from "../../../../common/GlobalTable/GlobalTable";
import FilterBar from "../../../../common/FilterBar/FilterBar";
import { getSafes, deleteSafe } from "../../../../../apis/safes";
import {
  PAYMENT_METHOD_ICONS,
  PAYMENT_METHOD_COLORS,
} from "../../../../../constants/paymentMethods";
import AddSafeForm from "./AddSafeForm";
import UpdateSafeForm from "./UpdateSafeForm";
// SafeDetailsModal removed from table actions per UX request
import useCurrency from "../../../../../hooks/useCurrency";
import { formatLocalDateTime } from "../../../../../utils/dateUtils";
import { isOdooIntegrationEnabled } from "../../../../../utils/odooIntegration";

export default function SafesTab() {
  const { setGlobalMessage, setChildRefreshHandler } = useOutletContext();
  const [odooEnabled] = useState(() => isOdooIntegrationEnabled());
  const { symbol, formatCurrency: formatMoney } = useCurrency();
  const [safes, setSafes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentView, setCurrentView] = useState("list");
  const [selectedSafe, setSelectedSafe] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [safeToDelete, setSafeToDelete] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [repFilter, setRepFilter] = useState("");
  const [methodFilter, setMethodFilter] = useState("");

  const loadSafes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getSafes();
      setSafes(response.safes || []);
    } catch (e) {
      setError(e.message || "Error loading safes");
      setGlobalMessage({
        type: "error",
        message: "فشل في تحميل بيانات الخزائن.",
      });
    } finally {
      setLoading(false);
    }
  }, [setGlobalMessage]);

  useEffect(() => {
    loadSafes();
  }, [loadSafes]);

  useEffect(() => {
    setChildRefreshHandler(() => loadSafes());
    return () => setChildRefreshHandler(null);
  }, [setChildRefreshHandler, loadSafes]);

  const handleAddSafe = useCallback(() => {
    setCurrentView("add");
  }, []);

  const handleEditSafe = useCallback((safe) => {
    setSelectedSafe(safe);
    setCurrentView("edit");
  }, []);

  // details view removed from table actions

  const handleDeleteSafe = useCallback((safe) => {
    setSafeToDelete(safe);
    setDeleteModalOpen(true);
  }, []);

  const confirmDelete = async () => {
    try {
      await deleteSafe(safeToDelete.safes_id);
      setGlobalMessage({ type: "success", message: "تم حذف الخزنة بنجاح." });
      await loadSafes();
    } catch {
      setGlobalMessage({ type: "error", message: "فشل في حذف الخزنة." });
    } finally {
      setDeleteModalOpen(false);
      setSafeToDelete(null);
    }
  };

  const handleFormSubmit = async () => {
    setGlobalMessage({
      type: "success",
      message: "تم حفظ بيانات الخزنة بنجاح.",
    });
    await loadSafes();
    setCurrentView("list");
    setSelectedSafe(null);
  };

  const handleCloseModal = () => {
    setCurrentView("list");
    setSelectedSafe(null);
  };

  const calculateTotalBalance = () => {
    return safes.reduce(
      (total, safe) => total + parseFloat(safe.safes_balance || 0),
      0,
    );
  };

  const applySearch = useCallback(
    (value) => {
      const normalized = (value ?? searchInput ?? "").trim();
      setSearchTerm(normalized);
      setSearchInput(value ?? "");
    },
    [searchInput],
  );

  const clearSearch = useCallback(() => {
    setSearchInput("");
    setSearchTerm("");
  }, []);

  const clearAllFilters = useCallback(() => {
    setSearchInput("");
    setSearchTerm("");
    setTypeFilter("all");
    setStatusFilter("all");
    setRepFilter("");
    setMethodFilter("");
  }, []);

  const typeOptions = useMemo(
    () => [
      { value: "all", label: "كل الأنواع" },
      { value: "company", label: "خزائن الشركة" },
      { value: "rep", label: "خزائن المناديب" },
      { value: "store_keeper", label: "خزائن أمين المخزن" },
    ],
    [],
  );

  const statusOptions = useMemo(
    () => [
      { value: "all", label: "كل الحالات" },
      { value: "active", label: "نشطة" },
      { value: "inactive", label: "غير نشطة" },
    ],
    [],
  );

  const filteredSafes = useMemo(() => {
    return safes.filter((safe) => {
      const matchesSearch = searchTerm
        ? [
            safe.safes_name,
            safe.safes_description,
            safe.rep_name,
            safe.payment_method_name,
          ]
            .filter(Boolean)
            .some((field) =>
              field.toString().toLowerCase().includes(searchTerm.toLowerCase()),
            )
        : true;

      const matchesType =
        typeFilter === "all" ? true : safe.safes_type === typeFilter;
      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "active"
            ? safe.safes_is_active === 1
            : safe.safes_is_active !== 1;

      const matchesRep = repFilter
        ? String(safe.rep_user_id ?? safe.safes_rep_user_id ?? "") === repFilter
        : true;
      const matchesMethod = methodFilter
        ? String(safe.payment_method_id ?? "") === methodFilter
        : true;

      return (
        matchesSearch &&
        matchesType &&
        matchesStatus &&
        matchesRep &&
        matchesMethod
      );
    });
  }, [safes, searchTerm, typeFilter, statusFilter, repFilter, methodFilter]);

  const activeFilterChips = useMemo(() => {
    const chips = [];
    if (searchTerm) {
      chips.push({
        key: "search",
        label: "البحث",
        value: searchTerm,
        tone: "blue",
        onRemove: clearSearch,
      });
    }
    if (typeFilter !== "all") {
      chips.push({
        key: "type",
        label: "النوع",
        value:
          typeOptions.find((opt) => opt.value === typeFilter)?.label ??
          typeFilter,
        tone: "purple",
        onRemove: () => setTypeFilter("all"),
      });
    }
    if (statusFilter !== "all") {
      chips.push({
        key: "status",
        label: "الحالة",
        value:
          statusOptions.find((opt) => opt.value === statusFilter)?.label ??
          statusFilter,
        tone: "green",
        onRemove: () => setStatusFilter("all"),
      });
    }
    if (repFilter) {
      const repLabel =
        safes.find(
          (safe) =>
            String(safe.rep_user_id ?? safe.safes_rep_user_id ?? "") ===
            repFilter,
        )?.rep_name || "غير محدد";
      chips.push({
        key: "rep",
        label: "المندوب",
        value: repLabel,
        tone: "yellow",
        onRemove: () => setRepFilter(""),
      });
    }
    if (methodFilter) {
      const methodLabel =
        safes.find(
          (safe) => String(safe.payment_method_id ?? "") === methodFilter,
        )?.payment_method_name || "غير محدد";
      chips.push({
        key: "method",
        label: "طريقة الدفع",
        value: methodLabel,
        tone: "teal",
        onRemove: () => setMethodFilter(""),
      });
    }
    return chips;
  }, [
    searchTerm,
    typeFilter,
    statusFilter,
    repFilter,
    methodFilter,
    clearSearch,
    typeOptions,
    statusOptions,
    safes,
  ]);

  const repOptions = useMemo(() => {
    const uniqueReps = new Map();
    safes.forEach((safe) => {
      const repId = String(safe.rep_user_id ?? safe.safes_rep_user_id ?? "");
      if (!repId) return;
      if (!uniqueReps.has(repId)) {
        uniqueReps.set(repId, safe.rep_name || `مندوب ${repId}`);
      }
    });
    return [
      { value: "", label: "كل المناديب" },
      ...Array.from(uniqueReps.entries()).map(([value, label]) => ({
        value,
        label,
      })),
    ];
  }, [safes]);

  const methodOptions = useMemo(() => {
    const uniqueMethods = new Map();
    safes.forEach((safe) => {
      const methodId = String(safe.payment_method_id ?? "");
      if (!methodId) return;
      if (!uniqueMethods.has(methodId)) {
        uniqueMethods.set(
          methodId,
          safe.payment_method_name || `طريقة ${methodId}`,
        );
      }
    });
    return [
      { value: "", label: "كل طرق الدفع" },
      ...Array.from(uniqueMethods.entries()).map(([value, label]) => ({
        value,
        label,
      })),
    ];
  }, [safes]);

  const columns = useMemo(
    () => [
      {
        key: "safes_id",
        title: "رقم الخزنة",
        sortable: true,
        className: "min-w-[80px]",
        render: (safe) => (
          <span className="text-sm font-mono text-gray-700 bg-gray-100 px-2 py-1 rounded">
            #{safe.safes_id}
          </span>
        ),
      },
      ...(odooEnabled
        ? [
            {
              key: "safes_odoo_journal_id",
              title: "Odoo ID",
              sortable: true,
              className: "min-w-[90px]",
              render: (safe) => (
                <span
                  className={`text-sm font-mono px-2 py-1 rounded ${safe.safes_odoo_journal_id ? "text-purple-700 bg-purple-100" : "text-gray-400 bg-gray-50"}`}
                >
                  {safe.safes_odoo_journal_id || "—"}
                </span>
              ),
            },
          ]
        : []),
      {
        key: "safes_type",
        title: "نوع الخزنة",
        sortable: true,
        className: "min-w-[150px]",
        render: (safe) => {
          const type = safe.safes_type;
          const isCompany = type === "company";
          const isStoreKeeper = type === "store_keeper";
          const baseClass =
            "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold";
          if (isCompany) {
            return (
              <span className={`${baseClass} bg-purple-100 text-purple-700`}>
                <ArchiveBoxIcon className="h-4 w-4" />
                خزنة الشركة
              </span>
            );
          }
          if (isStoreKeeper) {
            return (
              <span className={`${baseClass} bg-indigo-100 text-indigo-700`}>
                <ArchiveBoxIcon className="h-4 w-4" />
                خزنة أمين المخزن
              </span>
            );
          }

          return (
            <span className={`${baseClass} bg-blue-100 text-blue-700`}>
              <ArchiveBoxIcon className="h-4 w-4" />
              خزنة مندوب
            </span>
          );
        },
      },
      {
        key: "safes_name",
        title: "اسم الخزنة",
        sortable: true,
        className: "min-w-[160px]",
        render: (safe) => (
          <div className="flex items-center gap-2 font-semibold text-gray-900">
            <ArchiveBoxIcon className="h-4 w-4 text-blue-500" />
            <span>{safe.safes_name}</span>
          </div>
        ),
      },
      {
        key: "safes_description",
        title: "الوصف",
        className: "min-w-[220px]",
        render: (safe) => (
          <span className="text-sm text-gray-600">
            {safe.safes_description || "لا يوجد وصف"}
          </span>
        ),
      },
      {
        key: "safes_balance",
        title: "الرصيد الحالي",
        align: "center",
        sortable: true,
        sortAccessor: (safe) => Number(safe.safes_balance || 0),
        className: "min-w-[150px]",
        render: (safe) => (
          <div className="flex items-center justify-center gap-2">
            <BanknotesIcon className="h-4 w-4 text-green-600" />
            <span
              className={`font-bold ${parseFloat(safe.safes_balance || 0) >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              {formatMoney(safe.safes_balance || 0)}
            </span>
          </div>
        ),
      },
      {
        key: "rep_name",
        title: "مندوب المبيعات",
        className: "min-w-[170px]",
        sortable: true,
        render: (safe) => (
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <UserCircleIcon className="h-5 w-5 text-indigo-500" />
            <span>
              {safe.rep_name ||
                (safe.safes_type === "company"
                  ? "الشركة الرئيسية"
                  : "غير محدد")}
            </span>
          </div>
        ),
      },
      {
        key: "payment_method_name",
        title: "طريقة الدفع",
        className: "min-w-[180px]",
        sortable: true,
        render: (safe) => (
          <div className="flex items-center gap-2">
            <span className="text-lg">
              {PAYMENT_METHOD_ICONS[safe.payment_method_type] || "💳"}
            </span>
            <span
              className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${PAYMENT_METHOD_COLORS[safe.payment_method_type] || "text-gray-600 bg-gray-100"}`}
            >
              {safe.payment_method_name || "غير محدد"}
            </span>
          </div>
        ),
      },
      {
        key: "safes_is_active",
        title: "الحالة",
        sortable: true,
        align: "center",
        render: (safe) => (
          <span
            className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${safe.safes_is_active === 1 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
          >
            {safe.safes_is_active === 1 ? "نشط" : "غير نشط"}
          </span>
        ),
      },
      {
        key: "safes_created_at",
        title: "تاريخ الإنشاء",
        sortable: true,
        sortAccessor: (safe) => new Date(safe.safes_created_at || 0).getTime(),
        className: "min-w-[150px]",
        render: (safe) => (
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <CalendarDaysIcon className="h-4 w-4 text-sky-500" />
            <span>
              {safe.safes_created_at
                ? formatLocalDateTime(safe.safes_created_at)
                : "—"}
            </span>
          </div>
        ),
      },
      {
        key: "actions",
        title: "الإجراءات",
        align: "center",
        headerAlign: "center",
        className: "w-40",
        render: (safe) => (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => handleEditSafe(safe)}
              className="p-1.5 rounded-full 
                   text-green-700 bg-green-100
                   hover:bg-green-500 hover:text-white
                   hover:shadow-[0_0_12px_rgba(34,197,94,0.45)]
                   transition-all duration-200 hover:scale-110"
              title="تعديل"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleDeleteSafe(safe)}
              className="p-1.5 rounded-full 
                   text-red-700 bg-red-100
                   hover:bg-red-500 hover:text-white
                   hover:shadow-[0_0_12px_rgba(239,68,68,0.45)]
                   transition-all duration-200 hover:scale-110"
              title="حذف"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        ),
      },
    ],
    [handleDeleteSafe, handleEditSafe, formatMoney, odooEnabled],
  );

  const renderContent = () => {
    const listNode = (
      <>
        <CustomPageHeader
          title="إدارة الخزائن"
          subtitle="عرض حالة الخزائن والأرصدة الحالية"
          icon={<ArchiveBoxIcon className="h-8 w-8 text-[#1F2937]" />}
          statValue={formatMoney(calculateTotalBalance(), {
            withSymbol: false,
            fractionDigits: 0,
          })}
          statLabel={symbol}
          statSecondaryValue={safes.length}
          statSecondaryLabel="عدد الخزائن"
          actionButton={
            <button
              onClick={handleAddSafe}
              className="bg-[#1F2937] text-[#8DD8F5] hover:bg-[#374151] px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 shadow-md hover:shadow-lg font-bold text-lg"
            >
              <PlusIcon className="h-5 w-5" />
              إضافة خزنة
            </button>
          }
        />

        <FilterBar
          title="بحث وفلاتر الخزائن"
          searchConfig={{
            placeholder: "ابحث عن خزنة... ",
            value: searchInput,
            onChange: (value) => {
              setSearchInput(value);
              applySearch(value);
            },
            onClear: clearSearch,
            searchWhileTyping: true,
            showApplyButton: false,
          }}
          selectFilters={[
            {
              key: "type",
              label: "نوع الخزنة",
              value: typeFilter,
              onChange: setTypeFilter,
              options: typeOptions,
            },
            {
              key: "status",
              label: "الحالة",
              value: statusFilter,
              onChange: setStatusFilter,
              options: statusOptions,
            },
            {
              key: "rep",
              label: "المندوب",
              value: repFilter,
              onChange: setRepFilter,
              options: repOptions,
            },
            {
              key: "method",
              label: "طريقة الدفع",
              value: methodFilter,
              onChange: setMethodFilter,
              options: methodOptions,
            },
          ]}
          activeChips={activeFilterChips}
          onClearAll={clearAllFilters}
        />

        {loading && <Loader className="mt-8" />}
        {error && <Alert message={error} type="error" className="mb-4" />}
        {!loading && !error && (
          <GlobalTable
            data={filteredSafes}
            rowKey="safes_id"
            loading={loading}
            error={error}
            columns={columns}
            totalCount={filteredSafes.length}
            searchTerm={searchTerm}
            tableClassName="text-sm"
            headerClassName="text-xs"
            initialSort={{ key: "safes_created_at", direction: "desc" }}
          />
        )}
      </>
    );

    return (
      <>
        {listNode}
        {currentView === "add" && (
          <AddSafeForm onClose={handleCloseModal} onSubmit={handleFormSubmit} />
        )}
        {currentView === "edit" && selectedSafe && (
          <UpdateSafeForm
            safe={selectedSafe}
            onClose={handleCloseModal}
            onSubmit={handleFormSubmit}
          />
        )}
        {deleteModalOpen && (
          <DeleteConfirmationModal
            isOpen={deleteModalOpen}
            onClose={() => setDeleteModalOpen(false)}
            onConfirm={confirmDelete}
            title="حذف الخزنة"
            message={`هل أنت متأكد من حذف خزنة "${safeToDelete?.safes_name}"؟ سيتم حذف جميع المعاملات المرتبطة بها.`}
          />
        )}
      </>
    );
  };

  return (
    <div className="p-6" dir="rtl">
      {renderContent()}
    </div>
  );
}
