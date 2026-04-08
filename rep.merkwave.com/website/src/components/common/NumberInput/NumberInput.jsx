// src/components/common/NumberInput/NumberInput.jsx
// Reusable numeric input with thousand separators and wheel-prevent
import React, { useState, useEffect, useRef, useCallback } from 'react';

function formatWithCommas(value) {
  if (value === '' || value === null || value === undefined) return '';
  // Keep only digits and one dot
  const cleaned = String(value).replace(/[^0-9.]/g, '');
  if (cleaned === '') return '';
  const [intPart, decPart] = cleaned.split('.');
  const intNum = intPart.replace(/^0+(?=\d)/, '');
  const withCommas = intNum.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return decPart !== undefined ? `${withCommas}.${decPart}` : withCommas;
}

function toNumericString(displayValue) {
  if (displayValue === '' || displayValue === null || displayValue === undefined) return '';
  const cleaned = String(displayValue).replace(/,/g, '').replace(/[^0-9.]/g, '');
  // Ensure only one dot
  const parts = cleaned.split('.');
  if (parts.length > 2) {
    return `${parts[0]}.${parts.slice(1).join('')}`;
  }
  return cleaned;
}

export default function NumberInput({ value, onChange, className = '', dir = 'rtl', placeholder, name, id, disabled, required, min, max, ...rest }) {
  // Ensure value is always a string to prevent controlled/uncontrolled issues
  const safeValue = String(value || '');
  const [display, setDisplay] = useState(formatWithCommas(safeValue));
  const prevValueRef = useRef(safeValue);

  // Sync display when external value changes
  useEffect(() => {
    if (prevValueRef.current !== safeValue) {
      setDisplay(formatWithCommas(safeValue));
      prevValueRef.current = safeValue;
    }
  }, [safeValue]);

  const handleChange = (e) => {
    const raw = e.target.value;
    const formatted = formatWithCommas(raw);
    setDisplay(formatted);
    const numericStr = toNumericString(formatted);
    // If empty, propagate empty
    if (numericStr === '') {
      onChange?.(numericStr);
      return;
    }

    // Apply min/max clamping when provided
    const numericVal = parseFloat(numericStr);
    if (!Number.isNaN(numericVal)) {
      if (typeof max !== 'undefined' && max !== null && max !== '' && !Number.isNaN(Number(max)) && numericVal > Number(max)) {
        // Clamp to max
        const maxStr = String(max);
        setDisplay(formatWithCommas(maxStr));
        onChange?.(maxStr);
        return;
      }
      if (typeof min !== 'undefined' && min !== null && min !== '' && !Number.isNaN(Number(min)) && numericVal < Number(min)) {
        const minStr = String(min);
        setDisplay(formatWithCommas(minStr));
        onChange?.(minStr);
        return;
      }
    }

    onChange?.(numericStr);
  };

  const handleBlur = () => {
    // Normalize display to numeric string and apply clamping on blur
    const numericStr = toNumericString(display);
    if (numericStr === '') return;
    let numericVal = parseFloat(numericStr);
    if (typeof max !== 'undefined' && max !== null && max !== '' && !Number.isNaN(Number(max)) && numericVal > Number(max)) {
      numericVal = Number(max);
    }
    if (typeof min !== 'undefined' && min !== null && min !== '' && !Number.isNaN(Number(min)) && numericVal < Number(min)) {
      numericVal = Number(min);
    }
    const finalStr = String(numericVal);
    setDisplay(formatWithCommas(finalStr));
    onChange?.(finalStr);
  };

  const handleWheel = useCallback((e) => {
    e.preventDefault();
  }, []);

  const handleKeyDown = (e) => {
    // Prevent arrow up/down from incrementing in some browsers
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
    }
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      pattern="[0-9,\.]*"
      value={display}
      onChange={handleChange}
      onWheelCapture={handleWheel}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      className={`w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${className}`}
      dir={dir}
      placeholder={placeholder}
      name={name}
      id={id}
      disabled={disabled}
      required={required}
      {...rest}
    />
  );
}
