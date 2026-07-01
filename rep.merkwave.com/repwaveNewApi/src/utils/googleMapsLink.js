/**
 * Parse latitude/longitude from Google Maps URLs and coordinate strings.
 */

const COORD_PAIR =
  /^(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)$/;

function toCoords(latStr, lngStr) {
  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

function parseFromDecodedText(text) {
  if (!text) return null;

  const d3d4 = text.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/);
  if (d3d4) return toCoords(d3d4[1], d3d4[2]);

  const atMatch = text.match(/@(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/);
  if (atMatch) return toCoords(atMatch[1], atMatch[2]);

  for (const param of ["q", "query", "ll", "center"]) {
    const re = new RegExp(`[?&]${param}=([^&]+)`, "i");
    const m = text.match(re);
    if (!m) continue;
    const val = decodeURIComponent(m[1].replace(/\+/g, " "));
    const cm = val.match(COORD_PAIR);
    if (cm) return toCoords(cm[1], cm[2]);
  }

  return null;
}

export function isShortGoogleMapsLink(input) {
  const raw = (input || "").trim();
  return /^(https?:\/\/)?(maps\.app\.goo\.gl|goo\.gl\/maps)/i.test(raw);
}

export function normalizeMapsInput(input) {
  const raw = (input || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^(maps\.|www\.|goo\.gl|maps\.app\.goo\.gl)/i.test(raw)) {
    return `https://${raw}`;
  }
  return raw;
}

/**
 * @param {string} input - Google Maps URL or "lat,lng"
 * @returns {{ lat: number, lng: number } | { error: string } | null}
 */
export function parseGoogleMapsLink(input) {
  const raw = (input || "").trim();
  if (!raw) return null;

  const direct = raw.match(COORD_PAIR);
  if (direct) return toCoords(direct[1], direct[2]);

  if (isShortGoogleMapsLink(raw)) {
    return { error: "short_link" };
  }

  try {
    const normalized = normalizeMapsInput(raw);
    const decoded = decodeURIComponent(normalized);
    return parseFromDecodedText(decoded);
  } catch {
    return null;
  }
}

export function buildGoogleMapsLink(lat, lng) {
  const la = parseFloat(lat);
  const ln = parseFloat(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return "";
  return `https://www.google.com/maps?q=${la},${ln}`;
}

export function formatCoordinates(lat, lng, precision = 6) {
  const la = parseFloat(lat);
  const ln = parseFloat(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return "";
  return `${la.toFixed(precision)}, ${ln.toFixed(precision)}`;
}

/**
 * Parse locally first; resolve short links via API when needed.
 */
export async function parseGoogleMapsLinkAsync(input, options = {}) {
  const parsed = parseGoogleMapsLink(input);
  if (parsed && !parsed.error) return parsed;
  if (parsed?.error === "short_link" && options.resolveShortLink) {
    const resolved = await options.resolveShortLink(normalizeMapsInput(input));
    if (!resolved) return { error: "resolve_failed" };
    return parseGoogleMapsLink(resolved) || { error: "invalid_link" };
  }
  if (parsed?.error === "short_link") return { error: "short_link" };
  return parsed || { error: "invalid_link" };
}
