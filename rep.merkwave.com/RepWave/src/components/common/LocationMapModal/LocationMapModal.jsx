// src/components/common/LocationMapModal/LocationMapModal.jsx
import React, { useState, useEffect } from "react";
import {
  XMarkIcon,
  MapPinIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import MapPicker from "../MapPicker/MapPicker.jsx";

function LocationMapModal({
  isOpen,
  onClose,
  onSelectLocation,
  title,
  initialLat,
  initialLng,
  latitude,
  longitude,
  description,
  readOnly,
}) {
  const effectiveLat = parseFloat(initialLat ?? latitude) || 30.0444;
  const effectiveLng = parseFloat(initialLng ?? longitude) || 31.2357;
  const derivedReadOnly =
    typeof readOnly === "boolean" ? readOnly : !onSelectLocation;

  const [selectedLat, setSelectedLat] = useState(effectiveLat);
  const [selectedLng, setSelectedLng] = useState(effectiveLng);

  useEffect(() => {
    if (isOpen) {
      setSelectedLat(parseFloat(initialLat ?? latitude) || 30.0444);
      setSelectedLng(parseFloat(initialLng ?? longitude) || 31.2357);
    }
  }, [isOpen, initialLat, initialLng, latitude, longitude]);

  const handleLocationChange = (lat, lng) => {
    setSelectedLat(lat);
    setSelectedLng(lng);
  };

  const handleConfirm = () => {
    if (onSelectLocation) {
      onSelectLocation(selectedLat, selectedLng);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto" dir="rtl">
      <div className="flex items-center justify-center min-h-screen px-2 sm:px-4 pt-2 sm:pt-4 pb-10 sm:pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 backdrop-blur-sm bg-black/40 transition-opacity"
          onClick={onClose}
        />

        {/* Modal panel */}
        <div className="inline-block w-full max-w-4xl my-2 sm:my-8 overflow-hidden text-right align-middle transform bg-white shadow-2xl rounded-2xl border border-[#8DD8F5]/30 max-h-[95vh] sm:max-h-[90vh]">
          {/* Header */}
          <div className="border-b border-[#8DD8F5]/40">
            <div className="h-1.5 bg-[#8DD8F5]" />
            <div className="px-4 py-3 sm:px-6 sm:py-5 flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-[#8DD8F5]/20 flex items-center justify-center text-[#8DD8F5]">
                  <MapPinIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <h3 className="text-base sm:text-xl font-extrabold text-[#1F2937] truncate">
                  {title || (derivedReadOnly ? "عرض الموقع" : "اختر الموقع")}
                </h3>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-[#1F2937]/70 hover:bg-[#8DD8F5]/20 transition"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-3 sm:px-6 py-3 sm:py-6 space-y-3 sm:space-y-4">
            {/* Map Container */}
            <div className="rounded-2xl overflow-hidden border border-[#8DD8F5]/30 shadow-sm">
              <MapPicker
                key={`map-${initialLat ?? latitude}-${initialLng ?? longitude}-${derivedReadOnly}`}
                initialLatitude={selectedLat}
                initialLongitude={selectedLng}
                onLocationChange={
                  derivedReadOnly ? () => {} : handleLocationChange
                }
                readOnly={derivedReadOnly}
              />
            </div>

            {/* Selected Coordinates */}
            <div className="bg-[#8DD8F5]/10 rounded-2xl border border-[#8DD8F5]/30 p-3 sm:p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-[#1F2937] mb-1">
                    خط العرض (Latitude)
                  </label>
                  <div className="bg-white border border-gray-200 rounded-xl px-3 sm:px-4 py-2 font-mono text-xs sm:text-sm text-[#1F2937] shadow-sm truncate">
                    {(parseFloat(selectedLat) || 0).toFixed(7)}
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-[#1F2937] mb-1">
                    خط الطول (Longitude)
                  </label>
                  <div className="bg-white border border-gray-200 rounded-xl px-3 sm:px-4 py-2 font-mono text-xs sm:text-sm text-[#1F2937] shadow-sm truncate">
                    {(parseFloat(selectedLng) || 0).toFixed(7)}
                  </div>
                </div>
              </div>

              {!derivedReadOnly && (
                <p className="text-xs text-[#1F2937]/60 mt-2">
                  💡 انقر على الخريطة أو اسحب العلامة لتحديد الموقع
                </p>
              )}

              {derivedReadOnly && description && (
                <div className="mt-3 text-xs text-[#1F2937]/70 flex items-start gap-2">
                  <InformationCircleIcon className="h-4 w-4 text-[#8DD8F5] mt-0.5 shrink-0" />
                  <span>{description}</span>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-3 sm:px-6 py-3 sm:py-4 bg-gray-50 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 sm:px-6 py-2 rounded-xl bg-gray-100 border border-gray-200 text-[#1F2937] hover:bg-gray-200 transition text-sm font-medium"
            >
              {derivedReadOnly ? "إغلاق" : "إلغاء"}
            </button>

            {!derivedReadOnly && (
              <button
                onClick={handleConfirm}
                className="px-4 sm:px-6 py-2 rounded-xl bg-[#8DD8F5] hover:bg-[#7ccfee] text-[#1F2937] font-semibold shadow-md transition flex items-center justify-center gap-2 text-sm"
              >
                <MapPinIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                تأكيد الموقع
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default LocationMapModal;
