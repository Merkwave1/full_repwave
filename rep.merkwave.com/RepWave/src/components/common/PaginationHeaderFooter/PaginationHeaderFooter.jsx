import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, ChevronDoubleLeftIcon, ChevronDoubleRightIcon } from '@heroicons/react/24/outline';

export default function PaginationHeaderFooter({
  total = 0,
  currentPage = 1,
  totalPages = 1,
  itemsPerPage = 10,
  onItemsPerPageChange = () => {},
  onFirst = () => {},
  onPrev = () => {},
  onNext = () => {},
  onLast = () => {},
  transparent = false,
  // Parent can pass `loading` to indicate a server load is in-progress.
  loading = false,
  // Optional callback invoked immediately when a navigation button is clicked.
  onNavigateStart = () => {},
}) {
  const cur = Number(currentPage) || 1;
  const tp = Number(totalPages) || 1;
  const tot = Number(total) || 0;

  const [isNavigating, setIsNavigating] = useState(false);
  const navTimerRef = useRef(null);

  const clearNavigateState = useCallback((delay = 0) => {
    if (navTimerRef.current) {
      clearTimeout(navTimerRef.current);
      navTimerRef.current = null;
    }
    if (delay > 0) {
      navTimerRef.current = setTimeout(() => {
        setIsNavigating(false);
        navTimerRef.current = null;
      }, delay);
    } else {
      setIsNavigating(false);
    }
  }, []);

  useEffect(() => () => clearNavigateState(), [clearNavigateState]);

  useEffect(() => {
    if (!loading) {
      clearNavigateState();
    }
  }, [loading, clearNavigateState]);

  const startNavigate = (cb) => {
    if (navTimerRef.current) {
      clearTimeout(navTimerRef.current);
      navTimerRef.current = null;
    }

    setIsNavigating(true);
    if (typeof onNavigateStart === 'function') {
      onNavigateStart();
    }

    const result = typeof cb === 'function' ? cb() : null;
    if (result && typeof result.then === 'function') {
      result.finally(() => clearNavigateState());
    } else {
      clearNavigateState(400);
    }
  };

  const bgClass = transparent ? 'bg-transparent' : 'bg-white';

  const navDisabled = loading || isNavigating;

return (
  <div
    className={`
      ${bgClass}
      my-4 md:my-6 
      p-3 sm:p-4 md:p-5
      rounded-2xl
      border border-white/40
      shadow-[0_8px_30px_rgba(0,0,0,0.08)]
      backdrop-blur-md
      bg-gradient-to-br from-[#8DD8F5]/25 via-white to-white
      flex flex-col lg:flex-row
      lg:items-center lg:justify-between
      gap-3 sm:gap-4
    `}
  >
    {/* Info */}
    <div className="
      text-xs sm:text-sm md:text-base 
      text-[#1F2937] font-medium 
      flex flex-wrap items-center gap-x-2 gap-y-1
      leading-relaxed
    ">

      <span>
        إجمالي:
        <span className="ml-1 font-bold">{tot}</span>
      </span>

      <span className="text-gray-400 hidden sm:inline">•</span>

      <span>
        صفحة
        <span className="mx-1 font-bold">{cur}</span>
        من
        <span className="mx-1 font-bold">{tp}</span>
      </span>

      <span className="text-gray-400 hidden sm:inline">•</span>

      <span>
        عرض
        <span className="mx-1 font-bold">
          {Math.min(tot, (cur - 1) * itemsPerPage + 1)}
        </span>
        -
        <span className="mx-1 font-bold">
          {Math.min(
            tot,
            (cur - 1) * itemsPerPage +
              (tot
                ? Math.min(itemsPerPage, tot - (cur - 1) * itemsPerPage)
                : 0)
          )}
        </span>
      </span>

    </div>

    {/* Controls */}
    <div
      className="
        flex flex-wrap sm:flex-nowrap
        items-center justify-between sm:justify-end
        gap-2 sm:gap-3
      "
      dir="rtl"
    >

      <label className="text-xs sm:text-sm text-[#1F2937]/70 font-medium whitespace-nowrap">
        عدد العناصر
      </label>

      {/* Select */}
      <div className="relative shrink-0">
        <select
          value={itemsPerPage}
          onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
          className="
            appearance-none
            px-3 py-1.5 pr-9
            rounded-lg
            border border-[#8DD8F5]/40
            bg-white
            text-xs sm:text-sm
            shadow-sm
            focus:outline-none
            focus:ring-2 focus:ring-[#8DD8F5]
            hover:border-[#8DD8F5]
            transition
          "
        >
          {[10, 20, 50, 100].map(n => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>

        <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[#1F2937]/70">
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.38a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
            />
          </svg>
        </div>
      </div>

      {/* Navigation */}
      <div className="
        flex items-center
        bg-white rounded-xl border shadow-sm
        px-1
        overflow-x-auto
      ">

        {(isNavigating || loading) && (
          <div className="mx-2 shrink-0">
            <div className="animate-spin h-5 w-5 border-2 border-[#1F2937] border-t-transparent rounded-full" />
          </div>
        )}

        <button
          onClick={() => startNavigate(onFirst)}
          disabled={navDisabled || cur <= 1}
          className="p-2 sm:p-2.5 rounded-lg hover:bg-[#8DD8F5]/30 disabled:opacity-40 transition"
        >
          <ChevronDoubleRightIcon className="h-4 sm:h-5 w-4 sm:w-5"/>
        </button>

        <button
          onClick={() => startNavigate(onPrev)}
          disabled={navDisabled || cur <= 1}
          className="p-2 sm:p-2.5 rounded-lg hover:bg-[#8DD8F5]/30 disabled:opacity-40 transition"
        >
          <ChevronRightIcon className="h-4 sm:h-5 w-4 sm:w-5"/>
        </button>

        <span className="px-3 sm:px-4 py-1 text-xs sm:text-sm font-semibold text-[#1F2937] whitespace-nowrap">
          {cur} / {tp}
        </span>

        <button
          onClick={() => startNavigate(onNext)}
          disabled={navDisabled || cur >= tp}
          className="p-2 sm:p-2.5 rounded-lg hover:bg-[#8DD8F5]/30 disabled:opacity-40 transition"
        >
          <ChevronLeftIcon className="h-4 sm:h-5 w-4 sm:w-5"/>
        </button>

        <button
          onClick={() => startNavigate(onLast)}
          disabled={navDisabled || cur >= tp}
          className="p-2 sm:p-2.5 rounded-lg hover:bg-[#8DD8F5]/30 disabled:opacity-40 transition"
        >
          <ChevronDoubleLeftIcon className="h-4 sm:h-5 w-4 sm:w-5"/>
        </button>

      </div>
    </div>
  </div>
);
}
