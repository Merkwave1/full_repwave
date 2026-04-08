// src/components/common/LocationMapModal/LocationMapModal.jsx
import React, { useState, useEffect } from 'react';
import { XMarkIcon, MapPinIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import MapPicker from '../MapPicker/MapPicker.jsx';

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
  const effectiveLat = parseFloat((initialLat ?? latitude)) || 30.0444;
  const effectiveLng = parseFloat((initialLng ?? longitude)) || 31.2357;
  const derivedReadOnly = typeof readOnly === 'boolean' ? readOnly : !onSelectLocation;

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
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75"
          onClick={onClose}
        ></div>

        {/* Modal panel */}
        <div className="inline-block w-full max-w-4xl my-8 overflow-hidden text-right align-middle transition-all transform bg-white shadow-xl rounded-2xl">
          {/* Header */}
          <div className="px-6 py-4 bg-gradient-to-l from-green-600 to-green-700 text-white">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <MapPinIcon className="h-6 w-6" />
                {title || (derivedReadOnly ? 'عرض الموقع' : 'اختر الموقع')}
              </h3>
              <button
                onClick={onClose}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6">
            {/* Map Container */}
            <div className="mb-4">
              <MapPicker
                key={`map-${initialLat ?? latitude}-${initialLng ?? longitude}-${derivedReadOnly}`}
                initialLatitude={selectedLat}
                initialLongitude={selectedLng}
                onLocationChange={derivedReadOnly ? (() => {}) : handleLocationChange}
                readOnly={derivedReadOnly}
              />
            </div>

            {/* Selected Coordinates Display */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    خط العرض (Latitude)
                  </label>
                  <div className="bg-white border border-gray-300 rounded-lg px-4 py-2 font-mono text-sm">
                    {(parseFloat(selectedLat) || 0).toFixed(7)}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    خط الطول (Longitude)
                  </label>
                  <div className="bg-white border border-gray-300 rounded-lg px-4 py-2 font-mono text-sm">
                    {(parseFloat(selectedLng) || 0).toFixed(7)}
                  </div>
                </div>
              </div>
              {!derivedReadOnly && (
                <p className="text-xs text-gray-500 mt-2">
                  💡 انقر على الخريطة أو اسحب العلامة لتحديد الموقع
                </p>
              )}
              {derivedReadOnly && description && (
                <div className="mt-3 text-xs text-gray-600 flex items-start gap-2">
                  <InformationCircleIcon className="h-4 w-4 text-gray-400 mt-0.5" />
                  <span>{description}</span>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {derivedReadOnly ? 'إغلاق' : 'إلغاء'}
            </button>
            {!derivedReadOnly && (
              <button
                onClick={handleConfirm}
                className="px-6 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <MapPinIcon className="h-5 w-5" />
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
