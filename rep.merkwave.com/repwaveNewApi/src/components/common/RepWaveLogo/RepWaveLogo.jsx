/**
 * RepWaveLogo.jsx — RepWave brand mark
 * Props:
 *   size      — px size of the logo icon square (default 40)
 *   showText  — render "REPWAVE" wordmark next to icon (default true)
 *   showTag   — render tagline below (default false)
 *   className — extra classes on root element
 */
import React, { useId } from "react";

export default function RepWaveLogo({
  size = 40,
  showText = true,
  showTag = false,
  className = "",
}) {
  const uid = useId().replace(/:/g, "");
  const gradA = `rw-ga-${uid}`;
  const gradB = `rw-gb-${uid}`;

  return (
    <div className={`inline-flex items-center gap-2 select-none ${className}`}>
      {/* ── Icon mark ── */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        <defs>
          {/* Purple → Coral gradient */}
          <linearGradient
            id={gradA}
            x1="0"
            y1="0"
            x2="40"
            y2="40"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#8B5FD6" />
            <stop offset="100%" stopColor="#F97366" />
          </linearGradient>
          {/* Light version for inner ring */}
          <linearGradient
            id={gradB}
            x1="0"
            y1="0"
            x2="40"
            y2="40"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#C4A8F0" />
            <stop offset="100%" stopColor="#FAB5AD" />
          </linearGradient>
        </defs>

        {/* Outer circle */}
        <circle
          cx="20"
          cy="20"
          r="18"
          stroke={`url(#${gradA})`}
          strokeWidth="2.5"
        />
        {/* Middle ring */}
        <circle
          cx="20"
          cy="20"
          r="12"
          stroke={`url(#${gradB})`}
          strokeWidth="1.5"
        />
        {/* Center dot */}
        <circle cx="20" cy="20" r="3" fill={`url(#${gradA})`} />

        {/* Crosshair — horizontal ticks */}
        <line
          x1="2"
          y1="20"
          x2="7"
          y2="20"
          stroke={`url(#${gradA})`}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <line
          x1="33"
          y1="20"
          x2="38"
          y2="20"
          stroke={`url(#${gradA})`}
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Crosshair — vertical ticks */}
        <line
          x1="20"
          y1="2"
          x2="20"
          y2="7"
          stroke={`url(#${gradA})`}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <line
          x1="20"
          y1="33"
          x2="20"
          y2="38"
          stroke={`url(#${gradA})`}
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* "R" letterform — stem */}
        <line
          x1="16"
          y1="14"
          x2="16"
          y2="26"
          stroke={`url(#${gradA})`}
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        {/* "R" letterform — bump top */}
        <path
          d="M16 14 Q24 14 24 18 Q24 22 16 22"
          stroke={`url(#${gradA})`}
          strokeWidth="2.2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* "R" letterform — leg */}
        <line
          x1="16"
          y1="22"
          x2="24"
          y2="26"
          stroke={`url(#${gradA})`}
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>

      {/* ── Wordmark ── */}
      {showText && (
        <span
          className="font-extrabold tracking-widest rw-text-gradient leading-none"
          style={{ fontSize: size * 0.45 }}
        >
          REPWAVE
        </span>
      )}

      {/* ── Tagline (below, only if showTag) ── */}
      {showTag && (
        <span
          className="text-gray-400 text-xs font-medium block w-full mt-1 text-center"
          style={{ fontSize: size * 0.18 }}
        >
          Track Every Move, Deliver Every Result
        </span>
      )}
    </div>
  );
}
