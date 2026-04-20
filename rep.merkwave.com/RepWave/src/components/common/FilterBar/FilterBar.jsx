/* ============================
   ✅ SHAPES / STYLING ONLY
   ❌ NO LOGIC CHANGED
   ============================ */

import React from "react";
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  CalendarDaysIcon,
  FunnelIcon,
} from "@heroicons/react/24/outline";
import SearchableSelect from "../SearchableSelect/SearchableSelect";

const chipToneClasses = {
  blue: "bg-blue-100 text-blue-800",
  green: "bg-green-100 text-green-800",
  indigo: "bg-indigo-100 text-indigo-800",
  orange: "bg-orange-100 text-orange-800",
  purple: "bg-purple-100 text-purple-800",
  yellow: "bg-yellow-100 text-yellow-800",
  teal: "bg-teal-100 text-teal-800",
  red: "bg-red-100 text-red-800",
  gray: "bg-gray-100 text-gray-800",
};

const mergeClasses = (...classes) => classes.filter(Boolean).join(" ");

/* ================= DATE RANGE ================= */

const DateRangePicker = ({
  from = "",
  to = "",
  placeholder = "اختر فترة التاريخ",
  onChange = () => {},
  onClear = () => {},
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef(null);

  const dateFrom = from || "";
  const dateTo = to || "";

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formatDateForDisplay = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString("en-GB", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const getDisplayText = () => {
    if (!dateFrom && !dateTo) return placeholder;
    if (dateFrom && dateTo)
      return `${formatDateForDisplay(dateFrom)} - ${formatDateForDisplay(
        dateTo,
      )}`;
    if (dateFrom) return `من ${formatDateForDisplay(dateFrom)}`;
    if (dateTo) return `إلى ${formatDateForDisplay(dateTo)}`;
    return placeholder;
  };

  return (
    <div className="relative w-full" ref={dropdownRef} dir="rtl">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="
          w-full px-4 py-3
          rounded-xl
          bg-gray-50
          border border-transparent
          flex justify-between items-center
          transition-all duration-200
          hover:bg-white
          focus-within:border-[#8DD8F5]
          focus-within:ring-4 focus-within:ring-[#8DD8F5]/25
          cursor-pointer
        "
      >
        <div className="flex items-center justify-between w-full">
          <span
            className={`truncate ${
              !dateFrom && !dateTo ? "text-gray-400" : "text-gray-900"
            }`}
          >
            {getDisplayText()}
          </span>

          <div className="flex items-center gap-1">
            {(dateFrom || dateTo) && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClear();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
            <CalendarDaysIcon className="h-5 w-5 text-gray-400" />
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-xl shadow-lg z-50">
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                من تاريخ
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => onChange(e.target.value, dateTo)}
                className="w-full px-3 py-2 rounded-lg bg-gray-50 border border-transparent focus:bg-white focus:ring-2 focus:ring-[#8DD8F5]/25 focus:border-[#8DD8F5] text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                إلى تاريخ
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => onChange(dateFrom, e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-gray-50 border border-transparent focus:bg-white focus:ring-2 focus:ring-[#8DD8F5]/25 focus:border-[#8DD8F5] text-sm"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex-1 px-3 py-2 rounded-lg bg-[#1F2937] text-white text-sm hover:bg-[#111827]"
              >
                تطبيق
              </button>

              <button
                type="button"
                onClick={() => {
                  onClear();
                  setIsOpen(false);
                }}
                className="flex-1 px-3 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm hover:bg-gray-200"
              >
                مسح
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const getChipToneClass = (tone) =>
  chipToneClasses[tone] || chipToneClasses.gray;

/* ================= FILTER BAR ================= */

export default function FilterBar({
  title = "البحث والفلاتر",
  searchConfig = null,
  dateRangeConfig = null,
  selectFilters = [],
  children = null,
  activeChips = [],
  activeTitle = "الفلاتر النشطة:",
  clearAllLabel = "مسح جميع الفلاتر",
  onClearAll = null,
  className = "",
}) {
  const hasChips = Array.isArray(activeChips) && activeChips.length > 0;
  const hasSearch = !!searchConfig;
  const hasDateRange = !!dateRangeConfig;
  const visibleSelectFilters = Array.isArray(selectFilters)
    ? selectFilters.filter((filter) => !filter?.hidden)
    : [];
  const hasSelects = visibleSelectFilters.length > 0;
  const showControlsRow = hasSearch || hasDateRange || hasSelects || !!children;

  const searchWhileTyping = Boolean(searchConfig?.searchWhileTyping);
  const searchValue = searchConfig?.value ?? "";
  const [searchInputValue, setSearchInputValue] = React.useState(searchValue);
  const prevSearchValueRef = React.useRef(searchValue);
  const [isLocalDirty, setIsLocalDirty] = React.useState(false);

  React.useEffect(() => {
    if (prevSearchValueRef.current !== searchValue) {
      setSearchInputValue(searchValue);
      prevSearchValueRef.current = searchValue;
      setIsLocalDirty(false);
    }
  }, [searchValue]);

  const canTriggerSearch =
    typeof searchConfig?.onSubmit === "function" ||
    typeof searchConfig?.onChange === "function";

  const searchPlaceholder = searchConfig?.placeholder || "";

  const shouldShowApplyFromConfig = Boolean(
    searchConfig?.onSubmit &&
    (searchConfig?.showApplyButton !== undefined
      ? searchConfig.showApplyButton
      : (searchConfig?.isDirty ?? false)),
  );

  const applyButtonPreference =
    searchConfig?.showApplyButton !== undefined
      ? searchConfig.showApplyButton
      : true;

  const deferredApplyVisibility =
    applyButtonPreference || isLocalDirty || (searchConfig?.isDirty ?? false);

  const showSearchApply = searchWhileTyping
    ? shouldShowApplyFromConfig
    : canTriggerSearch &&
      deferredApplyVisibility &&
      searchInputValue.trim() !== "";

  const applyLabel = searchConfig?.applyLabel || "تطبيق";

  const handleSearchClear = () => {
    setSearchInputValue("");
    setIsLocalDirty(false);

    if (typeof searchConfig?.onClear === "function") searchConfig.onClear();
    else if (typeof searchConfig?.onChange === "function")
      searchConfig.onChange("");

    if (!searchWhileTyping && typeof searchConfig?.onSubmit === "function") {
      searchConfig.onSubmit("");
    }
  };

  const triggerSearch = () => {
    if (!canTriggerSearch) return;

    const valueToUse = searchInputValue;

    if (!searchWhileTyping && typeof searchConfig?.onChange === "function") {
      searchConfig.onChange(valueToUse);
    }

    if (typeof searchConfig?.onSubmit === "function") {
      searchConfig.onSubmit(valueToUse);
    }

    if (!searchWhileTyping) {
      prevSearchValueRef.current = valueToUse;
      setIsLocalDirty(false);
    }
  };

  return (
    <div
      className={mergeClasses(
        `
        relative
        bg-white/90 backdrop-blur
        rounded-2xl
        mt-10 mb-4
        p-4 md:p-6
        shadow-[0_8px_30px_rgba(0,0,0,0.06)]
        border border-gray-100
        overflow-hidden
        `,
        className,
      )}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-[#8DD8F5]" />

      <div className="flex flex-col md:flex-row mb-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#1F2937] text-white text-sm font-semibold shadow-sm">
          <FunnelIcon className="h-4 w-4 text-[#8DD8F5]" />
          {title}
        </div>
      </div>

      {showControlsRow && (
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
          {hasSearch && (
            <div className="w-full md:flex-[2] relative min-w-0">
              <div
                className="
                w-full flex items-center gap-2
                px-4 py-3
                rounded-xl
                bg-gray-50
                border border-transparent
                transition-all duration-200
                focus-within:bg-white
                focus-within:border-[#8DD8F5]
                focus-within:ring-4 focus-within:ring-[#8DD8F5]/25
              "
              >
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchInputValue}
                  onChange={(e) => {
                    const nextValue = e.target.value;
                    setSearchInputValue(nextValue);

                    if (searchWhileTyping) searchConfig?.onChange?.(nextValue);
                    else setIsLocalDirty(true);
                  }}
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter" &&
                      searchWhileTyping &&
                      canTriggerSearch
                    ) {
                      e.preventDefault();
                      triggerSearch();
                    }
                  }}
                  className="flex-1 bg-transparent text-right placeholder-gray-400 focus:outline-none text-sm"
                />

                <div className="flex items-center gap-2">
                  {showSearchApply && (
                    <button
                      type="button"
                      onClick={triggerSearch}
                      className="px-4 py-1.5 rounded-lg bg-[#1F2937] text-white text-sm hover:bg-[#111827] transition shadow-sm"
                    >
                      {applyLabel}
                    </button>
                  )}

                  {searchInputValue && (
                    <button
                      onClick={handleSearchClear}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  )}

                  <MagnifyingGlassIcon className="h-4 w-4 text-gray-400 hidden md:block pointer-events-none" />
                </div>
              </div>
            </div>
          )}

          {hasDateRange && (
            <div className="w-full md:flex-1 min-w-0">
              <DateRangePicker
                from={dateRangeConfig?.from ?? dateRangeConfig?.dateFrom ?? ""}
                to={dateRangeConfig?.to ?? dateRangeConfig?.dateTo ?? ""}
                placeholder={
                  dateRangeConfig?.placeholder || "اختر فترة التاريخ"
                }
                onChange={(f, t) => dateRangeConfig?.onChange?.(f, t)}
                onClear={() => dateRangeConfig?.onClear?.()}
              />
            </div>
          )}

          {hasSelects &&
            visibleSelectFilters.map((filter) => (
              <div
                key={filter.key}
                className={mergeClasses(
                  "w-full md:flex-1 min-w-0",
                  filter.wrapperClassName,
                )}
              >
                <SearchableSelect
                  options={filter.options || []}
                  value={filter.value ?? ""}
                  onChange={(val) => filter.onChange?.(val)}
                  placeholder={filter.placeholder || filter.label || ""}
                  className={filter.className || "w-full"}
                />
              </div>
            ))}

          {children}
        </div>
      )}

      {hasChips && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            {activeTitle && (
              <span className="text-sm text-gray-600">{activeTitle}</span>
            )}

            {activeChips.map((chip) => {
              const toneClass = getChipToneClass(chip.tone);

              const content = chip.render ?? (
                <>
                  <span>{chip.label}</span>
                  {chip.value && <span className="mx-1">: {chip.value}</span>}
                </>
              );

              if (chip.onRemove) {
                return (
                  <button
                    key={chip.key}
                    onClick={chip.onRemove}
                    className={mergeClasses(
                      "px-3 py-1.5 rounded-full text-sm flex items-center gap-1 transition",
                      toneClass,
                      chip.className,
                    )}
                  >
                    {content}
                    <span className="text-lg leading-none">×</span>
                  </button>
                );
              }

              return (
                <span
                  key={chip.key}
                  className={mergeClasses(
                    "px-3 py-1.5 rounded-full text-sm flex items-center gap-1",
                    toneClass,
                    chip.className,
                  )}
                >
                  {content}
                </span>
              );
            })}
          </div>

          {onClearAll && (
            <button
              onClick={onClearAll}
              className="shrink-0 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
            >
              {clearAllLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
