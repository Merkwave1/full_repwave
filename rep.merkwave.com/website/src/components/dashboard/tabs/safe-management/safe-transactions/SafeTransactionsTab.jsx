// src/components/dashboard/tabs/safe-management/safe-transactions/SafeTransactionsTab.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import {
  PlusIcon,
  BanknotesIcon,
  ArchiveBoxIcon,
  UserCircleIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";

import CustomPageHeader from "../../../../common/CustomPageHeader/CustomPageHeader";
import GlobalTable from "../../../../common/GlobalTable/GlobalTable";
import FilterBar from "../../../../common/FilterBar/FilterBar";
import { getSafes } from "../../../../../apis/safes";
import AddSafeTransactionForm from "./AddSafeTransactionForm";
import SafeTransactionsModal from "./SafeTransactionsModal";
import useCurrency from "../../../../../hooks/useCurrency";

export default function SafeTransactionsTab() {
  const { setGlobalMessage, setChildRefreshHandler } = useOutletContext();
  const { formatCurrency: formatMoney } = useCurrency();
  const [safes, setSafes] = useState([]);
  const [, setPendingTotals] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [selectedSafe, setSelectedSafe] = useState(null);
  const [showTransactionsModal, setShowTransactionsModal] = useState(false);
  const [prefillSafeId, setPrefillSafeId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const loadSafes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getSafes();
      setSafes(response.safes || []);
      setPendingTotals(Number(response.pendingTotals || 0));
    } catch (e) {
      setError(e.message || "Error loading safes");
      setGlobalMessage({
        type: "error",
        message: "فشل في تحميل بيانات الخزائن.",
      });
      setPendingTotals(0);
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

  const handleAddTransaction = useCallback((safe = null) => {
    setPrefillSafeId(safe?.safes_id ?? null);
    setShowAddTransaction(true);
  }, []);

  const handleViewTransactions = useCallback((safe) => {
    setSelectedSafe(safe);
    setShowTransactionsModal(true);
  }, []);

  const handleTransactionSubmit = useCallback(async () => {
    setGlobalMessage({ type: "success", message: "تم إضافة المعاملة بنجاح." });
    await loadSafes();
    setShowAddTransaction(false);
    setPrefillSafeId(null);
  }, [loadSafes, setGlobalMessage]);

  const totalBalance = useMemo(() => {
    return safes.reduce(
      (total, safe) => total + parseFloat(safe.safes_balance || 0),
      0,
    );
  }, [safes]);

  const filteredSafes = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return safes.filter((safe) => {
      const matchesSearch = normalizedSearch
        ? [safe.safes_name, safe.rep_name, safe.safes_description]
            .filter(Boolean)
            .some((field) =>
              field.toString().toLowerCase().includes(normalizedSearch),
            )
        : true;

      const matchesType =
        typeFilter === "all" ? true : safe.safes_type === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [safes, searchTerm, typeFilter]);

  const typeLabelMap = useMemo(
    () => ({
      company: "خزائن الشركة",
      rep: "خزائن المناديب",
      store_keeper: "خزائن أمناء المخازن",
    }),
    [],
  );

  const activeFilterChips = useMemo(() => {
    const chips = [];

    if (searchTerm.trim()) {
      chips.push({
        key: "search",
        label: "بحث",
        value: `"${searchTerm.trim()}"`,
        tone: "blue",
        onRemove: () => setSearchTerm(""),
      });
    }

    if (typeFilter !== "all") {
      chips.push({
        key: "type",
        label: "النوع",
        value: typeLabelMap[typeFilter] || typeFilter,
        tone: "purple",
        onRemove: () => setTypeFilter("all"),
      });
    }

    return chips;
  }, [searchTerm, typeFilter, typeLabelMap]);

  const columns = useMemo(
    () => [
      {
        key: "safes_name",
        title: "الخزنة",
        sortable: true,
        className: "min-w-[200px]",
        render: (safe) => (
          <div className="flex items-center gap-2 font-semibold text-gray-900">
            <ArchiveBoxIcon className="h-4 w-4 text-blue-500" />
            <span>{safe.safes_name}</span>
          </div>
        ),
      },
      {
        key: "safes_type",
        title: "نوع الخزنة",
        sortable: true,
        align: "center",
        className: "min-w-[140px]",
        render: (safe) => (
          <span
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${
              safe.safes_type === "company"
                ? "bg-purple-100 text-purple-700"
                : safe.safes_type === "store_keeper"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-blue-100 text-blue-700"
            }`}
          >
            <ArchiveBoxIcon className="h-4 w-4" />
            {typeLabelMap[safe.safes_type] || "خزنة"}
          </span>
        ),
      },
      {
        key: "rep_name",
        title: "المسؤول",
        sortable: true,
        className: "min-w-[180px]",
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
        key: "actions",
        title: "الإجراءات",
        align: "center",
        headerAlign: "center",
        className: "w-32",
        render: (safe) => (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => handleViewTransactions(safe)}
              className="group p-1.5 text-blue-600 hover:text-white hover:bg-blue-600 rounded-full transition relative"
              title="عرض المعاملات"
            >
              <EyeIcon className="h-4 w-4" />
              {Number(safe.pending_transactions_count || 0) > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shadow-md">
                  {Number(safe.pending_transactions_count)}
                </span>
              )}
            </button>
            <button
              onClick={() => handleAddTransaction(safe)}
              className="group p-1.5 text-green-600 hover:text-white hover:bg-green-600 rounded-full transition"
              title="إضافة معاملة"
            >
              <PlusIcon className="h-4 w-4" />
            </button>
          </div>
        ),
      },
    ],
    [handleAddTransaction, handleViewTransactions, formatMoney, typeLabelMap],
  );

  const clearAllFilters = useCallback(() => {
    setSearchTerm("");
    setTypeFilter("all");
  }, []);

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <CustomPageHeader
        title="إدارة معاملات الخزائن"
        subtitle="تحكم كامل في معاملات جميع الخزائن داخل النظام"
        icon={<BanknotesIcon className="h-8 w-8 text-white" />}
        statValue={formatMoney(totalBalance)}
        statLabel="إجمالي الأرصدة"
        statSecondaryValue={safes.length}
        statSecondaryLabel="عدد الخزائن"
        actionButton={
          <button
            onClick={() => handleAddTransaction()}
            className="bg-white text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 shadow-md hover:shadow-lg font-bold text-lg"
            disabled={loading}
          >
            <PlusIcon className="h-5 w-5" />
            إضافة معاملة
          </button>
        }
      />

      <FilterBar
        title="أدوات البحث والفلاتر"
        searchConfig={{
          value: searchTerm,
          onChange: setSearchTerm,
          placeholder: "ابحث عن خزنة، مندوب أو وصف",
          searchWhileTyping: true,
        }}
        selectFilters={[
          {
            key: "type",
            value: typeFilter,
            onChange: setTypeFilter,
            placeholder: "كل الأنواع",
            options: [
              { value: "all", label: "كل الأنواع" },
              { value: "company", label: "خزائن الشركة" },
              { value: "rep", label: "خزائن المناديب" },
              { value: "store_keeper", label: "خزائن أمناء المخازن" },
            ],
          },
        ]}
        activeChips={activeFilterChips}
        onClearAll={clearAllFilters}
      />

      <GlobalTable
        data={filteredSafes}
        loading={loading}
        error={error}
        columns={columns}
        rowKey="safes_id"
        totalCount={safes.length}
        searchTerm={searchTerm}
        emptyState={{
          icon: "🏦",
          title: "لا توجد خزائن مطابقة",
          description:
            "جرّب تعديل الفلاتر أو تأكد من وجود خزائن نشطة لإضافة معاملات",
        }}
        initialSort={{ key: "safes_name", direction: "asc" }}
        showSummary
      />

      {showAddTransaction && (
        <AddSafeTransactionForm
          safes={safes}
          safeId={prefillSafeId}
          onClose={() => {
            setShowAddTransaction(false);
            setPrefillSafeId(null);
          }}
          onSubmit={handleTransactionSubmit}
        />
      )}

      {showTransactionsModal && selectedSafe && (
        <SafeTransactionsModal
          safeId={selectedSafe.safes_id}
          safeName={selectedSafe.safes_name}
          onClose={() => {
            setShowTransactionsModal(false);
            setSelectedSafe(null);
          }}
        />
      )}
    </div>
  );
}
