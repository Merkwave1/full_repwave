-- Migration: Add Odoo Integration Settings
-- This migration adds settings for Odoo ERP integration

-- Insert Odoo URL setting
INSERT INTO settings (settings_key, settings_value, settings_description, settings_type)
VALUES (
    'odoo_url',
    'https://odoo.examble.com',
    'عنوان URL الخاص بنظام Odoo',
    'string'
) ON DUPLICATE KEY UPDATE 
    settings_description = 'عنوان URL الخاص بنظام Odoo',
    settings_type = 'string';

-- Insert Odoo Database setting
INSERT INTO settings (settings_key, settings_value, settings_description, settings_type)
VALUES (
    'odoo_database',
    'database_name',
    'اسم قاعدة البيانات في Odoo',
    'string'
) ON DUPLICATE KEY UPDATE 
    settings_description = 'اسم قاعدة البيانات في Odoo',
    settings_type = 'string';

-- Insert Odoo Username setting
INSERT INTO settings (settings_key, settings_value, settings_description, settings_type)
VALUES (
    'odoo_username',
    'username',
    'اسم المستخدم للوصول إلى Odoo',
    'string'
) ON DUPLICATE KEY UPDATE 
    settings_description = 'اسم المستخدم للوصول إلى Odoo',
    settings_type = 'string';

-- Insert Odoo Password setting
INSERT INTO settings (settings_key, settings_value, settings_description, settings_type)
VALUES (
    'odoo_password',
    'password',
    'كلمة المرور للوصول إلى Odoo',
    'password'
) ON DUPLICATE KEY UPDATE 
    settings_description = 'كلمة المرور للوصول إلى Odoo',
    settings_type = 'password';

-- Insert Odoo Integration Enabled setting
INSERT INTO settings (settings_key, settings_value, settings_description, settings_type)
VALUES (
    'odoo_integration_enabled',
    'true',
    'تفعيل التكامل مع نظام Odoo',
    'boolean'
) ON DUPLICATE KEY UPDATE 
    settings_description = 'تفعيل التكامل مع نظام Odoo',
    settings_type = 'boolean';
