import React from "react";
import {
  settingsSectionClass,
  settingsSectionHeaderClass,
  settingsSectionTitleClass,
  settingsSectionSubtitleClass,
  settingsSectionBodyClass,
  settingsFieldCardClass,
  settingsLabelClass,
  settingsHintClass,
  settingsSecondaryBtnClass,
  settingsPrimaryBtnClass,
  settingsDangerBtnClass,
} from "./settingsUi.js";

export function SettingsSection({ title, subtitle, icon: Icon, children }) {
  return (
    <section className={settingsSectionClass}>
      {(title || subtitle) && (
        <div className={settingsSectionHeaderClass}>
          {Icon && (
            <div className="p-2 rounded-xl bg-[#EDE7FF] shrink-0">
              <Icon className="h-5 w-5 text-[#8B5FD6]" />
            </div>
          )}
          <div className="min-w-0">
            {title && <h2 className={settingsSectionTitleClass}>{title}</h2>}
            {subtitle && <p className={settingsSectionSubtitleClass}>{subtitle}</p>}
          </div>
        </div>
      )}
      <div className={settingsSectionBodyClass}>{children}</div>
    </section>
  );
}

export function SettingsFieldCard({ children, className = "" }) {
  return (
    <div className={`${settingsFieldCardClass} ${className}`.trim()}>{children}</div>
  );
}

export function SettingsLabel({ htmlFor, children }) {
  return (
    <label htmlFor={htmlFor} className={settingsLabelClass}>
      {children}
    </label>
  );
}

export function SettingsHint({ children }) {
  if (!children) return null;
  return <p className={settingsHintClass}>{children}</p>;
}

export function SettingsCard({
  title,
  subtitle,
  icon,
  children,
  refreshing,
  onRefresh,
}) {
  return (
    <div className={settingsSectionClass}>
      <div className={`${settingsSectionHeaderClass} justify-between`}>
        <div className="flex items-start gap-3 min-w-0">
          {icon && (
            <div className="p-2 rounded-xl bg-[#EDE7FF] text-[#8B5FD6] shrink-0">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            {title && <h3 className={settingsSectionTitleClass}>{title}</h3>}
            {subtitle && <p className={settingsSectionSubtitleClass}>{subtitle}</p>}
          </div>
        </div>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className={settingsSecondaryBtnClass}
          >
            {refreshing ? "جاري..." : "تحديث"}
          </button>
        )}
      </div>
      <div className={settingsSectionBodyClass}>{children}</div>
    </div>
  );
}

export { settingsSecondaryBtnClass, settingsPrimaryBtnClass, settingsDangerBtnClass };
