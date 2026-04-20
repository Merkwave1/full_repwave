import React from "react";

const accentMap = {
  blue: "text-blue-600 bg-blue-100",
  emerald: "text-emerald-600 bg-emerald-100",
  amber: "text-amber-600 bg-amber-100",
  rose: "text-rose-600 bg-rose-100",
  violet: "text-violet-600 bg-violet-100",
  slate: "text-slate-600 bg-slate-200",
};

export default function CustomPageHeader({
  title,
  subtitle,
  icon,
  statValue,
  statLabel,
  statSecondaryValue,
  statSecondaryLabel,
  actionButton,
  color = "blue",
}) {
  const actionButtons = Array.isArray(actionButton)
    ? actionButton
    : actionButton
      ? [actionButton]
      : [];

  const accent = accentMap[color] || accentMap.amber;

  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-3 sm:p-5 md:p-6 mb-4 md:mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-5">
        {/* Left side: icon + title */}
        <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
          <div className={`p-2 sm:p-3 rounded-xl shrink-0 ${accent}`}>
            {icon}
          </div>

          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl md:text-3xl font-semibold text-gray-900 tracking-tight truncate">
              {title}
            </h1>
            <p className="text-gray-500 text-xs sm:text-sm mt-0.5 sm:mt-1 truncate">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Right side: actions + stats */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {actionButtons.map((btn, i) => (
            <div
              key={i}
              className="[&_button]:!text-xs [&_button]:!px-2.5 [&_button]:!py-1.5 sm:[&_button]:!text-sm sm:[&_button]:!px-4 sm:[&_button]:!py-2"
            >
              {btn}
            </div>
          ))}

          {statSecondaryValue !== undefined && (
            <div className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-gray-50 border border-gray-200 text-center">
              <div className="text-base sm:text-lg font-semibold text-gray-900">
                {statSecondaryValue}
              </div>
              <div className="text-[10px] sm:text-xs text-gray-500">
                {statSecondaryLabel}
              </div>
            </div>
          )}

          {statValue !== undefined && (
            <div className="px-3 py-1.5 sm:px-5 sm:py-2 rounded-xl bg-gray-900 text-white shadow-sm text-center">
              <div className="text-lg sm:text-2xl font-bold leading-tight">
                {statValue}
              </div>
              <div className="text-[10px] sm:text-xs opacity-80">
                {statLabel}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
