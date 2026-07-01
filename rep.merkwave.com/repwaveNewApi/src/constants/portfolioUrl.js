/** RepWave marketing / portfolio site (Next.js landing). */
export const PORTFOLIO_URL =
  import.meta.env.VITE_REPWAVE_PORTFOLIO_URL?.replace(/\/$/, "") ||
  (import.meta.env.DEV ? "http://localhost:3000" : "https://repwave.com");
