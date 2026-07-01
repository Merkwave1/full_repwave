import { api } from "../utils/axiosInstance.js";

export async function resolveGoogleMapsLink(url) {
  const data = await api.post("/utils/resolve-maps-link", { url });
  if (!data?.resolved_url && data?.latitude == null) {
    throw new Error("تعذّر تحليل رابط Google Maps");
  }
  return data;
}
