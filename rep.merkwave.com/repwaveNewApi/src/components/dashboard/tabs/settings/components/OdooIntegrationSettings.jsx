// src/components/dashboard/tabs/settings/components/OdooIntegrationSettings.jsx
import React, { useState, useEffect } from 'react';
import { getAllSettings, updateMultipleSettings, createSetting } from '../../../../../apis/settings.js';
import { testOdooConnection } from '../../../../../apis/odoo.js';
import Alert from '../../../../common/Alert/Alert.jsx';
import Loader from '../../../../common/Loader/Loader.jsx';
import OdooImportDataDialog from './OdooImportDataDialog.jsx';
import {
  SettingsSection,
  SettingsFieldCard,
  SettingsLabel,
  SettingsHint,
} from '../SettingsFormField.jsx';
import {
  settingsInputClass,
  settingsPrimaryBtnClass,
  settingsSecondaryBtnClass,
  SETTINGS_SECTION_GROUPS,
  settingsFieldsStackClass,
  settingsSectionsStackClass,
} from '../settingsUi.js';

function OdooIntegrationSettings({ embedded = false }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [settings, setSettings] = useState({
    odoo_integration_enabled: 'false',
    odoo_url: '',
    odoo_database: '',
    odoo_username: '',
    odoo_password: '',
  });

  const odooSections = SETTINGS_SECTION_GROUPS.odoo;

  useEffect(() => {
    fetchOdooSettings();
  }, []);

  const fetchOdooSettings = async () => {
    try {
      setLoading(true);
      const allSettings = await getAllSettings();

      const odooSettings = {
        odoo_integration_enabled: 'false',
        odoo_url: '',
        odoo_database: '',
        odoo_username: '',
        odoo_password: '',
      };

      allSettings.forEach((setting) => {
        if (setting.settings_key.startsWith('odoo_')) {
          odooSettings[setting.settings_key] = setting.settings_value || '';
        }
      });

      setSettings(odooSettings);
    } catch (error) {
      console.error('Error fetching Odoo settings:', error);
      setMessage({ type: 'error', text: 'فشل في تحميل إعدادات Odoo: ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      if (settings.odoo_integration_enabled === 'true') {
        if (!settings.odoo_url || !settings.odoo_database || !settings.odoo_username || !settings.odoo_password) {
          setMessage({ type: 'error', text: 'جميع الحقول مطلوبة عند تفعيل التكامل' });
          return;
        }
      }

      const allSettings = await getAllSettings();
      const existingKeys = new Set(allSettings.map((s) => s.settings_key));

      const typeMap = {
        odoo_integration_enabled: 'boolean',
        odoo_url: 'string',
        odoo_database: 'string',
        odoo_username: 'string',
        odoo_password: 'password',
      };

      const descMap = {
        odoo_integration_enabled: 'تفعيل التكامل مع نظام Odoo',
        odoo_url: 'عنوان URL الخاص بنظام Odoo',
        odoo_database: 'اسم قاعدة البيانات في Odoo',
        odoo_username: 'اسم المستخدم للوصول إلى Odoo',
        odoo_password: 'كلمة المرور للوصول إلى Odoo',
      };

      const missingKeys = Object.keys(settings).filter((k) => !existingKeys.has(k));
      if (missingKeys.length > 0) {
        await Promise.all(
          missingKeys.map((key) =>
            createSetting(key, settings[key] || '', descMap[key] || key, typeMap[key] || 'string')
          )
        );
      }

      await updateMultipleSettings(settings);
      setMessage({ type: 'success', text: 'تم حفظ إعدادات Odoo بنجاح' });
      await fetchOdooSettings();
    } catch (error) {
      console.error('Error saving Odoo settings:', error);
      setMessage({ type: 'error', text: 'فشل في حفظ الإعدادات: ' + error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setTesting(true);
      setMessage({ type: 'info', text: 'جاري اختبار الاتصال بـ Odoo...' });

      if (!settings.odoo_url || !settings.odoo_database || !settings.odoo_username || !settings.odoo_password) {
        setMessage({ type: 'error', text: 'يرجى ملء جميع حقول الاتصال قبل الاختبار' });
        return;
      }

      const result = await testOdooConnection({
        url: settings.odoo_url,
        database: settings.odoo_database,
        username: settings.odoo_username,
        password: settings.odoo_password,
      });

      if (result.status === 'success') {
        setMessage({ type: 'success', text: 'نجح الاتصال بـ Odoo!' });
      } else {
        setMessage({ type: 'error', text: 'فشل الاتصال: ' + (result.message || 'خطأ غير معروف') });
      }
    } catch (error) {
      console.error('Error testing Odoo connection:', error);
      setMessage({ type: 'error', text: error.message || 'فشل في اختبار الاتصال' });
    } finally {
      setTesting(false);
    }
  };

  const canConnect =
    settings.odoo_url && settings.odoo_database && settings.odoo_username && settings.odoo_password;

  if (loading) {
    return <Loader />;
  }

  const connectionSection = odooSections.find((s) => s.id === 'connection');
  const importSection = odooSections.find((s) => s.id === 'import');
  const notesSection = odooSections.find((s) => s.id === 'notes');

  return (
    <div className={settingsSectionsStackClass} dir="rtl">
      {message && (
        <Alert type={message.type} message={message.text} onClose={() => setMessage(null)} />
      )}

      <SettingsSection
        title={connectionSection?.title}
        subtitle={connectionSection?.subtitle}
      >
        <div className={settingsFieldsStackClass}>
          <SettingsFieldCard>
            <SettingsLabel>
              عنوان URL الخاص بـ Odoo <span className="text-red-500">*</span>
            </SettingsLabel>
            <input
              type="url"
              className={settingsInputClass}
              value={settings.odoo_url}
              onChange={(e) => handleChange('odoo_url', e.target.value)}
              placeholder="https://odoo.merkwave.com"
              dir="ltr"
            />
            <SettingsHint>مثال: https://your-odoo-instance.com</SettingsHint>
          </SettingsFieldCard>

          <SettingsFieldCard>
            <SettingsLabel>
              اسم قاعدة البيانات <span className="text-red-500">*</span>
            </SettingsLabel>
            <input
              type="text"
              className={settingsInputClass}
              value={settings.odoo_database}
              onChange={(e) => handleChange('odoo_database', e.target.value)}
              placeholder="test_mawnak"
              dir="ltr"
            />
            <SettingsHint>اسم قاعدة البيانات في نظام Odoo</SettingsHint>
          </SettingsFieldCard>

          <SettingsFieldCard>
            <SettingsLabel>
              اسم المستخدم <span className="text-red-500">*</span>
            </SettingsLabel>
            <input
              type="text"
              className={settingsInputClass}
              value={settings.odoo_username}
              onChange={(e) => handleChange('odoo_username', e.target.value)}
              placeholder="admin@example.com"
              dir="ltr"
            />
            <SettingsHint>اسم المستخدم أو البريد الإلكتروني للدخول إلى Odoo</SettingsHint>
          </SettingsFieldCard>

          <SettingsFieldCard>
            <SettingsLabel>
              كلمة المرور <span className="text-red-500">*</span>
            </SettingsLabel>
            <input
              type="password"
              className={settingsInputClass}
              value={settings.odoo_password}
              onChange={(e) => handleChange('odoo_password', e.target.value)}
              placeholder="••••••••••"
              dir="ltr"
            />
            <SettingsHint>كلمة المرور الخاصة بحساب Odoo</SettingsHint>
          </SettingsFieldCard>
        </div>

        <div className="flex items-center gap-3 flex-wrap pt-4 mt-4 border-t border-[#EDE7FF]">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={settingsPrimaryBtnClass}
          >
            {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
          </button>

          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testing || !settings.odoo_url || !settings.odoo_database}
            className={settingsSecondaryBtnClass}
          >
            {testing ? 'جاري الاختبار...' : 'اختبار الاتصال'}
          </button>
        </div>
      </SettingsSection>

      <SettingsSection
        title={importSection?.title}
        subtitle={importSection?.subtitle}
      >
        <p className="text-sm text-gray-500 mb-4 leading-relaxed">
          استورد العملاء والمنتجات من Odoo. يمكنك تحديث البيانات الموجودة أو استبدالها بالكامل.
        </p>
        <button
          type="button"
          onClick={() => setShowImportDialog(true)}
          disabled={!canConnect}
          className={settingsPrimaryBtnClass}
        >
          فتح نافذة الاستيراد
        </button>
        {!canConnect && (
          <p className="text-xs text-[#8B5FD6] mt-3">يرجى ملء جميع إعدادات الاتصال أولاً</p>
        )}
      </SettingsSection>

      <SettingsSection
        title={notesSection?.title}
        subtitle={notesSection?.subtitle}
      >
        <ul className="text-sm text-[#5A3A9E] space-y-2 pr-4 list-disc">
          <li>تأكد من صحة بيانات الاتصال قبل تفعيل التكامل</li>
          <li>استخدم حساب مدير في Odoo للحصول على جميع الصلاحيات</li>
          <li>يجب أن يكون Odoo متاحاً عبر HTTPS للأمان</li>
          <li>قم باختبار الاتصال بعد أي تغيير في الإعدادات</li>
        </ul>
      </SettingsSection>

      <OdooImportDataDialog
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        odooSettings={settings}
      />
    </div>
  );
}

export default OdooIntegrationSettings;
