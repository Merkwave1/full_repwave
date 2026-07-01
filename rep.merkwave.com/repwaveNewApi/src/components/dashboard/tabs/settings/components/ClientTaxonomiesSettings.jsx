// src/components/dashboard/tabs/settings/components/ClientTaxonomiesSettings.jsx
import React, { useEffect, useState } from 'react';
import { PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon, TagIcon, BuildingOffice2Icon, UsersIcon } from '@heroicons/react/24/outline';
import Loader from '../../../../common/Loader/Loader.jsx';
import Alert from '../../../../common/Alert/Alert.jsx';
import { SettingsCard } from '../SettingsFormField.jsx';
import {
  settingsInputClass,
  settingsSearchInputClass,
  settingsPrimaryBtnClass,
  settingsSecondaryBtnClass,
  settingsTableWrapClass,
  settingsListItemClass,
  settingsFieldsStackClass,
  settingsSectionsStackClass,
} from '../settingsUi.js';
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
      {/* Add form: stacks vertically on mobile, row on sm+ */}
      <div className="flex flex-col gap-2 mb-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            className={`flex-1 ${settingsInputClass}`}
            placeholder={placeholder}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <div className="flex gap-2">
            <input
              type="number"
              className={`w-24 sm:w-24 flex-1 sm:flex-none ${settingsInputClass}`}
              placeholder="الترتيب"
              value={newSortOrder}
              onChange={(e) => setNewSortOrder(e.target.value)}
              min="0"
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={saving || !newName.trim()}
              className={`${settingsPrimaryBtnClass} flex-1 sm:flex-none justify-center text-sm whitespace-nowrap`}
            >
              <PlusIcon className="h-4 w-4 ml-1" /> إضافة
            </button>
          </div>
        </div>
        <div className="relative">
          <MagnifyingGlassIcon className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-[#8B5FD6]/50" />
          <input
            className={settingsSearchInputClass}
            placeholder="بحث..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <Loader />
      ) : (
        <>
          {/* Mobile card-list (hidden on sm+) */}
          <div className="sm:hidden max-h-72 overflow-y-auto custom-scrollbar flex flex-col gap-2 border border-[#EDE7FF] rounded-xl p-2 bg-[#FAFAFE]">
            {filteredItems.length === 0 ? (
              <p className="py-6 text-center text-gray-400 text-sm">لا توجد عناصر</p>
            ) : (
              filteredItems.map((item) => (
                <div key={item[idKey]} className={settingsListItemClass}>
                  {editingId === item[idKey] ? (
                    <div className="flex flex-col gap-2">
                      <input
                        className={settingsInputClass}
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        placeholder="الاسم"
                      />
                      <input
                        type="number"
                        className={settingsInputClass}
                        value={editingSortOrder}
                        onChange={(e) => setEditingSortOrder(e.target.value)}
                        min="0"
                        placeholder="الترتيب"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className={`flex-1 py-2 rounded-xl ${settingsPrimaryBtnClass} justify-center text-xs`}
                          onClick={handleUpdate}
                          disabled={saving || !editingName.trim()}
                        >حفظ</button>
                        <button
                          type="button"
                          className={`flex-1 py-2 rounded-xl ${settingsSecondaryBtnClass} justify-center text-xs`}
                          onClick={resetEditState}
                        >إلغاء</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-start gap-2">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#EDE7FF] text-[#8B5FD6] text-xs font-semibold shrink-0 mt-0.5">
                          {normalizeSortOrder(item[sortKey])}
                        </span>
                        <span className="text-[#2D1B69] text-sm font-medium leading-snug break-words w-full">
                          {item[nameKey]}
                        </span>
                      </div>
                      <div className="flex gap-2 justify-end border-t border-[#EDE7FF] pt-1.5">
                        <button
                          type="button"
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-xl ${settingsSecondaryBtnClass} text-xs`}
                          onClick={() => startEdit(item)}
                        ><PencilIcon className="h-3.5 w-3.5" /> تعديل</button>
                        <button
                          type="button"
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-50 text-red-600 border border-red-100 text-xs font-semibold hover:bg-red-100"
                          onClick={() => handleDelete(item[idKey])}
                        ><TrashIcon className="h-3.5 w-3.5" /> حذف</button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Desktop table (hidden on mobile) */}
          <div className="hidden sm:block overflow-x-auto">
            <div className={`max-h-56 overflow-y-auto custom-scrollbar ${settingsTableWrapClass}`}>
              <table className="min-w-full">
                <thead className="bg-[#F8F5FF]">
                  <tr>
                    <th className="text-right text-sm font-semibold text-[#2D1B69] px-3 py-2.5 w-24">الترتيب</th>
                    <th className="text-right text-sm font-semibold text-[#2D1B69] px-3 py-2.5">الاسم</th>
                    <th className="w-24"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => (
                    <tr key={item[idKey]} className="border-t border-[#EDE7FF] hover:bg-[#FAFAFE]">
                      <td className="px-3 py-2 align-middle">
                        {editingId === item[idKey] ? (
                          <input
                            type="number"
                            className={`w-20 ${settingsInputClass}`}
                            value={editingSortOrder}
                            onChange={(e) => setEditingSortOrder(e.target.value)}
                            min="0"
                          />
                        ) : (
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#EDE7FF] text-[#8B5FD6] text-xs font-semibold">
                            {normalizeSortOrder(item[sortKey])}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 align-middle">
                        {editingId === item[idKey] ? (
                          <input
                            className={settingsInputClass}
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                          />
                        ) : (
                          <span className="text-[#2D1B69] text-sm">{item[nameKey]}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-left">
                        {editingId === item[idKey] ? (
                          <div className="flex gap-2 justify-end">
                            <button
                              type="button"
                              className={`inline-flex items-center px-2.5 py-1.5 rounded-xl ${settingsPrimaryBtnClass} text-xs`}
                              onClick={handleUpdate}
                              disabled={saving || !editingName.trim()}
                            >
                              حفظ
                            </button>
                            <button
                              type="button"
                              className={`inline-flex items-center px-2.5 py-1.5 rounded-xl ${settingsSecondaryBtnClass} text-xs`}
                              onClick={resetEditState}
                            >
                              إلغاء
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2 justify-end">
                            <button
                              type="button"
                              className="p-1.5 rounded-xl hover:bg-[#F8F5FF] text-[#8B5FD6]"
                              title="تعديل"
                              onClick={() => startEdit(item)}
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              className="p-1.5 rounded-xl hover:bg-red-50 text-red-600"
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
        </>
      )}
    </div>
  );
}

export default function ClientTaxonomiesSettings({ embedded = false }) {
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
    <div className={settingsSectionsStackClass} dir="rtl">
      {!embedded && (
        <p className="text-sm text-gray-500 leading-relaxed">
          إدارة التصنيفات المرتبطة بالعملاء — كل نوع ظاهر أمامك ويمكنك التعديل مباشرة.
        </p>
      )}
      <div className={settingsSectionsStackClass}>
        <SettingsCard
          title="وسوم المناطق"
          subtitle="استخدمها لتصنيف العملاء حسب مناطق أو نطاقات جغرافية"
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
        </SettingsCard>

        <SettingsCard
          title="الصناعات"
          subtitle="تعريف القطاعات الصناعية للعملاء لتقارير وتحليلات أدق"
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
        </SettingsCard>

        <SettingsCard
          title="أنواع العملاء"
          subtitle="تقسيم العملاء (مثل جملة، تجزئة، مستهلك نهائي)"
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
        </SettingsCard>
      </div>
    </div>
  );
}
