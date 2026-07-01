// src/components/dashboard/tabs/settings/SettingsTab.jsx
// This component represents the content for the "Settings" tab within the Dashboard.
// It provides a tabbed interface to manage all system settings.
import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Cog6ToothIcon,
  BuildingOffice2Icon,
  BanknotesIcon,
  CubeIcon,
  UserGroupIcon,
  MapIcon,
  LinkIcon,
} from '@heroicons/react/24/outline';
import { getAppSettingsCategorized } from '../../../../apis/auth.js';
import { updateMultipleSettings, createSetting } from '../../../../apis/settings.js';
import { isOdooIntegrationEnabled } from '../../../../utils/odooIntegration.js';
import Loader from '../../../common/Loader/Loader.jsx';
import Alert from '../../../common/Alert/Alert.jsx';
import NumberInput from '../../../common/NumberInput/NumberInput.jsx';
import ClientTaxonomiesSettings from './components/ClientTaxonomiesSettings.jsx';
import LocationManagement from './components/LocationManagement.jsx';
import OdooIntegrationSettings from './components/OdooIntegrationSettings.jsx';
import GoogleMapsLocationField from '../../../common/GoogleMapsLocationField/GoogleMapsLocationField.jsx';
import {
  SettingsSection,
  SettingsFieldCard,
  SettingsLabel,
  SettingsHint,
} from './SettingsFormField.jsx';
import {
  getSettingsSubTabClasses,
  settingsPageWrapperClass,
  settingsContentClass,
  settingsInputClass,
  settingsSelectClass,
  settingsTextareaClass,
  settingsBooleanCardClass,
  settingsFileInputClass,
  settingsLogoPreviewClass,
  settingsEmptyClass,
  settingsPendingBoxClass,
  SETTINGS_TAB_META,
  SETTINGS_SECTION_GROUPS,
  settingsFieldsStackClass,
  settingsSectionsStackClass,
} from './settingsUi.js';

function SettingsTab() {
  const location = useLocation();
  const lastRefetchPathRef = useRef(null);
  const [activeTab, setActiveTab] = useState('company');
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [changedSettings, setChangedSettings] = useState({});
  const [odooEnabled, setOdooEnabled] = useState(false);

  // Check Odoo integration status on mount
  useEffect(() => {
    setOdooEnabled(isOdooIntegrationEnabled());
  }, []);

  // Settings tabs configuration - conditionally include Odoo tab
  const settingsTabs = [
    { key: 'company', label: 'معلومات الشركة', icon: BuildingOffice2Icon, desc: 'بيانات وهوية الشركة' },
    { key: 'financial', label: 'الإعدادات المالية', icon: BanknotesIcon, desc: 'الضرائب والعملة والفوترة' },
    { key: 'inventory', label: 'إدارة المخزون', icon: CubeIcon, desc: 'التنبيهات وحدود المخزون' },
    { key: 'client', label: 'إدارة العملاء', icon: UserGroupIcon, desc: 'تصنيفات ووسوم العملاء' },
    { key: 'location', label: 'إدارة المناطق', icon: MapIcon, desc: 'الدول والمحافظات' },
    ...(odooEnabled
      ? [{ key: 'odoo', label: 'التكامل مع Odoo', icon: LinkIcon, desc: 'ربط النظام مع Odoo ERP' }]
      : []),
  ];

  useEffect(() => {
    // Initial fetch (cached or fresh)
    fetchSettings();
  }, []);

  // Refetch (force) whenever user lands on the base settings route explicitly
  useEffect(() => {
    const path = location.pathname.replace(/\/$/, '');
    if (path === '/dashboard/settings' && lastRefetchPathRef.current !== path) {
      lastRefetchPathRef.current = path;
      fetchSettings(true); // force refresh ignoring local cache
    }
  }, [location.pathname]);

  const fetchSettings = async (forceRefresh = false) => {
    try {
      setLoading(true);
      const categorizedSettings = await getAppSettingsCategorized(forceRefresh);
      setSettings(categorizedSettings);
    } catch (error) {
      console.error('Error fetching settings:', error);
      setMessage({ type: 'error', text: 'فشل في تحميل الإعدادات: ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (settingKey, newValue) => {
    setChangedSettings(prev => ({
      ...prev,
      [settingKey]: newValue
    }));
  };

  const handleSaveSettings = async () => {
    if (Object.keys(changedSettings).length === 0) {
      setMessage({ type: 'warning', text: 'لا توجد تغييرات للحفظ' });
      return;
    }

    try {
      setSaving(true);
      
      // Separate logo file from other settings
      const logoFile = changedSettings['company_logo'];
      const isLogoFile = logoFile instanceof File;
      const otherSettings = { ...changedSettings };
      
      if (isLogoFile) {
        delete otherSettings['company_logo'];
      }
      
      // 1) Ensure all keys exist; create any missing ones first
      const existingKeys = new Set();
      Object.values(settings).forEach(categoryArr => {
        if (Array.isArray(categoryArr)) {
          categoryArr.forEach(s => existingKeys.add(s.settings_key));
        }
      });
      const missingKeys = Object.keys(otherSettings).filter(k => !existingKeys.has(k));
      if (missingKeys.length > 0) {
        const typeMap = {
          low_stock_threshold: 'integer',
          out_of_stock_threshold: 'integer',
          company_country: 'string',
          company_currency: 'string'
        };
        const descMap = {
          low_stock_threshold: 'حد التنبيه للمخزون المنخفض',
          out_of_stock_threshold: 'حد نفاد المخزون',
          company_country: 'بلد الشركة',
          company_currency: 'العملة الافتراضية للشركة'
        };
        await Promise.all(
          missingKeys.map(key =>
            createSetting(
              key,
              otherSettings[key] ?? '',
              descMap[key] || key,
              typeMap[key] || 'string'
            )
          )
        );
      }

      // 2) Update other settings (non-file settings)
      if (Object.keys(otherSettings).length > 0) {
        await updateMultipleSettings(otherSettings);
      }
      
      // 3) Handle logo file upload separately if present
      if (isLogoFile) {
        await updateMultipleSettings({ company_logo: logoFile });
      }

      // 4) Immediately update the local state with changed values
      const updatedSettings = { ...settings };
      Object.entries(changedSettings).forEach(([key, value]) => {
        // For logo file, we'll get the URL from the server response
        const displayValue = (key === 'company_logo' && value instanceof File) ? '' : value;
        
        // Find and update the setting in the appropriate category
        for (const categoryKey of Object.keys(updatedSettings)) {
          const categorySettings = updatedSettings[categoryKey];
          const settingIndex = categorySettings.findIndex(s => s.settings_key === key);
          if (settingIndex !== -1) {
            updatedSettings[categoryKey][settingIndex].settings_value = displayValue;
            break;
          }
        }
        // If not found in any category (newly created), push into inventory category by convention
        const found = Object.keys(updatedSettings).some(cat => updatedSettings[cat].some(s => s.settings_key === key));
        if (!found) {
          if (!updatedSettings.inventory) updatedSettings.inventory = [];
          updatedSettings.inventory.push({
            settings_key: key,
            settings_value: displayValue,
            settings_type: (key === 'low_stock_threshold' || key === 'out_of_stock_threshold') ? 'integer' : 'string',
            settings_description: key === 'low_stock_threshold' ? 'حد التنبيه للمخزون المنخفض' : (key === 'out_of_stock_threshold' ? 'حد نفاد المخزون' : key)
          });
        }
      });
      setSettings(updatedSettings);
      setChangedSettings({});

      // Clear the cache to ensure fresh data is fetched next time
      localStorage.removeItem('appSettings');
      localStorage.removeItem('appSettingsCategorized');

      // Dispatch settings-updated event for dynamic currency updates
      window.dispatchEvent(new CustomEvent('settings-updated'));

      // Also refresh in background to sync with server
      fetchSettings(true);
      
      setMessage({ type: 'success', text: 'تم حفظ الإعدادات بنجاح' });
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ type: 'error', text: 'فشل في حفظ الإعدادات: ' + error.message });
    } finally {
      setSaving(false);
    }
  };

  const getSettingValue = (settingKey) => {
    return changedSettings[settingKey] !== undefined 
      ? changedSettings[settingKey] 
      : getOriginalSettingValue(settingKey);
  };

  const getOriginalSettingValue = (settingKey) => {
    // Search through all categories for the setting
    for (const category of Object.values(settings)) {
      const setting = category.find(s => s.settings_key === settingKey);
      if (setting) {
        return setting.settings_value;
      }
    }
    return '';
  };

  const renderSettingField = (setting) => {
    const { settings_key, settings_type, settings_description } = setting;
    const value = getSettingValue(settings_key);
  const disabledKeys = new Set(['expiration_date', 'users_limits']);
  const isDisabled = disabledKeys.has(settings_key);
    const numericFieldConfig = {
      defult_client_credit_limit: { min: 0 }
    };
    const fieldConfig = numericFieldConfig[settings_key] || {};

    // Special handling for country dropdown
    if (settings_key === 'company_country') {
      const countries = [
        { value: 'EG', label: 'مصر' },
        { value: 'SA', label: 'السعودية' },
        { value: 'AE', label: 'الإمارات العربية المتحدة' },
        { value: 'KW', label: 'الكويت' },
        { value: 'QA', label: 'قطر' },
        { value: 'BH', label: 'البحرين' },
        { value: 'OM', label: 'عمان' },
        { value: 'JO', label: 'الأردن' },
        { value: 'LB', label: 'لبنان' },
        { value: 'SY', label: 'سوريا' },
        { value: 'IQ', label: 'العراق' },
        { value: 'YE', label: 'اليمن' },
        { value: 'MA', label: 'المغرب' },
        { value: 'DZ', label: 'الجزائر' },
        { value: 'TN', label: 'تونس' },
        { value: 'LY', label: 'ليبيا' },
        { value: 'SD', label: 'السودان' },
      ];

      return (
        <div key={settings_key}>
          <SettingsLabel>{getSettingDisplayName(settings_key)}</SettingsLabel>
          <select
            value={value || 'EG'}
            onChange={(e) => handleSettingChange(settings_key, e.target.value)}
            className={settingsSelectClass}
          >
            <option value="">اختر البلد</option>
            {countries.map(country => (
              <option key={country.value} value={country.value}>
                {country.label}
              </option>
            ))}
          </select>
        </div>
      );
    }

    // Special handling for currency dropdown
    if (settings_key === 'company_currency') {
      const currencies = [
        { value: 'EGP', label: 'جنيه مصري (EGP)', symbol: 'ج.م' },
        { value: 'SAR', label: 'ريال سعودي (SAR)', symbol: 'ر.س' },
        { value: 'AED', label: 'درهم إماراتي (AED)', symbol: 'د.إ' },
        { value: 'KWD', label: 'دينار كويتي (KWD)', symbol: 'د.ك' },
        { value: 'QAR', label: 'ريال قطري (QAR)', symbol: 'ر.ق' },
        { value: 'BHD', label: 'دينار بحريني (BHD)', symbol: 'د.ب' },
        { value: 'OMR', label: 'ريال عماني (OMR)', symbol: 'ر.ع' },
        { value: 'JOD', label: 'دينار أردني (JOD)', symbol: 'د.أ' },
        { value: 'LBP', label: 'ليرة لبنانية (LBP)', symbol: 'ل.ل' },
        { value: 'USD', label: 'دولار أمريكي (USD)', symbol: '$' },
        { value: 'EUR', label: 'يورو (EUR)', symbol: '€' },
      ];

      return (
        <div key={settings_key}>
          <SettingsLabel>{getSettingDisplayName(settings_key)}</SettingsLabel>
          <select
            value={value || 'EGP'}
            onChange={(e) => handleSettingChange(settings_key, e.target.value)}
            className={settingsSelectClass}
          >
            <option value="">اختر العملة</option>
            {currencies.map(currency => (
              <option key={currency.value} value={currency.value}>
                {currency.label}
              </option>
            ))}
          </select>
        </div>
      );
    }

    // Allow custom input for default currency
    if (settings_key === 'default_currency') {
      return (
        <div key={settings_key}>
          <SettingsLabel>{getSettingDisplayName(settings_key)}</SettingsLabel>
          <input
            type="text"
            value={value || ''}
            onChange={(e) => handleSettingChange(settings_key, e.target.value)}
            placeholder="اكتب العملة الافتراضية (مثل: جنيه مصري، ريال سعودي، دولار أمريكي...)"
            disabled={isDisabled}
            className={settingsInputClass}
            dir="rtl"
          />
        </div>
      );
    }

    // Allow custom input for currency symbol
    if (settings_key === 'currency_symbol') {
      return (
        <div key={settings_key}>
          <SettingsLabel>{getSettingDisplayName(settings_key)}</SettingsLabel>
          <input
            type="text"
            value={value || ''}
            onChange={(e) => handleSettingChange(settings_key, e.target.value)}
            placeholder="اكتب رمز العملة (مثل: ج.م، ر.س، $، €...)"
            disabled={isDisabled}
            className={settingsInputClass}
            dir="rtl"
          />
        </div>
      );
    }

    switch (settings_type) {
      case 'boolean':
        return (
          <div key={settings_key} className={settingsBooleanCardClass}>
            <div className="flex-1 min-w-0">
              <SettingsLabel>{getSettingDisplayName(settings_key)}</SettingsLabel>
              <SettingsHint>{settings_description || getSettingDescription(settings_key)}</SettingsHint>
            </div>
            <select
              value={value}
              onChange={(e) => !isDisabled && handleSettingChange(settings_key, e.target.value)}
              disabled={isDisabled}
              className={`${settingsSelectClass} !w-auto min-w-[120px] ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <option value="true">مفعل</option>
              <option value="false">غير مفعل</option>
            </select>
          </div>
        );

      case 'integer':
      case 'decimal':
        return (
          <div key={settings_key}>
            <SettingsLabel>{getSettingDisplayName(settings_key)}</SettingsLabel>
            <div className="relative">
              <NumberInput
                value={value}
                onChange={(val) => !isDisabled && handleSettingChange(settings_key, val)}
                placeholder={settings_description || getSettingDescription(settings_key)}
                disabled={isDisabled}
                min={fieldConfig.min}
                max={fieldConfig.max}
                className="!p-2.5 !border-[#EDE7FF] !rounded-xl focus:!ring-[#8B5FD6]/25 focus:!border-[#8B5FD6]"
              />
              {isDisabled && (
                <div className="absolute inset-0 bg-[#F3F0FF]/60 cursor-not-allowed rounded-xl" title="غير قابل للتعديل" />
              )}
            </div>
            {isDisabled && <SettingsHint>هذا الحقل يُدار من قبل النظام ولا يمكن تعديله.</SettingsHint>}
          </div>
        );

      case 'datetime':
        return (
          <div key={settings_key}>
            <SettingsLabel>{getSettingDisplayName(settings_key)}</SettingsLabel>
            <input
              type="datetime-local"
              value={value ? value.slice(0, 16) : ''}
              onChange={(e) => !isDisabled && handleSettingChange(settings_key, e.target.value)}
              placeholder={settings_description || getSettingDescription(settings_key)}
              disabled={isDisabled}
              className={settingsInputClass}
            />
            {isDisabled && <SettingsHint>تاريخ الانتهاء يتم تحديده بواسطة الاشتراك.</SettingsHint>}
          </div>
        );

      default:
        return (
          <div key={settings_key}>
            <SettingsLabel>{getSettingDisplayName(settings_key)}</SettingsLabel>
            <input
              type="text"
              value={value}
              onChange={(e) => !isDisabled && handleSettingChange(settings_key, e.target.value)}
              placeholder={settings_description || getSettingDescription(settings_key)}
              disabled={isDisabled}
              className={settingsInputClass}
              dir="rtl"
            />
            {isDisabled && <SettingsHint>هذا الحقل للعرض فقط.</SettingsHint>}
          </div>
        );
    }
  };

  const getSettingDisplayName = (key) => {
    const nameMap = {
      // Company & Business Information
      'company_name': 'اسم الشركة',
      'company_logo': 'شعار الشركة',
      'company_address': 'عنوان الشركة',
      'company_phone': 'هاتف الشركة',
      'company_email': 'بريد الشركة الإلكتروني',
      'company_website': 'موقع الشركة',
      'company_vat_number': 'رقم ضريبة القيمة المضافة',
      'company_commercial_register': 'السجل التجاري',
      'company_description': 'وصف الشركة',
      'company_country': 'البلد',
      'company_currency': 'العملة',
      
      // System Licensing & Limits
      'users_limits': 'حد عدد المستخدمين',
      'expiration_date': 'تاريخ انتهاء الصلاحية',
      'clients_limit': 'حد عدد العملاء',
      'products_limit': 'حد عدد المنتجات',
      'warehouses_limit': 'حد عدد المستودعات',
      
      // Financial & Currency Settings
      'default_currency': 'العملة الافتراضية',
      'currency_symbol': 'رمز العملة',
      'decimal_places': 'عدد الخانات العشرية',
      'tax_rate': 'معدل الضريبة',
  'defult_client_credit_limit': 'الحد الائتماني الافتراضي للعميل',
      'payment_terms_days': 'شروط الدفع (أيام)',
      
      // System Configuration
      'timezone': 'المنطقة الزمنية',
      'date_format': 'تنسيق التاريخ',
      'time_format': 'تنسيق الوقت',
      'language': 'اللغة',
      'fiscal_year_start': 'بداية السنة المالية',
      
      // Document Numbering & Prefixes
      'order_prefix': 'بادئة رقم الطلب',
      'invoice_prefix': 'بادئة رقم الفاتورة',
      'purchase_order_prefix': 'بادئة أمر الشراء',
      'payment_receipt_prefix': 'بادئة إيصال الدفع',
      'return_prefix': 'بادئة رقم المرتجع',
      'transfer_prefix': 'بادئة رقم التحويل',
      'expense_prefix': 'بادئة رقم المصروف',
      'collection_prefix': 'بادئة رقم التحصيل',
      
      // Inventory & Stock Management
      'low_stock_threshold': 'حد التنبيه للمخزون المنخفض',
  'out_of_stock_threshold': 'حد نفاد المخزون',
      'allow_negative_inventory': 'السماح بالبيع تحت الصفر',
      'require_batch_tracking': 'إلزام تتبع الدفعات',
      'auto_reorder_enabled': 'تفعيل إعادة الطلب التلقائي',
      'reorder_point_default': 'نقطة إعادة الطلب الافتراضية',
      'max_expiry_days_threshold': 'أيام التنبيه للانتهاء',
      
      // Business Rules & Approvals
      'auto_approve_orders': 'الموافقة التلقائية على الطلبات',
      'auto_approve_threshold': 'حد الموافقة التلقائية',
      'credit_limit_check': 'فحص حد الائتمان',
      'require_visit_for_order': 'إلزام الزيارة لإنشاء الطلب',
      'order_confirmation_required': 'إلزام تأكيد الطلب',
      'invoice_auto_generate': 'إنشاء الفواتير تلقائياً',
      'return_approval_required': 'إلزام موافقة المرتجعات',
      'max_discount_percentage': 'أقصى نسبة خصم مسموحة',
      
      // Mobile App & GPS Settings
      'gps_tracking_enabled': 'تفعيل تتبع الموقع',
      'visit_radius_meters': 'نطاق القرب للزيارة (متر)',
      'offline_sync_interval': 'فترة المزامنة (دقائق)',
      'max_photo_size_mb': 'حد حجم الصورة (ميجابايت)',
      'visit_photo_required': 'إلزام الصور في الزيارات',
      'location_update_interval': 'فترة تحديث الموقع (ثانية)',
      'require_check_in_photo': 'إلزام صورة عند الدخول',
      'require_check_out_photo': 'إلزام صورة عند الخروج',
      
      // Visit Management
      'visit_duration_limit_hours': 'حد مدة الزيارة (ساعات)',
      'daily_visit_limit': 'حد الزيارات اليومي',
      'visit_notes_required': 'إلزام ملاحظات الزيارة',
      'visit_outcome_required': 'إلزام نتيجة الزيارة',
      'client_visit_frequency_days': 'دورية زيارة العميل (أيام)',
      'auto_schedule_visits': 'جدولة الزيارات تلقائياً',
      
      // Safe & Financial Management
      'expense_approval_threshold': 'حد موافقة المصروفات',
      'safe_balance_alert_threshold': 'حد تنبيه رصيد الخزينة',
      'collection_deposit_required': 'إلزام إيداع التحصيلات',
      'daily_closing_required': 'إلزام الإقفال اليومي',
      'safe_transfer_approval_required': 'إلزام موافقة تحويل الخزينة',
      
      // Warehouse & Transfers
      'transfer_approval_required': 'إلزام موافقة التحويلات',
      'goods_receipt_approval': 'موافقة استلام البضائع',
      'inventory_adjustment_approval': 'موافقة تعديل المخزون',
      'inter_warehouse_transfer_enabled': 'تفعيل التحويل بين المستودعات',
      'van_to_main_transfer_required': 'إلزام تحويل السيارة للمستودع',
      
      // Client Management
      'client_credit_check_enabled': 'فحص ائتمان العملاء',
      'client_auto_approval': 'الموافقة التلقائية على العملاء',
      'require_client_documents': 'إلزام مستندات العملاء',
      'client_balance_alert_enabled': 'تنبيه رصيد العميل',
      'overdue_payment_alert_days': 'أيام تنبيه المتأخرات',
      
      // Notifications & Communications
      'email_notifications': 'الإشعارات بالبريد الإلكتروني',
      'sms_notifications': 'الإشعارات بالرسائل النصية',
      'push_notifications': 'الإشعارات المباشرة',
      'admin_email': 'بريد المشرف الإلكتروني',
      'notification_low_stock': 'تنبيه المخزون المنخفض',
      'notification_overdue_payments': 'تنبيه المتأخرات',
      'notification_visit_reminders': 'تذكير الزيارات',
      'notification_order_updates': 'تحديثات الطلبات',
      
      // Security & Access Control
      'session_timeout_minutes': 'انتهاء الجلسة (دقائق)',
      'password_min_length': 'أقل طول لكلمة المرور',
      'max_login_attempts': 'أقصى محاولات دخول',
      'lockout_duration_minutes': 'مدة الحظر (دقائق)',
      'require_password_change': 'إلزام تغيير كلمة المرور',
      'two_factor_authentication': 'المصادقة الثنائية',
      
      // Backup & Maintenance
      'backup_frequency_days': 'دورية النسخ الاحتياطي (أيام)',
      'auto_backup_enabled': 'تفعيل النسخ التلقائي',
      'maintenance_mode': 'وضع الصيانة',
      'data_retention_months': 'فترة حفظ البيانات (شهور)',
      
      // Reports & Analytics
      'default_report_period': 'فترة التقرير الافتراضية (أيام)',
      'enable_advanced_analytics': 'تفعيل التحليلات المتقدمة',
      'dashboard_refresh_interval': 'فترة تحديث اللوحة (ثانية)',
      'sales_report_auto_email': 'إرسال تقارير المبيعات تلقائياً',
      
      // Product & Packaging
      'default_expiry_days': 'فترة الانتهاء الافتراضية (أيام)',
      'barcode_generation_enabled': 'تفعيل إنشاء الباركود',
      'require_product_images': 'إلزام صور المنتجات',
      'variant_auto_create': 'إنشاء المتغيرات تلقائياً',
      
      // UI/UX Settings
      'items_per_page': 'عدد العناصر في الصفحة',
      'theme_color_primary': 'اللون الأساسي',
      'theme_color_secondary': 'اللون الثانوي',
      'show_help_tooltips': 'إظهار نصائح المساعدة',
      'default_language_mobile': 'اللغة الافتراضية للجوال',
      
      // Integration & API
      'api_rate_limit_per_minute': 'حد استدعاءات API (دقيقة)',
      'webhook_enabled': 'تفعيل الويب هوك',
      'external_integration_enabled': 'تفعيل التكامل الخارجي',
      
      // Performance & Optimization
      'cache_enabled': 'تفعيل التخزين المؤقت',
      'cache_duration_minutes': 'مدة التخزين المؤقت (دقائق)',
      'database_optimization_enabled': 'تفعيل تحسين قاعدة البيانات',
      
      // Advanced Business Features
      'multi_warehouse_operations': 'عمليات متعددة المستودعات',
      'representative_commission_enabled': 'تفعيل عمولة المندوبين',
      'supplier_credit_tracking': 'تتبع ائتمان الموردين',
      'seasonal_pricing_enabled': 'تفعيل التسعير الموسمي',
      'loyalty_program_enabled': 'تفعيل برنامج الولاء',
      'route_optimization_enabled': 'تفعيل تحسين المسارات',
      'competitor_price_tracking': 'تتبع أسعار المنافسين',
      'quality_control_enabled': 'تفعيل مراقبة الجودة'
    };
    
    return nameMap[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Human-friendly Arabic descriptions for settings (used when backend description is empty)
  const getSettingDescription = (key) => {
    const descMap = {
      // Company & Business Information
      'company_name': 'الاسم التجاري الكامل المعروض في الفواتير والواقيات',
      'company_logo': 'شعار الشركة المستخدم في الفواتير والتقارير',
      'company_address': 'العنوان البريدي أو المقر الرئيسي للشركة',
      'company_phone': 'رقم الهاتف الرئيسي للتواصل مع الشركة',
      'company_email': 'البريد الإلكتروني الرسمي لاستقبال الرسائل والإشعارات',
      'company_website': 'رابط الموقع الإلكتروني للشركة (إن وجد)',
      'company_vat_number': 'رقم ضريبة القيمة المضافة الخاص بالشركة',
      'company_commercial_register': 'رقم السجل التجاري للشركة',
      'company_description': 'ملخص قصير عن نشاط وهوية الشركة',
      'company_country': 'البلد الافتراضي الذي تعمل فيه الشركة',
      'company_currency': 'العملة الافتراضية المستخدمة في الفواتير والمعاملات',

      // System / Licensing
      'users_limits': 'أقصى عدد للمستخدمين المسموح به حسب رخصتك',
      'expiration_date': 'تاريخ انتهاء الترخيص أو اشتراك الخدمة',

      // Financial
      'default_currency': 'العملة الافتراضية للعرض والحسابات داخل النظام',
      'currency_symbol': 'الرمز الذي يظهر بجانب المبالغ (مثال: ج.م أو $)',
      'decimal_places': 'عدد الخانات العشرية التي سيعرض بها النظام القيم المالية',
      'tax_rate': 'النسبة المئوية لضريبة المبيعات الافتراضية',
  'defult_client_credit_limit': 'الحد الائتماني الافتراضي للعملاء الجدد عند عدم تحديد قيمة',

      // Inventory
      'low_stock_threshold': 'الكمية التي عندها يظهر تنبيه أن المنتج منخفض المخزون',
      'out_of_stock_threshold': 'الكمية التي تعتبر عندها المخزون منتهي',
      'allow_negative_inventory': 'السماح بإنشاء مبيعات عندما تكون الكمية سلبية',

      // Mobile & GPS
      'gps_tracking_enabled': 'تشغيل تتبع الموقع في تطبيق المندوبين',
      'gps_tracking_interval_sec': 'الفاصل الزمني بين تحديثات الموقع (بالثواني)',

      // Notifications
      'email_notifications': 'إرسال إشعارات البريد الإلكتروني للأحداث المهمة',
      'sms_notifications': 'إرسال رسائل نصية عند وجود تنبيهات مهمة',

      // Defaults
      'items_per_page': 'عدد العناصر المعروضة في الصفحات القوائم افتراضياً'
    };

    return descMap[key] || '';
  };

  if (loading) {
    return <Loader />;
  }

  const currentSettings = settings[activeTab] || [];
  const companyOrder = [
    'company_logo',
    'company_name',
    'company_description',
    'company_website',
    'company_email',
    'company_phone',
    'company_address',
    'company_lat',
    'company_lng',
    'company_commercial_register',
    'company_vat_number'
  ];

  const sortedCompanySettings = activeTab === 'company'
    ? [...currentSettings].sort((a, b) => {
        const ia = companyOrder.indexOf(a.settings_key);
        const ib = companyOrder.indexOf(b.settings_key);
        const va = ia === -1 ? 999 : ia;
        const vb = ib === -1 ? 999 : ib;
        return va - vb;
      })
    : currentSettings;

  const handleCompanyLogoFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'الملف المختار ليس صورة' });
      return;
    }
    // Store the file object directly instead of converting to base64
    // We'll upload it when saving settings
    handleSettingChange('company_logo', file);
  };

  const handleCompanyMapChange = (lat, lng) => {
    handleSettingChange('company_lat', lat ? String(lat) : '');
    handleSettingChange('company_lng', lng ? String(lng) : '');
  };

  const renderCompanyCustomField = (setting) => {
    const { settings_key, settings_description } = setting;
    const value = getSettingValue(settings_key) || '';

    if (settings_key === 'company_logo') {
      // Handle both File objects and URL strings
      const isFile = value instanceof File;
      const isBase64 = typeof value === 'string' && value.startsWith('data:image');
      const isUrl = typeof value === 'string' && value && !isBase64;
      
      // Create preview URL
      let previewUrl = '';
      if (isFile) {
        previewUrl = URL.createObjectURL(value);
      } else if (typeof value === 'string' && value) {
        previewUrl = value;
      }
      
      return (
        <div key={settings_key} className="w-full">
          <SettingsFieldCard className="h-full">
            <SettingsLabel>شعار الشركة</SettingsLabel>
            <div className="flex flex-col sm:flex-row items-start gap-4 mt-2">
              <div className={settingsLogoPreviewClass}>
                {previewUrl ? (
                  <img src={previewUrl} alt="Company Logo" className="object-contain w-full h-full" />
                ) : (
                  <span className="text-xs text-[#8B5FD6]/60 text-center px-2">لا يوجد شعار</span>
                )}
              </div>
              <div className="flex-1 space-y-3 w-full">
                <input type="file" accept="image/*" onChange={handleCompanyLogoFile} className={settingsFileInputClass} />
                {isFile && (
                  <p className="text-xs text-[#8B5FD6]">تم اختيار صورة جديدة — احفظ الإعدادات لرفعها.</p>
                )}
                {isUrl && !isFile && (
                  <p className="text-xs text-gray-500">الشعار الحالي مخزن على الخادم.</p>
                )}
                {value && (
                  <button
                    type="button"
                    onClick={() => handleSettingChange('company_logo', '')}
                    className="text-xs px-3 py-1.5 rounded-xl bg-red-50 text-red-600 border border-red-100 hover:bg-red-100"
                  >
                    إزالة
                  </button>
                )}
              </div>
            </div>
          </SettingsFieldCard>
        </div>
      );
    }

    if (settings_key === 'company_description') {
      return (
        <div key={settings_key} className="w-full">
          <SettingsFieldCard>
            <SettingsLabel>وصف الشركة</SettingsLabel>
            <textarea
              rows={4}
              className={settingsTextareaClass}
              placeholder={settings_description || 'أدخل وصفاً مختصراً عن الشركة'}
              value={value}
              onChange={(e) => handleSettingChange('company_description', e.target.value)}
            />
          </SettingsFieldCard>
        </div>
      );
    }

    return (
      <div key={settings_key} className="w-full">
        <SettingsFieldCard>{renderSettingField(setting)}</SettingsFieldCard>
      </div>
    );
  };


  const renderCompanyMapSection = () => {
    const latValue =
      changedSettings.company_lat !== undefined
        ? String(changedSettings.company_lat)
        : sortedCompanySettings.find((s) => s.settings_key === 'company_lat')?.settings_value || '';
    const lngValue =
      changedSettings.company_lng !== undefined
        ? String(changedSettings.company_lng)
        : sortedCompanySettings.find((s) => s.settings_key === 'company_lng')?.settings_value || '';

    return (
    <SettingsSection
      key="location"
      title="الموقع الجغرافي"
      subtitle="الصق رابط Google Maps لموقع الشركة — سيتم استخراج الإحداثيات تلقائياً"
    >
      <SettingsFieldCard>
        <GoogleMapsLocationField
          label="موقع الشركة على الخريطة"
          hint="من Google Maps: مشاركة → نسخ الرابط → الصقه هنا."
          latitude={latValue}
          longitude={lngValue}
          onLocationChange={(lat, lng) => handleCompanyMapChange(lat, lng)}
        />
      </SettingsFieldCard>
    </SettingsSection>
    );
  };

  const renderCompanyTab = () => {
    const groups = SETTINGS_SECTION_GROUPS.company;
    const allGroupedKeys = new Set(groups.flatMap((g) => g.keys || []));

    return (
      <div className={settingsSectionsStackClass}>
        {groups.map((group) => {
          if (group.type === 'map') {
            return renderCompanyMapSection();
          }
          const groupSettings = sortedCompanySettings.filter((s) =>
            group.keys.includes(s.settings_key)
          );
          if (groupSettings.length === 0) return null;
          return (
            <SettingsSection
              key={group.id}
              title={group.title}
              subtitle={group.subtitle}
            >
              <div className={settingsFieldsStackClass}>
                {groupSettings.map((s) => renderCompanyCustomField(s))}
              </div>
            </SettingsSection>
          );
        })}
        {sortedCompanySettings.filter((s) => !allGroupedKeys.has(s.settings_key)).length > 0 && (
          <SettingsSection
            title="إعدادات إضافية"
            subtitle="حقول الشركة الأخرى غير المصنّفة"
          >
            <div className={settingsFieldsStackClass}>
              {sortedCompanySettings
                .filter((s) => !allGroupedKeys.has(s.settings_key))
                .map((s) => renderCompanyCustomField(s))}
            </div>
          </SettingsSection>
        )}
      </div>
    );
  };

  const renderGroupedSettingsTab = (tabKey) => {
    const groups = SETTINGS_SECTION_GROUPS[tabKey] || [];
    const allGroupedKeys = new Set(groups.flatMap((g) => g.keys || []));

    return (
      <div className={settingsSectionsStackClass}>
        {groups.map((group) => {
          const groupSettings = currentSettings.filter((s) =>
            group.keys.includes(s.settings_key)
          );
          if (groupSettings.length === 0) return null;
          return (
            <SettingsSection
              key={group.id}
              title={group.title}
              subtitle={group.subtitle}
            >
              <div className={settingsFieldsStackClass}>
                {groupSettings.map((setting) => (
                  <SettingsFieldCard key={setting.settings_key}>
                    {renderSettingField(setting)}
                  </SettingsFieldCard>
                ))}
              </div>
            </SettingsSection>
          );
        })}
        {currentSettings.filter((s) => !allGroupedKeys.has(s.settings_key)).length > 0 && (
          <SettingsSection
            title="إعدادات إضافية"
            subtitle="حقول أخرى في هذا القسم"
          >
            <div className={settingsFieldsStackClass}>
              {currentSettings
                .filter((s) => !allGroupedKeys.has(s.settings_key))
                .map((setting) => (
                  <SettingsFieldCard key={setting.settings_key}>
                    {renderSettingField(setting)}
                  </SettingsFieldCard>
                ))}
            </div>
          </SettingsSection>
        )}
      </div>
    );
  };

  return (
    <div className={settingsPageWrapperClass} dir="rtl">
      {/* Hero header */}
      <div className="bg-gradient-to-l from-[#8B5FD6] via-[#7A52C2] to-[#6B45B0] px-4 sm:px-6 py-6 sm:py-8 shadow-md w-full">
        <div className="flex flex-wrap items-center justify-between gap-4 w-full">
          <div className="flex items-center gap-4 min-w-0">
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-3 sm:p-3.5 shrink-0 ring-1 ring-white/30">
              <Cog6ToothIcon className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                الإعدادات
              </h1>
              <p className="text-sm sm:text-base text-white/85 mt-1">
                تهيئة النظام — الشركة، المخزون، العملاء، والمناطق
              </p>
            </div>
          </div>
          {Object.keys(changedSettings).length > 0 && (
            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-[#6B45B0] bg-white hover:bg-[#F8F5FF] shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 shrink-0"
            >
              {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
            </button>
          )}
        </div>
        {message && (
          <div className="mt-4">
            <Alert
              type={message.type}
              message={message.text}
              onClose={() => setMessage(null)}
            />
          </div>
        )}
      </div>

      {/* Pill tab bar */}
      <div className="-mt-4 relative z-10 w-full px-0">
        <nav
          className="flex w-full gap-2 sm:gap-3 p-2 sm:p-2.5 bg-white/95 backdrop-blur-sm border-y border-[#EDE7FF] shadow-lg shadow-[#8B5FD6]/10 overflow-x-auto"
          aria-label="أقسام الإعدادات"
          style={{ scrollbarWidth: 'none' }}
        >
          {settingsTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            const count = settings[tab.key]?.length ?? 0;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                title={tab.desc}
                className={`${getSettingsSubTabClasses(isActive)} min-w-[120px] sm:min-w-0 flex-col sm:flex-row py-3 sm:py-2.5 ${
                  isActive
                    ? '[&_svg]:text-white'
                    : '[&_svg]:text-[#8B5FD6] hover:[&_svg]:text-[#7A52C2]'
                }`}
              >
                <span className="flex items-center gap-1.5 sm:gap-2">
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                  <span className="truncate text-center leading-tight">{tab.label}</span>
                  {count > 0 && (
                    <span
                      className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[1.25rem] ${
                        isActive
                          ? 'bg-white/25 text-white'
                          : 'bg-[#EDE7FF] text-[#8B5FD6]'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </span>
                <span
                  className={`hidden lg:block text-[10px] font-normal truncate max-w-full mt-0.5 ${
                    isActive ? 'text-white/75' : 'text-gray-400 group-hover:text-[#8B5FD6]/70'
                  }`}
                >
                  {tab.desc}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab content */}
      <div className={`${settingsContentClass} ${settingsSectionsStackClass}`}>
        {activeTab === 'client' && (
          <SettingsSection
            title={SETTINGS_TAB_META.client.title}
            subtitle={SETTINGS_TAB_META.client.subtitle}
            icon={UserGroupIcon}
          >
            <ClientTaxonomiesSettings embedded />
          </SettingsSection>
        )}

        {activeTab === 'location' && (
          <SettingsSection
            title={SETTINGS_TAB_META.location.title}
            subtitle={SETTINGS_TAB_META.location.subtitle}
            icon={MapIcon}
          >
            <LocationManagement embedded />
          </SettingsSection>
        )}

        {activeTab === 'odoo' && (
          <SettingsSection
            title={SETTINGS_TAB_META.odoo.title}
            subtitle={SETTINGS_TAB_META.odoo.subtitle}
            icon={LinkIcon}
          >
            <OdooIntegrationSettings embedded />
          </SettingsSection>
        )}

        {currentSettings.length === 0 && !['client', 'location', 'odoo'].includes(activeTab) ? (
          <div className={settingsEmptyClass}>
            <p className="text-gray-500">لا توجد إعدادات في هذا القسم حالياً</p>
          </div>
        ) : (
          activeTab === 'company' && currentSettings.length > 0
            ? renderCompanyTab()
            : (activeTab === 'financial' || activeTab === 'inventory') && currentSettings.length > 0
              ? renderGroupedSettingsTab(activeTab)
              : currentSettings.length > 0
                ? renderGroupedSettingsTab(activeTab)
                : null
        )}

        {Object.keys(changedSettings).length > 0 && (
          <div className={settingsPendingBoxClass}>
            <h3 className="text-sm font-bold text-[#2D1B69] mb-2">التغييرات المعلقة</h3>
            <ul className="text-xs text-[#5A3A9E] space-y-1 max-h-40 overflow-y-auto pr-1">
              {Object.entries(changedSettings).map(([key, value]) => (
                <li key={key} className="flex justify-between gap-2">
                  <span className="truncate" title={getSettingDisplayName(key)}>{getSettingDisplayName(key)}</span>
                  <span className="font-semibold truncate max-w-[55%]" title={String(value)}>{String(value)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default SettingsTab;
