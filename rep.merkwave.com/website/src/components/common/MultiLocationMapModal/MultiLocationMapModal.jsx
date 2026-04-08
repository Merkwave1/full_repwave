import React, { useEffect, useRef, useState } from 'react';
import { XMarkIcon, MapPinIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

function MultiLocationMapModal({ isOpen, onClose, locations = [], title, onRefresh }) {
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);
  const markersRef = useRef([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!isOpen || !mapRef.current || locations.length === 0) return;

    // Load Leaflet CSS and JS if not already loaded
    const loadLeaflet = () => {
      return new Promise((resolve) => {
        if (window.L) {
          resolve();
          return;
        }

        // Load CSS
        if (!document.querySelector('link[href*="leaflet.css"]')) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
          link.crossOrigin = '';
          document.head.appendChild(link);
        }

        // Load JS
        if (!document.querySelector('script[src*="leaflet.js"]')) {
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
          script.crossOrigin = '';
          script.onload = () => resolve();
          document.head.appendChild(script);
        } else {
          resolve();
        }
      });
    };

    const initMap = async () => {
      await loadLeaflet();

      // Clear existing map
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }

      // Clear existing markers
      markersRef.current = [];

      // Calculate center point
      const centerLat = locations.reduce((sum, loc) => sum + parseFloat(loc.latitude), 0) / locations.length;
      const centerLng = locations.reduce((sum, loc) => sum + parseFloat(loc.longitude), 0) / locations.length;

      // Create map
      const map = window.L.map(mapRef.current).setView([centerLat, centerLng], 10);

      // Add OpenStreetMap tiles
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      leafletMapRef.current = map;

      // Helper function to get color based on time difference
      const getMarkerColor = (dateTimeStr) => {
        if (!dateTimeStr) return { bg: '#d1d5db', text: '#000000' }; // light grey
        
        const now = new Date();
        const past = new Date(dateTimeStr);
        const diffMs = now - past;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        
        // More than 1 day: light gray
        if (diffDays >= 1) return { bg: '#d1d5db', text: '#000000' };
        
        // 1 hour to 1 day (< 24 hours): red
        if (diffMins >= 60) return { bg: '#ef4444', text: '#ffffff' };
        
        // 10 minutes to 1 hour: green gradient (light to dark)
        if (diffMins >= 10) {
          const ratio = (diffMins - 10) / 50; // 0 to 1 over 50 minutes
          if (ratio < 0.25) return { bg: '#86efac', text: '#000000' }; // light green
          if (ratio < 0.5) return { bg: '#4ade80', text: '#000000' };
          if (ratio < 0.75) return { bg: '#22c55e', text: '#ffffff' };
          return { bg: '#16a34a', text: '#ffffff' }; // dark green
        }
        
        // 0-10 minutes: light green with black text
        return { bg: '#86efac', text: '#000000' };
      };

      // Helper function to get time ago
      const getTimeAgo = (dateTimeStr) => {
        if (!dateTimeStr) return '-';
        const now = new Date();
        const past = new Date(dateTimeStr);
        const diffMs = now - past;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        
        if (diffMins < 1) return 'الآن';
        if (diffMins < 60) return `منذ ${diffMins} د`;
        if (diffHours < 24) return `منذ ${diffHours} س`;
        return `منذ ${diffDays} ي`;
      };

      // Create custom icon with name
      const createNameIcon = (name, trackingTime, userRole = 'rep') => {
        const colors = getMarkerColor(trackingTime);
        const timeAgo = getTimeAgo(trackingTime);
        
        // Determine shape based on user role
        const isStoreKeeper = userRole === 'store_keeper';
        const borderRadius = isStoreKeeper ? '50%' : '8px'; // Circle for store_keeper, rounded square for rep
        const roleEmoji = isStoreKeeper ? '📦' : '👤'; // Box emoji for store keeper, person for rep
        
        return window.L.divIcon({
          className: 'custom-marker-icon',
          html: `
            <div style="
              background-color: ${colors.bg};
              color: ${colors.text};
              padding: 4px 8px;
              border-radius: ${borderRadius};
              font-weight: bold;
              font-size: 10px;
              border: 2px solid white;
              box-shadow: 0 2px 8px rgba(0,0,0,0.4);
              white-space: nowrap;
              text-align: center;
              font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
              max-width: 100px;
              overflow: hidden;
              text-overflow: ellipsis;
            ">
              <div style="font-size: 9px;">${roleEmoji} ${name}</div>
              <div style="
                font-size: 8px;
                font-weight: normal;
                margin-top: 1px;
                opacity: 0.9;
              ">${timeAgo}</div>
            </div>
          `,
          iconSize: [100, 40],
          iconAnchor: [50, 20],
          popupAnchor: [0, -20]
        });
      };

      // Add markers
      const bounds = [];
      locations.forEach((location) => {
        const lat = parseFloat(location.latitude);
        const lng = parseFloat(location.longitude);
        
        bounds.push([lat, lng]);

        const marker = window.L.marker([lat, lng], {
          icon: createNameIcon(location.users_name, location.tracking_time, location.users_role)
        }).addTo(map);

        // Create popup content
        const getTimeAgo = (dateTimeStr) => {
          if (!dateTimeStr) return '-';
          const now = new Date();
          const past = new Date(dateTimeStr);
          const diffMs = now - past;
          const diffMins = Math.floor(diffMs / 60000);
          const diffHours = Math.floor(diffMins / 60);
          const diffDays = Math.floor(diffHours / 24);
          
          if (diffMins < 1) return 'الآن';
          if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
          if (diffHours < 24) return `منذ ${diffHours} ساعة`;
          return `منذ ${diffDays} يوم`;
        };

        const getBatteryColor = (level) => {
          if (!level) return '#9ca3af';
          if (level >= 50) return '#16a34a';
          if (level >= 20) return '#eab308';
          return '#dc2626';
        };

        const getRoleLabel = (role) => {
          if (role === 'store_keeper') return '📦 أمين مخزن';
          return '👤 مندوب مبيعات';
        };

        const popupContent = `
          <div style="padding: 8px; font-family: Arial; direction: rtl; text-align: right; min-width: 200px;">
            <h3 style="margin: 0 0 8px 0; color: #1e40af; font-weight: bold; font-size: 16px;">
              ${location.users_name}
            </h3>
            <div style="font-size: 13px; color: #4b5563; line-height: 1.6;">
              <p style="margin: 4px 0;">
                <strong>👔 الوظيفة:</strong> ${getRoleLabel(location.users_role)}
              </p>
              <p style="margin: 4px 0;">
                <strong>📧 البريد:</strong> ${location.users_email || '-'}
              </p>
              <p style="margin: 4px 0;">
                <strong>📱 الهاتف:</strong> ${location.users_phone || '-'}
              </p>
              <p style="margin: 4px 0;">
                <strong style="color: ${getBatteryColor(location.battery_level)};">🔋 البطارية:</strong> 
                <span style="color: ${getBatteryColor(location.battery_level)}; font-weight: bold;">
                  ${location.battery_level ? location.battery_level + '%' : '-'}
                </span>
              </p>
              <p style="margin: 4px 0;">
                <strong>📱 الجهاز:</strong> ${location.phone_info || '-'}
              </p>
              <p style="margin: 4px 0; font-size: 12px; color: #6b7280;">
                <strong>🕒 آخر تحديث:</strong> ${getTimeAgo(location.tracking_time)}
              </p>
              <p style="margin: 4px 0; font-size: 11px; color: #9ca3af;">
                ${new Date(location.tracking_time).toLocaleString('ar-EG')}
              </p>
            </div>
          </div>
        `;

        marker.bindPopup(popupContent, {
          maxWidth: 300,
          className: 'custom-popup'
        });

        markersRef.current.push(marker);
      });

      // Fit map to show all markers
      if (bounds.length > 1) {
        map.fitBounds(bounds, {
          padding: [50, 50],
          maxZoom: 15
        });
      } else if (bounds.length === 1) {
        map.setView(bounds[0], 13);
      }

      // Add custom CSS for popup
      if (!document.querySelector('#leaflet-custom-popup-style')) {
        const style = document.createElement('style');
        style.id = 'leaflet-custom-popup-style';
        style.innerHTML = `
          .custom-popup .leaflet-popup-content-wrapper {
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          }
          .custom-popup .leaflet-popup-tip {
            background: white;
          }
        `;
        document.head.appendChild(style);
      }
    };

    initMap();

    // Cleanup
    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
      markersRef.current = [];
    };
  }, [isOpen, locations]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto" dir="rtl">
      <div className="flex items-center justify-center min-h-screen px-4 py-8">
        {/* Background overlay */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75"
          onClick={onClose}
        ></div>

        {/* Modal panel - with max height */}
        <div className="relative w-full max-w-6xl overflow-hidden text-right align-middle transition-all transform bg-white shadow-xl rounded-2xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 bg-gradient-to-l from-blue-600 to-blue-700 text-white flex-shrink-0">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <MapPinIcon className="h-6 w-6" />
                {title || 'عرض جميع المواقع'}
              </h3>
              <button
                onClick={onClose}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Content - scrollable */}
          <div className="px-6 py-6 overflow-y-auto flex-1">
            {/* Map Container - responsive height */}
            <div 
              ref={mapRef}
              style={{ height: 'min(500px, 50vh)', width: '100%' }}
              className="rounded-lg overflow-hidden border-2 border-gray-200 shadow-lg"
            />

            {/* Info */}
            <div className="mt-4 bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <MapPinIcon className="h-4 w-4 inline ml-1" />
                <strong>عدد المندوبين:</strong> {locations.length} مندوب
              </p>
              <p className="text-xs text-blue-600 mt-1">
                💡 انقر على أي علامة لعرض تفاصيل المندوب
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 flex items-center justify-end gap-3 flex-shrink-0">
            {onRefresh && (
              <button
                onClick={async () => {
                  setIsRefreshing(true);
                  await onRefresh();
                  setIsRefreshing(false);
                }}
                disabled={isRefreshing}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium flex items-center gap-2"
                title="تحديث البيانات"
              >
                <ArrowPathIcon className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'جاري التحديث...' : 'تحديث البيانات'}
              </button>
            )}
            <button
              onClick={onClose}
              className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MultiLocationMapModal;
