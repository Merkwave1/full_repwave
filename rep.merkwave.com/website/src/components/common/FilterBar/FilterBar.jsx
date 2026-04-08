import React from 'react';
import { MagnifyingGlassIcon, XMarkIcon, CalendarDaysIcon, FunnelIcon } from '@heroicons/react/24/outline';
import SearchableSelect from '../SearchableSelect/SearchableSelect';

const chipToneClasses = {
  blue: 'bg-blue-100 text-blue-800',
  green: 'bg-green-100 text-green-800',
  indigo: 'bg-indigo-100 text-indigo-800',
  orange: 'bg-orange-100 text-orange-800',
  purple: 'bg-purple-100 text-purple-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  teal: 'bg-teal-100 text-teal-800',
  red: 'bg-red-100 text-red-800',
  gray: 'bg-gray-200 text-gray-800',
};

const mergeClasses = (...classes) => classes.filter(Boolean).join(' ');

const DateRangePicker = ({
  from = '',
  to = '',
  placeholder = 'اختر فترة التاريخ',
  onChange = () => {},
  onClear = () => {},
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef(null);
  const dateFrom = from || '';
  const dateTo = to || '';

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatDateForDisplay = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  const getDisplayText = () => {
    if (!dateFrom && !dateTo) return placeholder;
    if (dateFrom && dateTo) return `${formatDateForDisplay(dateFrom)} - ${formatDateForDisplay(dateTo)}`;
    if (dateFrom) return `من ${formatDateForDisplay(dateFrom)}`;
    if (dateTo) return `إلى ${formatDateForDisplay(dateTo)}`;
    return placeholder;
  };

  return (
    <div className="relative w-full  " ref={dropdownRef} dir="rtl">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-100 sm:text-sm text-right flex justify-between items-center transition-all duration-200 bg-white hover:border-blue-300 hover:shadow-md"
      >
        <div className="flex items-center justify-between w-full">
          <span className={`truncate ${(!dateFrom && !dateTo) ? 'text-gray-500' : 'text-gray-900'}`}>{getDisplayText()}</span>
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
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg z-50">
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">من تاريخ</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => onChange(e.target.value, dateTo)}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">إلى تاريخ</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => onChange(dateFrom, e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 text-sm"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
              >
                تطبيق
              </button>
              <button
                type="button"
                onClick={() => {
                  onClear();
                  setIsOpen(false);
                }}
                className="flex-1 px-3 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300"
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

const getChipToneClass = (tone) => chipToneClasses[tone] || chipToneClasses.gray;

export default function FilterBar({
  title = 'البحث والفلاتر',
  searchConfig = null,
  dateRangeConfig = null,
  selectFilters = [],
  children = null,
  activeChips = [],
  activeTitle = 'الفلاتر النشطة:',
  clearAllLabel = 'مسح جميع الفلاتر',
  onClearAll = null,
  className = '',
}) {
  const hasChips = Array.isArray(activeChips) && activeChips.length > 0;
  const hasSearch = !!searchConfig;
  const hasDateRange = !!dateRangeConfig;
  const visibleSelectFilters = Array.isArray(selectFilters) ? selectFilters.filter((filter) => !filter?.hidden) : [];
  const hasSelects = visibleSelectFilters.length > 0;
  const showControlsRow = hasSearch || hasDateRange || hasSelects || !!children;

  const searchWhileTyping = Boolean(searchConfig?.searchWhileTyping);
  const searchValue = searchConfig?.value ?? '';
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

  const canTriggerSearch = typeof searchConfig?.onSubmit === 'function' || typeof searchConfig?.onChange === 'function';
  const searchPlaceholder = searchConfig?.placeholder || '';
  const shouldShowApplyFromConfig = Boolean(
    searchConfig?.onSubmit &&
    (searchConfig?.showApplyButton !== undefined ? searchConfig.showApplyButton : (searchConfig?.isDirty ?? false))
  );
  const applyButtonPreference = searchConfig?.showApplyButton !== undefined ? searchConfig.showApplyButton : true;
  const deferredApplyVisibility = applyButtonPreference || isLocalDirty || (searchConfig?.isDirty ?? false);
  const showSearchApply = searchWhileTyping
    ? shouldShowApplyFromConfig
    : (canTriggerSearch && deferredApplyVisibility && searchInputValue.trim() !== '');
  const applyLabel = searchConfig?.applyLabel || 'تطبيق';

  const handleSearchClear = () => {
    setSearchInputValue('');
    setIsLocalDirty(false);
    if (typeof searchConfig?.onClear === 'function') {
      searchConfig.onClear();
    } else if (typeof searchConfig?.onChange === 'function') {
      searchConfig.onChange('');
    }
    if (!searchWhileTyping && typeof searchConfig?.onSubmit === 'function') {
      searchConfig.onSubmit('');
    }
  };

  const triggerSearch = () => {
    if (!canTriggerSearch) return;
    const valueToUse = searchInputValue;

    if (!searchWhileTyping && typeof searchConfig?.onChange === 'function') {
      searchConfig.onChange(valueToUse);
    }

    if (typeof searchConfig?.onSubmit === 'function') {
      searchConfig.onSubmit(valueToUse);
    }

    if (!searchWhileTyping) {
      prevSearchValueRef.current = valueToUse;
      setIsLocalDirty(false);
    }
  };

  return (
    <div className={mergeClasses('relative bg-white  rounded-xl border mt-10 border-blue-700 shadow-sm p-1 md:p-4 pt-6 mb-3', className)}>
      <div className="flex -mt-6 mb-0" dir="ltr">
        <div dir="rtl" className="ml-auto inline-flex items-center gap-2 bg-blue-600 px-4 py-1 rounded-full text-lg font-bold text-white shadow-md transform -translate-y-1/2 border border-blue-900">
          <FunnelIcon className="h-5 w-5 text-white" />
          <span className="leading-5">{title}</span>
        </div>
      </div>

      {showControlsRow && (
        <div className="flex flex-col md:flex-row gap-3 items-center">
          {hasSearch && (
            <div className="flex-[2] relative min-w-0">
              <div className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-100 sm:text-sm text-right flex items-center justify-between transition-all duration-200 bg-white hover:border-blue-300 hover:shadow-md">
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchInputValue}
                  onChange={(e) => {
                    const nextValue = e.target.value;
                    setSearchInputValue(nextValue);
                    if (searchWhileTyping) {
                      searchConfig?.onChange?.(nextValue);
                    } else {
                      setIsLocalDirty(true);
                    }
                  }}
                  onKeyDown={(e) => {
                    // Only trigger search on Enter while typing when searchWhileTyping is true.
                    // If searchWhileTyping is false we want the user to explicitly click the "تطبيق" button.
                    if (e.key === 'Enter' && searchWhileTyping && canTriggerSearch) {
                      e.preventDefault();
                      triggerSearch();
                    }
                  }}
                  className="flex-1 bg-transparent text-right placeholder-gray-500 focus:outline-none text-sm"
                />
                <div className="flex items-center gap-2">
                  {showSearchApply && (
                    <button
                      type="button"
                      onClick={triggerSearch}
                      className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm"
                      disabled={!canTriggerSearch}
                    >
                      {applyLabel}
                    </button>
                  )}
                  {searchInputValue && (
                    <button onClick={handleSearchClear} className="text-gray-400 hover:text-gray-600">
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  )}
                  <MagnifyingGlassIcon className="h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>
          )}

          {hasDateRange && (
            <div className="flex-1 min-w-0">
              <DateRangePicker
                from={dateRangeConfig?.from ?? dateRangeConfig?.dateFrom ?? ''}
                to={dateRangeConfig?.to ?? dateRangeConfig?.dateTo ?? ''}
                placeholder={dateRangeConfig?.placeholder || 'اختر فترة التاريخ'}
                onChange={(fromVal, toVal) => dateRangeConfig?.onChange?.(fromVal, toVal)}
                onClear={() => dateRangeConfig?.onClear?.()}
              />
            </div>
          )}

          {hasSelects && visibleSelectFilters.map((filter) => (
            <div
              key={filter.key}
              className={mergeClasses('flex-1 min-w-0', filter.wrapperClassName)}
            >
              {/* Determine a sensible placeholder: explicit placeholder > filter.label > first option label/value */}
              {(() => {
                const opts = filter.options || [];
                let firstLabel = '';
                if (Array.isArray(opts) && opts.length > 0) {
                  // Support both [{value,label}] and legacy [ [value,label], ... ]
                  const first = opts[0];
                  if (first && typeof first === 'object') {
                    firstLabel = first.label || first.name || '';
                  } else if (Array.isArray(first)) {
                    firstLabel = first[1] || '';
                  }
                }

                const placeholderText = filter.placeholder || filter.label || firstLabel || '';

                return (
                  <SearchableSelect
                    options={filter.options || []}
                    value={filter.value ?? ''}
                    onChange={(val) => filter.onChange?.(val)}
                    placeholder={placeholderText}
                    className={filter.className || 'w-full'}
                  />
                );
              })()}
            </div>
          ))}

          {children}
        </div>
      )}

      {hasChips && (
        <div className="mt-1 pt-2 border-t border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            {activeTitle && <span className="text-sm text-gray-600">{activeTitle}</span>}
            {activeChips.map((chip) => {
              const toneClass = getChipToneClass(chip.tone);
              const content = chip.render ?? (
                <>
                  <span>{chip.label}</span>
                  {chip.value !== undefined && chip.value !== null && chip.value !== '' && (
                    <span className="mx-1">: {chip.value}</span>
                  )}
                </>
              );

              if (chip.onRemove) {
                return (
                  <button
                    type="button"
                    key={chip.key}
                    onClick={chip.onRemove}
                    className={mergeClasses('px-2 py-1 rounded-full text-sm flex items-center gap-1 transition-colors', toneClass, chip.className)}
                  >
                    {content}
                    <span className="text-lg leading-none">×</span>
                  </button>
                );
              }

              return (
                <span
                  key={chip.key}
                  className={mergeClasses('px-2 py-1 rounded-full text-sm flex items-center gap-1', toneClass, chip.className)}
                >
                  {content}
                </span>
              );
            })}
          </div>
          {onClearAll && (
            <button
              type="button"
              onClick={onClearAll}
              className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
            >
              {clearAllLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
