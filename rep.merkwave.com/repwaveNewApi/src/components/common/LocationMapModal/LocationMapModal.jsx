// src/components/common/LocationMapModal/LocationMapModal.jsx
import React, { useState, useEffect } from "react";
import {
  MapPinIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import MapPicker from "../MapPicker/MapPicker.jsx";
import AppModalShell, {
  modalPrimaryBtnClass,
  modalSecondaryBtnClass,
  modalSectionClass,
} from "../AppModalShell.jsx";

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
    <AppModalShell
      open={isOpen}
      onClose={onClose}
      title={title || (derivedReadOnly ? "عرض الموقع" : "اختر الموقع")}
      icon={MapPinIcon}
      size="2xl"
      zIndex="z-[60]"
      footer={
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3">
          <button type="button" onClick={onClose} className={modalSecondaryBtnClass}>
            {derivedReadOnly ? "إغلاق" : "إلغاء"}
          </button>
          {!derivedReadOnly && (
            <button type="button" onClick={handleConfirm} className={modalPrimaryBtnClass}>
              <MapPinIcon className="h-4 w-4 inline ml-1" />
              تأكيد الموقع
            </button>
          )}
        </div>
      }
    >
          <div className="space-y-3 sm:space-y-4">
            <div className="rounded-2xl overflow-hidden border border-[#EDE7FF] shadow-sm">
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

            <div className={`${modalSectionClass} p-3 sm:p-4 bg-[#FAFAFE]`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-[#1A0F35] mb-1">
                    خط العرض (Latitude)
                  </label>
                  <div className="bg-white border border-[#EDE7FF] rounded-xl px-3 sm:px-4 py-2 font-mono text-xs sm:text-sm text-[#1A0F35] shadow-sm truncate">
                    {(parseFloat(selectedLat) || 0).toFixed(7)}
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-[#1A0F35] mb-1">
                    خط الطول (Longitude)
                  </label>
                  <div className="bg-white border border-[#EDE7FF] rounded-xl px-3 sm:px-4 py-2 font-mono text-xs sm:text-sm text-[#1A0F35] shadow-sm truncate">
                    {(parseFloat(selectedLng) || 0).toFixed(7)}
                  </div>
                </div>
              </div>

              {!derivedReadOnly && (
                <p className="text-xs text-[#1A0F35]/60 mt-2">
                  💡 انقر على الخريطة أو اسحب العلامة لتحديد الموقع
                </p>
              )}

              {derivedReadOnly && description && (
                <div className="mt-3 text-xs text-[#1A0F35]/70 flex items-start gap-2">
                  <InformationCircleIcon className="h-4 w-4 text-[#8B5FD6] mt-0.5 shrink-0" />
                  <span>{description}</span>
                </div>
              )}
            </div>
          </div>
    </AppModalShell>
  );
}

export default LocationMapModal;
