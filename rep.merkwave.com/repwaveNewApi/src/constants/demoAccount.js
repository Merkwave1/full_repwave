/** Pre-filled demo tenant for local testing (rich seed data, unlimited expiry). */
export const DEMO_ACCOUNT = {
  tenantId: import.meta.env.VITE_DEMO_TENANT_ID || "demo",
  email: import.meta.env.VITE_DEMO_EMAIL || "admin@demo.com",
  password: import.meta.env.VITE_DEMO_PASSWORD || "Admin123!",
};
