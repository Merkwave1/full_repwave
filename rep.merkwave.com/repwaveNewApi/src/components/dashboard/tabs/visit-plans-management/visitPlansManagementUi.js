/** Shared purple UI tokens for إدارة خطط الزيارات */

export function getVisitPlanSubTabClasses(isActive) {
  return [
    "group relative flex-1 min-w-0 py-2.5 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold rounded-xl",
    "transition-all duration-300 flex items-center justify-center gap-1.5 sm:gap-2 focus:outline-none",
    isActive
      ? "bg-gradient-to-l from-[#8B5FD6] to-[#6B45B0] text-white shadow-lg shadow-[#8B5FD6]/30"
      : "text-gray-600 bg-white border border-[#EDE7FF] hover:text-[#8B5FD6] hover:bg-[#F8F5FF] hover:border-[#C4A8F0] hover:shadow-sm",
  ].join(" ");
}

export const visitPlanPrimaryBtnClass =
  "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-l from-[#8B5FD6] to-[#6B45B0] hover:from-[#7A52C2] hover:to-[#5A3A9E] shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";

export const visitPlanPageIconClass = "h-8 w-8 text-[#8B5FD6]";

export const visitPlanPageWrapperClass = "py-4 sm:py-6 space-y-4 sm:space-y-6";

export const visitPlanStatCardClass =
  "bg-white rounded-2xl border border-[#EDE7FF] p-4 shadow-sm hover:shadow-md transition-shadow";

export const visitPlanInputClass =
  "w-full px-3 py-2.5 border border-[#EDE7FF] rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-[#8B5FD6]/25 focus:border-[#8B5FD6]";

export function normalizePlanStatus(status) {
  return String(status ?? "").toLowerCase();
}

export function getPlanStatusMeta(status) {
  const s = normalizePlanStatus(status);
  if (s === "active") {
    return {
      label: "نشطة",
      card: "bg-gradient-to-l from-[#F8F5FF] to-[#EDE7FF] border-[#C4A8F0] text-[#2D1B69]",
      badge: "bg-green-100 text-green-700",
    };
  }
  if (s === "draft") {
    return {
      label: "مسودة",
      card: "bg-gradient-to-l from-amber-50 to-orange-50 border-amber-200 text-amber-900",
      badge: "bg-amber-100 text-amber-700",
    };
  }
  if (s === "completed") {
    return {
      label: "مكتملة",
      card: "bg-gradient-to-l from-emerald-50 to-green-50 border-emerald-200 text-emerald-900",
      badge: "bg-emerald-100 text-emerald-700",
    };
  }
  return {
    label: "متوقفة",
    card: "bg-gradient-to-l from-gray-50 to-slate-50 border-gray-200 text-gray-800",
    badge: "bg-gray-100 text-gray-700",
  };
}
