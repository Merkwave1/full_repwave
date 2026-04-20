// src/components/dashboard/tabs/users/modals/RepresentativeSettingsModal.jsx
import React, { useState, useEffect } from "react";
import {
  XMarkIcon,
  MapPinIcon,
  SignalIcon,
  CheckCircleIcon,
  BuildingStorefrontIcon,
  WalletIcon,
} from "@heroicons/react/24/outline";
import {
  getRepresentativeSettings,
  upsertRepresentativeSettings,
} from "../../../../../apis/representativeSettings.js";
import { getCachedEntityData } from "../../../../../utils/entityCache.js";
import {
  getUserWarehouses,
  updateUserWarehouses,
} from "../../../../../apis/userWarehouses.js";
import { getAllWarehouses } from "../../../../../apis/warehouses.js";
import {
  getUserSafes,
  updateUserSafes,
} from "../../../../../apis/userSafes.js";
import { getSafes } from "../../../../../apis/safes.js";
import LocationMapModal from "../../../../common/LocationMapModal/LocationMapModal.jsx";
import toast from "react-hot-toast";

const toBooleanFlag = (value, fallback = false) => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "1" || normalized === "true") return true;
    if (normalized === "0" || normalized === "false") return false;
  }
  return fallback;
};

function RepresentativeSettingsModal({ isOpen, onClose, user }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [mapModalType, setMapModalType] = useState("start"); // 'start' or 'end'

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
    work_start_latitude: "",
    work_start_longitude: "",
    work_end_latitude: "",
    work_end_longitude: "",
    gps_min_acceptable_accuracy_m: 10.0,
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
      const cachedSettings = getCachedEntityData("settings");
      if (cachedSettings && Array.isArray(cachedSettings)) {
        const latSetting = cachedSettings.find(
          (s) => s.settings_key === "company_lat",
        );
        const lngSetting = cachedSettings.find(
          (s) => s.settings_key === "company_lng",
        );

        return {
          lat: latSetting ? parseFloat(latSetting.settings_value) : 30.0444,
          lng: lngSetting ? parseFloat(lngSetting.settings_value) : 31.2357,
        };
      }
    } catch (error) {
      console.error("Error getting company location:", error);
    }
    // Default to Cairo coordinates
    return { lat: 30.0444, lng: 31.2357 };
  };

  const openMapModal = (type) => {
    setMapModalType(type);
    setMapModalOpen(true);
  };

  const handleLocationSelect = (lat, lng) => {
    if (mapModalType === "start") {
      setSettings((prev) => ({
        ...prev,
        work_start_latitude: lat,
        work_start_longitude: lng,
      }));
    } else {
      setSettings((prev) => ({
        ...prev,
        work_end_latitude: lat,
        work_end_longitude: lng,
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
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick(e);
        }
      }}
      className="inline-flex items-center cursor-pointer"
    >
      <div
        className={`w-11 h-6 rounded-full relative transition-colors ${checked ? "bg-green-600" : "bg-red-200"}`}
      >
        <div
          className={`absolute top-0.5 ${checked ? "right-0.5" : "left-0.5"} h-5 w-5 bg-white rounded-full shadow transform transition-transform`}
        />
      </div>
    </div>
  );

  const handleInputChange = (field, value) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleToggleClick = (field) => () => {
    setSettings((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const loadSettings = async () => {
    if (!user || !user.users_id) return;
    setLoading(true);
    try {
      // Load representative settings (for all roles)
      const data = await getRepresentativeSettings(user.users_id);
      if (data) {
        setSettings((prev) => ({
          ...prev,
          user_id: user.users_id,
          work_start_latitude: data.work_start_latitude ?? "",
          work_start_longitude: data.work_start_longitude ?? "",
          work_end_latitude: data.work_end_latitude ?? "",
          work_end_longitude: data.work_end_longitude ?? "",
          gps_min_acceptable_accuracy_m:
            data.gps_min_acceptable_accuracy_m != null
              ? parseFloat(data.gps_min_acceptable_accuracy_m)
              : prev.gps_min_acceptable_accuracy_m,
          gps_tracking_interval_sec:
            data.gps_tracking_interval_sec != null
              ? parseInt(data.gps_tracking_interval_sec)
              : prev.gps_tracking_interval_sec,
          gps_tracking_enabled: toBooleanFlag(data.gps_tracking_enabled, false),
          allow_out_of_plan_visits: toBooleanFlag(
            data.allow_out_of_plan_visits,
            true,
          ),
          allow_start_work_from_anywhere: toBooleanFlag(
            data.allow_start_work_from_anywhere,
            false,
          ),
          allow_end_work_from_anywhere: toBooleanFlag(
            data.allow_end_work_from_anywhere,
            false,
          ),
          allow_start_visit_from_anywhere: toBooleanFlag(
            data.allow_start_visit_from_anywhere,
            true,
          ),
          allow_end_visit_from_anywhere: toBooleanFlag(
            data.allow_end_visit_from_anywhere,
            true,
          ),
        }));
      } else {
        setSettings((prev) => ({ ...prev, user_id: user.users_id }));
      }

      // Load warehouses for store_keeper
      if (user.users_role === "store_keeper") {
        setWarehousesLoading(true);
        try {
          // Load all available warehouses
          const warehousesData = await getAllWarehouses();
          setAllWarehouses(warehousesData);

          // Load user's assigned warehouses
          const userWarehousesData = await getUserWarehouses(user.users_id);
          const assignedWarehouseIds = userWarehousesData.map(
            (uw) => uw.warehouse_id,
          );
          setSelectedWarehouseIds(assignedWarehouseIds);
        } catch (error) {
          console.error("Error loading warehouses:", error);
          toast.error("فشل في جلب بيانات المخازن");
        } finally {
          setWarehousesLoading(false);
        }
      }

      // Load safes for cash role
      if (user.users_role === "cash") {
        setSafesLoading(true);
        try {
          // Load all available safes
          const safesData = await getSafes();
          setAllSafes(safesData.safes || []);

          // Load user's assigned safes
          const userSafesData = await getUserSafes(user.users_id);
          const assignedSafeIds = userSafesData.map((us) => us.safe_id);
          setSelectedSafeIds(assignedSafeIds);
        } catch (error) {
          console.error("Error loading safes:", error);
          toast.error("فشل في جلب بيانات الخزن");
        } finally {
          setSafesLoading(false);
        }
      }
    } catch (error) {
      console.error("Error loading representative settings:", error);
      toast.error(error.message || "فشل في جلب الإعدادات");
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
        gps_min_acceptable_accuracy_m:
          parseFloat(settings.gps_min_acceptable_accuracy_m) || 10.0,
        gps_tracking_interval_sec:
          parseInt(settings.gps_tracking_interval_sec) || 300,
        gps_tracking_enabled: settings.gps_tracking_enabled ? 1 : 0,
        allow_out_of_plan_visits: settings.allow_out_of_plan_visits ? 1 : 0,
        allow_start_work_from_anywhere: settings.allow_start_work_from_anywhere
          ? 1
          : 0,
        allow_end_work_from_anywhere: settings.allow_end_work_from_anywhere
          ? 1
          : 0,
        allow_start_visit_from_anywhere:
          settings.allow_start_visit_from_anywhere ? 1 : 0,
        allow_end_visit_from_anywhere: settings.allow_end_visit_from_anywhere
          ? 1
          : 0,
      };

      await upsertRepresentativeSettings(dataToSubmit);

      // Save warehouses for store_keeper
      if (user.users_role === "store_keeper") {
        await updateUserWarehouses(user.users_id, selectedWarehouseIds);
      }

      // Save safes for cash role
      if (user.users_role === "cash") {
        await updateUserSafes(user.users_id, selectedSafeIds);
      }

      toast.success("تم حفظ الإعدادات بنجاح");
      onClose();
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error(error.message || "فشل في حفظ الإعدادات");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" dir="rtl">
      <div className="flex flex-col md:flex-row items-center justify-center min-h-screen px-2 sm:px-0 pt-2 sm:pt-4 pb-10 sm:pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 transition-opacity backdrop-blur-sm bg-black/40"
          onClick={onClose}
        ></div>

        {/* Modal panel */}
        <div className="inline-block w-full max-w-3xl my-2 sm:my-1 overflow-hidden text-right align-middle transition-all transform bg-white shadow-xl rounded-2xl">
          {/* Header */}
          {/* Header */}
          <div className="border-b border-[#8DD8F5]/40">
            {/* Strong accent bar */}
            <div className="h-1.5 bg-[#8DD8F5]" />

            {/* Main header body */}
            <div className="px-4 py-3 sm:px-6 sm:py-5 bg-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="
        w-11 h-11
        rounded-xl
        bg-[#8DD8F5]/20
        flex items-center justify-center
        text-[#8DD8F5]
      "
                >
                  <MapPinIcon className="h-6 w-6" />
                </div>

                <div>
                  <h3 className="text-base sm:text-xl font-extrabold text-[#1F2937]">
                    إعدادات المستخدم
                  </h3>
                  {user && (
                    <p className="text-sm text-[#1F2937]/60 mt-0.5">
                      المستخدم:{" "}
                      <span className="font-semibold">{user.users_name}</span>
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={onClose}
                className="
        p-2 rounded-lg
        text-[#1F2937]/70
        hover:bg-[#8DD8F5]/15
        hover:text-[#1F2937]
        transition
      "
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-4 py-4 sm:px-6 sm:py-6 max-h-[70vh] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div
                  className="animate-spin rounded-full h-12 w-12 border-b-2"
                  style={{ borderColor: "#8DD8F5" }}
                ></div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Warehouse Selection Section - Only for store_keeper */}
                {user?.users_role === "store_keeper" && (
                  <div className="p-4 bg-[#8DD8F5]/10 rounded-2xl border border-[#8DD8F5]/30 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <BuildingStorefrontIcon className="h-6 w-6 text-[#8DD8F5]" />
                      <div>
                        <h4 className="text-lg font-semibold text-[#1F2937]">
                          المخازن المتاحة
                        </h4>
                        <p className="text-xs text-[#1F2937]/60 mt-0.5">
                          اختر المخازن التي يمكن لأمين المخزن التحكم بها
                        </p>
                      </div>
                    </div>

                    {warehousesLoading ? (
                      <div className="flex items-center justify-center py-6">
                        <div
                          className="animate-spin rounded-full h-8 w-8 border-b-2"
                          style={{ borderColor: "#8DD8F5" }}
                        ></div>
                      </div>
                    ) : allWarehouses.length === 0 ? (
                      <p className="text-center text-[#1F2937]/60 py-4">
                        لا توجد مخازن متاحة
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                        {/* Sort warehouses: Main first, then Van */}
                        {[...allWarehouses]
                          .sort((a, b) => {
                            // Main warehouses first
                            if (
                              a.warehouse_type === "Main" &&
                              b.warehouse_type !== "Main"
                            )
                              return -1;
                            if (
                              a.warehouse_type !== "Main" &&
                              b.warehouse_type === "Main"
                            )
                              return 1;
                            // Then sort by name
                            return a.warehouse_name.localeCompare(
                              b.warehouse_name,
                              "ar",
                            );
                          })
                          .map((warehouse) => {
                            const warehouseTypeLabel =
                              warehouse.warehouse_type === "Main"
                                ? "مخزن رئيسي"
                                : warehouse.warehouse_type === "Van"
                                  ? "مخزن سيارة"
                                  : warehouse.warehouse_type;

                            const isMainWarehouse =
                              warehouse.warehouse_type === "Main";

                            return (
                              <label
                                key={warehouse.warehouse_id}
                                className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                                  selectedWarehouseIds.includes(
                                    warehouse.warehouse_id,
                                  )
                                    ? isMainWarehouse
                                      ? "border-[#8DD8F5] bg-[#8DD8F5]/20"
                                      : "border-[#8DD8F5]/20 bg-white"
                                    : isMainWarehouse
                                      ? "border-[#8DD8F5]/20 bg-white hover:border-[#8DD8F5]/40"
                                      : "border-gray-200 bg-white hover:border-[#8DD8F5]/30"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedWarehouseIds.includes(
                                    warehouse.warehouse_id,
                                  )}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedWarehouseIds((prev) => [
                                        ...prev,
                                        warehouse.warehouse_id,
                                      ]);
                                    } else {
                                      setSelectedWarehouseIds((prev) =>
                                        prev.filter(
                                          (id) => id !== warehouse.warehouse_id,
                                        ),
                                      );
                                    }
                                  }}
                                  className={`w-5 h-5 border-gray-300 rounded focus:ring-2`}
                                  style={
                                    isMainWarehouse
                                      ? { accentColor: "#8DD8F5" }
                                      : { accentColor: "#8DD8F5" }
                                  }
                                />
                                <div className="flex-1">
                                  <p className="font-semibold text-[#1F2937] flex items-center gap-2">
                                    {warehouse.warehouse_name}
                                    {isMainWarehouse && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#8DD8F5] text-[#1F2937]">
                                        رئيسي
                                      </span>
                                    )}
                                  </p>
                                  <p className="text-xs text-[#1F2937]/60">
                                    {warehouseTypeLabel} •{" "}
                                    {warehouse.warehouse_code}
                                  </p>
                                </div>
                              </label>
                            );
                          })}
                      </div>
                    )}

                    <div className="mt-3 text-sm text-[#1F2937]/70">
                      <span className="font-semibold">
                        {selectedWarehouseIds.length}
                      </span>{" "}
                      مخزن محدد
                    </div>
                  </div>
                )}

                {/* Safe Selection Section - Only for cash role */}
                {user?.users_role === "cash" && (
                  <div className="p-4 bg-[#8DD8F5]/10 rounded-2xl border border-[#8DD8F5]/30 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <WalletIcon className="h-6 w-6 text-[#8DD8F5]" />
                      <div>
                        <h4 className="text-lg font-semibold text-[#1F2937]">
                          الخزن المتاحة
                        </h4>
                        <p className="text-xs text-[#1F2937]/60 mt-0.5">
                          اختر الخزن التي يمكن للكاش التحكم بها
                        </p>
                      </div>
                    </div>

                    {safesLoading ? (
                      <div className="flex items-center justify-center py-6">
                        <div
                          className="animate-spin rounded-full h-8 w-8 border-b-2"
                          style={{ borderColor: "#8DD8F5" }}
                        ></div>
                      </div>
                    ) : allSafes.length === 0 ? (
                      <p className="text-center text-[#1F2937]/60 py-4">
                        لا توجد خزن متاحة
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                        {allSafes
                          .sort((a, b) =>
                            a.safes_name.localeCompare(b.safes_name, "ar"),
                          )
                          .map((safe) => {
                            const safeTypeLabel =
                              safe.safes_type === "company"
                                ? "خزينة شركة"
                                : safe.safes_type === "rep"
                                  ? "خزينة مندوب"
                                  : safe.safes_type === "cash"
                                    ? "خزينة كاش"
                                    : safe.safes_type;

                            const isCompanySafe = safe.safes_type === "company";

                            return (
                              <label
                                key={safe.safes_id}
                                className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                                  selectedSafeIds.includes(safe.safes_id)
                                    ? isCompanySafe
                                      ? "border-[#8DD8F5] bg-[#8DD8F5]/20"
                                      : "border-[#8DD8F5]/20 bg-white"
                                    : isCompanySafe
                                      ? "border-[#8DD8F5]/20 bg-white hover:border-[#8DD8F5]/40"
                                      : "border-gray-200 bg-white hover:border-[#8DD8F5]/30"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedSafeIds.includes(
                                    safe.safes_id,
                                  )}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedSafeIds((prev) => [
                                        ...prev,
                                        safe.safes_id,
                                      ]);
                                    } else {
                                      setSelectedSafeIds((prev) =>
                                        prev.filter(
                                          (id) => id !== safe.safes_id,
                                        ),
                                      );
                                    }
                                  }}
                                  className="w-5 h-5 border-gray-300 rounded focus:ring-2"
                                  style={{ accentColor: "#8DD8F5" }}
                                />
                                <div className="flex-1">
                                  <p className="font-semibold text-[#1F2937] flex items-center gap-2">
                                    {safe.safes_name}
                                    {isCompanySafe && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#8DD8F5] text-[#1F2937]">
                                        شركة
                                      </span>
                                    )}
                                  </p>
                                  <p className="text-xs text-[#1F2937]/60">
                                    {safeTypeLabel} • {safe.safes_balance}
                                  </p>
                                </div>
                              </label>
                            );
                          })}
                      </div>
                    )}

                    <div className="mt-3 text-sm text-[#1F2937]/70">
                      <span className="font-semibold">
                        {selectedSafeIds.length}
                      </span>{" "}
                      خزينة محددة
                    </div>
                  </div>
                )}

                {/* Work Start Location Section */}
                <div>
                  {/* Toggle and Header Row */}
                  <div className="flex items-center justify-between mb-4 p-4 bg-[#8DD8F5]/10 rounded-2xl border border-[#8DD8F5]/30 pb-6">
                    <div className="flex items-center gap-3">
                      <MapPinIcon className="h-5 w-5 text-[#8DD8F5]" />
                      <div>
                        <h4 className="text-lg font-semibold text-[#1F2937]">
                          تحديد موقع بداية العمل
                        </h4>
                        <p className="text-xs text-[#1F2937]/60 mt-0.5">
                          تفعيل لتحديد موقع محدد لبداية العمل
                        </p>
                        <p className="text-xs text-[#1F2937]/50 mt-1">
                          ⚠️ إلغاء التفعيل يسمح للمندوب ببدء العمل من أي مكان
                        </p>
                      </div>
                    </div>
                    <ToggleSwitch
                      checked={!settings.allow_start_work_from_anywhere}
                      onClick={handleToggleClick(
                        "allow_start_work_from_anywhere",
                      )}
                      ariaLabel="تحديد موقع بداية العمل"
                    />
                  </div>

                  {/* Location Inputs - show when toggle is ON (false = enabled) */}
                  {!settings.allow_start_work_from_anywhere && (
                    <div className="mt-4">
                      <div className="flex items-center justify-end mb-3">
                        <button
                          onClick={() => openMapModal("start")}
                          className="flex items-center md:gap-2 gap-1 px-1 md:px-4 py-2 text-sm font-medium rounded-lg transition-colors"
                          style={{ background: "#8DD8F5", color: "#1F2937" }}
                        >
                          <MapPinIcon className="h-4 w-4" />
                          اختر من الخريطة
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-[#1F2937] mb-2">
                            خط العرض (Latitude)
                          </label>
                          <input
                            type="number"
                            step="0.0000001"
                            value={settings.work_start_latitude}
                            onChange={(e) =>
                              handleInputChange(
                                "work_start_latitude",
                                e.target.value,
                              )
                            }
                            placeholder="30.0444"
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-[#8DD8F5] focus:ring-4 focus:ring-[#8DD8F5]/25 outline-none shadow-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[#1F2937] mb-2">
                            خط الطول (Longitude)
                          </label>
                          <input
                            type="number"
                            step="0.0000001"
                            value={settings.work_start_longitude}
                            onChange={(e) =>
                              handleInputChange(
                                "work_start_longitude",
                                e.target.value,
                              )
                            }
                            placeholder="31.2357"
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-[#8DD8F5] focus:ring-4 focus:ring-[#8DD8F5]/25 outline-none shadow-sm"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Work End Location Section */}
                <div>
                  {/* Toggle and Header Row */}
                  <div className="flex items-center justify-between mb-4 p-4 bg-[#8DD8F5]/10 rounded-2xl border border-[#8DD8F5]/30 pb-6">
                    <div className="flex items-center gap-3">
                      <MapPinIcon className="h-5 w-5 text-[#8DD8F5]" />
                      <div>
                        <h4 className="text-lg font-semibold text-[#1F2937]">
                          تحديد موقع نهاية العمل
                        </h4>
                        <p className="text-xs text-[#1F2937]/60 mt-0.5">
                          تفعيل لتحديد موقع محدد لنهاية العمل
                        </p>
                        <p className="text-xs text-[#1F2937]/50 mt-1">
                          ⚠️ إلغاء التفعيل يسمح للمندوب بإنهاء العمل من أي مكان
                        </p>
                      </div>
                    </div>
                    <ToggleSwitch
                      checked={!settings.allow_end_work_from_anywhere}
                      onClick={handleToggleClick(
                        "allow_end_work_from_anywhere",
                      )}
                      ariaLabel="تحديد موقع نهاية العمل"
                    />
                  </div>

                  {/* Location Inputs - Only show if toggle is ON (false = enabled) */}
                  {!settings.allow_end_work_from_anywhere && (
                    <div className="mt-4">
                      <div className="flex items-center justify-end mb-3">
                        <button
                          onClick={() => openMapModal("end")}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors"
                          style={{ background: "#8DD8F5", color: "#1F2937" }}
                        >
                          <MapPinIcon className="h-4 w-4" />
                          اختر من الخريطة
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-[#1F2937] mb-2">
                            خط العرض (Latitude)
                          </label>
                          <input
                            type="number"
                            step="0.0000001"
                            value={settings.work_end_latitude}
                            onChange={(e) =>
                              handleInputChange(
                                "work_end_latitude",
                                e.target.value,
                              )
                            }
                            placeholder="30.0444"
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-[#8DD8F5] focus:ring-4 focus:ring-[#8DD8F5]/25 outline-none shadow-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[#1F2937] mb-2">
                            خط الطول (Longitude)
                          </label>
                          <input
                            type="number"
                            step="0.0000001"
                            value={settings.work_end_longitude}
                            onChange={(e) =>
                              handleInputChange(
                                "work_end_longitude",
                                e.target.value,
                              )
                            }
                            placeholder="31.2357"
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-[#8DD8F5] focus:ring-4 focus:ring-[#8DD8F5]/25 outline-none shadow-sm"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Toggles */}
                <div className="space-y-4">
                  {/* Allow Out of Plan Visits - Hidden for store_keeper and cash */}
                  {user?.users_role !== "store_keeper" &&
                    user?.users_role !== "cash" && (
                      <div className="flex items-center justify-between p-4 bg-[#8DD8F5]/10 rounded-2xl border border-[#8DD8F5]/30 pb-6">
                        <div className="flex items-center gap-3">
                          <CheckCircleIcon className="h-5 w-5 text-[#8DD8F5]" />
                          <div>
                            <h4 className="text-lg font-semibold text-[#1F2937]">
                              السماح بزيارات خارج الخطة
                            </h4>
                            <p className="text-xs text-[#1F2937]/60 mt-0.5">
                              إمكانية إضافة زيارات غير مخططة
                            </p>
                          </div>
                        </div>
                        <ToggleSwitch
                          checked={settings.allow_out_of_plan_visits}
                          onClick={handleToggleClick(
                            "allow_out_of_plan_visits",
                          )}
                          ariaLabel="السماح بزيارات خارج الخطة"
                        />
                      </div>
                    )}

                  {/* Allow Start Visit from Anywhere - Hidden for store_keeper and cash */}
                  {user?.users_role !== "store_keeper" &&
                    user?.users_role !== "cash" && (
                      <div className="flex items-center justify-between p-4 bg-[#8DD8F5]/10 rounded-2xl border border-[#8DD8F5]/30 pb-6">
                        <div className="flex items-center gap-3">
                          <MapPinIcon className="h-5 w-5 text-[#8DD8F5]" />
                          <div>
                            <h4 className="text-lg font-semibold text-[#1F2937]">
                              السماح ببدء الزيارة من أي مكان
                            </h4>
                            <p className="text-xs text-[#1F2937]/60 mt-0.5">
                              عدم الالتزام بموقع العميل عند بدء الزيارة
                            </p>
                          </div>
                        </div>
                        <ToggleSwitch
                          checked={settings.allow_start_visit_from_anywhere}
                          onClick={handleToggleClick(
                            "allow_start_visit_from_anywhere",
                          )}
                          ariaLabel="السماح ببدء الزيارة من أي مكان"
                        />
                      </div>
                    )}

                  {/* Allow End Visit from Anywhere - Hidden for store_keeper and cash */}
                  {user?.users_role !== "store_keeper" &&
                    user?.users_role !== "cash" && (
                      <div className="flex items-center justify-between p-4 bg-[#8DD8F5]/10 rounded-2xl border border-[#8DD8F5]/30 pb-6">
                        <div className="flex items-center gap-3">
                          <MapPinIcon className="h-5 w-5 text-[#8DD8F5]" />
                          <div>
                            <h4 className="text-lg font-semibold text-[#1F2937]">
                              السماح بإنهاء الزيارة من أي مكان
                            </h4>
                            <p className="text-xs text-[#1F2937]/60 mt-0.5">
                              عدم الالتزام بموقع العميل عند إنهاء الزيارة
                            </p>
                          </div>
                        </div>
                        <ToggleSwitch
                          checked={settings.allow_end_visit_from_anywhere}
                          onClick={handleToggleClick(
                            "allow_end_visit_from_anywhere",
                          )}
                          ariaLabel="السماح بإنهاء الزيارة من أي مكان"
                        />
                      </div>
                    )}

                  {/* GPS Tracking Enabled - moved to bottom - Hidden for store_keeper and cash */}
                  {user?.users_role !== "store_keeper" &&
                    user?.users_role !== "cash" && (
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-[#8DD8F5]/10 rounded-2xl border border-[#8DD8F5]/30">
                        
                        {/* Left Content */}
                        <div className="flex items-start sm:items-center gap-3">
                          <SignalIcon className="h-5 w-5 text-[#8DD8F5] mt-1 sm:mt-0" />
                          
                          <div>
                            <h4 className="text-base sm:text-lg font-semibold text-[#1F2937]">
                              تفعيل تتبع GPS
                            </h4>
                            <p className="text-xs text-[#1F2937]/60 mt-0.5">
                              تتبع موقع المندوب في الخلفية
                            </p>
                          </div>
                        </div>

                        {/* Toggle */}
                        <div className="self-end sm:self-auto">
                          <ToggleSwitch
                            checked={settings.gps_tracking_enabled}
                            onClick={handleToggleClick("gps_tracking_enabled")}
                            ariaLabel="تفعيل تتبع GPS"
                          />
                        </div>
                      </div>
                  )}
                </div>

                {/* GPS Accuracy - standalone card (input inside the card) */}
                <div className="p-4 bg-[#8DD8F5]/10 rounded-2xl border border-[#8DD8F5]/30 pb-6">
                  <div className="flex items-center gap-3 mb-4">
                    <SignalIcon className="h-5 w-5 text-[#8DD8F5]" />
                    <div>
                      <h4 className="text-lg font-semibold text-[#1F2937]">
                        دقة GPS المطلوبة (متر)
                      </h4>
                      <p className="text-xs text-[#1F2937]/60 mt-0.5">
                        القيم الأقل تعني دقة أعلى
                      </p>
                    </div>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    value={settings.gps_min_acceptable_accuracy_m}
                    onChange={(e) =>
                      handleInputChange(
                        "gps_min_acceptable_accuracy_m",
                        e.target.value,
                      )
                    }
                    placeholder="10.00"
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-[#8DD8F5] focus:ring-4 focus:ring-[#8DD8F5]/25 outline-none shadow-sm"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          {/* Footer */}
          <div className="px-2 md:px-6 py-4 bg-gray-50 flex items-center justify-center gap-3 border-t border-gray-200">
            <button
              onClick={onClose}
              disabled={saving}
              className="
      px-6 py-2
      rounded-xl
      bg-gray-100
      border border-gray-200
      text-[#1F2937]
      hover:bg-gray-200
      transition
      disabled:opacity-50
    "
            >
              إلغاء
            </button>

            <button
              onClick={handleSave}
              disabled={saving || loading}
              className=" px-1
      md:px-3 py-2
      rounded-xl
      bg-[#8DD8F5]
      hover:bg-[#7ccfee]
      text-[#1F2937]
      font-semibold
      shadow-md
      transition
      disabled:opacity-50
      disabled:cursor-not-allowed
      flex items-center gap-2
    "
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#1F2937]"></div>
                  جاري الحفظ...
                </>
              ) : (
                "حفظ الإعدادات"
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
        title={
          mapModalType === "start"
            ? "اختر موقع بداية العمل"
            : "اختر موقع نهاية العمل"
        }
        initialLat={
          mapModalType === "start"
            ? settings.work_start_latitude || getCompanyLocation().lat
            : settings.work_end_latitude || getCompanyLocation().lat
        }
        initialLng={
          mapModalType === "start"
            ? settings.work_start_longitude || getCompanyLocation().lng
            : settings.work_end_longitude || getCompanyLocation().lng
        }
      />
    </div>
  );
}

export default RepresentativeSettingsModal;
