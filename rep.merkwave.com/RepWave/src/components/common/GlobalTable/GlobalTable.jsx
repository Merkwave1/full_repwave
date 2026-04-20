import React from "react";
import Loader from "../Loader/Loader";
import Alert from "../Alert/Alert";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";

/* =========================================================
   Helpers
========================================================= */

const joinClasses = (...classes) => classes.filter(Boolean).join(" ");

const alignMap = {
  right: "text-right",
  left: "text-left",
  center: "text-center",
};

const defaultEmptyState = {
  icon: "📂",
  title: "لا توجد بيانات لعرضها",
  description: "جرب تغيير الفلاتر أو أعد المحاولة لاحقًا",
};

/* =========================================================
   Sort Indicator
========================================================= */

function SortIndicator({ active, direction }) {
  if (!active) {
    return (
      <div className="flex flex-col items-center text-[#1F2937]">
        <ChevronUpIcon className="h-4 w-4" />
        <ChevronDownIcon className="h-4 w-4 -mt-1" />
      </div>
    );
  }

  return direction === "asc" ? (
    <ChevronUpIcon className="h-5 w-5 text-[#8DD8F5]" />
  ) : (
    <ChevronDownIcon className="h-5 w-5 text-[#8DD8F5]" />
  );
}

/* =========================================================
   Component
========================================================= */

export default function GlobalTable({
  data = [],
  loading = false,
  error = null,
  columns = [],
  rowKey = "id",
  renderRow,
  totalCount = null,
  searchTerm = "",
  onSort = null,
  emptyState,
  initialSort = null,
  showSummary = false,
  showColumnTotals = false,
  columnTotalsLabel = "الإجمالي",
  totalsColumns = null,
}) {
  const resolvedEmptyState = { ...defaultEmptyState, ...emptyState };

  /* =========================================================
     Sorting
  ========================================================= */

  const [sortConfig, setSortConfig] = React.useState(() => {
    if (initialSort?.key)
      return {
        key: initialSort.key,
        direction: initialSort.direction ?? "asc",
      };

    return { key: null, direction: "asc" };
  });

  const normalizedColumns = React.useMemo(
    () => (Array.isArray(columns) ? columns : []),
    [columns],
  );

  const displayedData = React.useMemo(() => {
    if (!sortConfig.key || typeof onSort === "function") return data;

    const sorted = [...data].sort((a, b) => {
      const aVal = a?.[sortConfig.key];
      const bVal = b?.[sortConfig.key];

      const aNum = Number(aVal);
      const bNum = Number(bVal);

      if (!isNaN(aNum) && !isNaN(bNum)) {
        return sortConfig.direction === "asc" ? aNum - bNum : bNum - aNum;
      }

      return sortConfig.direction === "asc"
        ? String(aVal).localeCompare(String(bVal), "ar")
        : String(bVal).localeCompare(String(aVal), "ar");
    });

    return sorted;
  }, [data, sortConfig, onSort]);

  /* =========================================================
     Column Totals
  ========================================================= */

  const columnTotals = React.useMemo(() => {
    if (!showColumnTotals) return {};

    const totals = {};

    normalizedColumns.forEach((col) => {
      if (!col.key) return;
      if (totalsColumns && !totalsColumns.includes(col.key)) return;

      let sum = 0;
      let hasNumbers = false;

      displayedData.forEach((item) => {
        const v = parseFloat(item?.[col.key]);
        if (!isNaN(v)) {
          sum += v;
          hasNumbers = true;
        }
      });

      if (hasNumbers) totals[col.key] = sum;
    });

    return totals;
  }, [displayedData, normalizedColumns, totalsColumns, showColumnTotals]);

  /* =========================================================
     Sort Click
  ========================================================= */

  const handleHeaderClick = (col) => {
    if (!col.sortable) return;

    setSortConfig((prev) => {
      const next =
        prev.key === col.key && prev.direction === "asc" ? "desc" : "asc";

      onSort?.(col.key, next);

      return { key: col.key, direction: next };
    });
  };

  /* =========================================================
     Header
  ========================================================= */

  const renderHeader = () => (
    <thead className="bg-white sticky top-0 z-10 border-b border-gray-200">
      <tr className="relative after:absolute after:bottom-0 after:left-0 after:w-full after:h-[2px] after:bg-[#8DD8F5]/40">
        {normalizedColumns.map((col, i) => {
          const isActive = sortConfig.key === col.key;

          return (
            <th
              key={i}
              onClick={() => handleHeaderClick(col)}
              className={joinClasses(
                "px-6 py-4 text-xs font-semibold text-[#1F2937] whitespace-nowrap",
                alignMap[col.align],
                col.sortable && "cursor-pointer",
              )}
            >
              {col.sortable ? (
                <div className="flex items-center justify-between gap-2">
                  {col.title}
                  <SortIndicator
                    active={isActive}
                    direction={sortConfig.direction}
                  />
                </div>
              ) : (
                col.title
              )}
            </th>
          );
        })}
      </tr>
    </thead>
  );

  /* =========================================================
     Body
  ========================================================= */

  const renderBody = () => (
    <tbody>
      {displayedData.map((item, index) => {
        const key = item?.[rowKey] ?? index;

        const rowClasses = joinClasses(
          "group transition-all duration-150",
          index % 2 === 0 ? "bg-white" : "bg-gray-50/30",
          "hover:bg-[#8DD8F5]/10 hover:shadow-[inset_4px_0_0_#8DD8F5]",
        );

        const cells =
          typeof renderRow === "function"
            ? renderRow(item, index)
            : normalizedColumns.map((col, ci) => (
                <td
                  key={ci}
                  className={joinClasses(
                    "px-6 py-4 text-sm text-gray-700 border-b border-gray-100 whitespace-nowrap",
                    alignMap[col.align],
                  )}
                >
                  {col.render
                    ? col.render(item, index)
                    : (item?.[col.key] ?? "—")}
                </td>
              ));

        return (
          <tr key={key} className={rowClasses}>
            {cells}
          </tr>
        );
      })}
    </tbody>
  );

  /* =========================================================
     Mobile Cards
  ========================================================= */

  const renderMobileCards = () => {
    // Split columns into regular (paired 2-up) and full-width (actions / explicit flag)
    const visibleCols = normalizedColumns.filter((c) => !c.hideOnMobile);
    const isFullWidth = (col) =>
      col.mobileFullWidth ||
      col.key === "actions" ||
      col.key === "action" ||
      String(col.key).toLowerCase().includes("action");

    return (
      <div className="flex flex-col gap-2 p-2 w-full">
        {displayedData.map((item, index) => {
          const key = item?.[rowKey] ?? index;
          const regularCols = visibleCols.filter((c) => !isFullWidth(c));
          const actionCols = visibleCols.filter((c) => isFullWidth(c));

          // Build paired rows from regular columns
          const pairs = [];
          for (let i = 0; i < regularCols.length; i += 2) {
            pairs.push(regularCols.slice(i, i + 2));
          }

          return (
            <div
              key={key}
              className="w-full bg-white rounded-xl border border-gray-200 shadow-sm"
            >
              {/* Regular columns: 2-column grid */}
              {pairs.map((pair, rowIdx) => (
                <React.Fragment key={rowIdx}>
                  {/* Hard separator – never overridden by cell bg */}
                  {rowIdx !== 0 && <div className="h-px bg-gray-200 w-full" />}
                  <div
                    className={joinClasses(
                      "grid divide-x divide-x-reverse divide-gray-200",
                      pair.length === 2 ? "grid-cols-2" : "grid-cols-1",
                    )}
                  >
                    {pair.map((col, ci) => (
                      <div
                        key={ci}
                        className="flex flex-col min-w-0 bg-white px-2 pt-1.5 pb-2 gap-1"
                      >
                        <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide leading-normal truncate">
                          {col.title}
                        </span>
                        <div className="flex flex-wrap gap-1 items-start text-[11px] font-medium text-gray-800 leading-snug break-words whitespace-normal min-h-0">
                          {col.render
                            ? col.render(item, index)
                            : (item?.[col.key] ?? "—")}
                        </div>
                      </div>
                    ))}
                  </div>
                </React.Fragment>
              ))}

              {/* Action columns: full-width row, buttons shrunk */}
              {actionCols.length > 0 && (
                <div
                  className="border-t-2 border-gray-100 bg-gray-50/70 px-2 py-2 flex flex-wrap items-center gap-1.5
                  [&_button]:!text-[10px] [&_button]:!px-2 [&_button]:!py-1 [&_button]:!gap-1
                  [&_button]:!rounded-md [&_svg]:!h-3.5 [&_svg]:!w-3.5"
                >
                  {actionCols.map((col, ci) => (
                    <React.Fragment key={ci}>
                      {col.render
                        ? col.render(item, index)
                        : (item?.[col.key] ?? null)}
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  /* =========================================================
     Footer
  ========================================================= */

  const renderFooter = () => {
    if (!showColumnTotals || !Object.keys(columnTotals).length) return null;

    return (
      <tfoot className="bg-gray-50/70 border-t border-gray-200">
        <tr>
          {normalizedColumns.map((col, i) => (
            <td key={i} className="px-6 py-3 text-sm font-bold text-[#1F2937]">
              {columnTotals[col.key]
                ? columnTotals[col.key].toLocaleString("ar-SA")
                : i === 0
                  ? `Σ ${columnTotalsLabel}`
                  : "—"}
            </td>
          ))}
        </tr>
      </tfoot>
    );
  };

  /* =========================================================
     Render
  ========================================================= */

  const summaryVisible = showSummary && (totalCount !== null || searchTerm);

  return (
    <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
      {summaryVisible && (
        <div className="hidden md:flex px-5 py-3 border-b border-gray-100 text-sm text-gray-700 justify-between">
          <div>
            إجمالي العناصر:
            <span className="font-bold text-[#1F2937] mr-2">
              {totalCount ?? data.length}
            </span>
          </div>

          {searchTerm && (
            <div className="text-gray-500">
              نتائج البحث:{" "}
              <span className="font-medium text-[#1F2937]">{searchTerm}</span>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="py-14 flex justify-center">
          <Loader />
        </div>
      ) : error ? (
        <div className="p-6">
          <Alert message={error} type="error" />
        </div>
      ) : displayedData.length === 0 ? (
        <div className="py-14 text-center">
          <div className="text-4xl mb-4 text-blue-300">
            {resolvedEmptyState.icon}
          </div>
          <p className="font-semibold text-gray-700">
            {resolvedEmptyState.title}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            {resolvedEmptyState.description}
          </p>
        </div>
      ) : (
        <>
          {/* ── Mobile: card stack (hidden on md+) ── */}
          <div className="md:hidden w-full overflow-hidden">
            {summaryVisible && (
              <div className="px-3 pt-3 text-xs text-gray-500">
                إجمالي:{" "}
                <span className="font-bold text-[#1F2937]">
                  {totalCount ?? data.length}
                </span>
              </div>
            )}
            {renderMobileCards()}
          </div>

          {/* ── Desktop: full table (hidden below md) ── */}
          <div className="hidden md:block w-full overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300">
            <div className="min-w-[900px]">
              <table className="w-full border-separate border-spacing-0 text-sm">
                {renderHeader()}
                {renderBody()}
                {renderFooter()}
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
