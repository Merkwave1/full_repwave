/** Shared purple UI tokens for صفحة الإعدادات */

export function getSettingsSubTabClasses(isActive) {
  return [
    "group relative flex-1 min-w-0 py-2.5 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold rounded-xl",
    "transition-all duration-300 flex items-center justify-center gap-1.5 sm:gap-2 focus:outline-none",
    isActive
      ? "bg-gradient-to-l from-[#8B5FD6] to-[#6B45B0] text-white shadow-lg shadow-[#8B5FD6]/30"
      : "text-gray-600 bg-white border border-[#EDE7FF] hover:text-[#8B5FD6] hover:bg-[#F8F5FF] hover:border-[#C4A8F0] hover:shadow-sm",
  ].join(" ");
}

export const settingsPrimaryBtnClass =
  "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-l from-[#8B5FD6] to-[#6B45B0] hover:from-[#7A52C2] hover:to-[#5A3A9E] shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";

export const settingsSecondaryBtnClass =
  "inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-[#8B5FD6] bg-[#F8F5FF] border border-[#EDE7FF] hover:bg-[#EDE7FF] hover:border-[#C4A8F0] transition-all disabled:opacity-50";

export const settingsDangerBtnClass =
  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-red-600 bg-red-50 border border-red-100 hover:bg-red-100 transition-colors";

export const settingsPageWrapperClass =
  "min-h-full w-full bg-[#FAFAFE] sm:-mx-2 md:-mx-4";

export const settingsContentClass = "px-3 sm:px-4 py-4 sm:py-6 w-full";

export const settingsSectionClass =
  "bg-white rounded-2xl border border-[#EDE7FF] shadow-sm overflow-hidden";

export const settingsSectionHeaderClass =
  "flex items-center gap-3 px-4 sm:px-6 py-4 bg-gradient-to-l from-[#F8F5FF] to-white border-b border-[#EDE7FF]";

export const settingsSectionTitleClass = "text-base sm:text-lg font-bold text-[#2D1B69]";

export const settingsSectionSubtitleClass = "text-xs sm:text-sm text-gray-500 mt-0.5";

export const settingsSectionBodyClass = "p-4 sm:p-6";

/** Vertical stack for fields and sections */
export const settingsFieldsStackClass = "flex flex-col gap-4 w-full";

export const settingsSectionsStackClass = "flex flex-col gap-6 w-full";

export const settingsFieldCardClass =
  "bg-[#FAFAFE] rounded-xl border border-[#EDE7FF] p-4 hover:border-[#C4A8F0] hover:shadow-sm transition-all duration-200";

export const settingsLabelClass =
  "block text-sm font-semibold text-[#2D1B69] mb-2 text-right";

export const settingsHintClass = "text-xs text-gray-500 mt-1.5 leading-relaxed";

export const settingsInputClass =
  "w-full px-3 py-2.5 text-sm border border-[#EDE7FF] rounded-xl bg-white text-[#2D1B69] placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-[#8B5FD6]/25 focus:border-[#8B5FD6] hover:border-[#C4A8F0] transition-colors disabled:bg-[#F3F0FF] disabled:text-gray-400 disabled:cursor-not-allowed";

export const settingsSelectClass = settingsInputClass;

export const settingsTextareaClass =
  "w-full resize-y min-h-[100px] px-3 py-2.5 text-sm border border-[#EDE7FF] rounded-xl bg-white text-[#2D1B69] placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-[#8B5FD6]/25 focus:border-[#8B5FD6] hover:border-[#C4A8F0] transition-colors";

export const settingsBooleanCardClass =
  "flex items-center justify-between gap-4 p-4 rounded-xl border border-[#EDE7FF] bg-gradient-to-l from-[#FAFAFE] to-white";

export const settingsSearchInputClass =
  "w-full pr-9 pl-3 py-2.5 text-sm border border-[#EDE7FF] rounded-xl bg-[#FAFAFE] text-[#2D1B69] outline-none focus:ring-2 focus:ring-[#8B5FD6]/25 focus:border-[#8B5FD6]";

export const settingsTableWrapClass =
  "overflow-hidden rounded-xl border border-[#EDE7FF] bg-white";

export const settingsListItemClass =
  "p-3 bg-[#FAFAFE] border border-[#EDE7FF] rounded-xl hover:border-[#C4A8F0] transition-colors";

export const settingsEmptyClass =
  "text-center py-16 border-2 border-dashed border-[#EDE7FF] rounded-2xl bg-white";

export const settingsPendingBoxClass =
  "bg-[#F8F5FF] border border-[#C4A8F0] rounded-2xl p-4 shadow-sm";

export const settingsFileInputClass =
  "block w-full text-sm text-[#2D1B69] file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-[#EDE7FF] file:text-[#7A52C2] hover:file:bg-[#C4A8F0] hover:file:text-white cursor-pointer";

export const settingsLogoPreviewClass =
  "w-32 h-32 border-2 border-dashed border-[#C4A8F0] rounded-2xl overflow-hidden bg-[#F8F5FF] flex items-center justify-center";

export const SETTINGS_TAB_META = {
  company: {
    title: "معلومات الشركة",
    subtitle: "الهوية، التواصل، والموقع على الخريطة",
  },
  financial: {
    title: "الإعدادات المالية",
    subtitle: "العملة، الضرائب، وحدود الائتمان",
  },
  inventory: {
    title: "إدارة المخزون",
    subtitle: "حدود التنبيه وقواعد المخزون",
  },
  client: {
    title: "تصنيفات العملاء",
    subtitle: "المناطق، الصناعات، وأنواع العملاء",
  },
  location: {
    title: "إدارة المناطق",
    subtitle: "الدول والمحافظات",
  },
  odoo: {
    title: "التكامل مع Odoo",
    subtitle: "ربط النظام مع Odoo ERP",
  },
};

/** Sub-sections within each settings tab — title, description, and field keys */
export const SETTINGS_SECTION_GROUPS = {
  company: [
    {
      id: "identity",
      title: "الهوية والعلامة التجارية",
      subtitle: "اسم الشركة، الشعار، والوصف المعروض في النظام",
      keys: ["company_logo", "company_name", "company_description"],
    },
    {
      id: "contact",
      title: "بيانات التواصل",
      subtitle: "الموقع الإلكتروني، البريد الإلكتروني، ورقم الهاتف",
      keys: ["company_website", "company_email", "company_phone"],
    },
    {
      id: "legal",
      title: "العنوان والسجل التجاري",
      subtitle: "عنوان الشركة، السجل التجاري، ورقم ضريبة القيمة المضافة",
      keys: ["company_address", "company_commercial_register", "company_vat_number"],
    },
    {
      id: "location",
      title: "الموقع الجغرافي",
      subtitle: "الصق رابط Google Maps لموقع الشركة",
      type: "map",
      keys: ["company_lat", "company_lng"],
    },
    {
      id: "regional",
      title: "البلد والعملة",
      subtitle: "البلد الافتراضي وعملة الشركة في الفواتير والمعاملات",
      keys: ["company_country", "company_currency"],
    },
  ],
  financial: [
    {
      id: "currency",
      title: "العملة والتنسيق",
      subtitle: "العملة الافتراضية، الرمز، وعدد الخانات العشرية",
      keys: ["default_currency", "currency_symbol", "decimal_places"],
    },
    {
      id: "tax_credit",
      title: "الضرائب والائتمان",
      subtitle: "معدل الضريبة الافتراضي والحد الائتماني للعملاء الجدد",
      keys: ["tax_rate", "defult_client_credit_limit"],
    },
    {
      id: "payment",
      title: "شروط الدفع",
      subtitle: "مدة السماح للسداد بالأيام في الفواتير والطلبات",
      keys: ["payment_terms_days"],
    },
  ],
  inventory: [
    {
      id: "thresholds",
      title: "حدود التنبيه",
      subtitle: "تنبيهات المخزون المنخفض، النفاد، واقتراب تاريخ الانتهاء",
      keys: ["low_stock_threshold", "out_of_stock_threshold", "max_expiry_days_threshold"],
    },
    {
      id: "rules",
      title: "قواعد المخزون",
      subtitle: "البيع تحت الصفر، تتبع الدفعات، وإعادة الطلب التلقائي",
      keys: ["allow_negative_inventory", "require_batch_tracking", "auto_reorder_enabled"],
    },
  ],
  odoo: [
    {
      id: "connection",
      title: "إعدادات الاتصال",
      subtitle: "عنوان Odoo، قاعدة البيانات، وبيانات الدخول",
    },
    {
      id: "import",
      title: "استيراد البيانات",
      subtitle: "استيراد العملاء والمنتجات من Odoo إلى النظام",
    },
    {
      id: "notes",
      title: "ملاحظات مهمة",
      subtitle: "إرشادات الأمان والتفعيل قبل ربط النظام",
    },
  ],
};
