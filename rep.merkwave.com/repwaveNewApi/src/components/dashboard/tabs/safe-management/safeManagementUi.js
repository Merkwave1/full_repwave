/** Shared purple UI tokens for إدارة الخزائن */

export function getSafeSubTabClasses(isActive) {
  return [
    "group relative flex-1 min-w-0 py-2.5 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold rounded-xl",
    "transition-all duration-300 flex items-center justify-center gap-1.5 sm:gap-2 focus:outline-none",
    isActive
      ? "bg-gradient-to-l from-[#8B5FD6] to-[#6B45B0] text-white shadow-lg shadow-[#8B5FD6]/30"
      : "text-gray-600 bg-white border border-[#EDE7FF] hover:text-[#8B5FD6] hover:bg-[#F8F5FF] hover:border-[#C4A8F0] hover:shadow-sm",
  ].join(" ");
}

export const safePrimaryBtnClass =
  "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-l from-[#8B5FD6] to-[#6B45B0] hover:from-[#7A52C2] hover:to-[#5A3A9E] shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";

export const safePageIconClass = "h-8 w-8 text-[#8B5FD6]";

export const safePageWrapperClass = "py-4 sm:py-6 space-y-4 sm:space-y-6";

export const safeIdBadgeClass =
  "text-sm font-mono text-[#7A52C2] bg-[#EDE7FF] px-2.5 py-1 rounded-lg border border-[#C4A8F0]/30";
