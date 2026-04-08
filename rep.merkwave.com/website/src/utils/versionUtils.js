// src/utils/versionUtils.js
/**
 * Update version for a specific entity
 * @param {string} entity - The entity name (e.g., 'suppliers', 'clients', 'products')
 * @returns {Promise<void>}
 */
export const updateVersion = async (entity) => {
  try {
    const companyName = localStorage.getItem('companyName');
    if (!companyName) {
      throw new Error('Company name not found in localStorage');
    }
    
    const response = await fetch(`https://your-domain.example/api/clients/${companyName}/versions/update_version.php?entity=${entity}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log(`Version updated for ${entity}:`, result);
    return result;
  } catch (error) {
    console.error(`Error updating version for ${entity}:`, error);
    // Don't throw the error to prevent disrupting the main operation
    // Version update is non-critical
  }
};
