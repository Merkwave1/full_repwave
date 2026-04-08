// src/components/dashboard/tabs/users/modals/RepresentativeSettingsModal.jsx
import React, { useState, useEffect } from 'react';
import {
  XMarkIcon,
  MapPinIcon,
  SignalIcon,
  CheckCircleIcon,
  BuildingStorefrontIcon,
  WalletIcon,
} from '@heroicons/react/24/outline';
import { getRepresentativeSettings, upsertRepresentativeSettings } from '../../../../../apis/representativeSettings.js';
import { getCachedEntityData } from '../../../../../utils/entityCache.js';
import { getUserWarehouses, updateUserWarehouses } from '../../../../../apis/userWarehouses.js';
import { getAllWarehouses } from '../../../../../apis/warehouses.js';
import { getUserSafes, updateUserSafes } from '../../../../../apis/userSafes.js';
import { getSafes } from '../../../../../apis/safes.js';
import LocationMapModal from '../../../../common/LocationMapModal/LocationMapModal.jsx';
import toast from 'react-hot-toast';

const toBooleanFlag = (value, fallback = false) => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === '1' || normalized === 'true') return true;
    if (normalized === '0' || normalized === 'false') return false;
  }
  return fallback;
};

function RepresentativeSettingsModal({ isOpen, onClose, user }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [mapModalType, setMapModalType] = useState('start'); // 'start' or 'end'
  
  // Warehouse states for store_keeper
  const [allWarehouses, setAllWarehouses] = useState([]);
  const [selectedWarehouseIds, setSelectedWarehouseIds] = useState([]);
  const [warehousesLoading, setWarehousesLoading] = useState(false);

  // Safe states for cash role
  const [allSafes, setAllSafes] = useState([]);
  const [selectedSafeIds, setSelectedSafeIds] = useState([]);
  const [safesLoading, setSafesLoading] = useState(false);
  
  const [settings, setSettings] = useState({
    user_id: null,
    work_start_latitude: '',
    work_start_longitude: '',
    work_end_latitude: '',
    work_end_longitude: '',
  gps_min_acceptable_accuracy_m: 10.00,
  gps_tracking_interval_sec: 300,
  gps_tracking_enabled: false,
    allow_out_of_plan_visits: true,
  allow_start_work_from_anywhere: false,
  allow_end_work_from_anywhere: false,
    allow_start_visit_from_anywhere: true,
    allow_end_visit_from_anywhere: true,
  });

  // Get company location from settings in localStorage
  const getCompanyLocation = () => {
    try {
      const cachedSettings = getCachedEntityData('settings');
      if (cachedSettings && Array.isArray(cachedSettings)) {
        const latSetting = cachedSettings.find(s => s.settings_key === 'company_lat');
        const lngSetting = cachedSettings.find(s => s.settings_key === 'company_lng');
        
        return {
          lat: latSetting ? parseFloat(latSetting.settings_value) : 30.0444,
          lng: lngSetting ? parseFloat(lngSetting.settings_value) : 31.2357
        };
      }
    } catch (error) {
      console.error('Error getting company location:', error);
    }
    // Default to Cairo coordinates
    return { lat: 30.0444, lng: 31.2357 };
  };

  const openMapModal = (type) => {
    setMapModalType(type);
    setMapModalOpen(true);
  };

  const handleLocationSelect = (lat, lng) => {
    if (mapModalType === 'start') {
      setSettings(prev => ({
        ...prev,
        work_start_latitude: lat,
        work_start_longitude: lng
      }));
    } else {
      setSettings(prev => ({
        ...prev,
        work_end_latitude: lat,
        work_end_longitude: lng
      }));
    }
  };

  // Toggle component used across rows
  const ToggleSwitch = ({ checked, onClick, ariaLabel }) => (
    <div
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(e);
        }
      }}
      className="inline-flex items-center cursor-pointer"
    >
      <div className={`w-11 h-6 rounded-full relative transition-colors ${checked ? 'bg-green-600' : 'bg-red-200'}`}>
        <div className={`absolute top-0.5 ${checked ? 'right-0.5' : 'left-0.5'} h-5 w-5 bg-white rounded-full shadow transform transition-transform`} />
      </div>
    </div>
  );

  const handleInputChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleToggleClick = (field) => () => {
    setSettings(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const loadSettings = async () => {
    if (!user || !user.users_id) return;
    setLoading(true);
    try {
      // Load representative settings (for all roles)
      const data = await getRepresentativeSettings(user.users_id);
      if (data) {
        setSettings(prev => ({
          ...prev,
          user_id: user.users_id,
          work_start_latitude: data.work_start_latitude ?? '',
          work_start_longitude: data.work_start_longitude ?? '',
          work_end_latitude: data.work_end_latitude ?? '',
          work_end_longitude: data.work_end_longitude ?? '',
          gps_min_acceptable_accuracy_m: data.gps_min_acceptable_accuracy_m != null
            ? parseFloat(data.gps_min_acceptable_accuracy_m)
            : prev.gps_min_acceptable_accuracy_m,
          gps_tracking_interval_sec: data.gps_tracking_interval_sec != null
            ? parseInt(data.gps_tracking_interval_sec)
            : prev.gps_tracking_interval_sec,
          gps_tracking_enabled: toBooleanFlag(data.gps_tracking_enabled, false),
          allow_out_of_plan_visits: toBooleanFlag(data.allow_out_of_plan_visits, true),
          allow_start_work_from_anywhere: toBooleanFlag(data.allow_start_work_from_anywhere, false),
          allow_end_work_from_anywhere: toBooleanFlag(data.allow_end_work_from_anywhere, false),
          allow_start_visit_from_anywhere: toBooleanFlag(data.allow_start_visit_from_anywhere, true),
          allow_end_visit_from_anywhere: toBooleanFlag(data.allow_end_visit_from_anywhere, true),
        }));
      } else {
        setSettings(prev => ({ ...prev, user_id: user.users_id }));
      }

      // Load warehouses for store_keeper
      if (user.users_role === 'store_keeper') {
        setWarehousesLoading(true);
        try {
          // Load all available warehouses
          const warehousesData = await getAllWarehouses();
          setAllWarehouses(warehousesData);

          // Load user's assigned warehouses
          const userWarehousesData = await getUserWarehouses(user.users_id);
          const assignedWarehouseIds = userWarehousesData.map(uw => uw.warehouse_id);
          setSelectedWarehouseIds(assignedWarehouseIds);
        } catch (error) {
          console.error('Error loading warehouses:', error);
          toast.error('فشل في جلب بيانات المخازن');
        } finally {
          setWarehousesLoading(false);
        }
      }

      // Load safes for cash role
      if (user.users_role === 'cash') {
        setSafesLoading(true);
        try {
          // Load all available safes
          const safesData = await getSafes();
          setAllSafes(safesData.safes || []);

          // Load user's assigned safes
          const userSafesData = await getUserSafes(user.users_id);
          const assignedSafeIds = userSafesData.map(us => us.safe_id);
          setSelectedSafeIds(assignedSafeIds);
        } catch (error) {
          console.error('Error loading safes:', error);
          toast.error('فشل في جلب بيانات الخزن');
        } finally {
          setSafesLoading(false);
        }
      }
    } catch (error) {
      console.error('Error loading representative settings:', error);
      toast.error(error.message || 'فشل في جلب الإعدادات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, user?.users_id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save representative settings (for all roles)
      const dataToSubmit = {
        user_id: user.users_id,
        work_start_latitude: settings.work_start_latitude || null,
        work_start_longitude: settings.work_start_longitude || null,
        work_end_latitude: settings.work_end_latitude || null,
        work_end_longitude: settings.work_end_longitude || null,
        gps_min_acceptable_accuracy_m: parseFloat(settings.gps_min_acceptable_accuracy_m) || 10.00,
        gps_tracking_interval_sec: parseInt(settings.gps_tracking_interval_sec) || 300,
        gps_tracking_enabled: settings.gps_tracking_enabled ? 1 : 0,
        allow_out_of_plan_visits: settings.allow_out_of_plan_visits ? 1 : 0,
        allow_start_work_from_anywhere: settings.allow_start_work_from_anywhere ? 1 : 0,
        allow_end_work_from_anywhere: settings.allow_end_work_from_anywhere ? 1 : 0,
        allow_start_visit_from_anywhere: settings.allow_start_visit_from_anywhere ? 1 : 0,
        allow_end_visit_from_anywhere: settings.allow_end_visit_from_anywhere ? 1 : 0,
      };

      await upsertRepresentativeSettings(dataToSubmit);

      // Save warehouses for store_keeper
      if (user.users_role === 'store_keeper') {
        await updateUserWarehouses(user.users_id, selectedWarehouseIds);
      }

      // Save safes for cash role
      if (user.users_role === 'cash') {
        await updateUserSafes(user.users_id, selectedSafeIds);
      }

      toast.success('تم حفظ الإعدادات بنجاح');
      onClose();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error(error.message || 'فشل في حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" dir="rtl">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        ></div>

        {/* Modal panel */}
        <div className="inline-block w-full max-w-3xl my-8 overflow-hidden text-right align-middle transition-all transform bg-white shadow-xl rounded-2xl">
          {/* Header */}
          <div className="px-6 py-4 bg-gradient-to-l from-blue-600 to-blue-700 text-white">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <MapPinIcon className="h-6 w-6" />
                إعدادات المستخدم
              </h3>
              <button
                onClick={onClose}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            {user && (
              <p className="mt-2 text-sm text-blue-100">
                المستخدم: <span className="font-semibold">{user.users_name}</span>
              </p>
            )}
          </div>

          {/* Content */}
          <div className="px-6 py-6 max-h-[70vh] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Warehouse Selection Section - Only for store_keeper */}
                {user?.users_role === 'store_keeper' && (
                  <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                    <div className="flex items-center gap-3 mb-4">
                      <BuildingStorefrontIcon className="h-6 w-6 text-amber-600" />
                      <div>
                        <h4 className="text-lg font-semibold text-gray-800">المخازن المتاحة</h4>
                        <p className="text-xs text-gray-600 mt-0.5">اختر المخازن التي يمكن لأمين المخزن التحكم بها</p>
                      </div>
                    </div>
                    
                    {warehousesLoading ? (
                      <div className="flex items-center justify-center py-6">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
                      </div>
                    ) : allWarehouses.length === 0 ? (
                      <p className="text-center text-gray-500 py-4">لا توجد مخازن متاحة</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                        {/* Sort warehouses: Main first, then Van */}
                        {[...allWarehouses]
                          .sort((a, b) => {
                            // Main warehouses first
                            if (a.warehouse_type === 'Main' && b.warehouse_type !== 'Main') return -1;
                            if (a.warehouse_type !== 'Main' && b.warehouse_type === 'Main') return 1;
                            // Then sort by name
                            return a.warehouse_name.localeCompare(b.warehouse_name, 'ar');
                          })
                          .map((warehouse) => {
                            const warehouseTypeLabel = warehouse.warehouse_type === 'Main' 
                              ? 'مخزن رئيسي' 
                              : warehouse.warehouse_type === 'Van'
                                ? 'مخزن سيارة'
                                : warehouse.warehouse_type;
                            
                            const isMainWarehouse = warehouse.warehouse_type === 'Main';
                            
                            return (
                              <label
                                key={warehouse.warehouse_id}
                                className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                  selectedWarehouseIds.includes(warehouse.warehouse_id)
                                    ? isMainWarehouse
                                      ? 'border-blue-500 bg-blue-100'
                                      : 'border-amber-500 bg-amber-100'
                                    : isMainWarehouse
                                      ? 'border-blue-200 bg-blue-50 hover:border-blue-300'
                                      : 'border-gray-200 bg-white hover:border-amber-300'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedWarehouseIds.includes(warehouse.warehouse_id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedWarehouseIds(prev => [...prev, warehouse.warehouse_id]);
                                    } else {
                                      setSelectedWarehouseIds(prev => prev.filter(id => id !== warehouse.warehouse_id));
                                    }
                                  }}
                                  className={`w-5 h-5 border-gray-300 rounded focus:ring-2 ${
                                    isMainWarehouse 
                                      ? 'text-blue-600 focus:ring-blue-500' 
                                      : 'text-amber-600 focus:ring-amber-500'
                                  }`}
                                />
                                <div className="flex-1">
                                  <p className="font-semibold text-gray-800 flex items-center gap-2">
                                    {warehouse.warehouse_name}
                                    {isMainWarehouse && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-600 text-white">
                                        رئيسي
                                      </span>
                                    )}
                                  </p>
                                  <p className="text-xs text-gray-600">
                                    {warehouseTypeLabel} • {warehouse.warehouse_code}
                                  </p>
                                </div>
                              </label>
                            );
                          })}
                      </div>
                    )}
                    
                    <div className="mt-3 text-sm text-gray-600">
                      <span className="font-semibold">{selectedWarehouseIds.length}</span> مخزن محدد
                    </div>
                  </div>
                )}

                {/* Safe Selection Section - Only for cash role */}
                {user?.users_role === 'cash' && (
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-3 mb-4">
                      <WalletIcon className="h-6 w-6 text-green-600" />
                      <div>
                        <h4 className="text-lg font-semibold text-gray-800">الخزن المتاحة</h4>
                        <p className="text-xs text-gray-600 mt-0.5">اختر الخزن التي يمكن للكاش التحكم بها</p>
                      </div>
                    </div>
                    
                    {safesLoading ? (
                      <div className="flex items-center justify-center py-6">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                      </div>
                    ) : allSafes.length === 0 ? (
                      <p className="text-center text-gray-500 py-4">لا توجد خزن متاحة</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                        {allSafes
                          .sort((a, b) => a.safes_name.localeCompare(b.safes_name, 'ar'))
                          .map((safe) => {
                            const safeTypeLabel = safe.safes_type === 'company' 
                              ? 'خزينة شركة' 
                              : safe.safes_type === 'rep'
                                ? 'خزينة مندوب'
                                : safe.safes_type === 'cash'
                                  ? 'خزينة كاش'
                                  : safe.safes_type;
                            
                            const isCompanySafe = safe.safes_type === 'company';
                            
                            return (
                              <label
                                key={safe.safes_id}
                                className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                  selectedSafeIds.includes(safe.safes_id)
                                    ? isCompanySafe
                                      ? 'border-blue-500 bg-blue-100'
                                      : 'border-green-500 bg-green-100'
                                    : isCompanySafe
                                      ? 'border-blue-200 bg-blue-50 hover:border-blue-300'
                                      : 'border-gray-200 bg-white hover:border-green-300'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedSafeIds.includes(safe.safes_id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedSafeIds(prev => [...prev, safe.safes_id]);
                                    } else {
                                      setSelectedSafeIds(prev => prev.filter(id => id !== safe.safes_id));
                                    }
                                  }}
                                  className={`w-5 h-5 border-gray-300 rounded focus:ring-2 ${
                                    isCompanySafe 
                                      ? 'text-blue-600 focus:ring-blue-500' 
                                      : 'text-green-600 focus:ring-green-500'
                                  }`}
                                />
                                <div className="flex-1">
                                  <p className="font-semibold text-gray-800 flex items-center gap-2">
                                    {safe.safes_name}
                                    {isCompanySafe && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-600 text-white">
                                        شركة
                                      </span>
                                    )}
                                  </p>
                                  <p className="text-xs text-gray-600">
                                    {safeTypeLabel} • {safe.safes_balance}
                                  </p>
                                </div>
                              </label>
                            );
                          })}
                      </div>
                    )}
                    
                    <div className="mt-3 text-sm text-gray-600">
                      <span className="font-semibold">{selectedSafeIds.length}</span> خزينة محددة
                    </div>
                  </div>
                )}

                {/* Work Start Location Section */}
                <div>
                  {/* Toggle and Header Row */}
                  <div className="flex items-center justify-between mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200 border-b pb-6">
                    <div className="flex items-center gap-3">
                      <MapPinIcon className="h-5 w-5 text-blue-600" />
                      <div>
                        <h4 className="text-lg font-semibold text-gray-800">تحديد موقع بداية العمل</h4>
                        <p className="text-xs text-gray-600 mt-0.5">تفعيل لتحديد موقع محدد لبداية العمل</p>
                        <p className="text-xs text-gray-500 mt-1">⚠️ إلغاء التفعيل يسمح للمندوب ببدء العمل من أي مكان</p>
                      </div>
                    </div>
                    <ToggleSwitch
                      checked={!settings.allow_start_work_from_anywhere}
                      onClick={handleToggleClick('allow_start_work_from_anywhere')}
                      ariaLabel="تحديد موقع بداية العمل"
                    />
                  </div>

                  {/* Location Inputs - show when toggle is ON (false = enabled) */}
                  {!settings.allow_start_work_from_anywhere && (
                    <div className="mt-4">
                        <div className="flex items-center justify-end mb-3">
                        <button
                          onClick={() => openMapModal('start')}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                        >
                          <MapPinIcon className="h-4 w-4" />
                          اختر من الخريطة
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            خط العرض (Latitude)
                          </label>
                          <input
                            type="number"
                            step="0.0000001"
                            value={settings.work_start_latitude}
                            onChange={(e) => handleInputChange('work_start_latitude', e.target.value)}
                            placeholder="30.0444"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            خط الطول (Longitude)
                          </label>
                          <input
                            type="number"
                            step="0.0000001"
                            value={settings.work_start_longitude}
                            onChange={(e) => handleInputChange('work_start_longitude', e.target.value)}
                            placeholder="31.2357"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Work End Location Section */}
                <div>
                  {/* Toggle and Header Row */}
                  <div className="flex items-center justify-between mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200 border-b pb-6">
                    <div className="flex items-center gap-3">
                      <MapPinIcon className="h-5 w-5 text-blue-600" />
                      <div>
                        <h4 className="text-lg font-semibold text-gray-800">تحديد موقع نهاية العمل</h4>
                        <p className="text-xs text-gray-600 mt-0.5">تفعيل لتحديد موقع محدد لنهاية العمل</p>
                        <p className="text-xs text-gray-500 mt-1">⚠️ إلغاء التفعيل يسمح للمندوب بإنهاء العمل من أي مكان</p>
                      </div>
                    </div>
                    <ToggleSwitch
                      checked={!settings.allow_end_work_from_anywhere}
                      onClick={handleToggleClick('allow_end_work_from_anywhere')}
                      ariaLabel="تحديد موقع نهاية العمل"
                    />
                  </div>

                  {/* Location Inputs - Only show if toggle is ON (false = enabled) */}
                  {!settings.allow_end_work_from_anywhere && (
                    <div className="mt-4">
                        <div className="flex items-center justify-end mb-3">
                        <button
                          onClick={() => openMapModal('end')}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                        >
                          <MapPinIcon className="h-4 w-4" />
                          اختر من الخريطة
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            خط العرض (Latitude)
                          </label>
                          <input
                            type="number"
                            step="0.0000001"
                            value={settings.work_end_latitude}
                            onChange={(e) => handleInputChange('work_end_latitude', e.target.value)}
                            placeholder="30.0444"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            خط الطول (Longitude)
                          </label>
                          <input
                            type="number"
                            step="0.0000001"
                            value={settings.work_end_longitude}
                            onChange={(e) => handleInputChange('work_end_longitude', e.target.value)}
                            placeholder="31.2357"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>


                {/* Toggles */}
                <div className="space-y-4">

                  {/* Allow Out of Plan Visits - Hidden for store_keeper and cash */}
                  {user?.users_role !== 'store_keeper' && user?.users_role !== 'cash' && (
                    <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200 border-b pb-6">
                      <div className="flex items-center gap-3">
                        <CheckCircleIcon className="h-5 w-5 text-blue-600" />
                        <div>
                          <h4 className="text-lg font-semibold text-gray-800">السماح بزيارات خارج الخطة</h4>
                          <p className="text-xs text-gray-600 mt-0.5">إمكانية إضافة زيارات غير مخططة</p>
                        </div>
                      </div>
                      <ToggleSwitch
                        checked={settings.allow_out_of_plan_visits}
                        onClick={handleToggleClick('allow_out_of_plan_visits')}
                        ariaLabel="السماح بزيارات خارج الخطة"
                      />
                    </div>
                  )}

                  {/* Allow Start Visit from Anywhere - Hidden for store_keeper and cash */}
                  {user?.users_role !== 'store_keeper' && user?.users_role !== 'cash' && (
                    <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200 border-b pb-6">
                      <div className="flex items-center gap-3">
                        <MapPinIcon className="h-5 w-5 text-blue-600" />
                        <div>
                          <h4 className="text-lg font-semibold text-gray-800">السماح ببدء الزيارة من أي مكان</h4>
                          <p className="text-xs text-gray-600 mt-0.5">عدم الالتزام بموقع العميل عند بدء الزيارة</p>
                        </div>
                      </div>
                      <ToggleSwitch
                        checked={settings.allow_start_visit_from_anywhere}
                        onClick={handleToggleClick('allow_start_visit_from_anywhere')}
                        ariaLabel="السماح ببدء الزيارة من أي مكان"
                      />
                    </div>
                  )}

                  {/* Allow End Visit from Anywhere - Hidden for store_keeper and cash */}
                  {user?.users_role !== 'store_keeper' && user?.users_role !== 'cash' && (
                    <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200 border-b pb-6">
                      <div className="flex items-center gap-3">
                        <MapPinIcon className="h-5 w-5 text-blue-600" />
                        <div>
                          <h4 className="text-lg font-semibold text-gray-800">السماح بإنهاء الزيارة من أي مكان</h4>
                          <p className="text-xs text-gray-600 mt-0.5">عدم الالتزام بموقع العميل عند إنهاء الزيارة</p>
                        </div>
                      </div>
                      <ToggleSwitch
                        checked={settings.allow_end_visit_from_anywhere}
                        onClick={handleToggleClick('allow_end_visit_from_anywhere')}
                        ariaLabel="السماح بإنهاء الزيارة من أي مكان"
                      />
                    </div>
                  )}

                  {/* GPS Tracking Enabled - moved to bottom - Hidden for store_keeper and cash */}
                  {user?.users_role !== 'store_keeper' && user?.users_role !== 'cash' && (
                    <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200 border-b pb-6">
                      <div className="flex items-center gap-3">
                        <SignalIcon className="h-5 w-5 text-blue-600" />
                        <div>
                          <h4 className="text-lg font-semibold text-gray-800">تفعيل تتبع GPS</h4>
                          <p className="text-xs text-gray-600 mt-0.5">تتبع موقع المندوب في الخلفية</p>
                        </div>
                      </div>
                      <ToggleSwitch
                        checked={settings.gps_tracking_enabled}
                        onClick={handleToggleClick('gps_tracking_enabled')}
                        ariaLabel="تفعيل تتبع GPS"
                      />
                    </div>
                  )}

                  {/* GPS accuracy input moved to its own standalone card below */}
                </div>

                {/* GPS Accuracy - standalone card (input inside the card) */}
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 border-b pb-6">
                  <div className="flex items-center gap-3 mb-4">
                    <SignalIcon className="h-5 w-5 text-blue-600" />
                    <div>
                      <h4 className="text-lg font-semibold text-gray-800">دقة GPS المطلوبة (متر)</h4>
                      <p className="text-xs text-gray-600 mt-0.5">القيم الأقل تعني دقة أعلى</p>
                    </div>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    value={settings.gps_min_acceptable_accuracy_m}
                    onChange={(e) => handleInputChange('gps_min_acceptable_accuracy_m', e.target.value)}
                    placeholder="10.00"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={saving}
            >
              إلغاء
            </button>
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  جاري الحفظ...
                </>
              ) : (
                'حفظ الإعدادات'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Location Map Modal */}
      <LocationMapModal
        isOpen={mapModalOpen}
        onClose={() => setMapModalOpen(false)}
        onSelectLocation={handleLocationSelect}
        title={mapModalType === 'start' ? 'اختر موقع بداية العمل' : 'اختر موقع نهاية العمل'}
        initialLat={
          mapModalType === 'start' 
            ? (settings.work_start_latitude || getCompanyLocation().lat)
            : (settings.work_end_latitude || getCompanyLocation().lat)
        }
        initialLng={
          mapModalType === 'start' 
            ? (settings.work_start_longitude || getCompanyLocation().lng)
            : (settings.work_end_longitude || getCompanyLocation().lng)
        }
      />
    </div>
  );
}

export default RepresentativeSettingsModal;
