// src/components/dashboard/tabs/clients-management/ClientsTab.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { addClient, updateClient, deleteClient, getClientDetails } from '../../../../apis/clients'; // Removed direct getAllClients (use cached helper instead)
import { getAppClients, getAppClientAreaTags, getAppClientIndustries, getAppUsers } from '../../../../apis/auth';
import { getAllCountriesWithGovernorates } from '../../../../apis/countries';
import { getErrorMessage } from '../../../../utils/errorTranslations';
import { CLIENT_STATUS_OPTIONS, getClientStatusBadgeClass, getClientStatusChipTone, getClientStatusLabel } from '../../../../constants/clientStatus';
// Import the new ClientListView
import ClientListView from './clients/ClientListView';
import AddClientForm from './clients/AddClientForm';
import UpdateClientForm from './clients/UpdateClientForm';
import ClientDetailsModal from './clients/ClientDetailsModal';
import DeleteConfirmationModal from '../../../common/DeleteConfirmationModal';
import Loader from '../../../common/Loader/Loader';
import Alert from '../../../common/Alert/Alert';
import FilterBar from '../../../common/FilterBar/FilterBar';
import CustomPageHeader from '../../../common/CustomPageHeader/CustomPageHeader';
import GlobalTable from '../../../common/GlobalTable/GlobalTable';
import PaginationHeaderFooter from '../../../common/PaginationHeaderFooter/PaginationHeaderFooter';
import { EyeIcon, PencilIcon, TrashIcon, UsersIcon, PlusIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

// Import currency formatting utility
import { formatCurrency } from '../../../../utils/currency';
import { isOdooIntegrationEnabled } from '../../../../utils/odooIntegration';

const STATUS_FILTER_OPTIONS = [{ value: '', label: 'جميع الحالات' }, ...CLIENT_STATUS_OPTIONS];

const TYPE_OPTIONS = [
  { value: '', label: 'جميع الأنواع' },
  { value: 'store', label: 'متجر' },
  { value: 'importer', label: 'مستورد' },
  { value: 'distributor', label: 'موزع' },
];
// Account statement related API imports
import ClientAccountStatementModal from './clients/ClientAccountStatementModal';
import ClientDocumentsModal from './clients/details/ClientDocumentsModal';

function ClientsTab() {
  const { setGlobalMessage, setChildRefreshHandler } = useOutletContext();
  const [allClients, setAllClients] = useState([]);
  const [clientAreaTags, setClientAreaTags] = useState([]);
  const [clientIndustries, setClientIndustries] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentView, setCurrentView] = useState('list');
  const [selectedClient, setSelectedClient] = useState(null); // This will hold the detailed client data
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [isClientDetailsModalOpen, setIsClientDetailsModalOpen] = useState(false);
  // Account statement (managed in modal component, only client ref here)
  const [statementClient, setStatementClient] = useState(null);
  // Documents modal state
  const [documentsClient, setDocumentsClient] = useState(null);
  const [odooEnabled, setOdooEnabled] = useState(false);

  // Filter and Search States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAreaTagFilter, setSelectedAreaTagFilter] = useState('');
  const [selectedIndustryFilter, setSelectedIndustryFilter] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('');
  const [selectedRepFilter, setSelectedRepFilter] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'clients_id', direction: 'desc' });

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Prepare options for filter selects
  // NOTE: We force all option values to be strings so state stays consistent (prevents strict === mismatches)
  const usersOptions = useMemo(() => [
    { value: '', label: 'جميع المناديب' },
    ...Array.isArray(allUsers) ? allUsers.map(user => ({
      value: user.users_id != null ? String(user.users_id) : '',
      label: user.users_name
    })) : []
  ], [allUsers]);

  const areaTagsOptions = useMemo(() => [
    { value: '', label: 'جميع المناطق' },
    ...Array.isArray(clientAreaTags) ? clientAreaTags.map(tag => ({
      value: tag.client_area_tag_id != null ? String(tag.client_area_tag_id) : '',
      label: tag.client_area_tag_name
    })) : []
  ], [clientAreaTags]);

  const industriesOptions = useMemo(() => [
    { value: '', label: 'جميع الصناعات' },
    ...Array.isArray(clientIndustries) ? clientIndustries.map(industry => ({
      value: industry.client_industries_id != null ? String(industry.client_industries_id) : '',
      label: industry.client_industries_name
    })) : []
  ], [clientIndustries]);

  const handleClearAllFilters = useCallback(() => {
    setSearchTerm('');
    setSelectedRepFilter('');
    setSelectedAreaTagFilter('');
    setSelectedIndustryFilter('');
    setSelectedStatusFilter('');
    setSelectedTypeFilter('');
  }, [
    setSearchTerm,
    setSelectedRepFilter,
    setSelectedAreaTagFilter,
    setSelectedIndustryFilter,
    setSelectedStatusFilter,
    setSelectedTypeFilter,
  ]);

  const searchConfig = useMemo(() => ({
    value: searchTerm,
    placeholder: 'البحث في العملاء (الاسم، الهاتف، البريد الإلكتروني)...',
    onChange: (value) => setSearchTerm(value),
    onClear: () => setSearchTerm(''),
    searchWhileTyping: true,
  }), [searchTerm, setSearchTerm]);

  const selectFilters = useMemo(() => ([
    {
      key: 'rep',
      value: selectedRepFilter,
      placeholder: 'جميع المناديب',
      options: usersOptions,
      onChange: (value) => setSelectedRepFilter(value),
      wrapperClassName: 'min-w-[160px]',
    },
    {
      key: 'area',
      value: selectedAreaTagFilter,
      placeholder: 'جميع المناطق',
      options: areaTagsOptions,
      onChange: (value) => setSelectedAreaTagFilter(value),
      wrapperClassName: 'min-w-[160px]',
    },
    {
      key: 'industry',
      value: selectedIndustryFilter,
      placeholder: 'جميع الصناعات',
      options: industriesOptions,
      onChange: (value) => setSelectedIndustryFilter(value),
      wrapperClassName: 'min-w-[160px]',
    },
    {
      key: 'status',
      value: selectedStatusFilter,
      placeholder: 'جميع الحالات',
      options: STATUS_FILTER_OPTIONS,
      onChange: (value) => setSelectedStatusFilter(value),
      wrapperClassName: 'min-w-[140px]',
    },
    {
      key: 'type',
      value: selectedTypeFilter,
      placeholder: 'جميع الأنواع',
      options: TYPE_OPTIONS,
      onChange: (value) => setSelectedTypeFilter(value),
      wrapperClassName: 'min-w-[140px]',
    },
  ]), [
    selectedRepFilter,
    selectedAreaTagFilter,
    selectedIndustryFilter,
    selectedStatusFilter,
    selectedTypeFilter,
    usersOptions,
    areaTagsOptions,
    industriesOptions,
    setSelectedRepFilter,
    setSelectedAreaTagFilter,
    setSelectedIndustryFilter,
    setSelectedStatusFilter,
    setSelectedTypeFilter,
  ]);

  const activeChips = useMemo(() => {
    const chips = [];

    if (searchTerm) {
      chips.push({
        key: 'search',
        label: 'البحث',
        value: searchTerm,
        tone: 'blue',
        onRemove: () => setSearchTerm(''),
      });
    }

    if (selectedRepFilter) {
      const repLabel = allUsers?.find((user) => String(user.users_id) === String(selectedRepFilter))?.users_name || 'غير محدد';
      chips.push({
        key: 'rep',
        label: 'المندوب',
        value: repLabel,
        tone: 'green',
        onRemove: () => setSelectedRepFilter(''),
      });
    }

    if (selectedAreaTagFilter) {
      const areaLabel = clientAreaTags?.find((tag) => String(tag.client_area_tag_id) === String(selectedAreaTagFilter))?.client_area_tag_name || 'غير محدد';
      chips.push({
        key: 'area',
        label: 'المنطقة',
        value: areaLabel,
        tone: 'purple',
        onRemove: () => setSelectedAreaTagFilter(''),
      });
    }

    if (selectedIndustryFilter) {
      const industryLabel = clientIndustries?.find((industry) => String(industry.client_industries_id) === String(selectedIndustryFilter))?.client_industries_name || 'غير محدد';
      chips.push({
        key: 'industry',
        label: 'الصناعة',
        value: industryLabel,
        tone: 'yellow',
        onRemove: () => setSelectedIndustryFilter(''),
      });
    }

    if (selectedStatusFilter) {
      const statusLabel = getClientStatusLabel(selectedStatusFilter);
      chips.push({
        key: 'status',
        label: 'الحالة',
        value: statusLabel,
        tone: getClientStatusChipTone(selectedStatusFilter) || 'blue',
        onRemove: () => setSelectedStatusFilter(''),
      });
    }

    if (selectedTypeFilter) {
      const typeLabel = selectedTypeFilter === 'store' ? 'متجر' : selectedTypeFilter === 'importer' ? 'مستورد' : 'موزع';
      chips.push({
        key: 'type',
        label: 'النوع',
        value: typeLabel,
        tone: 'teal',
        onRemove: () => setSelectedTypeFilter(''),
      });
    }

    return chips;
  }, [
    searchTerm,
    selectedRepFilter,
    selectedAreaTagFilter,
    selectedIndustryFilter,
    selectedStatusFilter,
    selectedTypeFilter,
    allUsers,
    clientAreaTags,
    clientIndustries,
    setSearchTerm,
    setSelectedRepFilter,
    setSelectedAreaTagFilter,
    setSelectedIndustryFilter,
    setSelectedStatusFilter,
    setSelectedTypeFilter,
  ]);

  // Function to load all necessary data for clients tab (fetches all clients)
  const loadAllClientData = useCallback(async (forceApiRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      // Use centralized cached helpers; only hit network when cache empty or force=true
      const clientsData = await getAppClients(forceApiRefresh);
      setAllClients(Array.isArray(clientsData) ? clientsData : (clientsData?.data || []));

      const tagsData = await getAppClientAreaTags(forceApiRefresh);
      setClientAreaTags(tagsData || []);

      const industriesData = await getAppClientIndustries(forceApiRefresh);
      setClientIndustries(industriesData || []);

      const usersData = await getAppUsers(forceApiRefresh);
      setAllUsers(usersData || []);

      const countriesData = await getAllCountriesWithGovernorates();
      setCountries(countriesData || []);
    } catch (err) {
      console.error("Failed to load client data:", err);
      setError('فشل في تحميل بيانات العملاء: ' + (err.message || 'خطأ غير معروف'));
      setGlobalMessage({ type: 'error', message: 'فشل في تحميل بيانات العملاء.' });
    } finally {
      setLoading(false);
    }
  }, [setGlobalMessage]);

  // Register this tab's refresh logic with DashboardLayout
  useEffect(() => {
    const refreshThisTab = async () => {
      await loadAllClientData(true);
    };
    setChildRefreshHandler(refreshThisTab);
    return () => {
      setChildRefreshHandler(null);
    };
  }, [setChildRefreshHandler, loadAllClientData]);

  // Initial load: use cached data only (no forced network on tab entry)
  useEffect(() => {
    loadAllClientData(false);
    setOdooEnabled(isOdooIntegrationEnabled());
  }, [loadAllClientData]);

  // Refetch clients only when versions indicates change
  useEffect(() => {
    const onVersionsUpdated = (e) => {
      try {
        const changed = e?.detail?.changed || [];
        if (Array.isArray(changed) && changed.includes('clients')) {
          // Refresh clients only (no force to avoid duplicate fetch if central logic already fetched)
          loadAllClientData(false);
        }
      } catch { /* noop */ }
    };
    window.addEventListener('versions:updated', onVersionsUpdated);
    return () => window.removeEventListener('versions:updated', onVersionsUpdated);
  }, [loadAllClientData]);

  // Client-side filtering logic
  const filteredClients = useMemo(() => {
    let currentFilteredClients = [...allClients];

    if (searchTerm) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      currentFilteredClients = currentFilteredClients.filter(client =>
        client.clients_company_name?.toLowerCase().includes(lowerCaseSearchTerm) ||
        client.clients_email?.toLowerCase().includes(lowerCaseSearchTerm) ||
        client.clients_address?.toLowerCase().includes(lowerCaseSearchTerm) ||
        client.clients_city?.toLowerCase().includes(lowerCaseSearchTerm) ||
        client.clients_description?.toLowerCase().includes(lowerCaseSearchTerm) ||
        client.clients_source?.toLowerCase().includes(lowerCaseSearchTerm) ||
        client.clients_vat_number?.toLowerCase().includes(lowerCaseSearchTerm) ||
        client.clients_contact_name?.toLowerCase().includes(lowerCaseSearchTerm) ||
        client.clients_contact_phone_1?.toLowerCase().includes(lowerCaseSearchTerm) ||
        client.clients_contact_phone_2?.toLowerCase().includes(lowerCaseSearchTerm) ||
        (odooEnabled && String(client.clients_odoo_partner_id || '').toLowerCase().includes(lowerCaseSearchTerm))
      );
    }

    if (selectedAreaTagFilter) {
      currentFilteredClients = currentFilteredClients.filter(client =>
        String(client.clients_area_tag_id ?? '') === String(selectedAreaTagFilter)
      );
    }

    if (selectedIndustryFilter) {
      currentFilteredClients = currentFilteredClients.filter(client =>
        String(client.clients_industry_id ?? '') === String(selectedIndustryFilter)
      );
    }

    if (selectedStatusFilter) {
      currentFilteredClients = currentFilteredClients.filter(client =>
        client.clients_status?.toLowerCase() === selectedStatusFilter.toLowerCase()
      );
    }

    if (selectedTypeFilter) {
      currentFilteredClients = currentFilteredClients.filter(client =>
        client.clients_type?.toLowerCase() === selectedTypeFilter.toLowerCase()
      );
    }

    if (selectedRepFilter) {
      currentFilteredClients = currentFilteredClients.filter(client =>
        String(client.clients_rep_user_id ?? '') === String(selectedRepFilter)
      );
    }

    return currentFilteredClients;
  }, [allClients, searchTerm, selectedAreaTagFilter, selectedIndustryFilter, selectedStatusFilter, selectedTypeFilter, selectedRepFilter]);

  // Sorting logic
  const sortedClients = useMemo(() => {
    if (!sortConfig.key) return filteredClients;
    return [...filteredClients].sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      if (aValue === null || aValue === undefined) aValue = '';
      if (bValue === null || bValue === undefined) bValue = '';

      // Special handling for numeric fields like balance
      if (['clients_credit_balance', 'clients_credit_limit'].includes(sortConfig.key)) {
        const aNum = parseFloat(aValue) || 0;
        const bNum = parseFloat(bValue) || 0;
        return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredClients, sortConfig]);

  // Pagination logic
  const totalClients = sortedClients.length;
  const totalPages = Math.ceil(totalClients / itemsPerPage);
  
  // Paginated clients for display
  const paginatedClients = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedClients.slice(startIndex, endIndex);
  }, [sortedClients, currentPage, itemsPerPage]);

  // Pagination handlers
  const handleItemsPerPageChange = useCallback((newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
  }, []);

  const handleFirstPage = useCallback(() => {
    setCurrentPage(1);
  }, []);

  const handlePrevPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  }, [totalPages]);

  const handleLastPage = useCallback(() => {
    setCurrentPage(totalPages);
  }, [totalPages]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedAreaTagFilter, selectedIndustryFilter, selectedStatusFilter, selectedTypeFilter, selectedRepFilter]);

  // Handle sorting
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Sortable header component
  const SortableHeader = ({ title, sortKey, className = "" }) => (
    <th
      className={`px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors ${className}`}
      onClick={() => handleSort(sortKey)}
    >
      <div className="flex items-center justify-between">
        <span className="select-none">{title}</span>
        <div className="flex flex-col items-center ml-1">
          {sortConfig.key === sortKey ? (
            sortConfig.direction === 'asc' ? (
              <ChevronUpIcon className="h-5 w-5 text-indigo-600 font-bold" />
            ) : (
              <ChevronDownIcon className="h-5 w-5 text-indigo-600 font-bold" />
            )
          ) : (
            <div className="flex flex-col">
              <ChevronUpIcon className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              <ChevronDownIcon className="h-4 w-4 text-gray-400 hover:text-gray-600 -mt-1" />
            </div>
          )}
        </div>
      </div>
    </th>
  );

  // const handleClearSearch = () => {
  //   setSearchTerm('');
  // };

  const handleAddClient = async (newClientData) => {
    try {
      setLoading(true);
      const message = await addClient(newClientData);
      setGlobalMessage({ type: 'success', message: message || 'تم إضافة العميل بنجاح!' });
      setCurrentView('list');
      await loadAllClientData(true); // Force refresh all clients after add
    } catch (err) {
      console.error("Failed to add client:", err);
      setGlobalMessage({ type: 'error', message: err.message || 'فشل في إضافة العميل.' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateClient = async (updatedClientData) => {
    try {
      setLoading(true);
      const message = await updateClient(updatedClientData.clients_id, updatedClientData);
      setGlobalMessage({ type: 'success', message: message || 'تم تحديث العميل بنجاح!' });
      setCurrentView('list');
      await loadAllClientData(true); // Force refresh all clients after update
    } catch (err) {
      console.error("Failed to update client:", err);
      setGlobalMessage({ type: 'error', message: err.message || 'فشل في تحديث العميل.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClient = async () => {
    if (!selectedClient) return;
    setDeleteLoading(true);
    try {
      const message = await deleteClient(selectedClient.clients_id);
      setGlobalMessage({ type: 'success', message: message || 'تم حذف العميل بنجاح!' });
      setCurrentView('list');
      setSelectedClient(null);
      await loadAllClientData(true); // Force refresh all clients after delete
    } catch (err) {
      console.error("Failed to delete client:", err);
      // Use error translation utility to get Arabic message
      const translatedMessage = getErrorMessage(err);
      setGlobalMessage({ type: 'error', message: translatedMessage });
    } finally {
      setDeleteLoading(false);
    }
  };

  // Function to fetch and open client details modal
  const openClientDetailsModal = async (clientSummary) => {
    setLoading(true);
    setError(null);
    try {
      const detailedClient = await getClientDetails(clientSummary.clients_id);
      setSelectedClient(detailedClient);
      setIsClientDetailsModalOpen(true);
    } catch (err) {
      console.error("Failed to fetch client details:", err);
      setError('فشل في تحميل تفاصيل العميل: ' + (err.message || 'خطأ غير معروف'));
      setGlobalMessage({ type: 'error', message: 'فشل في تحميل تفاصيل العميل.' });
    } finally {
      setLoading(false);
    }
  };

  const closeClientDetailsModal = () => {
    setIsClientDetailsModalOpen(false);
    setSelectedClient(null);
  };

  const openStatement = (client) => setStatementClient(client);
  const closeStatement = () => setStatementClient(null);

  const openDocuments = (client) => setDocumentsClient(client);
  const closeDocuments = () => setDocumentsClient(null);

  // Function to fetch and open client edit form
  const handleEditClient = async (clientSummary) => {
    setLoading(true);
    setError(null);
    try {
      const detailedClient = await getClientDetails(clientSummary.clients_id);
      setSelectedClient(detailedClient);
      setCurrentView('edit');
    } catch (err) {
      console.error("Failed to fetch client details for edit:", err);
      setError('فشل في تحميل تفاصيل العميل للتعديل: ' + (err.message || 'خطأ غير معروف'));
      setGlobalMessage({ type: 'error', message: 'فشل في تحميل تفاصيل العميل للتعديل.' });
    } finally {
      setLoading(false);
    }
  };


  const renderContent = () => {
    switch (currentView) {
      case 'add': return <AddClientForm onAdd={handleAddClient} onCancel={() => setCurrentView('list')} clientAreaTags={clientAreaTags} clientIndustries={clientIndustries} allUsers={allUsers} />;
      case 'edit': return <UpdateClientForm client={selectedClient} onUpdate={handleUpdateClient} onCancel={() => setCurrentView('list')} clientAreaTags={clientAreaTags} clientIndustries={clientIndustries} allUsers={allUsers} />;
      case 'deleteConfirm': return (
        <DeleteConfirmationModal
          isOpen={true}
          onClose={() => { setCurrentView('list'); setSelectedClient(null); }}
          onConfirm={handleDeleteClient}
          message={`هل أنت متأكد أنك تريد حذف العميل "${selectedClient?.clients_company_name}"؟`}
          itemName={selectedClient?.clients_company_name}
          deleteLoading={deleteLoading}
        />
      );
      case 'details': return (
        <ClientDetailsModal
          isOpen={isClientDetailsModalOpen}
          onClose={closeClientDetailsModal}
          client={selectedClient}
          allUsers={allUsers}
          clientAreaTags={clientAreaTags}
          clientIndustries={clientIndustries}
          countries={countries}
          onNotify={setGlobalMessage}
        />
      );
      case 'list':
      default: return (
        <div className="space-y-6" dir="rtl">
          {/* Header */}
          <div className="mb-6">
            <CustomPageHeader
              title="إدارة العملاء"
              subtitle="إدارة وتنظيم قاعدة بيانات العملاء"
              icon={<UsersIcon className="h-8 w-8 text-white" />}
              statValue={allClients.length}
              statLabel="إجمالي العملاء"
              actionButton={
                <button
                  onClick={() => setCurrentView('add')}
                  className="bg-white text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 shadow-md hover:shadow-lg font-bold text-lg"
                >
                  <PlusIcon className="h-5 w-5" />
                  إضافة عميل جديد
                </button>
              }
            />
          </div>

          {/* Filters */}
          <FilterBar
            searchConfig={searchConfig}
            selectFilters={selectFilters}
            activeChips={activeChips}
            onClearAll={handleClearAllFilters}
          />

          {loading && <Loader className="mt-8" />}
          {error && <Alert message={error} type="error" className="mb-4" />}

          {/* Clients Table */}
          {!loading && !error && sortedClients.length === 0 && (
            <div className="bg-white rounded-xl shadow border border-gray-200 p-12 text-center animate-fadeIn">
              <div className="text-4xl mb-4 text-blue-300">👥</div>
              <p className="text-gray-700 text-lg font-semibold">لا توجد عملاء لعرضهم</p>
              <p className="text-gray-500 text-sm mt-2">جرب البحث بكلمات مختلفة أو أضف عميل جديد</p>
            </div>
          )}

          {!loading && !error && sortedClients.length > 0 && (
            <>
              {/* Pagination Header */}
              <PaginationHeaderFooter
                total={totalClients}
                currentPage={currentPage}
                totalPages={totalPages}
                itemsPerPage={itemsPerPage}
                onItemsPerPageChange={handleItemsPerPageChange}
                onFirst={handleFirstPage}
                onPrev={handlePrevPage}
                onNext={handleNextPage}
                onLast={handleLastPage}
                loading={loading}
              />

              <GlobalTable
                data={paginatedClients}
                loading={loading}
                error={error}
                rowKey="clients_id"
                searchTerm={searchTerm}
                totalCount={totalClients}
                initialSort={sortConfig.key ? { key: sortConfig.key, direction: sortConfig.direction } : null}
                onSort={(key, direction) => setSortConfig({ key, direction })}
                columns={[
                { key: 'clients_id', title: 'id', sortable: true, headerAlign: 'center', align: 'center', className: 'w-16' },
                ...(odooEnabled ? [{ key: 'clients_odoo_partner_id', title: 'Odoo ID', sortable: true, headerAlign: 'center', align: 'center', className: 'w-20', render: (c) => (
                    <span className="font-mono text-xs text-gray-600">{c.clients_odoo_partner_id || '-'}</span>
                  ) }] : []),
                { key: 'clients_company_name', title: 'العميل', sortable: true, render: (c) => (
                    <div>
                      <div className="text-sm font-bold text-blue-800 line-clamp-2" style={{
                        display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden', textOverflow: 'ellipsis', wordBreak: 'break-word'
                      }}>{c.clients_company_name || 'غير محدد'}</div>
                      <div className="text-xs text-gray-500 mt-1">{c.clients_contact_name && c.clients_contact_name.trim() !== '' ? c.clients_contact_name : 'لا يوجد جهة اتصال'}</div>
                    </div>
                  ), headerClassName: 'min-w-[200px]'} ,
                { key: 'clients_rep_user_id', title: 'المندوب', sortable: true, render: (c) => (
                    <span className="font-semibold text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">{allUsers?.find(u => u.users_id == c.clients_rep_user_id)?.users_name || 'غير محدد'}</span>
                  ), headerClassName: 'min-w-[150px]', headerAlign: 'center', align: 'center' },
                { key: 'clients_area_tag_id', title: 'المنطقة', sortable: true, render: (c) => (
                    <span className="font-semibold text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-800">{clientAreaTags?.find(t => t.client_area_tag_id == c.clients_area_tag_id)?.client_area_tag_name || 'غير محدد'}</span>
                  ), headerClassName: 'min-w-[120px]', headerAlign: 'center', align: 'center' },
                { key: 'clients_industry_id', title: 'الصناعة', sortable: true, render: (c) => (
                    <span className="font-semibold text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">{clientIndustries?.find(i => i.client_industries_id == c.clients_industry_id)?.client_industries_name || 'غير محدد'}</span>
                  ), headerClassName: 'min-w-[120px]', headerAlign: 'center', align: 'center' },
                { key: 'clients_city', title: 'المدينة', sortable: true, headerClassName: 'min-w-[120px]', align: 'center' },
                { key: 'clients_contact_phone_1', title: 'الهاتف', sortable: false, render: (c) => (
                    <div className="line-clamp-2" style={{ display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden', textOverflow: 'ellipsis', wordBreak: 'break-word' }}>{c.clients_contact_phone_1 && c.clients_contact_phone_1.trim() !== '' ? c.clients_contact_phone_1 : 'غير محدد'}</div>
                  ), headerClassName: 'min-w-[140px]'},
                // { key: 'clients_last_visit', title: 'آخر زيارة', sortable: true, render: (c) => (c.clients_last_visit ? new Date(c.clients_last_visit).toLocaleDateString('en-GB') : 'لا توجد زيارة'), headerClassName: 'min-w-[120px]', align: 'center' },
                { key: 'clients_credit_balance', title: 'الرصيد', sortable: true, render: (c) => (
                    <span className={`font-semibold text-sm ${parseFloat(c.clients_credit_balance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(c.clients_credit_balance || 0)}</span>
                  ), headerClassName: 'min-w-[70px]', align: 'center' },

                { key: 'clients_status', title: 'الحالة', sortable: true, render: (c) => {
                    const badgeClass = getClientStatusBadgeClass(c.clients_status);
                    return (
                      <span className={`font-semibold text-xs px-2 py-1 rounded-full ${badgeClass}`}>
                        {getClientStatusLabel(c.clients_status)}
                      </span>
                    );
                  }, headerClassName: 'min-w-[90px]', align: 'center' },
                { key: 'actions', title: 'الإجراءات', sortable: false, align: 'center', render: (c) => (
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      <button onClick={(e) => { e.stopPropagation(); openClientDetailsModal(c); }} className="group p-1.5 text-blue-600 hover:text-white hover:bg-blue-600 rounded-full transition-all" title="عرض التفاصيل"><EyeIcon className="h-4 w-4" /></button>
                      <button onClick={(e) => { e.stopPropagation(); handleEditClient(c); }} className="group p-1.5 text-green-600 hover:text-white hover:bg-green-600 rounded-full transition-all" title="تعديل"><PencilIcon className="h-4 w-4" /></button>
                      <button onClick={(e) => { e.stopPropagation(); setSelectedClient(c); setCurrentView('deleteConfirm'); }} className="group p-1.5 text-red-600 hover:text-white hover:bg-red-600 rounded-full transition-all" title="حذف"><TrashIcon className="h-4 w-4" /></button>
                      <button onClick={(e) => { e.stopPropagation(); openStatement(c); }} className="px-2.5 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white rounded-full text-xs font-semibold border border-indigo-200 transition-all" title="كشف حساب">كشف</button>
                      <button onClick={(e) => { e.stopPropagation(); openDocuments(c); }} className="px-2.5 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-600 hover:text-white rounded-full text-xs font-semibold border border-purple-200 transition-all" title="مستندات">مستندات</button>
                    </div>
                  ), className: 'w-48' },
              ]}
            />

            {/* Pagination Footer */}
            <PaginationHeaderFooter
              total={totalClients}
              currentPage={currentPage}
              totalPages={totalPages}
              itemsPerPage={itemsPerPage}
              onItemsPerPageChange={handleItemsPerPageChange}
              onFirst={handleFirstPage}
              onPrev={handlePrevPage}
              onNext={handleNextPage}
              onLast={handleLastPage}
              loading={loading}
            />
          </>
          )}
        </div>
      );
    }
  };

  return (
    <div className="p-4" dir="rtl">
      {renderContent()}
      {isClientDetailsModalOpen && selectedClient && (
        <ClientDetailsModal
          isOpen={isClientDetailsModalOpen}
          onClose={closeClientDetailsModal}
          client={selectedClient}
          allUsers={allUsers}
          clientAreaTags={clientAreaTags}
          clientIndustries={clientIndustries}
          countries={countries}
          onNotify={setGlobalMessage}
        />
      )}
      <ClientAccountStatementModal client={statementClient} open={!!statementClient} onClose={closeStatement} />
      <ClientDocumentsModal client={documentsClient} open={!!documentsClient} onClose={closeDocuments} />
    </div>
  );
}
export default ClientsTab;
