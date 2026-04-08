import React, { useEffect, useRef, useState } from 'react';
import { XMarkIcon, MapPinIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

function RouteMapModal({ isOpen, onClose, locations = [], repName, onRefresh }) {
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);
  const markersRef = useRef([]);
  const polylineRef = useRef(null);
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

    const formatTime = (datetime) => {
      const date = new Date(datetime);
      return date.toLocaleTimeString('ar-EG', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
    };

    const formatDate = (datetime) => {
      const date = new Date(datetime);
      return date.toLocaleDateString('ar-EG', { 
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    };

    const initMap = async () => {
      await loadLeaflet();

      // Clear existing map
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }

      // Sort locations by time (oldest to newest for route)
      const sortedLocations = [...locations].sort((a, b) => 
        new Date(a.tracking_time) - new Date(b.tracking_time)
      );

      // Initialize map
      const map = window.L.map(mapRef.current);
      leafletMapRef.current = map;

      // Add OpenStreetMap tile layer
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(map);

      // Create array of coordinates for the polyline
      const routeCoordinates = sortedLocations.map(loc => [loc.latitude, loc.longitude]);

      // Draw polyline (route)
      const polyline = window.L.polyline(routeCoordinates, {
        color: '#3b82f6', // Blue color
        weight: 3,
        opacity: 0.6,
        smoothFactor: 1
      }).addTo(map);
      polylineRef.current = polyline;

      // Array to store all markers
      const allMarkers = [];

      // Add circle markers for ALL points along the route (including start and end)
      sortedLocations.forEach((location, index) => {
        const isStart = index === 0;
        const isEnd = index === sortedLocations.length - 1;
        
        // Determine color and size based on position
        let fillColor, color, radius, zIndex;
        if (isStart) {
          fillColor = '#22c55e'; // Green for start
          color = '#ffffff';
          radius = 8;
          zIndex = 1000;
        } else if (isEnd) {
          fillColor = '#ef4444'; // Red for end
          color = '#ffffff';
          radius = 8;
          zIndex = 1000;
        } else {
          fillColor = '#3b82f6'; // Blue for intermediate points
          color = '#ffffff';
          radius = 5;
          zIndex = 500;
        }

        // Create a circle marker for each point
        const circleMarker = window.L.circleMarker([location.latitude, location.longitude], {
          radius: radius,
          fillColor: fillColor,
          color: color,
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9,
          zIndexOffset: zIndex
        }).addTo(map);

        // Create popup content
        let pointLabel = '';
        if (isStart) {
          pointLabel = '🟢 بداية المسار';
        } else if (isEnd) {
          pointLabel = '🔴 نهاية المسار';
        } else {
          pointLabel = `نقطة ${index + 1} من ${sortedLocations.length}`;
        }

        // Add popup with time and details
        circleMarker.bindPopup(`
          <div style="text-align: right; direction: rtl; min-width: 180px;">
            <div style="font-weight: bold; font-size: 13px; color: ${fillColor}; margin-bottom: 6px;">
              ${pointLabel}
            </div>
            <div style="font-size: 12px; margin-bottom: 4px;">
              <strong>الوقت:</strong> ${formatTime(location.tracking_time)}
            </div>
            <div style="font-size: 11px; margin-bottom: 3px;">
              <strong>التاريخ:</strong> ${formatDate(location.tracking_time)}
            </div>
            <div style="font-size: 11px; margin-bottom: 3px;">
              <strong>البطارية:</strong> ${location.battery_level || '-'}%
            </div>
            <div style="font-size: 10px; color: #666;">
              ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}
            </div>
          </div>
        `);

        // Add tooltip that shows on hover - always show time
        circleMarker.bindTooltip(formatTime(location.tracking_time), {
          permanent: false,
          direction: 'top',
          offset: [0, -10],
          className: 'route-point-tooltip'
        });

        allMarkers.push(circleMarker);
      });

      markersRef.current = allMarkers;
      markersRef.current = allMarkers;

      // Fit map to show entire route
      map.fitBounds(polyline.getBounds(), {
        padding: [50, 50]
      });

      // Add custom CSS for markers and tooltips
      if (!document.getElementById('route-map-marker-styles')) {
        const style = document.createElement('style');
        style.id = 'route-map-marker-styles';
        style.textContent = `
          .custom-marker-icon {
            background: transparent !important;
            border: none !important;
          }
          .route-point-tooltip {
            background: rgba(59, 130, 246, 0.95) !important;
            border: 2px solid white !important;
            border-radius: 6px !important;
            color: white !important;
            font-weight: bold !important;
            font-size: 11px !important;
            padding: 4px 8px !important;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3) !important;
          }
          .route-point-tooltip::before {
            border-top-color: rgba(59, 130, 246, 0.95) !important;
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
      polylineRef.current = null;
    };
  }, [isOpen, locations]);

  if (!isOpen) return null;

  // Calculate route statistics
  const sortedLocations = [...locations].sort((a, b) => 
    new Date(a.tracking_time) - new Date(b.tracking_time)
  );
  
  const startTime = sortedLocations[0]?.tracking_time;
  const endTime = sortedLocations[sortedLocations.length - 1]?.tracking_time;
  
  // Haversine formula to calculate distance between two coordinates
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
  };
  
  const calculateTotalDistance = () => {
    if (sortedLocations.length < 2) return 0;
    
    let totalDistance = 0;
    for (let i = 0; i < sortedLocations.length - 1; i++) {
      const current = sortedLocations[i];
      const next = sortedLocations[i + 1];
      totalDistance += calculateDistance(
        current.latitude,
        current.longitude,
        next.latitude,
        next.longitude
      );
    }
    
    return totalDistance;
  };
  
  const calculateDuration = () => {
    if (!startTime || !endTime) return '-';
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end - start;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours} ساعة و ${minutes} دقيقة`;
    }
    return `${minutes} دقيقة`;
  };
  
  const totalDistanceKm = calculateTotalDistance();
  const formattedDistance = totalDistanceKm > 0 
    ? totalDistanceKm >= 1 
      ? `${totalDistanceKm.toFixed(2)} كم` 
      : `${(totalDistanceKm * 1000).toFixed(0)} متر`
    : '-';

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
                عرض مسار الحركة - {repName}
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
            {/* Route Statistics - 4 Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              {/* Start Time */}
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="text-xs text-green-600 mb-1">بداية المسار</div>
                <div className="text-sm font-bold text-green-700">
                  {startTime ? new Date(startTime).toLocaleTimeString('ar-EG', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  }) : '-'}
                </div>
              </div>
              
              {/* End Time */}
              <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                <div className="text-xs text-red-600 mb-1">نهاية المسار</div>
                <div className="text-sm font-bold text-red-700">
                  {endTime ? new Date(endTime).toLocaleTimeString('ar-EG', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  }) : '-'}
                </div>
              </div>
              
              {/* Duration */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="text-xs text-blue-600 mb-1">مدة التحرك</div>
                <div className="text-sm font-bold text-blue-700">
                  {calculateDuration()}
                </div>
              </div>
              
              {/* Distance */}
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <div className="text-xs text-purple-600 mb-1">المسافة المقطوعة</div>
                <div className="text-sm font-bold text-purple-700">
                  {formattedDistance}
                </div>
              </div>
            </div>

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
                <strong>عدد النقاط:</strong> {locations.length} نقطة
              </p>
              <p className="text-xs text-blue-600 mt-1">
                💡 الخط الأزرق يوضح مسار الحركة من البداية (🟢) إلى النهاية (🔴)
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
                {isRefreshing ? 'جاري التحديث...' : 'تحديث'}
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

export default RouteMapModal;
