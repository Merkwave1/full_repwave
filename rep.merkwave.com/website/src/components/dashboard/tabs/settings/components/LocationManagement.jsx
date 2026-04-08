// src/components/dashboard/tabs/settings/components/LocationManagement.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { 
  PlusIcon, PencilIcon, TrashIcon, ArrowPathIcon, 
  MagnifyingGlassIcon, GlobeAltIcon, MapPinIcon,
  ArrowUpIcon, ArrowDownIcon, CheckIcon, XMarkIcon
} from '@heroicons/react/24/outline';
import Button from '../../../../common/Button/Button.jsx';
import TextField from '../../../../common/TextField/TextField.jsx';
import Loader from '../../../../common/Loader/Loader.jsx';
import Alert from '../../../../common/Alert/Alert.jsx';
import { getAllCountries, getAllCountriesWithGovernorates, addCountry, updateCountry, deleteCountry } from '../../../../../apis/countries.js';
import { getAllGovernorates, addGovernorate, updateGovernorate, deleteGovernorate } from '../../../../../apis/governorates.js';

// Card component
const Card = ({ title, icon, description, children, refreshing, onRefresh }) => (
  <div className="bg-white border border-gray-100 rounded-xl shadow-sm flex flex-col overflow-hidden hover:shadow-md transition-shadow duration-200">
    <div className="px-5 pt-5 flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-1">{title}</h3>
          {description && <p className="text-xs text-gray-500 leading-relaxed">{description}</p>}
        </div>
      </div>
      <button
        className={`inline-flex items-center text-xs font-medium px-3 py-1.5 rounded-md border ${
          refreshing ? 'bg-gray-100 text-gray-400 border-gray-200' : 'bg-white hover:bg-gray-50 text-gray-600 border-gray-200'
        }`}
        onClick={onRefresh}
        disabled={refreshing}
        title="تحديث"
      >
        <ArrowPathIcon className={`h-4 w-4 ml-1 ${refreshing ? 'animate-spin' : ''}`} />
        {refreshing ? 'جاري...' : 'تحديث'}
      </button>
    </div>
    <div className="p-5 pt-3 flex-1 flex flex-col">{children}</div>
  </div>
);

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
      <Card
        title="إدارة الدول"
        icon={<GlobeAltIcon className="h-5 w-5" />}
        description="إضافة وتعديل وترتيب الدول"
        refreshing={false}
        onRefresh={() => {}}
      >
        <div className="flex justify-center items-center py-8">
          <Loader size="md" />
        </div>
      </Card>
    );
  }

  return (
    <Card
      title="إدارة الدول"
      icon={<GlobeAltIcon className="h-5 w-5" />}
      description="إضافة وتعديل وترتيب الدول"
      refreshing={refreshing}
      onRefresh={() => fetchCountries(true)}
    >
      {error && (
        <Alert type="error" message={error} onClose={() => setError(null)} className="mb-4" />
      )}

      {/* Add New Country */}
      <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h4 className="text-xs font-semibold text-gray-700 mb-3">إضافة دولة جديدة</h4>
        <div className="flex gap-3 items-center">
          <div className="flex-1">
            <TextField
              value={newCountry.name_ar}
              onChange={(e) => setNewCountry({ ...newCountry, name_ar: e.target.value })}
              placeholder="الاسم بالعربي (مثال: مصر)"
              className="text-sm"
            />
          </div>
          <div className="flex-1">
            <TextField
              value={newCountry.name_en}
              onChange={(e) => setNewCountry({ ...newCountry, name_en: e.target.value })}
              placeholder="Name in English (e.g., Egypt)"
              className="text-sm"
            />
          </div>
          <div className="w-24">
            <TextField
              type="number"
              value={newCountry.sort_order}
              onChange={(e) => setNewCountry({ ...newCountry, sort_order: e.target.value })}
              placeholder="الترتيب"
              className="text-sm"
            />
          </div>
          <div>
            <Button
              onClick={handleAdd}
              disabled={saving || !newCountry.name_ar.trim() || !newCountry.name_en.trim()}
              className="text-sm whitespace-nowrap"
              variant="primary"
            >
              {saving ? 'جاري الإضافة...' : 'إضافة'}
            </Button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث في الدول..."
            className="w-full pr-10 pl-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Countries List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredCountries.length === 0 ? (
          <p className="text-center text-gray-500 text-sm py-8">لا توجد دول</p>
        ) : (
          filteredCountries.map((country) => (
            <div
              key={country.id}
              className="p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
            >
              {editingId === country.id ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <TextField
                      value={editingData.name_ar}
                      onChange={(e) => setEditingData({ ...editingData, name_ar: e.target.value })}
                      placeholder="الاسم بالعربي"
                      className="text-sm"
                    />
                    <TextField
                      value={editingData.name_en}
                      onChange={(e) => setEditingData({ ...editingData, name_en: e.target.value })}
                      placeholder="Name in English"
                      className="text-sm"
                    />
                    <TextField
                      type="number"
                      value={editingData.sort_order}
                      onChange={(e) => setEditingData({ ...editingData, sort_order: e.target.value })}
                      placeholder="الترتيب"
                      className="text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleUpdate}
                      disabled={saving}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-md disabled:opacity-50"
                    >
                      <CheckIcon className="h-4 w-4 ml-1" />
                      حفظ
                    </button>
                    <button
                      onClick={cancelEdit}
                      disabled={saving}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md disabled:opacity-50"
                    >
                      <XMarkIcon className="h-4 w-4 ml-1" />
                      إلغاء
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 text-xs font-semibold">
                      {country.sort_order}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{country.name_ar}</p>
                      <p className="text-xs text-gray-500">
                        {country.name_en} • {country.governorates_count} محافظة
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(country)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
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
    </Card>
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
      <Card
        title="إدارة المحافظات"
        icon={<MapPinIcon className="h-5 w-5" />}
        description="إضافة وتعديل وترتيب المحافظات حسب الدولة"
        refreshing={false}
        onRefresh={() => {}}
      >
        <div className="flex justify-center items-center py-8">
          <Loader size="md" />
        </div>
      </Card>
    );
  }

  return (
    <Card
      title="إدارة المحافظات"
      icon={<MapPinIcon className="h-5 w-5" />}
      description="إضافة وتعديل وترتيب المحافظات حسب الدولة"
      refreshing={refreshing}
      onRefresh={() => fetchData(true)}
    >
      {error && (
        <Alert type="error" message={error} onClose={() => setError(null)} className="mb-4" />
      )}

      {/* Add New Governorate */}
      <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h4 className="text-xs font-semibold text-gray-700 mb-3">إضافة محافظة جديدة</h4>
        <div className="flex gap-3 items-center">

                      <div className="w-48">
            <select
              value={newGovernorate.country_id}
              onChange={(e) => setNewGovernorate({ ...newGovernorate, country_id: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">اختر الدولة</option>
              {countries.map(country => (
                <option key={country.id} value={country.id}>{country.name_ar} - {country.name_en}</option>
              ))}
            </select>
          </div>

          
          <div className="flex-1">
            <TextField
              value={newGovernorate.name_ar}
              onChange={(e) => setNewGovernorate({ ...newGovernorate, name_ar: e.target.value })}
              placeholder="الاسم بالعربي"
              className="text-sm"
            />
          </div>
          <div className="flex-1">
            <TextField
              value={newGovernorate.name_en}
              onChange={(e) => setNewGovernorate({ ...newGovernorate, name_en: e.target.value })}
              placeholder="Name in English"
              className="text-sm"
            />
          </div>

          <div className="w-24">
            <TextField
              type="number"
              value={newGovernorate.sort_order}
              onChange={(e) => setNewGovernorate({ ...newGovernorate, sort_order: e.target.value })}
              placeholder="الترتيب"
              className="text-sm"
            />
          </div>
          <div>
            <Button
              onClick={handleAdd}
              disabled={saving || !newGovernorate.name_ar.trim() || !newGovernorate.name_en.trim() || !newGovernorate.country_id}
              className="text-sm whitespace-nowrap"
              variant="primary"
            >
              {saving ? 'جاري الإضافة...' : 'إضافة'}
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث في المحافظات..."
            className="w-full pr-10 pl-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterCountryId}
          onChange={(e) => setFilterCountryId(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">كل الدول</option>
          {countries.map(country => (
            <option key={country.id} value={country.id}>{country.name_ar} - {country.name_en}</option>
          ))}
        </select>
      </div>

      {/* Governorates List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredGovernorates.length === 0 ? (
          <p className="text-center text-gray-500 text-sm py-8">لا توجد محافظات</p>
        ) : (
          filteredGovernorates.map((gov) => (
            <div
              key={gov.id}
              className="p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
            >
              {editingId === gov.id ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                    <TextField
                      value={editingData.name_ar}
                      onChange={(e) => setEditingData({ ...editingData, name_ar: e.target.value })}
                      placeholder="الاسم بالعربي"
                      className="text-sm"
                    />
                    <TextField
                      value={editingData.name_en}
                      onChange={(e) => setEditingData({ ...editingData, name_en: e.target.value })}
                      placeholder="Name in English"
                      className="text-sm"
                    />
                    <select
                      value={editingData.country_id}
                      onChange={(e) => setEditingData({ ...editingData, country_id: e.target.value })}
                      className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">اختر الدولة</option>
                      {countries.map(country => (
                        <option key={country.id} value={country.id}>{country.name_ar} - {country.name_en}</option>
                      ))}
                    </select>
                    <TextField
                      type="number"
                      value={editingData.sort_order}
                      onChange={(e) => setEditingData({ ...editingData, sort_order: e.target.value })}
                      placeholder="الترتيب"
                      className="text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleUpdate}
                      disabled={saving}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-md disabled:opacity-50"
                    >
                      <CheckIcon className="h-4 w-4 ml-1" />
                      حفظ
                    </button>
                    <button
                      onClick={cancelEdit}
                      disabled={saving}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md disabled:opacity-50"
                    >
                      <XMarkIcon className="h-4 w-4 ml-1" />
                      إلغاء
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-600 text-xs font-semibold">
                      {gov.sort_order}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{gov.name_ar}</p>
                      <p className="text-xs text-gray-500">
                        {gov.name_en} • {gov.country_name_ar} - {gov.country_name_en}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(gov)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      title="تعديل"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(gov.id)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
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
    </Card>
  );
}

// Main Component
export default function LocationManagement() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CountriesManager />
        <GovernoratesManager />
      </div>
    </div>
  );
}
