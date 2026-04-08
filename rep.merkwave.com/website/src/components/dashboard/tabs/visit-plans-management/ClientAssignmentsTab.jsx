// src/components/dashboard/tabs/visit-plans-management/ClientAssignmentsTab.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  getAllVisitPlans,
  getAllClientsWithAssignmentStatus,
  assignClientsToVisitPlan,
} from '../../../../apis/visitPlans.js';
import { getAllClientAreaTags } from '../../../../apis/client_area_tags.js';
import { getAllClientIndustries } from '../../../../apis/client_industries.js';
import { getAllUsers } from '../../../../apis/users.js';
// Import currency formatting utility
import { formatCurrency } from '../../../../utils/currency.js';
import Alert from '../../../common/Alert/Alert.jsx';
import Button from '../../../common/Button/Button.jsx';
import CustomPageHeader from '../../../common/CustomPageHeader/CustomPageHeader.jsx';
import FilterBar from '../../../common/FilterBar/FilterBar.jsx';
import GlobalTable from '../../../common/GlobalTable/GlobalTable.jsx';
import Modal from '../../../common/Modal/Modal.jsx';
import { CheckIcon } from '@heroicons/react/24/outline';

function ClientAssignmentsTab() {
  const { setGlobalMessage } = useOutletContext();

  const [visitPlans, setVisitPlans] = useState([]);
  const [users, setUsers] = useState([]);
  const [availableClients, setAvailableClients] = useState([]);
  const [areaTags, setAreaTags] = useState([]);
  const [industries, setIndustries] = useState([]);

  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedClients, setSelectedClients] = useState([]);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isPlanSelectModalOpen, setIsPlanSelectModalOpen] = useState(false);

  const [clientSearch, setClientSearch] = useState('');
  const [selectedAreaTag, setSelectedAreaTag] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedClientType, setSelectedClientType] = useState('');
  const [selectedRepresentative, setSelectedRepresentative] = useState('');

  const [sortConfig, setSortConfig] = useState({ key: 'company', direction: 'asc' });
  const itemsPerPage = 1000; // Show all clients, no pagination

  const [error, setError] = useState('');
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isClientsLoading, setIsClientsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadStaticData = async () => {
      setError('');
      setIsInitialLoading(true);
      try {
        const [plansData, usersData, areaTagsData, industriesData] = await Promise.all([
          getAllVisitPlans(),
          getAllUsers(),
          getAllClientAreaTags(),
          getAllClientIndustries(),
        ]);

        if (cancelled) return;
        setVisitPlans(plansData || []);
        setUsers(usersData || []);
        setAreaTags(areaTagsData || []);
        setIndustries(industriesData || []);
      } catch (err) {
        if (!cancelled) {
          console.error('Error loading static data:', err);
          setError(err.message || 'فشل في تحميل البيانات الأساسية');
        }
      } finally {
        if (!cancelled) {
          setIsInitialLoading(false);
        }
      }
    };

    loadStaticData();

    return () => {
      cancelled = true;
    };
  }, [selectedPlan]);

  useEffect(() => {
    let cancelled = false;

    if (!selectedPlan) {
      setAvailableClients([]);
      setSelectedClients([]);
      setSelectedRepresentative('');
      setIsClientsLoading(false);
      return undefined;
    }

    const fetchClients = async () => {
      setError('');
      setIsClientsLoading(true);
      try {
        const clientsData = await getAllClientsWithAssignmentStatus({ visitPlanId: selectedPlan });
        if (cancelled) return;

        const normalizedClients = Array.isArray(clientsData) ? clientsData : [];
        setAvailableClients(normalizedClients);
        setSelectedClients(
          normalizedClients
            .filter((client) => client.is_assigned)
            .map((client) => Number(client.clients_id))
        );
        // When a plan is selected, default the representative filter to the plan owner
        // so we show only clients under that representative.
        try {
          const planObj = visitPlans.find((p) => Number(p.visit_plan_id) === Number(selectedPlan));
          if (planObj && planObj.user_id) {
            setSelectedRepresentative(String(planObj.user_id));
          }
        } catch {
          // ignore
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Error loading clients:', err);
          setError(err.message || 'فشل في تحميل العملاء');
          setAvailableClients([]);
          setSelectedClients([]);
        }
      } finally {
        if (!cancelled) {
          setIsClientsLoading(false);
        }
      }
    };

    fetchClients();

    return () => {
      cancelled = true;
    };
  }, [selectedPlan, visitPlans]);

  useEffect(() => {
    setClientSearch('');
    setSelectedAreaTag('');
    setSelectedIndustry('');
    setSelectedCity('');
    setSelectedClientType('');
    if (!selectedPlan) {
      setSelectedRepresentative('');
    }
    setSortConfig({ key: 'company', direction: 'asc' });
  }, [selectedPlan]);

  const areaTagMap = useMemo(() => {
    const map = new Map();
    areaTags.forEach((tag) => {
      map.set(String(tag.client_area_tag_id), tag.client_area_tag_name);
    });
    return map;
  }, [areaTags]);

  const industryMap = useMemo(() => {
    const map = new Map();
    industries.forEach((industry) => {
      map.set(String(industry.client_industry_id), industry.client_industry_name);
    });
    return map;
  }, [industries]);

  const representativeMap = useMemo(() => {
    const map = new Map();
    users.forEach((user) => {
      map.set(user.users_id.toString(), user.users_name);
    });
    return map;
  }, [users]);

  const areaOptions = useMemo(() => [
    { value: '', label: 'كل المناطق' },
    ...areaTags.map((tag) => ({ value: String(tag.client_area_tag_id), label: tag.client_area_tag_name })),
  ], [areaTags]);

  const industryOptions = useMemo(() => {
    const unique = new Map();
    industries.forEach((industry) => {
      unique.set(String(industry.client_industry_id), industry.client_industry_name);
    });

    availableClients.forEach((client) => {
      if (client.client_industry_name) {
        unique.set(String(client.clients_industry_id), client.client_industry_name);
      }
    });

    return [
      { value: '', label: 'كل الصناعات' },
      ...Array.from(unique.entries()).map(([value, label]) => ({ value, label })),
    ];
  }, [availableClients, industries]);

  const cityOptions = useMemo(() => [
    { value: '', label: 'كل المدن' },
    ...Array.from(new Set(availableClients.map((client) => client.clients_city).filter(Boolean))).map((city) => ({
      value: city,
      label: city,
    })),
  ], [availableClients]);

  const clientTypeOptions = useMemo(() => [
    { value: '', label: 'كل الأنواع' },
    ...Array.from(new Set(availableClients.map((client) => client.clients_type).filter(Boolean))).map((type) => ({
      value: type,
      label: type,
    })),
  ], [availableClients]);

  const representativeOptions = useMemo(() => [
    { value: '', label: 'كل المندوبين' },
    ...users.map((user) => ({ value: user.users_id.toString(), label: user.users_name })),
  ], [users]);

  const filteredClients = useMemo(() => {
    if (!selectedPlan) return [];

    const search = clientSearch.trim().toLowerCase();

    return availableClients.filter((client) => {
      const companyName = client.clients_company_name?.toLowerCase() || '';
      const contactName = client.clients_contact_name?.toLowerCase() || '';
      const address = client.clients_address?.toLowerCase() || '';
      const phone1 = client.clients_contact_phone_1 || '';
      const phone2 = client.clients_contact_phone_2 || '';

      const matchesSearch = !search
        || companyName.includes(search)
        || contactName.includes(search)
        || address.includes(search)
        || phone1.includes(search)
        || phone2.includes(search);

      const matchesArea = selectedAreaTag
        ? String(client.clients_area_tag_id || '') === selectedAreaTag
        : true;

      const matchesIndustry = selectedIndustry
        ? String(client.clients_industry_id || '') === selectedIndustry
        : true;

      const matchesCity = selectedCity ? client.clients_city === selectedCity : true;
      const matchesType = selectedClientType ? client.clients_type === selectedClientType : true;

      const matchesRepresentative = selectedRepresentative
        ? String(client.clients_rep_user_id || '') === selectedRepresentative
        : true;

      return matchesSearch && matchesArea && matchesIndustry && matchesCity && matchesType && matchesRepresentative;
    });
  }, [
    availableClients,
    selectedPlan,
    clientSearch,
    selectedAreaTag,
    selectedIndustry,
    selectedCity,
    selectedClientType,
    selectedRepresentative,
  ]);

  const sortedClients = useMemo(() => {
    const data = [...filteredClients];
    const direction = sortConfig.direction === 'asc' ? 1 : -1;

    const getComparableValue = (client) => {
      switch (sortConfig.key) {
        case 'city':
          return client.clients_city || '';
        case 'area':
          return areaTagMap.get(String(client.clients_area_tag_id || '')) || '';
        case 'industry':
          return client.client_industry_name || industryMap.get(String(client.clients_industry_id || '')) || '';
        case 'type':
          return client.clients_type || '';
        case 'lastVisit':
          return client.clients_last_visit || '';
        case 'balance':
          return Number(client.clients_credit_balance) || 0;
        case 'assigned':
          return client.is_assigned ? 1 : 0;
        case 'company':
        default:
          return client.clients_company_name || '';
      }
    };

    return data.sort((a, b) => {
      const aValue = getComparableValue(a);
      const bValue = getComparableValue(b);

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return (aValue - bValue) * direction;
      }

      const aString = (aValue ?? '').toString().toLowerCase();
      const bString = (bValue ?? '').toString().toLowerCase();

      if (aString < bString) return -1 * direction;
      if (aString > bString) return 1 * direction;
      return 0;
    });
  }, [filteredClients, sortConfig, areaTagMap, industryMap]);

  const totalClients = sortedClients.length;

  const paginatedClients = useMemo(() => {
    return sortedClients.slice(0, itemsPerPage);
  }, [sortedClients, itemsPerPage]);

  const selectedCount = selectedClients.length;
  const tableLoading = isInitialLoading || isClientsLoading || isAssigning;

  const areAllFilteredSelected = useMemo(() => (
    filteredClients.length > 0
    && filteredClients.every((client) => selectedClients.includes(Number(client.clients_id)))
  ), [filteredClients, selectedClients]);

  const handleSearchChange = useCallback((value) => {
    setClientSearch(value);
  }, []);

  const handleAreaTagChange = useCallback((value) => {
    setSelectedAreaTag(value || '');
  }, []);

  const handleIndustryChange = useCallback((value) => {
    setSelectedIndustry(value || '');
  }, []);

  const handleCityChange = useCallback((value) => {
    setSelectedCity(value || '');
  }, []);

  const handleClientTypeChange = useCallback((value) => {
    setSelectedClientType(value || '');
  }, []);

  const handleRepresentativeChange = useCallback((value) => {
    setSelectedRepresentative(value || '');
  }, []);

  const handleSortChange = useCallback((key, direction) => {
    setSortConfig({ key, direction });
  }, []);

  const handleClientSelection = useCallback((clientId) => {
    const id = Number(clientId);
    setSelectedClients((prev) => (
      prev.includes(id)
        ? prev.filter((existing) => existing !== id)
        : [...prev, id]
    ));
  }, []);

  const handleSelectAll = useCallback(() => {
    if (!selectedPlan || filteredClients.length === 0) return;
    const allIds = filteredClients.map((client) => Number(client.clients_id));
    setSelectedClients(areAllFilteredSelected ? [] : allIds);
  }, [selectedPlan, filteredClients, areAllFilteredSelected]);

  const handlePlanChange = useCallback((value) => {
    const numericValue = value ? Number(value) : null;
    setSelectedPlan(numericValue);
  }, []);

  const clearFilters = useCallback(() => {
    setClientSearch('');
    setSelectedAreaTag('');
    setSelectedIndustry('');
    setSelectedCity('');
    setSelectedClientType('');
    // Don't clear representative when a plan is selected (we lock the rep to the plan owner)
    if (!selectedPlan) {
      setSelectedRepresentative('');
    }
  }, []);

  const activeFilterChips = useMemo(() => {
    if (!selectedPlan) return [];

    const chips = [];

    if (clientSearch) {
      chips.push({
        key: 'search',
        label: 'البحث',
        value: clientSearch,
        tone: 'blue',
        onRemove: () => handleSearchChange(''),
      });
    }

    if (selectedAreaTag) {
      chips.push({
        key: 'area',
        label: 'المنطقة',
        value: areaTagMap.get(selectedAreaTag) || selectedAreaTag,
        tone: 'indigo',
        onRemove: () => handleAreaTagChange(''),
      });
    }

    if (selectedIndustry) {
      chips.push({
        key: 'industry',
        label: 'الصناعة',
        value: industryMap.get(selectedIndustry) || selectedIndustry,
        tone: 'purple',
        onRemove: () => handleIndustryChange(''),
      });
    }

    if (selectedCity) {
      chips.push({
        key: 'city',
        label: 'المدينة',
        value: selectedCity,
        tone: 'green',
        onRemove: () => handleCityChange(''),
      });
    }

    if (selectedClientType) {
      chips.push({
        key: 'type',
        label: 'النوع',
        value: selectedClientType,
        tone: 'orange',
        onRemove: () => handleClientTypeChange(''),
      });
    }

    if (selectedRepresentative) {
      if (!selectedPlan) {
        chips.push({
          key: 'representative',
          label: 'المندوب',
          value: representativeMap.get(selectedRepresentative) || selectedRepresentative,
          tone: 'teal',
          onRemove: () => handleRepresentativeChange(''),
        });
      }
    }

    return chips;
  }, [
    selectedPlan,
    clientSearch,
    selectedAreaTag,
    selectedIndustry,
    selectedCity,
    selectedClientType,
    selectedRepresentative,
    areaTagMap,
    industryMap,
    representativeMap,
    handleSearchChange,
    handleAreaTagChange,
    handleIndustryChange,
    handleCityChange,
    handleClientTypeChange,
    handleRepresentativeChange,
  ]);

  const tableColumns = useMemo(() => [
    {
      key: 'select',
      title: 'تحديد',
      align: 'center',
      headerAlign: 'center',
      showDivider: false,
      render: (client) => (
        <div className="flex justify-center">
          <button
            type="button"
            className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
              selectedClients.includes(Number(client.clients_id))
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'border-gray-300 bg-white hover:border-blue-400'
            }`}
            onClick={(event) => {
              event.stopPropagation();
              handleClientSelection(client.clients_id);
            }}
            aria-label={selectedClients.includes(Number(client.clients_id)) ? 'إلغاء تحديد' : 'تحديد'}
          >
            {selectedClients.includes(Number(client.clients_id)) && (
              <CheckIcon className="w-3 h-3" />
            )}
          </button>
        </div>
      ),
    },
    {
      key: 'company',
      title: 'اسم الشركة',
      sortable: true,
      render: (client) => (
        <div className="space-y-1">
          <div className="font-semibold text-blue-800 leading-snug">
            {client.clients_company_name || 'اسم غير محدد'}
          </div>
          <div className="text-xs text-gray-500 leading-snug">
            {client.clients_contact_name || client.clients_contact_phone_1 || client.clients_address || '—'}
          </div>
        </div>
      ),
    },
    {
      key: 'city',
      title: 'المدينة',
      sortable: true,
      render: (client) => client.clients_city || '—',
    },
    {
      key: 'area',
      title: 'المنطقة',
      sortable: true,
      render: (client) => areaTagMap.get(String(client.clients_area_tag_id || '')) || '—',
    },
    {
      key: 'industry',
      title: 'الصناعة',
      sortable: true,
      render: (client) => client.client_industry_name || industryMap.get(String(client.clients_industry_id || '')) || '—',
    },
    {
      key: 'type',
      title: 'النوع',
      sortable: true,
      render: (client) => client.clients_type || '—',
    },
    {
      key: 'lastVisit',
      title: 'آخر زيارة',
      sortable: true,
      render: (client) => client.clients_last_visit || '—',
    },
    {
      key: 'balance',
      title: 'الرصيد',
      align: 'center',
      headerAlign: 'center',
      sortable: true,
      render: (client) => (
        <span className="font-semibold text-gray-700">
          {formatCurrency(Number(client.clients_credit_balance) || 0)}
        </span>
      ),
    },
    {
      key: 'assigned',
      title: 'الحالة',
      align: 'center',
      headerAlign: 'center',
      sortable: true,
      render: (client) => (
        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${client.is_assigned ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
          {client.is_assigned ? 'مُخصص للخطة' : 'غير مُخصص'}
        </span>
      ),
    },
  ], [selectedClients, handleClientSelection, areaTagMap, industryMap]);

  const rowClassName = useCallback((client) => (
    selectedClients.includes(Number(client.clients_id))
      ? 'bg-blue-50'
      : undefined
  ), [selectedClients]);

  const handleRowClick = useCallback((client) => {
    handleClientSelection(client.clients_id);
  }, [handleClientSelection]);

  const handleSaveAssignedClients = useCallback(async () => {
    if (!selectedPlan || Number.isNaN(selectedPlan)) {
      setGlobalMessage({ type: 'warning', message: 'يرجى اختيار خطة زيارة أولاً' });
      return;
    }

    setIsAssigning(true);
    try {
      const message = await assignClientsToVisitPlan(Number(selectedPlan), selectedClients);
      setGlobalMessage({ type: 'success', message: message || 'تم حفظ التغييرات بنجاح!' });

      setIsClientsLoading(true);
      const refreshedClients = await getAllClientsWithAssignmentStatus({ visitPlanId: selectedPlan });
      const normalizedClients = Array.isArray(refreshedClients) ? refreshedClients : [];
      setAvailableClients(normalizedClients);
      setSelectedClients(
        normalizedClients
          .filter((client) => client.is_assigned)
          .map((client) => Number(client.clients_id))
      );
    } catch (err) {
      console.error('Error saving assigned clients:', err);
      setGlobalMessage({ type: 'error', message: err.message || 'فشل في حفظ التغييرات' });
    } finally {
      setIsAssigning(false);
      setIsClientsLoading(false);
    }
  }, [selectedPlan, selectedClients, setGlobalMessage]);

  const tableEmptyState = selectedPlan
    ? {
        icon: '🧾',
        title: 'لا توجد نتائج مطابقة',
        description: filteredClients.length === 0
          ? 'لم يتم العثور على عملاء يطابقون الفلاتر الحالية.'
          : 'جرّب تعديل الفلاتر أو البحث عن اسم مختلف.',
      }
    : {
        icon: '📋',
        title: 'اختر خطة زيارة',
        description: 'حدد خطة من القائمة أعلاه لعرض العملاء المتاحين وتخصيصهم.',
      };

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <CustomPageHeader
        title="تخصيص العملاء لخطط الزيارات"
        subtitle="اختر خطة ثم قم بتعيين العملاء المناسبين إليها"
        icon={<span className="text-2xl">🗂️</span>}
        statValue={selectedPlan ? selectedCount : visitPlans.length}
        statLabel={selectedPlan ? 'عملاء محددون' : 'عدد الخطط المتاحة'}
        actionButton={[
          <button
            key="select-plan"
            type="button"
            onClick={() => setIsPlanSelectModalOpen(true)}
            className="bg-white text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg shadow-md hover:shadow-lg font-bold"
          >
            اختر خطة
          </button>
        ]}
      />

      {error && (
        <Alert type="error" message={error} className="mb-4" />
      )}

      {selectedPlan && (
        <>
          <FilterBar
            title="أدوات البحث والفلاتر"
            searchConfig={{
              value: clientSearch,
              onChange: handleSearchChange,
              onClear: () => handleSearchChange(''),
              placeholder: 'ابحث في العملاء (الاسم، الهاتف، العنوان...)',
              searchWhileTyping: true,
            }}
            selectFilters={[
              {
                key: 'area',
                value: selectedAreaTag,
                onChange: handleAreaTagChange,
                options: areaOptions,
                placeholder: 'كل المناطق',
              },
              {
                key: 'industry',
                value: selectedIndustry,
                onChange: handleIndustryChange,
                options: industryOptions,
                placeholder: 'كل الصناعات',
              },
              {
                key: 'city',
                value: selectedCity,
                onChange: handleCityChange,
                options: cityOptions,
                placeholder: 'كل المدن',
              },
              {
                key: 'type',
                value: selectedClientType,
                onChange: handleClientTypeChange,
                options: clientTypeOptions,
                placeholder: 'كل الأنواع',
              },
              // Only include representative filter when no plan is selected.
              ...(!selectedPlan ? [{
                key: 'representative',
                value: selectedRepresentative,
                onChange: handleRepresentativeChange,
                options: representativeOptions,
                placeholder: 'كل المندوبين',
              }] : []),
            ]}
            activeChips={activeFilterChips}
            onClearAll={activeFilterChips.length ? clearFilters : null}
          >
            <Button
              type="button"
              variant="secondary"
              onClick={handleSelectAll}
              disabled={filteredClients.length === 0}
              className="whitespace-nowrap"
            >
              {areAllFilteredSelected ? 'إلغاء تحديد الكل' : 'تحديد كل النتائج'}
            </Button>
          </FilterBar>

        </>
      )}

      {selectedPlan && (
        <>
          <GlobalTable
            data={paginatedClients}
            loading={tableLoading}
            error={null}
            columns={tableColumns}
            rowKey="clients_id"
            totalCount={totalClients}
            searchTerm={clientSearch}
            emptyState={tableEmptyState}
            initialSort={sortConfig}
            onSort={handleSortChange}
            rowClassName={rowClassName}
            onRowClick={handleRowClick}
            highlightOnHover
            showSummary
          />
        </>
      )}

      {selectedPlan && selectedClients.length > 0 && (
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 shadow-lg z-10">
          <div className="flex justify-center">
            <Button
              type="button"
              onClick={handleSaveAssignedClients}
              disabled={isAssigning}
              isLoading={isAssigning}
              className="px-8 py-3 text-lg font-bold"
            >
              <CheckIcon className="h-5 w-5 ml-2" />
              حفظ التغييرات ({selectedClients.length} عميل)
            </Button>
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 leading-loose text-sm text-blue-800">
        <h4 className="font-semibold mb-2">تلميحات للاستخدام:</h4>
        <ul className="space-y-1 list-disc list-inside">
          <li>ابدأ باختيار خطة الزيارة من القائمة العلوية لعرض العملاء المرتبطين بها.</li>
          <li>استخدم شريط الفلاتر للبحث المتقدم حسب المنطقة أو الصناعة أو المدينة أو نوع العميل.</li>
          <li>زر "تحديد كل النتائج" يساعدك على تحديد كل العملاء المطابقين للفلاتر الحالية بسرعة.</li>
          <li>يمكنك تحديد أو إلغاء تحديد أي عميل عبر النقر على الصف أو مربع الاختيار.</li>
          <li>بعد الانتهاء اضغط على زر "حفظ التغييرات" الموجود أسفل الجدول لتحديث التخصيصات.</li>
        </ul>
      </div>

      <Modal
        isOpen={isPlanSelectModalOpen}
        onClose={() => setIsPlanSelectModalOpen(false)}
        title="اختيار خطة الزيارة"
      >
        <div className="space-y-4">
          <p className="text-gray-600">حدد الخطة التي تريد تخصيص العملاء لها:</p>
          <select
            value={selectedPlan ?? ''}
            onChange={(event) => {
              handlePlanChange(event.target.value);
              setIsPlanSelectModalOpen(false);
            }}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 text-right"
          >
            <option value="">اختر خطة الزيارة</option>
            {visitPlans.map((plan) => (
              <option key={plan.visit_plan_id} value={plan.visit_plan_id}>
                {plan.visit_plan_name} — {users.find((user) => user.users_id === plan.user_id)?.users_name || 'غير محدد'}
              </option>
            ))}
          </select>
        </div>
      </Modal>
    </div>
  );
}

export default ClientAssignmentsTab;
