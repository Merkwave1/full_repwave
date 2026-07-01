// src/components/dashboard/tabs/safe-management/safe-transactions/SafeTransactionsTab.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import {
  PlusIcon,
  BanknotesIcon,
  ArchiveBoxIcon,
  CalendarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";

import CustomPageHeader from "../../../../common/CustomPageHeader/CustomPageHeader";
import GlobalTable from "../../../../common/GlobalTable/GlobalTable";
import FilterBar from "../../../../common/FilterBar/FilterBar";
import PaginationHeaderFooter from "../../../../common/PaginationHeaderFooter/PaginationHeaderFooter";
import { getSafes } from "../../../../../apis/safes";
import { getSafeTransactionsPaginated } from "../../../../../apis/safe_transactions";
import AddSafeTransactionForm from "./AddSafeTransactionForm";
import TransactionDetailsModal from "./TransactionDetailsModal";
import useCurrency from "../../../../../hooks/useCurrency";
import { formatLocalDateTime } from "../../../../../utils/dateUtils";
import {
  safePrimaryBtnClass,
  safePageIconClass,
  safePageWrapperClass,
} from "../safeManagementUi";

const TYPE_LABELS = {
  deposit: "إيداع",
  withdrawal: "سحب",
  credit: "إيداع",
  debit: "سحب",
  transfer_in: "تحويل وارد",
  transfer_out: "تحويل صادر",
  payment: "دفعة",
  receipt: "إيصال",
  supplier_payment: "دفعة مورد",
  purchase: "مشتريات",
  sale: "مبيعات",
  expense: "مصروف",
  other: "أخرى",
};

const OUTGOING_TYPES = new Set([
  "expense",
  "withdrawal",
  "debit",
  "transfer_out",
  "supplier_payment",
  "payment",
]);

function getTypeLabel(type) {
  return TYPE_LABELS[type] || type || "—";
}

function isOutgoing(type, amount) {
  return OUTGOING_TYPES.has(type) || Number(amount) < 0;
}

function getStatusBadge(status) {
  const normalized = String(status || "approved").toLowerCase();
  if (normalized === "pending") {
    return { label: "قيد المراجعة", className: "bg-yellow-100 text-yellow-800" };
  }
  if (normalized === "rejected") {
    return { label: "مرفوضة", className: "bg-red-100 text-red-800" };
  }
  return { label: "مكتملة", className: "bg-green-100 text-green-800" };
}

export default function SafeTransactionsTab() {
  const { setGlobalMessage, setChildRefreshHandler } = useOutletContext();
  const { formatCurrency: formatMoney } = useCurrency();

  const [transactions, setTransactions] = useState([]);
  const [safes, setSafes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [serverPagination, setServerPagination] = useState(null);

  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [prefillSafeId, setPrefillSafeId] = useState(null);
  const [selectedTransactionId, setSelectedTransactionId] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [safeFilter, setSafeFilter] = useState("");

  const loadSafes = useCallback(async () => {
    try {
      const response = await getSafes();
      setSafes(
        Array.isArray(response)
          ? response
          : response?.safes || response?.data || [],
      );
    } catch {
      setSafes([]);
    }
  }, []);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, pagination } = await getSafeTransactionsPaginated({
        safeId: safeFilter ? Number(safeFilter) : undefined,
        page,
        limit,
      });
      setTransactions(data || []);
      setServerPagination(pagination || null);
    } catch (e) {
      setError(e.message || "فشل في تحميل المعاملات");
      setGlobalMessage({
        type: "error",
        message: "فشل في تحميل المعاملات المالية.",
      });
      setTransactions([]);
      setServerPagination(null);
    } finally {
      setLoading(false);
    }
  }, [page, limit, safeFilter, setGlobalMessage]);

  useEffect(() => {
    loadSafes();
  }, [loadSafes]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  useEffect(() => {
    setChildRefreshHandler(() => {
      loadSafes();
      loadTransactions();
    });
    return () => setChildRefreshHandler(null);
  }, [setChildRefreshHandler, loadSafes, loadTransactions]);

  const handleTransactionSubmit = useCallback(async () => {
    setGlobalMessage({ type: "success", message: "تم إضافة المعاملة بنجاح." });
    setShowAddTransaction(false);
    setPrefillSafeId(null);
    setPage(1);
    await loadTransactions();
  }, [loadTransactions, setGlobalMessage]);

  const filteredTransactions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return (transactions || []).filter((tx) => {
      const matchesSearch = term
        ? [
            tx.safe_name,
            tx.safe_transactions_description,
            tx.safe_transactions_reference,
            getTypeLabel(tx.safe_transactions_type),
            tx.safe_transactions_id,
          ]
            .filter(Boolean)
            .some((field) => field.toString().toLowerCase().includes(term))
        : true;

      let matchesType = true;
      if (typeFilter === "__incoming__") {
        matchesType = !isOutgoing(
          tx.safe_transactions_type,
          tx.safe_transactions_amount,
        );
      } else if (typeFilter === "__outgoing__") {
        matchesType = isOutgoing(
          tx.safe_transactions_type,
          tx.safe_transactions_amount,
        );
      } else if (typeFilter) {
        matchesType = tx.safe_transactions_type === typeFilter;
      }

      return matchesSearch && matchesType;
    });
  }, [transactions, searchTerm, typeFilter]);

  const summary = useMemo(() => {
    return filteredTransactions.reduce(
      (acc, tx) => {
        const amount = Math.abs(Number(tx.safe_transactions_amount || 0));
        if (
          isOutgoing(tx.safe_transactions_type, tx.safe_transactions_amount)
        ) {
          acc.totalOut += amount;
        } else {
          acc.totalIn += amount;
        }
        return acc;
      },
      { totalIn: 0, totalOut: 0 },
    );
  }, [filteredTransactions]);

  const totalItems = Number(
    serverPagination?.total ?? filteredTransactions.length,
  );
  const totalPages = Math.max(
    1,
    Number(serverPagination?.total_pages ?? 1),
  );
  const currentPage = Number(serverPagination?.page ?? page);
  const perPage = Number(serverPagination?.per_page ?? limit);

  const safeOptions = useMemo(
    () => [
      { value: "", label: "كل الخزائن" },
      ...safes.map((safe) => ({
        value: String(safe.safes_id),
        label: safe.safes_name,
      })),
    ],
    [safes],
  );

  const activeFilterChips = useMemo(() => {
    const chips = [];
    if (searchTerm.trim()) {
      chips.push({
        key: "search",
        label: "بحث",
        value: searchTerm.trim(),
        tone: "blue",
        onRemove: () => setSearchTerm(""),
      });
    }
    if (safeFilter) {
      chips.push({
        key: "safe",
        label: "الخزنة",
        value:
          safes.find((s) => String(s.safes_id) === safeFilter)?.safes_name ||
          safeFilter,
        tone: "purple",
        onRemove: () => {
          setSafeFilter("");
          setPage(1);
        },
      });
    }
    if (typeFilter) {
      const typeLabels = {
        __incoming__: "واردة",
        __outgoing__: "صادرة",
        deposit: "إيداع",
        withdrawal: "سحب",
        credit: "إيداع",
        debit: "سحب",
        transfer_in: "تحويل وارد",
        transfer_out: "تحويل صادر",
      };
      chips.push({
        key: "type",
        label: "النوع",
        value: typeLabels[typeFilter] || typeFilter,
        tone: "green",
        onRemove: () => setTypeFilter(""),
      });
    }
    return chips;
  }, [searchTerm, safeFilter, typeFilter, safes]);

  const columns = useMemo(
    () => [
      {
        key: "safe_transactions_id",
        title: "#",
        align: "center",
        className: "w-16",
        sortable: true,
        sortAccessor: (row) => Number(row.safe_transactions_id || 0),
        render: (row) => (
          <span className="text-xs font-mono text-[#7A52C2] bg-[#EDE7FF] px-2 py-1 rounded-lg">
            #{row.safe_transactions_id}
          </span>
        ),
      },
      {
        key: "safe_transactions_date",
        title: "التاريخ",
        sortable: true,
        sortAccessor: (row) =>
          new Date(row.safe_transactions_date || 0).getTime(),
        className: "min-w-[150px]",
        render: (row) => (
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <CalendarIcon className="h-4 w-4 text-gray-400" />
            <span>
              {row.safe_transactions_date
                ? formatLocalDateTime(row.safe_transactions_date)
                : "—"}
            </span>
          </div>
        ),
      },
      {
        key: "safe_name",
        title: "الخزنة",
        sortable: true,
        className: "min-w-[160px]",
        render: (row) => (
          <div className="flex items-center gap-2 font-medium text-gray-900">
            <ArchiveBoxIcon className="h-4 w-4 text-[#8B5FD6]" />
            <span>{row.safe_name || "—"}</span>
          </div>
        ),
      },
      {
        key: "safe_transactions_type",
        title: "نوع المعاملة",
        sortable: true,
        className: "min-w-[140px]",
        render: (row) => {
          const outgoing = isOutgoing(
            row.safe_transactions_type,
            row.safe_transactions_amount,
          );
          return (
            <div className="flex items-center gap-2">
              {outgoing ? (
                <ArrowUpIcon className="h-4 w-4 text-red-500" />
              ) : (
                <ArrowDownIcon className="h-4 w-4 text-green-500" />
              )}
              <span className="text-sm font-semibold text-gray-800">
                {getTypeLabel(row.safe_transactions_type)}
              </span>
            </div>
          );
        },
      },
      {
        key: "safe_transactions_amount",
        title: "المبلغ",
        align: "center",
        sortable: true,
        sortAccessor: (row) => Number(row.safe_transactions_amount || 0),
        render: (row) => {
          const outgoing = isOutgoing(
            row.safe_transactions_type,
            row.safe_transactions_amount,
          );
          const value = Math.abs(Number(row.safe_transactions_amount || 0));
          return (
            <span
              className={`font-bold ${outgoing ? "text-red-600" : "text-green-600"}`}
            >
              {outgoing ? "-" : "+"}
              {formatMoney(value)}
            </span>
          );
        },
      },
      {
        key: "safe_transactions_status",
        title: "الحالة",
        align: "center",
        render: (row) => {
          const badge = getStatusBadge(row.safe_transactions_status);
          return (
            <span
              className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${badge.className}`}
            >
              {badge.label}
            </span>
          );
        },
      },
      {
        key: "safe_transactions_description",
        title: "الوصف",
        className: "min-w-[180px]",
        render: (row) => (
          <span className="text-sm text-gray-600 line-clamp-2">
            {row.safe_transactions_description ||
              row.safe_transactions_reference ||
              "—"}
          </span>
        ),
      },
      {
        key: "actions",
        title: "الإجراءات",
        align: "center",
        className: "w-24",
        render: (row) => (
          <button
            type="button"
            onClick={() => setSelectedTransactionId(row.safe_transactions_id)}
            className="p-1.5 rounded-full text-sky-700 bg-sky-100 hover:bg-sky-500 hover:text-white transition-all"
            title="عرض التفاصيل"
          >
            <EyeIcon className="h-4 w-4" />
          </button>
        ),
      },
    ],
    [formatMoney],
  );

  const clearAllFilters = useCallback(() => {
    setSearchTerm("");
    setTypeFilter("");
    setSafeFilter("");
    setPage(1);
  }, []);

  return (
    <div className={safePageWrapperClass} dir="rtl">
      <CustomPageHeader
        title="المعاملات المالية"
        subtitle="عرض جميع معاملات الخزائن — إيداع، سحب، وتحويلات"
        icon={<BanknotesIcon className={safePageIconClass} />}
        color="purple"
        statValue={formatMoney(summary.totalIn)}
        statLabel="إجمالي الوارد"
        statSecondaryValue={formatMoney(summary.totalOut)}
        statSecondaryLabel="إجمالي الصادر"
        actionButton={
          <button
            onClick={() => {
              setPrefillSafeId(null);
              setShowAddTransaction(true);
            }}
            className={safePrimaryBtnClass}
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
          placeholder: "ابحث بالوصف، المرجع، الخزنة أو رقم المعاملة",
          searchWhileTyping: true,
        }}
        selectFilters={[
          {
            key: "safe",
            label: "الخزنة",
            value: safeFilter,
            onChange: (value) => {
              setSafeFilter(value);
              setPage(1);
            },
            options: safeOptions,
          },
          {
            key: "type",
            label: "نوع المعاملة",
            value: typeFilter,
            onChange: setTypeFilter,
            placeholder: "كل الأنواع",
            options: [
              { value: "", label: "كل الأنواع" },
              { value: "__incoming__", label: "واردة" },
              { value: "__outgoing__", label: "صادرة" },
              { value: "credit", label: "إيداع" },
              { value: "debit", label: "سحب" },
              { value: "transfer_in", label: "تحويل وارد" },
              { value: "transfer_out", label: "تحويل صادر" },
            ],
          },
        ]}
        activeChips={activeFilterChips}
        onClearAll={clearAllFilters}
      />

      <PaginationHeaderFooter
        total={totalItems}
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={perPage}
        onItemsPerPageChange={(value) => {
          setLimit(value);
          setPage(1);
        }}
        onFirst={() => setPage(1)}
        onPrev={() => setPage((p) => Math.max(1, p - 1))}
        onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
        onLast={() => setPage(totalPages)}
        loading={loading}
        transparent
      />

      <GlobalTable
        data={filteredTransactions}
        loading={loading}
        error={error}
        columns={columns}
        rowKey="safe_transactions_id"
        totalCount={totalItems}
        searchTerm={searchTerm}
        emptyState={{
          icon: "💳",
          title: "لا توجد معاملات لعرضها",
          description: "أضف معاملة جديدة أو جرّب تعديل الفلاتر.",
        }}
        initialSort={{ key: "safe_transactions_date", direction: "desc" }}
        showSummary
      />

      <PaginationHeaderFooter
        total={totalItems}
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={perPage}
        onItemsPerPageChange={(value) => {
          setLimit(value);
          setPage(1);
        }}
        onFirst={() => setPage(1)}
        onPrev={() => setPage((p) => Math.max(1, p - 1))}
        onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
        onLast={() => setPage(totalPages)}
        loading={loading}
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

      {selectedTransactionId && (
        <TransactionDetailsModal
          transactionId={selectedTransactionId}
          onClose={() => setSelectedTransactionId(null)}
          onStatusUpdate={loadTransactions}
        />
      )}
    </div>
  );
}
