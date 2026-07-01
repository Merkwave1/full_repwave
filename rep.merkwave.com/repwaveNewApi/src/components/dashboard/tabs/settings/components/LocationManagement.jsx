// src/components/dashboard/tabs/settings/components/LocationManagement.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { 
  PencilIcon, TrashIcon, 
  MagnifyingGlassIcon, GlobeAltIcon, MapPinIcon,
  CheckIcon, XMarkIcon
} from '@heroicons/react/24/outline';
import Loader from '../../../../common/Loader/Loader.jsx';
import Alert from '../../../../common/Alert/Alert.jsx';
import { SettingsCard } from '../SettingsFormField.jsx';
import {
  settingsInputClass,
  settingsSelectClass,
  settingsSearchInputClass,
  settingsPrimaryBtnClass,
  settingsSecondaryBtnClass,
  settingsListItemClass,
  settingsFieldCardClass,
  settingsFieldsStackClass,
  settingsSectionsStackClass,
} from '../settingsUi.js';
import { getAllCountries, getAllCountriesWithGovernorates, addCountry, updateCountry, deleteCountry } from '../../../../../apis/countries.js';
import { getAllGovernorates, addGovernorate, updateGovernorate, deleteGovernorate } from '../../../../../apis/governorates.js';

// Normalize country/governorate shapes across cache/API responses
const normalizeCountry = (c) => ({
  id: c.countries_id ?? c.id ?? c.clients_id ?? null,
  name_ar: c.countries_name_ar ?? c.name_ar ?? c.countries_name ?? c.name ?? '',
  name_en: c.countries_name_en ?? c.name_en ?? '',
  sort_order: c.countries_sort_order ?? c.sort_order ?? 0,
  is_active: c.countries_is_active ?? c.is_active ?? 1,
  governorates: Array.isArray(c.governorates) ? c.governorates.map(g => ({
    id: g.governorates_id ?? g.id ?? null,
    name_ar: g.governorates_name_ar ?? g.name_ar ?? '',
    name_en: g.governorates_name_en ?? g.name_en ?? '',
    sort_order: g.governorates_sort_order ?? g.sort_order ?? 0,
    country_id: g.governorates_country_id ?? g.country_id ?? null
  })) : []
});

// Refresh the localStorage cache for countries with governorates
const refreshCountriesCache = async () => {
  try {
    const combined = await getAllCountriesWithGovernorates();
    // combined is expected to be an array of countries (the API returns {status..., data: {countries: [...]}} but our helper returns array)
    // Store normalized form (ensure consistent shape)
    const normalized = Array.isArray(combined) ? combined : [];
    localStorage.setItem('appCountriesWithGovernorates', JSON.stringify(normalized));
    // Notify other components in the same window that the countries+governorates cache was updated
    window.dispatchEvent(new CustomEvent('appCountriesWithGovernoratesUpdated'));
    } catch (err) {
      // Don't block the UI if cache refresh fails; log for debugging
      console.error('Failed to refresh countries cache:', err);
  }
};

// Countries Manager Component
function CountriesManager() {
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [newCountry, setNewCountry] = useState({ name_ar: '', name_en: '', sort_order: 0 });
  const [editingId, setEditingId] = useState(null);
  const [editingData, setEditingData] = useState({ name_ar: '', name_en: '', sort_order: 0 });
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  

  const fetchCountries = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      // Try to get from localStorage first
      const cachedData = localStorage.getItem('appCountriesWithGovernorates');
      if (cachedData) {
        const parsedData = JSON.parse(cachedData);
        // Normalize cached countries to the UI-friendly shape
  const normalized = Array.isArray(parsedData) ? parsedData.map(normalizeCountry) : [];
  setCountries(normalized);
  setError(null);
  // notify other components (in case they missed the cache-updated event)
  window.dispatchEvent(new CustomEvent('appCountriesWithGovernoratesUpdated'));
      } else {
        // Fallback to API if not in cache
        const data = await getAllCountries();
  const normalized = Array.isArray(data) ? data.map(normalizeCountry) : [];
  setCountries(normalized);
  setError(null);
  // notify other components
  window.dispatchEvent(new CustomEvent('appCountriesWithGovernoratesUpdated'));
      }
    } catch (err) {
      setError('فشل في تحميل الدول: ' + err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCountries();
  }, [fetchCountries]);

  const handleAdd = async () => {
    if (!newCountry.name_ar.trim()) {
      setError('الاسم بالعربي مطلوب');
      return;
    }

    if (!newCountry.name_en.trim()) {
      setError('الاسم بالإنجليزي مطلوب');
      return;
    }

    try {
      setSaving(true);
      await addCountry({
        name_ar: newCountry.name_ar.trim(),
        name_en: newCountry.name_en.trim(),
        sort_order: parseInt(newCountry.sort_order) || 0
      });

      setNewCountry({ name_ar: '', name_en: '', sort_order: 0 });
      // Refresh server + cache and update UI
      await refreshCountriesCache();
      await fetchCountries(true);
      setError(null);
    } catch (err) {
      setError(err.message || 'فشل في إضافة الدولة');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingData.name_ar.trim()) {
      setError('الاسم بالعربي مطلوب');
      return;
    }

    if (!editingData.name_en.trim()) {
      setError('الاسم بالإنجليزي مطلوب');
      return;
    }

    try {
      setSaving(true);
      await updateCountry(editingId, {
        name_ar: editingData.name_ar.trim(),
        name_en: editingData.name_en.trim(),
        sort_order: parseInt(editingData.sort_order) || 0
      });

      setEditingId(null);
      setEditingData({ name_ar: '', name_en: '', sort_order: 0 });
      await refreshCountriesCache();
      await fetchCountries(true);
      setError(null);
    } catch (err) {
      setError(err.message || 'فشل في تحديث الدولة');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('هل أنت متأكد من حذف هذه الدولة؟')) return;

    try {
      setSaving(true);
      await deleteCountry(id);
  await refreshCountriesCache();
  await fetchCountries(true);
      setError(null);
    } catch (err) {
      setError(err.message || 'فشل في حذف الدولة');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (country) => {
    setEditingId(country.id);
    setEditingData({
      name_ar: country.name_ar,
      name_en: country.name_en,
      sort_order: country.sort_order || 0
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingData({ name_ar: '', name_en: '', sort_order: 0 });
  };

  const filteredCountries = (() => {
    const q = (searchQuery || '').toString().toLowerCase();
    return countries.filter(country => {
      const na = (country.name_ar || '').toString().toLowerCase();
      const ne = (country.name_en || '').toString().toLowerCase();
      return na.includes(q) || ne.includes(q);
    });
  })();

  if (loading) {
    return (
      <SettingsCard
        title="إدارة الدول"
        icon={<GlobeAltIcon className="h-5 w-5" />}
        subtitle="إضافة وتعديل وترتيب الدول"
      >
        <div className="flex justify-center items-center py-8">
          <Loader size="md" />
        </div>
      </SettingsCard>
    );
  }

  return (
    <SettingsCard
      title="إدارة الدول"
      icon={<GlobeAltIcon className="h-5 w-5" />}
      subtitle="إضافة وتعديل وترتيب الدول"
      refreshing={refreshing}
      onRefresh={() => fetchCountries(true)}
    >
      {error && (
        <Alert type="error" message={error} onClose={() => setError(null)} className="mb-4" />
      )}

      <div className={`mb-4 p-4 ${settingsFieldCardClass}`}>
        <h4 className="text-xs font-semibold text-[#2D1B69] mb-3">إضافة دولة جديدة</h4>
        <div className={settingsFieldsStackClass}>
          <input
            className={settingsInputClass}
            value={newCountry.name_ar}
            onChange={(e) => setNewCountry({ ...newCountry, name_ar: e.target.value })}
            placeholder="الاسم بالعربي (مثال: مصر)"
          />
          <input
            className={settingsInputClass}
            value={newCountry.name_en}
            onChange={(e) => setNewCountry({ ...newCountry, name_en: e.target.value })}
            placeholder="Name in English (e.g., Egypt)"
            dir="ltr"
          />
          <input
            type="number"
            className={settingsInputClass}
            value={newCountry.sort_order}
            onChange={(e) => setNewCountry({ ...newCountry, sort_order: e.target.value })}
            placeholder="الترتيب"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={saving || !newCountry.name_ar.trim() || !newCountry.name_en.trim()}
            className={`${settingsPrimaryBtnClass} whitespace-nowrap justify-center`}
          >
            {saving ? 'جاري الإضافة...' : 'إضافة'}
          </button>
        </div>
      </div>

      <div className="mb-4">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8B5FD6]/50" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث في الدول..."
            className={settingsSearchInputClass}
          />
        </div>
      </div>

      {/* Countries List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredCountries.length === 0 ? (
          <p className="text-center text-gray-500 text-sm py-8">لا توجد دول</p>
        ) : (
          filteredCountries.map((country) => (
            <div key={country.id} className={settingsListItemClass}>
              {editingId === country.id ? (
                <div className="space-y-2">
                  <div className={settingsFieldsStackClass}>
                    <input
                      className={settingsInputClass}
                      value={editingData.name_ar}
                      onChange={(e) => setEditingData({ ...editingData, name_ar: e.target.value })}
                      placeholder="الاسم بالعربي"
                    />
                    <input
                      className={settingsInputClass}
                      value={editingData.name_en}
                      onChange={(e) => setEditingData({ ...editingData, name_en: e.target.value })}
                      placeholder="Name in English"
                      dir="ltr"
                    />
                    <input
                      type="number"
                      className={settingsInputClass}
                      value={editingData.sort_order}
                      onChange={(e) => setEditingData({ ...editingData, sort_order: e.target.value })}
                      placeholder="الترتيب"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleUpdate}
                      disabled={saving}
                      className={`inline-flex items-center px-3 py-1.5 text-xs ${settingsPrimaryBtnClass}`}
                    >
                      <CheckIcon className="h-4 w-4 ml-1" />
                      حفظ
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      disabled={saving}
                      className={`inline-flex items-center px-3 py-1.5 text-xs ${settingsSecondaryBtnClass}`}
                    >
                      <XMarkIcon className="h-4 w-4 ml-1" />
                      إلغاء
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#EDE7FF] text-[#8B5FD6] text-xs font-semibold">
                      {country.sort_order}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-[#2D1B69]">{country.name_ar}</p>
                      <p className="text-xs text-gray-500">
                        {country.name_en} • {country.governorates_count} محافظة
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(country)}
                      className="p-1.5 text-[#8B5FD6] hover:bg-[#f5f3ff] rounded-md transition-colors"
                      title="تعديل"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(country.id)}
                      disabled={country.governorates_count > 0}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title={country.governorates_count > 0 ? "لا يمكن الحذف - يوجد محافظات مرتبطة" : "حذف"}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </SettingsCard>
  );
}

// Governorates Manager Component
function GovernoratesManager() {
  const [governorates, setGovernorates] = useState([]);
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [newGovernorate, setNewGovernorate] = useState({ 
    name_ar: '', 
    name_en: '', 
    country_id: '', 
    sort_order: 0 
  });
  const [editingId, setEditingId] = useState(null);
  const [editingData, setEditingData] = useState({ 
    name_ar: '', 
    name_en: '', 
    country_id: '', 
    sort_order: 0 
  });
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCountryId, setFilterCountryId] = useState('');

  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      // Try to get from localStorage first
      const cachedData = localStorage.getItem('appCountriesWithGovernorates');
      if (cachedData) {
        const parsedData = JSON.parse(cachedData);
        // Normalize countries from cache
        const normalizedCountries = Array.isArray(parsedData) ? parsedData.map(normalizeCountry) : [];
        setCountries(normalizedCountries);

        // Flatten governorates from all countries and attach consistent meta
        const allGovernorates = [];
        normalizedCountries.forEach(country => {
          if (country.governorates && Array.isArray(country.governorates)) {
            country.governorates.forEach(gov => {
              allGovernorates.push({
                id: gov.id,
                name_ar: gov.name_ar,
                name_en: gov.name_en,
                sort_order: gov.sort_order,
                governorates_country_id: country.id,
                country_name_ar: country.name_ar,
                country_name_en: country.name_en,
                country_id: country.id
              });
            });
          }
        });

        setGovernorates(allGovernorates);
        setError(null);
      } else {
        // Fallback to API if not in cache
        const [governoratesData, countriesData] = await Promise.all([
          getAllGovernorates(),
          getAllCountries()
        ]);

        setGovernorates(governoratesData);
        setCountries(countriesData);
        setError(null);
      }
    } catch (err) {
      setError('فشل في تحميل البيانات: ' + err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    const onCacheUpdated = () => fetchData(true);
    window.addEventListener('appCountriesWithGovernoratesUpdated', onCacheUpdated);
    return () => window.removeEventListener('appCountriesWithGovernoratesUpdated', onCacheUpdated);
  }, [fetchData]);

  const handleAdd = async () => {
    if (!newGovernorate.name_ar.trim() || !newGovernorate.name_en.trim()) {
      setError('الاسم بالعربي والإنجليزي مطلوب');
      return;
    }
    if (!newGovernorate.country_id) {
      setError('يجب اختيار الدولة');
      return;
    }

    try {
      setSaving(true);
      await addGovernorate({
        name_ar: newGovernorate.name_ar.trim(),
        name_en: newGovernorate.name_en.trim(),
        country_id: parseInt(newGovernorate.country_id),
        sort_order: parseInt(newGovernorate.sort_order) || 0
      });

      setNewGovernorate({ name_ar: '', name_en: '', country_id: '', sort_order: 0 });
  await refreshCountriesCache();
  await fetchData(true);
      setError(null);
    } catch (err) {
      setError(err.message || 'فشل في إضافة المحافظة');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingData.name_ar.trim() || !editingData.name_en.trim()) {
      setError('الاسم بالعربي والإنجليزي مطلوب');
      return;
    }
    if (!editingData.country_id) {
      setError('يجب اختيار الدولة');
      return;
    }

    try {
      setSaving(true);
      await updateGovernorate(editingId, {
        name_ar: editingData.name_ar.trim(),
        name_en: editingData.name_en.trim(),
        country_id: parseInt(editingData.country_id),
        sort_order: parseInt(editingData.sort_order) || 0
      });

      setEditingId(null);
      setEditingData({ name_ar: '', name_en: '', country_id: '', sort_order: 0 });
  await refreshCountriesCache();
  await fetchData(true);
      setError(null);
    } catch (err) {
      setError(err.message || 'فشل في تحديث المحافظة');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('هل أنت متأكد من حذف هذه المحافظة؟')) return;

    try {
      setSaving(true);
      await deleteGovernorate(id);
  await refreshCountriesCache();
  await fetchData(true);
      setError(null);
    } catch (err) {
      setError(err.message || 'فشل في حذف المحافظة');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (governorate) => {
    setEditingId(governorate.id);
    setEditingData({
      name_ar: governorate.name_ar,
      name_en: governorate.name_en,
      country_id: governorate.country_id,
      sort_order: governorate.sort_order || 0
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingData({ name_ar: '', name_en: '', country_id: '', sort_order: 0 });
  };

  const filteredGovernorates = (() => {
    const q = (searchQuery || '').toString().toLowerCase();
    return governorates.filter(gov => {
      const na = (gov.name_ar || '').toString().toLowerCase();
      const ne = (gov.name_en || '').toString().toLowerCase();
      const cna = (gov.country_name_ar || '').toString().toLowerCase();
      const cne = (gov.country_name_en || '').toString().toLowerCase();
      const matchesSearch = na.includes(q) || ne.includes(q) || cna.includes(q) || cne.includes(q);
      const matchesCountry = !filterCountryId || gov.country_id === parseInt(filterCountryId);
      return matchesSearch && matchesCountry;
    });
  })();

  if (loading) {
    return (
      <SettingsCard
        title="إدارة المحافظات"
        icon={<MapPinIcon className="h-5 w-5" />}
        subtitle="إضافة وتعديل وترتيب المحافظات حسب الدولة"
      >
        <div className="flex justify-center items-center py-8">
          <Loader size="md" />
        </div>
      </SettingsCard>
    );
  }

  return (
    <SettingsCard
      title="إدارة المحافظات"
      icon={<MapPinIcon className="h-5 w-5" />}
      subtitle="إضافة وتعديل وترتيب المحافظات حسب الدولة"
      refreshing={refreshing}
      onRefresh={() => fetchData(true)}
    >
      {error && (
        <Alert type="error" message={error} onClose={() => setError(null)} className="mb-4" />
      )}

      <div className={`mb-4 p-4 ${settingsFieldCardClass}`}>
        <h4 className="text-xs font-semibold text-[#2D1B69] mb-3">إضافة محافظة جديدة</h4>
        <div className={settingsFieldsStackClass}>
          <select
            value={newGovernorate.country_id}
            onChange={(e) => setNewGovernorate({ ...newGovernorate, country_id: e.target.value })}
            className={settingsSelectClass}
          >
            <option value="">اختر الدولة</option>
            {countries.map(country => (
              <option key={country.id} value={country.id}>{country.name_ar} - {country.name_en}</option>
            ))}
          </select>
          <input
            className={settingsInputClass}
            value={newGovernorate.name_ar}
            onChange={(e) => setNewGovernorate({ ...newGovernorate, name_ar: e.target.value })}
            placeholder="الاسم بالعربي"
          />
          <input
            className={settingsInputClass}
            value={newGovernorate.name_en}
            onChange={(e) => setNewGovernorate({ ...newGovernorate, name_en: e.target.value })}
            placeholder="Name in English"
            dir="ltr"
          />
          <input
            type="number"
            className={settingsInputClass}
            value={newGovernorate.sort_order}
            onChange={(e) => setNewGovernorate({ ...newGovernorate, sort_order: e.target.value })}
            placeholder="الترتيب"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={saving || !newGovernorate.name_ar.trim() || !newGovernorate.name_en.trim() || !newGovernorate.country_id}
            className={`${settingsPrimaryBtnClass} whitespace-nowrap justify-center`}
          >
            {saving ? 'جاري الإضافة...' : 'إضافة'}
          </button>
        </div>
      </div>

      <div className={`${settingsFieldsStackClass} mb-4`}>
        <div className="relative">
          <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8B5FD6]/50" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث في المحافظات..."
            className={settingsSearchInputClass}
          />
        </div>
        <select
          value={filterCountryId}
          onChange={(e) => setFilterCountryId(e.target.value)}
          className={settingsSelectClass}
        >
          <option value="">كل الدول</option>
          {countries.map(country => (
            <option key={country.id} value={country.id}>{country.name_ar} - {country.name_en}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredGovernorates.length === 0 ? (
          <p className="text-center text-gray-500 text-sm py-8">لا توجد محافظات</p>
        ) : (
          filteredGovernorates.map((gov) => (
            <div key={gov.id} className={settingsListItemClass}>
              {editingId === gov.id ? (
                <div className="space-y-2">
                  <div className={settingsFieldsStackClass}>
                    <input
                      className={settingsInputClass}
                      value={editingData.name_ar}
                      onChange={(e) => setEditingData({ ...editingData, name_ar: e.target.value })}
                      placeholder="الاسم بالعربي"
                    />
                    <input
                      className={settingsInputClass}
                      value={editingData.name_en}
                      onChange={(e) => setEditingData({ ...editingData, name_en: e.target.value })}
                      placeholder="Name in English"
                      dir="ltr"
                    />
                    <select
                      value={editingData.country_id}
                      onChange={(e) => setEditingData({ ...editingData, country_id: e.target.value })}
                      className={settingsSelectClass}
                    >
                      <option value="">اختر الدولة</option>
                      {countries.map(country => (
                        <option key={country.id} value={country.id}>{country.name_ar} - {country.name_en}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      className={settingsInputClass}
                      value={editingData.sort_order}
                      onChange={(e) => setEditingData({ ...editingData, sort_order: e.target.value })}
                      placeholder="الترتيب"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleUpdate}
                      disabled={saving}
                      className={`inline-flex items-center px-3 py-1.5 text-xs ${settingsPrimaryBtnClass}`}
                    >
                      <CheckIcon className="h-4 w-4 ml-1" />
                      حفظ
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      disabled={saving}
                      className={`inline-flex items-center px-3 py-1.5 text-xs ${settingsSecondaryBtnClass}`}
                    >
                      <XMarkIcon className="h-4 w-4 ml-1" />
                      إلغاء
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#EDE7FF] text-[#8B5FD6] text-xs font-semibold">
                      {gov.sort_order}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-[#2D1B69]">{gov.name_ar}</p>
                      <p className="text-xs text-gray-500">
                        {gov.name_en} • {gov.country_name_ar} - {gov.country_name_en}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(gov)}
                      className="p-1.5 text-[#8B5FD6] hover:bg-[#F8F5FF] rounded-xl transition-colors"
                      title="تعديل"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(gov.id)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                      title="حذف"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </SettingsCard>
  );
}

// Main Component
export default function LocationManagement({ embedded = false }) {
  return (
    <div className={settingsSectionsStackClass}>
      <CountriesManager />
      <GovernoratesManager />
    </div>
  );
}
