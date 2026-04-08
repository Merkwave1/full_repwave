import React from 'react';
import Loader from '../Loader/Loader';
import Alert from '../Alert/Alert';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

const joinClasses = (...classes) => classes.filter(Boolean).join(' ');

const defaultEmptyState = {
  icon: '📂',
  title: 'لا توجد بيانات لعرضها',
  description: 'جرب تغيير الفلاتر أو أعد المحاولة لاحقًا',
};

const alignMap = {
  right: 'text-right',
  left: 'text-left',
  center: 'text-center',
};

function SortIndicator({ active, direction }) {
  if (!active) {
    return (
      <div className="flex flex-col items-center gap-0.5 text-gray-400" aria-hidden="true">
        <ChevronUpIcon className="h-4 w-4" />
        <ChevronDownIcon className="h-4 w-4 -mt-1" />
      </div>
    );
  }

  return direction === 'asc'
    ? <ChevronUpIcon className="h-5 w-5 text-indigo-600" aria-hidden="true" />
    : <ChevronDownIcon className="h-5 w-5 text-indigo-600" aria-hidden="true" />;
}

export default function GlobalTable({
  data = [],
  loading = false,
  error = null,
  columns = [],
  rowKey = 'id',
  renderRow,
  totalCount = null,
  searchTerm = '',
  onSort = null,
  emptyState,
  initialSort = null,
  tableClassName = '',
  headerClassName = '',
  bodyClassName = '',
  rowClassName = '',
  onRowClick = null,
  highlightOnHover = true,
  showSummary = false,
  showColumnTotals = false,
  columnTotalsLabel = 'الإجمالي',
  totalsColumns = null, // Array of column keys to sum, or null to auto-detect numeric columns
}) {
  const resolvedEmptyState = { ...defaultEmptyState, ...emptyState };

  const [sortConfig, setSortConfig] = React.useState(() => {
    if (initialSort?.key) {
      return { key: initialSort.key, direction: initialSort.direction ?? 'asc' };
    }
    return { key: null, direction: 'asc' };
  });

  // Normalize columns: make 'actions' or title 'الإجراءات' centered and show divider by default
  const normalizedColumns = React.useMemo(() => {
    return (Array.isArray(columns) ? columns : []).map((col) => {
      const base = { ...col };
      // Default showDivider to true unless explicitly set to false
      base.showDivider = Object.prototype.hasOwnProperty.call(col, 'showDivider') ? col.showDivider : true;

      const isActions = String(col?.key || '').toLowerCase() === 'actions' || (col?.title === 'الإجراءات');
      if (isActions) {
        base.align = col.align ?? 'center';
        base.headerAlign = col.headerAlign ?? 'center';
        base.className = joinClasses(col.className || '', 'text-center');
      }

      return base;
    });
  }, [columns]);

  const displayedData = React.useMemo(() => {
    if (!Array.isArray(data)) return [];
    if (!sortConfig.key || typeof onSort === 'function') return data;

    const activeColumn = normalizedColumns.find((col) => col.key === sortConfig.key);

    const getComparableValue = (item) => {
      if (activeColumn?.sortAccessor) return activeColumn.sortAccessor(item);
      if (activeColumn?.sortKey) return item?.[activeColumn.sortKey];
      return item?.[sortConfig.key];
    };

    const sorted = [...data].sort((a, b) => {
      const aValue = getComparableValue(a);
      const bValue = getComparableValue(b);

      const aNum = Number(aValue);
      const bNum = Number(bValue);
      const bothNumeric = !Number.isNaN(aNum) && !Number.isNaN(bNum);

      if (bothNumeric) {
        return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc'
          ? aValue.localeCompare(bValue, 'ar')
          : bValue.localeCompare(aValue, 'ar');
      }

      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sortConfig.direction === 'asc' ? -1 : 1;
      if (bValue == null) return sortConfig.direction === 'asc' ? 1 : -1;

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [data, sortConfig, normalizedColumns, onSort]);

  // Calculate column totals for numeric columns
  const columnTotals = React.useMemo(() => {
    if (!showColumnTotals || !displayedData.length) return {};

    const totals = {};
    
    normalizedColumns.forEach((col) => {
      if (!col.key) return;
      
      // Skip if totalsColumns is specified and this column is not in the list
      if (totalsColumns && !totalsColumns.includes(col.key)) return;
      
      // Skip actions column
      const isActions = String(col.key).toLowerCase() === 'actions' || col.title === 'الإجراءات';
      if (isActions) return;

      // Check if column has numeric values
      let sum = 0;
      let hasNumericValues = false;
      
      displayedData.forEach((item) => {
        const value = item?.[col.key];
        const numValue = parseFloat(value);
        
        if (!isNaN(numValue) && value !== null && value !== undefined && value !== '') {
          sum += numValue;
          hasNumericValues = true;
        }
      });
      
      if (hasNumericValues) {
        // Round to 2 decimal places to avoid floating point issues
        totals[col.key] = Math.round(sum * 100) / 100;
      }
    });
    
    return totals;
  }, [displayedData, normalizedColumns, showColumnTotals, totalsColumns]);

  // (normalizedColumns is defined above)

  const handleHeaderClick = (col) => {
    if (!col?.sortable) return;
    setSortConfig((prev) => {
      const nextDirection = prev.key === col.key && prev.direction === 'asc' ? 'desc' : 'asc';
      if (typeof onSort === 'function') {
        onSort(col.key, nextDirection);
      }
      return { key: col.key, direction: nextDirection };
    });
  };

  const summaryVisible = showSummary && (totalCount !== null || searchTerm);
  const effectiveTotal = totalCount ?? data.length;

  const resolveRowClassName = (item, index) => {
    if (typeof rowClassName === 'function') {
      return rowClassName(item, index);
    }
    return rowClassName;
  };

  const renderTableHeader = () => (
    <thead className={joinClasses('bg-gray-50', headerClassName)}>
      <tr>
        {normalizedColumns.map((col, idx) => {
          const headerAlign = alignMap[col.headerAlign || col.align] ?? 'text-right';
          const isSortable = Boolean(col.sortable);
          const isActive = sortConfig.key === col.key;
          const isLast = idx === normalizedColumns.length - 1;
          const isActions = String(col?.key || '').toLowerCase() === 'actions' || (col?.title === 'الإجراءات');

          const thClasses = joinClasses(
            'px-4 py-4 text-lg font-bold uppercase tracking-wider transition-colors duration-150',
            headerAlign,
            isSortable ? 'cursor-pointer hover:bg-gray-100' : '',
            !isLast ? 'border-r border-gray-200' : '',
            // If this is the actions column, always add both left and right borders so the separator is visible in RTL/LTR
            isActions ? 'border-l border-r border-gray-200' : '',
            col.className,
            col.headerClassName,
          );

          const headerContent = typeof col.headerRenderer === 'function'
            ? col.headerRenderer({ col, sortConfig })
            : (
              isSortable
                ? (
                  <div className="flex items-center justify-between gap-2">
                    <span className="select-none text-gray-700">{col.title}</span>
                    <SortIndicator active={isActive} direction={sortConfig.direction} />
                  </div>
                )
                : <span className="select-none text-gray-700 block">{col.title}</span>
            );

          return (
            <th
              key={col.key || idx}
              className={thClasses}
              onClick={() => handleHeaderClick(col)}
              scope="col"
            >
              {headerContent}
            </th>
          );
        })}
      </tr>
    </thead>
  );

  const renderTableBody = () => (
    <tbody className={joinClasses('bg-white divide-y divide-gray-100 ', bodyClassName)}>
      {displayedData.map((item, index) => {
        const key = item?.[rowKey] ?? index;

        const cells = typeof renderRow === 'function'
          ? renderRow(item, index, displayedData)
                : normalizedColumns.map((col, ci) => {
              const cellAlign = alignMap[col.align] ?? 'text-right';
              const isLastCell = ci === normalizedColumns.length - 1;
              const isActionsCell = String(col?.key || '').toLowerCase() === 'actions' || (col?.title === 'الإجراءات');

              const baseCellClass = joinClasses(
                'px-4 py-4 text-sm text-gray-600',
                cellAlign,
                !isLastCell ?'border-l border-r border-gray-200' : 'border-l border-r border-gray-200',
                // For actions cell, always add left and right borders so the separator is visible in RTL/LTR
                isActionsCell ? 'border-l border-r border-gray-200' : 'border-l border-r border-gray-200',
                col.tdClass,
                col.cellClassName,
              );

              const content = typeof col.render === 'function'
                ? col.render(item, index, displayedData)
                : item?.[col.key];

              if (React.isValidElement(content) && content.type === 'td') {
                return React.cloneElement(content, {
                  key: `${col.key || ci}-${index}`,
                });
              }

              return (
                <td key={`${col.key || ci}-${index}`} className={baseCellClass}>
                  {content ?? '—'}
                </td>
              );
            });

        const rowClasses = joinClasses(
          'group transition-all duration-150',
          highlightOnHover ? 'hover:bg-gray-50' : '',
          resolveRowClassName(item, index),
        );

        const handleRowClick = onRowClick ? () => onRowClick(item, index) : undefined;

        return (
          <tr key={key} className={rowClasses} onClick={handleRowClick}>
            {cells}
          </tr>
        );
      })}
    </tbody>
  );

  // Render table footer with column totals
  const renderTableFooter = () => {
    if (!showColumnTotals || Object.keys(columnTotals).length === 0) return null;

    const rowCount = displayedData.length;

    return (
      <tfoot className="bg-gradient-to-r from-indigo-50 to-blue-50 border-t-2 border-indigo-200">
        {/* Totals Row */}
        <tr>
          {normalizedColumns.map((col, idx) => {
            const cellAlign = alignMap[col.align] ?? 'text-right';
            const isFirstColumn = idx === 0;
            const hasTotal = columnTotals.hasOwnProperty(col.key);
            
            const footerCellClass = joinClasses(
              'px-4 py-3 text-sm font-bold',
              cellAlign,
              'border-l border-r border-indigo-100',
              hasTotal ? 'text-indigo-700' : 'text-gray-600',
            );

            let content;
            if (isFirstColumn && !hasTotal) {
              // Show label in first column if it doesn't have a total
              content = (
                <span className="flex items-center gap-2 text-indigo-700 font-bold">
                  <span className="text-lg">Σ</span>
                  {columnTotalsLabel}
                </span>
              );
            } else if (hasTotal) {
              // Format number with locale
              content = (
                <span className="text-indigo-700 font-bold">
                  {columnTotals[col.key].toLocaleString('ar-SA', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2,
                  })}
                </span>
              );
            } else {
              content = '—';
            }

            return (
              <td key={`footer-${col.key || idx}`} className={footerCellClass}>
                {content}
              </td>
            );
          })}
        </tr>
        {/* Row Count Row */}
        <tr className="bg-gray-100 border-t border-indigo-100">
          <td 
            colSpan={normalizedColumns.length} 
            className="px-4 py-2 text-center text-sm text-gray-600"
          >
            <span className="font-medium">عدد الصفوف:</span>
            <span className="font-bold text-indigo-600 mr-2">{rowCount.toLocaleString('ar-SA')}</span>
          </td>
        </tr>
      </tfoot>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden animate-fadeIn">
      {summaryVisible && (
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-700">
          <div>
            إجمالي العناصر:
            <span className="font-bold text-indigo-600 ml-1">{effectiveTotal}</span>
          </div>
          {searchTerm && (
            <div className="text-sm text-gray-500">
              نتائج البحث عن: <span className="font-medium text-gray-700">{searchTerm}</span>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="px-6 py-12 flex items-center justify-center">
          <Loader />
        </div>
      ) : error ? (
        <div className="px-6 py-6">
          <Alert message={error} type="error" />
        </div>
      ) : displayedData.length === 0 ? (
        <div className="px-6 py-12 text-center animate-fadeIn">
          <div className="text-4xl mb-4 text-blue-300">{resolvedEmptyState.icon}</div>
          <p className="text-gray-700 text-lg font-semibold">{resolvedEmptyState.title}</p>
          {resolvedEmptyState.description && (
            <p className="text-gray-500 text-sm mt-2">{resolvedEmptyState.description}</p>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className={joinClasses('min-w-full divide-y divide-gray-200 text-sm', tableClassName)}>
            {renderTableHeader()}
            {renderTableBody()}
            {renderTableFooter()}
          </table>
        </div>
      )}
    </div>
  );
}
