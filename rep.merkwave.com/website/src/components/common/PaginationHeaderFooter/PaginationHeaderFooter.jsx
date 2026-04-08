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
    <div className={`${bgClass} rounded-xl border border-gray-200  my-6 shadow-sm p-3 md:p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3`}>
      <div className="text-sm md:text-base text-gray-700">
        إجمالي: <span className="font-semibold text-blue-600">{tot}</span>
        <span className="mx-2">•</span>
        صفحة <span className="font-semibold">{cur}</span> من <span className="font-semibold">{tp}</span>
        <span className="mx-2">•</span>
        عرض <span className="font-semibold">{Math.min(tot, (cur - 1) * itemsPerPage + 1)}</span>
        {' - '}
        <span className="font-semibold">{Math.min(tot, (cur - 1) * itemsPerPage + (tot ? Math.min(itemsPerPage, tot - (cur - 1) * itemsPerPage) : 0))}</span>
      </div>

      <div className="flex items-center gap-2" dir="rtl">
        <label className="text-sm text-gray-600">عدد العناصر:::</label>
        <select value={itemsPerPage} onChange={(e) => onItemsPerPageChange(Number(e.target.value))} className="px-2 py-1 border rounded-md text-sm bg-white">
          {[10,20,50,100].map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <div className="flex items-center gap-1">
          {/* show local spinner when navigating or when parent indicates loading */}
          {(isNavigating || loading) && (
            <div className="mr-2">
              <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full" aria-hidden="true"></div>
            </div>
          )}
          <button title="الأولى" onClick={() => startNavigate(onFirst)} disabled={navDisabled || cur<=1} className="px-2 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"><ChevronDoubleRightIcon className="h-5 w-5"/></button>
          <button title="السابق" onClick={() => startNavigate(onPrev)} disabled={navDisabled || cur<=1} className="px-2 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"><ChevronRightIcon className="h-5 w-5"/></button>
          <span className="px-2 py-1 text-sm text-gray-700">{cur} / {tp}</span>
          <button title="التالي" onClick={() => startNavigate(onNext)} disabled={navDisabled || cur>=tp} className="px-2 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"><ChevronLeftIcon className="h-5 w-5"/></button>
          <button title="الأخيرة" onClick={() => startNavigate(onLast)} disabled={navDisabled || cur>=tp} className="px-2 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"><ChevronDoubleLeftIcon className="h-5 w-5"/></button>
        </div>
      </div>
    </div>
  );
}
