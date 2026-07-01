export type TrialRegistrationPayload = {
  contact_name: string;
  contact_email: string;
  contact_phone?: string | null;
  company_name: string;
  country: string;
};

export type TrialCredentials = {
  company_name: string;
  tenant_id: string;
  email: string;
  password: string;
  expires_at: string;
  days: number;
};

export type LoginPayload = {
  user_id: number;
  name: string;
  email: string;
  role: string;
  token: string;
  tenant_id: string;
  image?: string | null;
  days_remaining?: number | null;
};

type ApiEnvelope<T> = {
  status: string;
  message?: string;
  data?: T;
};

/** Browser calls same-origin proxy (/api/repwave/*) to avoid CORS. */
const API_BASE =
  process.env.NEXT_PUBLIC_REPWAVE_API_URL?.replace(/\/$/, "") ||
  "/api/repwave";

const APP_BASE =
  process.env.NEXT_PUBLIC_REPWAVE_APP_URL?.replace(/\/$/, "") ||
  "http://localhost:5174";

export function getAppBaseUrl() {
  return APP_BASE;
}

export async function registerTrial(
  payload: TrialRegistrationPayload,
): Promise<TrialCredentials> {
  const res = await fetch(`${API_BASE}/tenants/trial`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  let json: ApiEnvelope<TrialCredentials>;
  try {
    json = await res.json();
  } catch {
    throw new Error(`Server error (${res.status}). Please try again later.`);
  }

  if (json.status !== "success" || !json.data) {
    throw new Error(json.message || "Registration failed. Please try again.");
  }

  return json.data;
}

export async function loginTrialUser(
  tenantId: string,
  email: string,
  password: string,
): Promise<LoginPayload> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      tenant_id: tenantId,
      login_type: "admin",
    }),
  });

  let json: ApiEnvelope<LoginPayload>;
  try {
    json = await res.json();
  } catch {
    throw new Error(`Login failed (${res.status}).`);
  }

  if (json.status !== "success" || !json.data) {
    throw new Error(json.message || "Could not sign you in automatically.");
  }

  return json.data;
}

/** Redirect to the main RepWave app with auth stored via handoff route. */
export function redirectToAppWithAuth(auth: LoginPayload) {
  const payload = encodeURIComponent(
    btoa(
      JSON.stringify({
        token: auth.token,
        user_id: auth.user_id,
        name: auth.name,
        email: auth.email,
        role: auth.role,
        tenant_id: auth.tenant_id,
        image: auth.image ?? null,
        days_remaining: auth.days_remaining ?? null,
      }),
    ),
  );
  window.location.href = `${APP_BASE}/auth/handoff?payload=${payload}`;
}

export function buildManualLoginUrl(credentials: TrialCredentials) {
  const params = new URLSearchParams({
    tenant_id: credentials.tenant_id,
    email: credentials.email,
  });
  return `${APP_BASE}/login?${params.toString()}`;
}
