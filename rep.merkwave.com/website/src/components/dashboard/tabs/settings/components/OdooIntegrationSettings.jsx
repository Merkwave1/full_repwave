// src/components/dashboard/tabs/settings/components/OdooIntegrationSettings.jsx
// Component for managing Odoo ERP integration settings

import React, { useState, useEffect } from 'react';
import { getAllSettings, updateMultipleSettings, createSetting } from '../../../../../apis/settings.js';
import { testOdooConnection } from '../../../../../apis/odoo.js';
import Button from '../../../../common/Button/Button.jsx';
import TextField from '../../../../common/TextField/TextField.jsx';
import Alert from '../../../../common/Alert/Alert.jsx';
import Loader from '../../../../common/Loader/Loader.jsx';
import OdooImportDataDialog from './OdooImportDataDialog.jsx';

function OdooIntegrationSettings() {
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
    odoo_password: ''
  });

  useEffect(() => {
    fetchOdooSettings();
  }, []);

  const fetchOdooSettings = async () => {
    try {
      setLoading(true);
      const allSettings = await getAllSettings();
      
      // Extract Odoo-related settings
      const odooSettings = {
        odoo_integration_enabled: 'false',
        odoo_url: '',
        odoo_database: '',
        odoo_username: '',
        odoo_password: ''
      };

      allSettings.forEach(setting => {
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
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Validate required fields if integration is enabled
      if (settings.odoo_integration_enabled === 'true') {
        if (!settings.odoo_url || !settings.odoo_database || !settings.odoo_username || !settings.odoo_password) {
          setMessage({ type: 'error', text: 'جميع الحقول مطلوبة عند تفعيل التكامل' });
          return;
        }
      }

      // Check if settings exist first, create if missing
      const allSettings = await getAllSettings();
      const existingKeys = new Set(allSettings.map(s => s.settings_key));
      
      const typeMap = {
        odoo_integration_enabled: 'boolean',
        odoo_url: 'string',
        odoo_database: 'string',
        odoo_username: 'string',
        odoo_password: 'password'
      };

      const descMap = {
        odoo_integration_enabled: 'تفعيل التكامل مع نظام Odoo',
        odoo_url: 'عنوان URL الخاص بنظام Odoo',
        odoo_database: 'اسم قاعدة البيانات في Odoo',
        odoo_username: 'اسم المستخدم للوصول إلى Odoo',
        odoo_password: 'كلمة المرور للوصول إلى Odoo'
      };

      // Create missing settings
      const missingKeys = Object.keys(settings).filter(k => !existingKeys.has(k));
      if (missingKeys.length > 0) {
        await Promise.all(
          missingKeys.map(key =>
            createSetting(
              key,
              settings[key] || '',
              descMap[key] || key,
              typeMap[key] || 'string'
            )
          )
        );
      }

      // Update all settings
      await updateMultipleSettings(settings);
      
      setMessage({ type: 'success', text: 'تم حفظ إعدادات Odoo بنجاح' });
      
      // Refresh settings from server
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

      // Validate required fields
      if (!settings.odoo_url || !settings.odoo_database || !settings.odoo_username || !settings.odoo_password) {
        setMessage({ type: 'error', text: 'يرجى ملء جميع حقول الاتصال قبل الاختبار' });
        return;
      }

      const result = await testOdooConnection({
        url: settings.odoo_url,
        database: settings.odoo_database,
        username: settings.odoo_username,
        password: settings.odoo_password
      });

      if (result.status === 'success') {
        setMessage({ type: 'success', text: 'نجح الاتصال بـ Odoo! ✓' });
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

  if (loading) {
    return <Loader />;
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="text-4xl">🔗</div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 mb-2">التكامل مع Odoo ERP</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              قم بربط النظام مع Odoo لمزامنة البيانات تلقائياً، بما في ذلك العملاء والمنتجات والطلبات. 
              تأكد من إدخال بيانات الاتصال الصحيحة واختبار الاتصال قبل التفعيل.
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      {message && (
        <Alert
          type={message.type}
          message={message.text}
          onClose={() => setMessage(null)}
        />
      )}

      {/* Enable/Disable Integration
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h4 className="text-lg font-semibold text-gray-900 mb-1">حالة التكامل</h4>
            <p className="text-sm text-gray-600">تفعيل أو إيقاف التكامل مع نظام Odoo</p>
          </div>
          <div className="mr-4">
            <select
              value={settings.odoo_integration_enabled}
              onChange={(e) => handleChange('odoo_integration_enabled', e.target.value)}
              className={`px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium ${
                settings.odoo_integration_enabled === 'true'
                  ? 'bg-green-50 text-green-700 border-green-300'
                  : 'bg-gray-50 text-gray-700 border-gray-300'
              }`}
            >
              <option value="false">غير مفعل</option>
              <option value="true">مفعل</option>
            </select>
          </div>
        </div>
      </div> */}

      {/* Connection Settings */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span>⚙️</span>
          <span>إعدادات الاتصال</span>
        </h4>
        
        <div className="space-y-4">
          {/* Odoo URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              عنوان URL الخاص بـ Odoo <span className="text-red-500">*</span>
            </label>
            <TextField
              type="url"
              value={settings.odoo_url}
              onChange={(e) => handleChange('odoo_url', e.target.value)}
              placeholder="https://odoo.example.com"
              dir="ltr"
            />
            <p className="text-xs text-gray-500 mt-1">مثال: https://your-odoo-instance.com</p>
          </div>

          {/* Database Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              اسم قاعدة البيانات <span className="text-red-500">*</span>
            </label>
            <TextField
              type="text"
              value={settings.odoo_database}
              onChange={(e) => handleChange('odoo_database', e.target.value)}
              placeholder="test_mawnak"
              dir="ltr"
            />
            <p className="text-xs text-gray-500 mt-1">اسم قاعدة البيانات في نظام Odoo</p>
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              اسم المستخدم <span className="text-red-500">*</span>
            </label>
            <TextField
              type="text"
              value={settings.odoo_username}
              onChange={(e) => handleChange('odoo_username', e.target.value)}
              placeholder="admin@example.com"
              dir="ltr"
            />
            <p className="text-xs text-gray-500 mt-1">اسم المستخدم أو البريد الإلكتروني للدخول إلى Odoo</p>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              كلمة المرور <span className="text-red-500">*</span>
            </label>
            <TextField
              type="password"
              value={settings.odoo_password}
              onChange={(e) => handleChange('odoo_password', e.target.value)}
              placeholder="••••••••••"
              dir="ltr"
            />
            <p className="text-xs text-gray-500 mt-1">كلمة المرور الخاصة بحساب Odoo</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-green-600 hover:bg-green-700 flex items-center gap-2"
        >
          {saving ? (
            <>
              <span className="animate-spin">⏳</span>
              <span>جاري الحفظ...</span>
            </>
          ) : (
            <>
              <span>💾</span>
              <span>حفظ الإعدادات</span>
            </>
          )}
        </Button>

        <Button
          onClick={handleTestConnection}
          disabled={testing || !settings.odoo_url || !settings.odoo_database}
          className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
        >
          {testing ? (
            <>
              <span className="animate-spin">⏳</span>
              <span>جاري الاختبار...</span>
            </>
          ) : (
            <>
              <span>🔍</span>
              <span>اختبار الاتصال</span>
            </>
          )}
        </Button>

        <Button
          onClick={() => setShowImportDialog(true)}
          disabled={!settings.odoo_url || !settings.odoo_database || !settings.odoo_username || !settings.odoo_password}
          className="bg-purple-600 hover:bg-purple-700 flex items-center gap-2"
        >
          <span>📥</span>
          <span>استيراد البيانات</span>
        </Button>
      </div>

      {/* Import Data Section */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="text-3xl">📥</div>
          <div className="flex-1">
            <h4 className="text-lg font-semibold text-purple-900 mb-2">استيراد البيانات من Odoo</h4>
            <p className="text-sm text-purple-700 mb-4">
              يمكنك استيراد البيانات من نظام Odoo إلى هذا النظام. اختر البيانات التي تريد استيرادها 
              وحدد ما إذا كنت تريد تحديث البيانات الموجودة أو استبدالها بالكامل.
            </p>
            <Button
              onClick={() => setShowImportDialog(true)}
              disabled={!settings.odoo_url || !settings.odoo_database || !settings.odoo_username || !settings.odoo_password}
              className="bg-purple-600 hover:bg-purple-700 flex items-center gap-2"
            >
              <span>📥</span>
              <span>فتح نافذة الاستيراد</span>
            </Button>
            {(!settings.odoo_url || !settings.odoo_database || !settings.odoo_username || !settings.odoo_password) && (
              <p className="text-xs text-purple-600 mt-2">
                ⚠️ يرجى ملء جميع إعدادات الاتصال أولاً لتتمكن من استيراد البيانات
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h5 className="text-sm font-semibold text-blue-900 mb-2">📘 ملاحظات مهمة</h5>
        <ul className="text-xs text-blue-800 space-y-1 pr-4 list-disc">
          <li>تأكد من صحة بيانات الاتصال قبل تفعيل التكامل</li>
          <li>استخدم حساب مدير في Odoo للحصول على جميع الصلاحيات</li>
          <li>يجب أن يكون Odoo متاحاً عبر HTTPS للأمان</li>
          <li>قم باختبار الاتصال بعد أي تغيير في الإعدادات</li>
          <li>سيتم تخزين البيانات بشكل آمن في قاعدة البيانات</li>
        </ul>
      </div>

      {/* Import Data Dialog */}
      <OdooImportDataDialog
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        odooSettings={settings}
      />
    </div>
  );
}

export default OdooIntegrationSettings;