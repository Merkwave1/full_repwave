import React, { useCallback, useEffect, useId, useState } from "react";
import {
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  LinkIcon,
} from "@heroicons/react/24/outline";
import MapPicker from "../MapPicker/MapPicker.jsx";
import {
  buildGoogleMapsLink,
  formatCoordinates,
  parseGoogleMapsLinkAsync,
} from "../../../utils/googleMapsLink.js";
import { resolveGoogleMapsLink } from "../../../apis/maps.js";

function GoogleMapsLocationField({
  latitude = "",
  longitude = "",
  onLocationChange,
  label = "رابط Google Maps",
  hint = "الصق رابط الموقع من Google Maps (مشاركة → نسخ الرابط)",
  required = false,
  readOnly = false,
  className = "",
}) {
  const inputId = useId();
  const [linkInput, setLinkInput] = useState("");
  const [parseError, setParseError] = useState("");
  const [resolving, setResolving] = useState(false);
  const [parsedOk, setParsedOk] = useState(false);

  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);

  useEffect(() => {
    if (hasCoords) {
      setLinkInput((prev) => prev || buildGoogleMapsLink(lat, lng));
      setParsedOk(true);
    }
  }, [hasCoords, lat, lng]);

  const applyCoords = useCallback(
    (nextLat, nextLng) => {
      onLocationChange?.(String(nextLat), String(nextLng));
      setLinkInput(buildGoogleMapsLink(nextLat, nextLng));
      setParsedOk(true);
      setParseError("");
    },
    [onLocationChange],
  );

  const handleParse = async () => {
    const trimmed = linkInput.trim();
    if (!trimmed) {
      setParseError("يرجى لصق رابط Google Maps");
      setParsedOk(false);
      onLocationChange?.("", "");
      return;
    }

    setResolving(true);
    setParseError("");
    try {
      const result = await parseGoogleMapsLinkAsync(trimmed, {
        resolveShortLink: async (url) => {
          const resolved = await resolveGoogleMapsLink(url);
          if (resolved?.latitude != null && resolved?.longitude != null) {
            return `https://www.google.com/maps?q=${resolved.latitude},${resolved.longitude}`;
          }
          return resolved?.resolved_url || null;
        },
      });

      if (result?.lat != null && result?.lng != null) {
        applyCoords(result.lat, result.lng);
        return;
      }

      setParsedOk(false);
      onLocationChange?.("", "");
      setParseError(
        "تعذّر استخراج الإحداثيات. تأكد أن الرابط من Google Maps ويحتوي على موقع محدد.",
      );
    } catch {
      setParsedOk(false);
      onLocationChange?.("", "");
      setParseError("تعذّر تحليل الرابط. حاول نسخ الرابط الكامل من Google Maps.");
    } finally {
      setResolving(false);
    }
  };

  const handleLinkChange = (e) => {
    setLinkInput(e.target.value);
    setParsedOk(false);
    setParseError("");
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData?.getData("text")?.trim();
    if (!pasted || readOnly) return;
    setTimeout(() => {
      setLinkInput(pasted);
      parseGoogleMapsLinkAsync(pasted, {
        resolveShortLink: async (url) => {
          try {
            const resolved = await resolveGoogleMapsLink(url);
            if (resolved?.latitude != null && resolved?.longitude != null) {
              return `https://www.google.com/maps?q=${resolved.latitude},${resolved.longitude}`;
            }
            return resolved?.resolved_url || null;
          } catch {
            return null;
          }
        },
      }).then((result) => {
        if (result?.lat != null && result?.lng != null) {
          applyCoords(result.lat, result.lng);
        }
      });
    }, 0);
  };

  const mapsHref = hasCoords ? buildGoogleMapsLink(lat, lng) : linkInput.trim();

  return (
    <div className={`space-y-3 ${className}`}>
      <div>
        <label htmlFor={inputId} className="block text-sm font-semibold text-gray-700 mb-1.5">
          {label}
          {required && <span className="text-red-500 mr-1">*</span>}
        </label>
        {hint && !readOnly && (
          <p className="text-xs text-gray-500 mb-2 leading-relaxed">{hint}</p>
        )}

        {!readOnly ? (
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <LinkIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#C4A8F0] pointer-events-none" />
              <input
                id={inputId}
                type="url"
                dir="ltr"
                value={linkInput}
                onChange={handleLinkChange}
                onPaste={handlePaste}
                onBlur={() => {
                  if (linkInput.trim() && !hasCoords) handleParse();
                }}
                placeholder="https://maps.google.com/... أو https://maps.app.goo.gl/..."
                className="block w-full pr-10 pl-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5FD6]/40 focus:border-[#8B5FD6] bg-white shadow-sm"
              />
            </div>
            <button
              type="button"
              onClick={handleParse}
              disabled={resolving || !linkInput.trim()}
              className="shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold text-white rw-btn-gradient disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resolving ? "جاري التحليل…" : "تحليل الرابط"}
            </button>
          </div>
        ) : mapsHref ? (
          <a
            href={mapsHref}
            target="_blank"
            rel="noopener noreferrer"
            dir="ltr"
            className="block px-3 py-2.5 rounded-xl border border-[#EDE7FF] bg-[#FAFAFE] text-sm text-[#7A52C2] truncate hover:border-[#C4A8F0]"
          >
            {mapsHref}
          </a>
        ) : null}

        {parseError && (
          <p className="mt-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {parseError}
          </p>
        )}

        {parsedOk && hasCoords && !readOnly && (
          <p className="mt-2 text-xs text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2 flex items-center gap-1.5">
            <CheckCircleIcon className="h-4 w-4 shrink-0" />
            <span>
              تم استخراج الموقع:{" "}
              <span className="font-mono">{formatCoordinates(lat, lng)}</span>
            </span>
          </p>
        )}
      </div>

      {hasCoords && (
        <>
          <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
            <MapPicker
              key={`preview-${lat}-${lng}`}
              initialLatitude={lat}
              initialLongitude={lng}
              onLocationChange={() => {}}
              readOnly
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-gray-500 font-mono">
              {formatCoordinates(lat, lng)}
            </span>
            {mapsHref && (
              <a
                href={mapsHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8B5FD6] hover:text-[#7A52C2] transition-colors"
              >
                فتح في Google Maps
                <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default GoogleMapsLocationField;
