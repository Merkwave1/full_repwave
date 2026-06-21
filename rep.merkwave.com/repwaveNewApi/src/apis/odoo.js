// Odoo integration not implemented in .NET API — stubs return empty data
const notAvailable = () => Promise.resolve([]);
export const syncToOdoo = () => Promise.resolve({ status: 'success', message: 'Odoo not available' });
export const getOdooSyncLogs = notAvailable;
export const testOdooConnection = () => Promise.resolve({ connected: false });
export const getProductSyncLogs = notAvailable;
export const getSalesOrderSyncLogs = notAvailable;
export const getPaymentSyncLogs = notAvailable;
export const getSafeTransferSyncLogs = notAvailable;
export const getTransactionSyncLogs = notAvailable;
export const getInventorySyncLogs = notAvailable;
export const importUsersFromOdoo = notAvailable;
export const importFromOdoo = notAvailable;
export const deleteOdooData = notAvailable;

