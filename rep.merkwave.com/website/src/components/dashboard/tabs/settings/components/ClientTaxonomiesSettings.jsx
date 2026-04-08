// src/components/dashboard/tabs/settings/components/ClientTaxonomiesSettings.jsx
import React, { useEffect, useState } from 'react';
import { PlusIcon, PencilIcon, TrashIcon, ArrowPathIcon, MagnifyingGlassIcon, TagIcon, BuildingOffice2Icon, UsersIcon } from '@heroicons/react/24/outline';
import Button from '../../../../common/Button/Button.jsx';
import TextField from '../../../../common/TextField/TextField.jsx';
import Loader from '../../../../common/Loader/Loader.jsx';
import Alert from '../../../../common/Alert/Alert.jsx';
import {
  getAppClientAreaTags,
  getAppClientIndustries,
  getAppClientTypes
} from '../../../../../apis/auth.js';
import {
  addClientAreaTag,
  updateClientAreaTag,
  deleteClientAreaTag
} from '../../../../../apis/client_area_tags.js';
import {
  addClientIndustry,
  updateClientIndustry,
  deleteClientIndustry
} from '../../../../../apis/client_industries.js';
import {
  addClientType,
  updateClientType,
  deleteClientType
} from '../../../../../apis/client_types.js';

// Generic card shell
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
        className={`inline-flex items-center text-xs font-medium px-3 py-1.5 rounded-md border ${refreshing ? 'bg-gray-100 text-gray-400 border-gray-200' : 'bg-white hover:bg-gray-50 text-gray-600 border-gray-200'}`}
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

function ListManager({
  placeholder,
  items,
  idKey,
  nameKey,
  sortKey = 'sort_order',
  onAdd,
  onUpdate,
  onDelete,
  loading,
  error,
  setError
}) {
  const [newName, setNewName] = useState('');
  const [newSortOrder, setNewSortOrder] = useState('0');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [editingSortOrder, setEditingSortOrder] = useState('0');
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');

  const normalizeSortOrder = (value) => {
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const resetEditState = () => {
    setEditingId(null);
    setEditingName('');
    setEditingSortOrder('0');
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    try {
      setSaving(true);
      await onAdd({
        name: newName.trim(),
        sort_order: normalizeSortOrder(newSortOrder)
      });
      setNewName('');
      setNewSortOrder('0');
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingName.trim() || editingId == null) return;
    try {
      setSaving(true);
      await onUpdate(editingId, {
        name: editingName.trim(),
        sort_order: normalizeSortOrder(editingSortOrder)
      });
      resetEditState();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('هل أنت متأكد من الحذف؟')) return;
    try {
      setSaving(true);
      await onDelete(id);
      if (editingId === id) {
        resetEditState();
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredItems = items
    .filter((item) => {
      const nameValue = (item[nameKey] ?? '').toString().toLowerCase();
      return nameValue.includes(query.toLowerCase());
    })
    .sort((a, b) => {
      const aSort = normalizeSortOrder(a[sortKey]);
      const bSort = normalizeSortOrder(b[sortKey]);
      if (aSort !== bSort) {
        return aSort - bSort;
      }
      const aName = (a[nameKey] ?? '').toString();
      const bName = (b[nameKey] ?? '').toString();
      return aName.localeCompare(bName, 'ar', { sensitivity: 'base' });
    });

  const startEdit = (item) => {
    setEditingId(item[idKey]);
    setEditingName(item[nameKey] ?? '');
    setEditingSortOrder(String(item[sortKey] ?? 0));
  };

  return (
    <div>
      {error && (
        <Alert type="error" message={error} onClose={() => setError(null)} className="mb-3" />
      )}
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex flex-wrap gap-2">
          <input
            className="min-w-[200px] flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={placeholder}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <input
            type="number"
            className="w-28 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="الترتيب"
            value={newSortOrder}
            onChange={(e) => setNewSortOrder(e.target.value)}
            min="0"
          />
          <Button onClick={handleAdd} disabled={saving || !newName.trim()} className="bg-blue-600 hover:bg-blue-700">
            <PlusIcon className="h-4 w-4 ml-1" /> إضافة
          </Button>
        </div>
        <div className="relative">
          <MagnifyingGlassIcon className="h-4 w-4 absolute right-3 top-3 text-gray-400" />
          <input
            className="w-full pr-8 pl-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
            placeholder="بحث..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <Loader />
      ) : (
        <div className="overflow-x-auto">
          <div className="max-h-56 overflow-y-auto custom-scrollbar border border-gray-100 rounded-md">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-right text-sm font-medium text-gray-600 px-3 py-2 w-24">الترتيب</th>
                  <th className="text-right text-sm font-medium text-gray-600 px-3 py-2">الاسم</th>
                  <th className="w-24"></th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item[idKey]} className="border-t border-gray-100">
                    <td className="px-3 py-1.5 align-middle">
                      {editingId === item[idKey] ? (
                        <input
                          type="number"
                          className="w-20 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          value={editingSortOrder}
                          onChange={(e) => setEditingSortOrder(e.target.value)}
                          min="0"
                        />
                      ) : (
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 text-blue-600 text-xs font-semibold">
                          {normalizeSortOrder(item[sortKey])}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-1.5 align-middle">
                      {editingId === item[idKey] ? (
                        <div className="flex items-center gap-2">
                          <input
                            className="flex-1 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                          />
                        </div>
                      ) : (
                        <span className="text-gray-800 text-sm">{item[nameKey]}</span>
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-left">
                      {editingId === item[idKey] ? (
                        <div className="flex gap-2 justify-end">
                          <button
                            className="inline-flex items-center px-2 py-1 rounded-md bg-green-600 text-white hover:bg-green-700 text-xs"
                            onClick={handleUpdate}
                            disabled={saving || !editingName.trim()}
                          >
                            حفظ
                          </button>
                          <button
                            className="inline-flex items-center px-2 py-1 rounded-md bg-gray-200 text-gray-800 hover:bg-gray-300 text-xs"
                            onClick={resetEditState}
                          >
                            إلغاء
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2 justify-end">
                          <button
                            className="p-1.5 rounded-md hover:bg-yellow-50 text-yellow-700"
                            title="تعديل"
                            onClick={() => startEdit(item)}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            className="p-1.5 rounded-md hover:bg-red-50 text-red-600"
                            title="حذف"
                            onClick={() => handleDelete(item[idKey])}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredItems.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-3 py-6 text-center text-gray-500 text-sm">لا توجد عناصر</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ClientTaxonomiesSettings() {
  // State groups kept separate for clarity & independent loading
  const [areaTags, setAreaTags] = useState([]);
  const [industries, setIndustries] = useState([]);
  const [clientTypes, setClientTypes] = useState([]);

  const [loadingAreaTags, setLoadingAreaTags] = useState(true);
  const [loadingIndustries, setLoadingIndustries] = useState(true);
  const [loadingClientTypes, setLoadingClientTypes] = useState(true);

  const [refreshingAreaTags, setRefreshingAreaTags] = useState(false);
  const [refreshingIndustries, setRefreshingIndustries] = useState(false);
  const [refreshingClientTypes, setRefreshingClientTypes] = useState(false);

  const [errorAreaTags, setErrorAreaTags] = useState(null);
  const [errorIndustries, setErrorIndustries] = useState(null);
  const [errorClientTypes, setErrorClientTypes] = useState(null);

  const fetchAreaTags = async (force = false) => {
    try {
      if (force) setRefreshingAreaTags(true); else setLoadingAreaTags(true);
      const data = await getAppClientAreaTags(force);
      setAreaTags(data);
    } catch (e) {
      setErrorAreaTags(e.message);
    } finally {
      setLoadingAreaTags(false);
      setRefreshingAreaTags(false);
    }
  };

  const fetchIndustries = async (force = false) => {
    try {
      if (force) setRefreshingIndustries(true); else setLoadingIndustries(true);
      const data = await getAppClientIndustries(force);
      setIndustries(data);
    } catch (e) {
      setErrorIndustries(e.message);
    } finally {
      setLoadingIndustries(false);
      setRefreshingIndustries(false);
    }
  };

  const fetchClientTypes = async (force = false) => {
    try {
      if (force) setRefreshingClientTypes(true); else setLoadingClientTypes(true);
      const data = await getAppClientTypes(force);
      setClientTypes(data);
    } catch (e) {
      setErrorClientTypes(e.message);
    } finally {
      setLoadingClientTypes(false);
      setRefreshingClientTypes(false);
    }
  };

  useEffect(() => {
    fetchAreaTags(false);
    fetchIndustries(false);
  fetchClientTypes(false);
  }, []);

  // Handlers with cache invalidation
  const addAreaTagHandler = async ({ name, sort_order }) => {
    await addClientAreaTag(name, sort_order);
    localStorage.removeItem('appClientAreaTags');
    await fetchAreaTags(true);
  };

  const updateAreaTagHandler = async (id, { name, sort_order }) => {
    await updateClientAreaTag(id, name, sort_order);
    localStorage.removeItem('appClientAreaTags');
    await fetchAreaTags(true);
  };

  const deleteAreaTagHandler = async (id) => {
    await deleteClientAreaTag(id);
    localStorage.removeItem('appClientAreaTags');
    await fetchAreaTags(true);
  };

  const addIndustryHandler = async ({ name, sort_order }) => {
    await addClientIndustry(name, sort_order);
    localStorage.removeItem('appClientIndustries');
    await fetchIndustries(true);
  };

  const updateIndustryHandler = async (id, { name, sort_order }) => {
    await updateClientIndustry(id, name, sort_order);
    localStorage.removeItem('appClientIndustries');
    await fetchIndustries(true);
  };

  const deleteIndustryHandler = async (id) => {
    await deleteClientIndustry(id);
    localStorage.removeItem('appClientIndustries');
    await fetchIndustries(true);
  };

  // Client Types handlers
  const addClientTypeHandler = async ({ name, sort_order }) => {
    await addClientType(name, sort_order);
    localStorage.removeItem('appClientTypes');
    await fetchClientTypes(true);
  };

  const updateClientTypeHandler = async (id, { name, sort_order }) => {
    await updateClientType(id, name, sort_order);
    localStorage.removeItem('appClientTypes');
    await fetchClientTypes(true);
  };

  const deleteClientTypeHandler = async (id) => {
    await deleteClientType(id);
    localStorage.removeItem('appClientTypes');
    await fetchClientTypes(true);
  };

  // Icons (RTL friendly)
  const iconSize = 'h-5 w-5';

  return (
    <div className="space-y-8" dir="rtl">
      <div className="mb-2">
        <p className="text-sm text-gray-600">إدارة التصنيفات المرتبطة بالعملاء. تم توحيد العرض لإلغاء أزرار التبديل المربكة – الآن كل نوع ظاهر أمامك ويمكنك التعديل مباشرة.</p>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Area Tags */}
        <Card
          title="وسوم المناطق"
          description="استخدمها لتصنيف العملاء حسب مناطق أو نطاقات جغرافية"
          icon={<TagIcon className={iconSize} />}
          refreshing={refreshingAreaTags}
          onRefresh={() => fetchAreaTags(true)}
        >
          <ListManager
            placeholder="أدخل اسم وسم منطقة..."
            items={areaTags}
            idKey="client_area_tag_id"
            nameKey="client_area_tag_name"
            onAdd={addAreaTagHandler}
            onUpdate={updateAreaTagHandler}
            onDelete={deleteAreaTagHandler}
            loading={loadingAreaTags}
            error={errorAreaTags}
            setError={setErrorAreaTags}
          />
        </Card>

        {/* Industries */}
        <Card
          title="الصناعات"
          description="تعريف القطاعات الصناعية للعملاء لتقارير وتحليلات أدق"
          icon={<BuildingOffice2Icon className={iconSize} />}
          refreshing={refreshingIndustries}
          onRefresh={() => fetchIndustries(true)}
        >
          <ListManager
            placeholder="أدخل اسم صناعة..."
            items={industries}
            idKey="client_industries_id"
            nameKey="client_industries_name"
            onAdd={addIndustryHandler}
            onUpdate={updateIndustryHandler}
            onDelete={deleteIndustryHandler}
            loading={loadingIndustries}
            error={errorIndustries}
            setError={setErrorIndustries}
          />
        </Card>

        {/* Client Types */}
        <Card
          title="أنواع العملاء"
          description="تقسيم العملاء (مثل جملة، تجزئة، مستهلك نهائي)" 
          icon={<UsersIcon className={iconSize} />}
          refreshing={refreshingClientTypes}
          onRefresh={() => fetchClientTypes(true)}
        >
          <ListManager
            placeholder="أدخل اسم نوع العميل..."
            items={clientTypes}
            idKey="client_type_id"
            nameKey="client_type_name"
            onAdd={addClientTypeHandler}
            onUpdate={updateClientTypeHandler}
            onDelete={deleteClientTypeHandler}
            loading={loadingClientTypes}
            error={errorClientTypes}
            setError={setErrorClientTypes}
          />
        </Card>
      </div>
    </div>
  );
}
