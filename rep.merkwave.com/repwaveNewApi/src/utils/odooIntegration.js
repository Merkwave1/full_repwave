// src/utils/odooIntegration.js
// Utility function to check if Odoo integration is enabled

/**
 * Check if Odoo integration is enabled from localStorage settings
 * @returns {boolean} true if enabled, false otherwise
 */
export const isOdooIntegrationEnabled = () => {
  try {
    // First check appSettingsCategorized
    const categorizedSettings = localStorage.getItem('appSettingsCategorized');
    if (categorizedSettings) {
      const parsed = JSON.parse(categorizedSettings);
      // Check in 'odoo' category or 'integration' category
      const categories = ['odoo', 'integration', 'company', 'general'];
      for (const category of categories) {
        if (parsed[category] && Array.isArray(parsed[category])) {
          const setting = parsed[category].find(s => s.settings_key === 'odoo_integration_enabled');
          if (setting) {
            return setting.settings_value === 'true' || setting.settings_value === true || setting.settings_value === '1';
          }
        }
      }
      // Also check all categories
      for (const key of Object.keys(parsed)) {
        if (Array.isArray(parsed[key])) {
          const setting = parsed[key].find(s => s.settings_key === 'odoo_integration_enabled');
          if (setting) {
            return setting.settings_value === 'true' || setting.settings_value === true || setting.settings_value === '1';
          }
        }
      }
    }

    // Fallback: check appSettings array
    const appSettings = localStorage.getItem('appSettings');
    if (appSettings) {
      const parsed = JSON.parse(appSettings);
      if (Array.isArray(parsed)) {
        const setting = parsed.find(s => s.settings_key === 'odoo_integration_enabled');
        if (setting) {
          return setting.settings_value === 'true' || setting.settings_value === true || setting.settings_value === '1';
        }
      }
    }

    // If setting not found, return false (disabled by default)
    return false;
  } catch (error) {
    console.error('Error checking Odoo integration status:', error);
    return false;
  }
};

export default isOdooIntegrationEnabled;
