// src/components/common/MapPicker/MapPicker.js
import React, { useEffect, useRef } from 'react';
// REMOVED: import 'https://unpkg.com/leaflet@1.7.1/dist/leaflet.css';
// REMOVED: import 'https://unpkg.com/leaflet@1.7.1/dist/leaflet.js';
// Leaflet JS will be loaded globally if you add the script tag in index.html,
// or you can install it via npm and import it conventionally.
// For now, assuming it will be available globally or handle via script tag.

function MapPicker({ initialLatitude, initialLongitude, onLocationChange, readOnly = false }) {
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    // Check if Leaflet global object is available
    if (typeof window === 'undefined' || !window.L) {
      console.error("Leaflet.js is not loaded. Please ensure the Leaflet script is included in your index.html.");
      return;
    }

    // Initialize map only once
    if (!mapRef.current) {
      const defaultLat = initialLatitude || 30.0444; // Cairo latitude
      const defaultLng = initialLongitude || 31.2357; // Cairo longitude

      mapRef.current = window.L.map('map-picker-container').setView([defaultLat, defaultLng], 13);

      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(mapRef.current);

      markerRef.current = window.L.marker([defaultLat, defaultLng], { draggable: !readOnly }).addTo(mapRef.current);

      if (!readOnly) {
        markerRef.current.on('dragend', function (event) {
          const marker = event.target;
          const position = marker.getLatLng();
          onLocationChange(position.lat, position.lng);
        });

        mapRef.current.on('click', function (e) {
          const { lat, lng } = e.latlng;
          markerRef.current.setLatLng([lat, lng]);
          onLocationChange(lat, lng);
        });
      }
    } else {
      const newLat = initialLatitude || 0;
      const newLng = initialLongitude || 0;
      if (markerRef.current && (markerRef.current.getLatLng().lat !== newLat || markerRef.current.getLatLng().lng !== newLng)) {
        markerRef.current.setLatLng([newLat, newLng]);
        // Only update view if the new coordinates are different and valid
        if (newLat !== 0 || newLng !== 0) {
             mapRef.current.setView([newLat, newLng], mapRef.current.getZoom());
        }
      }
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [initialLatitude, initialLongitude, onLocationChange, readOnly]);

  return (
    <div id="map-picker-container" className="w-full h-80 rounded-md shadow-sm" style={{ zIndex: 1 }}></div>
  );
}

export default MapPicker;
