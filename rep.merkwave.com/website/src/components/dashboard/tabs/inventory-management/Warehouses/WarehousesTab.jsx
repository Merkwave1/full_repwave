// src/components/dashboard/tabs/inventory-management/WarehousesTab.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  MagnifyingGlassIcon, 
  XMarkIcon, 
  FunnelIcon,
  BuildingStorefrontIcon,
  DocumentTextIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline';

import { addWarehouse, updateWarehouse, deleteWarehouse } from '../../../../../apis/warehouses';
import { getAppWarehouses, getAppUsers } from '../../../../../apis/auth';
import AddWarehouseForm from './AddWarehouseForm';
import UpdateWarehouseForm from './UpdateWarehouseForm';
import DeleteConfirmationModal from '../../../../common/DeleteConfirmationModal';
import Loader from '../../../../common/Loader/Loader';
import Alert from '../../../../common/Alert/Alert';
import CustomPageHeader from '../../../../common/CustomPageHeader/CustomPageHeader';
import FilterBar from '../../../../common/FilterBar/FilterBar';
import GlobalTable from '../../../../common/GlobalTable/GlobalTable';
import WarehouseDetailsModal from './WarehouseDetailsModal';
import SearchableSelect from '../../../../common/SearchableSelect/SearchableSelect';

function WarehousesTab() {
  const { setGlobalMessage, setChildRefreshHandler } = useOutletContext();
  const [warehouses, setWarehouses] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentView, setCurrentView] = useState('list');
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [isWarehouseDetailsModalOpen, setIsWarehouseDetailsModalOpen] = useState(false);

  // Search and Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('');
  const [selectedContactPersonFilter, setSelectedContactPersonFilter] = useState('');

  // Function to load warehouse data with centralized auth function
  const loadWarehouses = useCallback(async (forceApiRefresh = false) => {
    setLoading(true);
    setError(null);

    try {
      const [warehousesResponse, usersResponse] = await Promise.all([
        getAppWarehouses(forceApiRefresh),
        getAppUsers(forceApiRefresh)
      ]);

      // Normalize response shapes: warehouses: { data: [] }, users: may be [] or { data: [] }
      const warehousesArray = Array.isArray(warehousesResponse)
        ? warehousesResponse
        : (warehousesResponse?.data || []);
      const usersArray = Array.isArray(usersResponse)
        ? usersResponse
        : (usersResponse?.data || []);
      
      setWarehouses(warehousesArray);
      setAllUsers(usersArray);
      
      if (forceApiRefresh) {
        setGlobalMessage({ type: 'success', message: 'تم تحديث المخازن بنجاح!' });
      }
    } catch (err) {
      console.error("Failed to fetch warehouses:", err);
      setError('فشل في تحميل المخازن: ' + (err.message || 'خطأ غير معروف'));
      setGlobalMessage({ type: 'error', message: 'فشل في تحميل المخازن.' });
    } finally {
      setLoading(false);
    }
  }, [setGlobalMessage]);

  // Helper function to get user name by ID
  const getUserName = (userId) => {
    if (!Array.isArray(allUsers) || !userId) return '–';
    const user = allUsers.find(u => u.users_id === userId);
    return user ? user.users_name : '–';
  };

  // Get sales reps (users with role 'rep')
  const salesReps = useMemo(() => {
    return allUsers.filter(user => user.users_role === 'rep');
  }, [allUsers]);

  // Register this tab's refresh logic with DashboardLayout
  useEffect(() => {
    const refreshThisTab = async () => {
      await loadWarehouses(true); // Force API refresh
    };
    setChildRefreshHandler(refreshThisTab);
    return () => {
      setChildRefreshHandler(null);
    };
  }, [setChildRefreshHandler, loadWarehouses]);

  // Initial load on component mount
  useEffect(() => {
  loadWarehouses(false);
  }, [loadWarehouses]);

  const handleAddWarehouse = async (newWarehouseData) => {
    try {
      setLoading(true);
      const result = await addWarehouse(newWarehouseData);
      // result may be an object { warehouse_id, warehouse_name, warehouse_code } or a message string
      const successMsg = (typeof result === 'object' && result.warehouse_code)
        ? `تم إضافة المخزن ${result.warehouse_name} (${result.warehouse_code}) بنجاح!`
        : (typeof result === 'string' ? result : 'تم إضافة المخزن بنجاح!');
      setGlobalMessage({ type: 'success', message: successMsg });
      setCurrentView('list');
      await loadWarehouses(true); // Force API refresh after add
    } catch (err) {
      console.error("Failed to add warehouse:", err);
      setGlobalMessage({ type: 'error', message: err.message || 'فشل في إضافة المخزن.' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateWarehouse = async (updatedWarehouseData) => {
    try {
      setLoading(true);
      const message = await updateWarehouse(updatedWarehouseData.warehouse_id, updatedWarehouseData);
      setGlobalMessage({ type: 'success', message: message || 'تم تحديث المخزن بنجاح!' });
      setCurrentView('list');
      await loadWarehouses(true); // Force API refresh after update
    } catch (err) {
      console.error("Failed to update warehouse:", err);
      setGlobalMessage({ type: 'error', message: err.message || 'فشل في تحديث المخزن.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWarehouse = async () => {
    if (!selectedWarehouse) return;
    setDeleteLoading(true);
    try {
      const message = await deleteWarehouse(selectedWarehouse.warehouse_id);
      setGlobalMessage({ type: 'success', message: message || 'تم حذف المخزن بنجاح!' });
      setCurrentView('list');
      setSelectedWarehouse(null);
      await loadWarehouses(true); // Force API refresh after delete
    } catch (err) {
      console.error("Failed to delete warehouse:", err);
      setGlobalMessage({ type: 'error', message: err.message || 'فشل في حذف المخزن.' });
    } finally {
      setDeleteLoading(false);
    }
  };

  const openWarehouseDetailsModal = (warehouse) => {
    setSelectedWarehouse(warehouse);
    setIsWarehouseDetailsModalOpen(true);
  };

  const closeWarehouseDetailsModal = () => {
    setIsWarehouseDetailsModalOpen(false);
    setSelectedWarehouse(null);
  };

  // Memoized unique filter options
  const uniqueWarehouseTypes = useMemo(() => {
    const types = new Set(
      warehouses
        .map(w => w.warehouse_type)
        .filter(t => t && typeof t === 'string' && t.trim() !== '')
    );
    return Array.from(types).sort();
  }, [warehouses]);

  const uniqueContactPersons = useMemo(() => {
    const userIds = new Set(
      warehouses
        .map(w => w.warehouse_representative_user_id)
        .filter(id => id && id !== null && id !== undefined)
    );
    return Array.from(userIds).map(id => {
      const user = allUsers.find(u => u.users_id === id);
      return user ? { id, name: user.users_name } : null;
    }).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name));
  }, [warehouses, allUsers]);

  // Prepare options for SearchableSelect components
  const typeOptions = useMemo(() => {
    const options = [
      { value: '', label: 'كل الأنواع' },
      ...uniqueWarehouseTypes.map(type => ({ value: type, label: type }))
    ];
    return options;
  }, [uniqueWarehouseTypes]);

  const statusOptions = useMemo(() => {
    const options = [
      { value: '', label: 'كل الحالات' },
      { value: 'Active', label: 'نشط' },
      { value: 'Inactive', label: 'غير نشط' },
      { value: 'Under Maintenance', label: 'تحت الصيانة' }
    ];
    return options;
  }, []);

  const contactPersonOptions = useMemo(() => {
    const options = [
      { value: '', label: 'كل الأشخاص' },
      ...uniqueContactPersons.map(person => ({ value: String(person.id), label: person.name }))
    ];
    return options;
  }, [uniqueContactPersons]);

  const selectFilters = useMemo(() => [
    {
      key: 'type',
      options: typeOptions,
      value: selectedTypeFilter,
      onChange: setSelectedTypeFilter,
      placeholder: 'اختر النوع...'
    },
    {
      key: 'status',
      options: statusOptions,
      value: selectedStatusFilter,
      onChange: setSelectedStatusFilter,
      placeholder: 'اختر الحالة...'
    },
    {
      key: 'contactPerson',
      options: contactPersonOptions,
      value: selectedContactPersonFilter,
      onChange: setSelectedContactPersonFilter,
      placeholder: 'اختر الشخص المسؤول...'
    }
  ], [typeOptions, statusOptions, contactPersonOptions, selectedTypeFilter, selectedStatusFilter, selectedContactPersonFilter]);

  const activeChips = useMemo(() => {
    const chips = [];
    if (selectedTypeFilter) {
      const option = typeOptions.find(o => o.value === selectedTypeFilter);
      if (option) chips.push({ key: 'type', label: 'النوع', value: option.label, onRemove: () => setSelectedTypeFilter('') });
    }
    if (selectedStatusFilter) {
      const option = statusOptions.find(o => o.value === selectedStatusFilter);
      if (option) chips.push({ key: 'status', label: 'الحالة', value: option.label, onRemove: () => setSelectedStatusFilter('') });
    }
    if (selectedContactPersonFilter) {
      const option = contactPersonOptions.find(o => o.value === selectedContactPersonFilter);
      if (option) chips.push({ key: 'contactPerson', label: 'الشخص المسؤول', value: option.label, onRemove: () => setSelectedContactPersonFilter('') });
    }
    return chips;
  }, [selectedTypeFilter, selectedStatusFilter, selectedContactPersonFilter, typeOptions, statusOptions, contactPersonOptions]);

  const handleClearAll = () => {
    setSearchTerm('');
    setSelectedTypeFilter('');
    setSelectedStatusFilter('');
    setSelectedContactPersonFilter('');
  };

  // Client-side filtering based on search and filters
  const filteredWarehouses = useMemo(() => {
    let currentFiltered = warehouses;

    const term = searchTerm.trim().toLowerCase();
    if (term) {
      currentFiltered = currentFiltered.filter(w =>
        w.warehouse_name?.toLowerCase().includes(term) ||
        w.warehouse_type?.toLowerCase().includes(term) ||
        w.warehouse_code?.toLowerCase().includes(term) ||
        w.warehouse_address?.toLowerCase().includes(term) ||
        w.warehouse_contact_person?.toLowerCase().includes(term) ||
        w.warehouse_phone?.toLowerCase().includes(term) ||
        w.warehouse_description?.toLowerCase().includes(term)
      );
    }

    if (selectedTypeFilter && selectedTypeFilter.trim()) {
      currentFiltered = currentFiltered.filter(w => 
        w.warehouse_type && 
        typeof w.warehouse_type === 'string' &&
        w.warehouse_type.trim().toLowerCase() === selectedTypeFilter.trim().toLowerCase()
      );
    }
    if (selectedStatusFilter && selectedStatusFilter.trim()) {
      currentFiltered = currentFiltered.filter(w => 
        w.warehouse_status && 
        typeof w.warehouse_status === 'string' &&
        w.warehouse_status.trim().toLowerCase() === selectedStatusFilter.trim().toLowerCase()
      );
    }
    if (selectedContactPersonFilter && selectedContactPersonFilter.trim()) {
      currentFiltered = currentFiltered.filter(w => 
        w.warehouse_representative_user_id && 
        String(w.warehouse_representative_user_id) === String(selectedContactPersonFilter.trim())
      );
    }

    return currentFiltered;
  }, [warehouses, searchTerm, selectedTypeFilter, selectedStatusFilter, selectedContactPersonFilter]);


  // Keyboard shortcut for clearing filters
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        handleClearAll();
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);


  // (Removed unused renderMainTabs to simplify UI and fix lint)

  const renderContent = () => {
    // Warehouse management content only
    switch (currentView) {
      case 'add': return <AddWarehouseForm onAdd={handleAddWarehouse} onCancel={() => setCurrentView('list')} allUsers={allUsers} salesReps={salesReps} />;
      case 'edit': return <UpdateWarehouseForm warehouse={selectedWarehouse} onUpdate={handleUpdateWarehouse} onCancel={() => setCurrentView('list')} allUsers={allUsers} salesReps={salesReps} />;
      case 'deleteConfirm': return (
        <DeleteConfirmationModal
          isOpen={true}
          onClose={() => { setCurrentView('list'); setSelectedWarehouse(null); }}
          onConfirm={handleDeleteWarehouse}
          message={`هل أنت متأكد أنك تريد حذف المخزن "${selectedWarehouse?.warehouse_name}"؟`}
          itemName={selectedWarehouse?.warehouse_name}
          deleteLoading={deleteLoading}
        />
      );
      case 'details': return (
        <WarehouseDetailsModal
          isOpen={isWarehouseDetailsModalOpen}
          onClose={closeWarehouseDetailsModal}
          warehouse={selectedWarehouse}
        />
      );
      case 'list':
      default: return (
        <>
          <CustomPageHeader
            title="إدارة المخازن"
            subtitle="إدارة المخازن والمستودعات"
            icon={<BuildingStorefrontIcon className="h-8 w-8 text-white" />}
            statValue={warehouses.length}
            statLabel="إجمالي المخازن"
            actionButton={
              <button
                onClick={() => setCurrentView('add')}
                className="bg-white text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 shadow-md hover:shadow-lg font-bold text-lg"
              >
                <PlusIcon className="h-5 w-5" />
                إضافة مخزن جديد
              </button>
            }
          />
          <FilterBar
            searchConfig={{ value: searchTerm, onChange: setSearchTerm, placeholder: 'ابحث عن مخزن...', searchWhileTyping: true }}
            selectFilters={selectFilters}
            activeChips={activeChips}
            onClearAll={handleClearAll}
            className="mb-6"
          />
          {/* action button moved into header */}


          {/* Conditional rendering for loading/error states for the list view */}
          {loading && <Loader className="mt-8" />}
          {error && <Alert message={error} type="error" className="mb-4" />}

          {!loading && !error && (
            <GlobalTable
              data={filteredWarehouses}
              loading={loading}
              error={error}
              rowKey="warehouse_id"
              showSummary={false}
              columns={[
                { key: 'warehouse_id', title: 'ID', className: 'w-16 text-center', sortable: true },
                { key: 'warehouse_name', title: 'الاسم', className: 'min-w-[150px]', sortable: true },
                { key: 'warehouse_type', title: 'النوع', className: 'min-w-[100px]', sortable: true },
                { key: 'warehouse_code', title: 'الكود', className: 'min-w-[100px]', sortable: true },
                { key: 'warehouse_address', title: 'العنوان', className: 'min-w-[200px]', sortable: true },
                { key: 'contact_person', title: 'الشخص المسؤول', className: 'min-w-[150px]', sortable: true, sortAccessor: (row) => getUserName(row?.warehouse_representative_user_id) },
                { key: 'warehouse_status', title: 'الحالة', className: 'min-w-[80px]', sortable: true },
                { key: 'actions', title: 'الإجراءات', className: 'w-32 text-center', sortable: false, showDivider: false },
              ]}
              renderRow={(warehouse, idx) => {
                return (
                  <>
                    <td className="text-center px-4 py-3 border-r border-gray-200">
                      <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-1 rounded-full font-semibold">{warehouse.warehouse_id}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-900 font-medium border-r border-gray-200">
                      <div className="line-clamp-2" style={{display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden', textOverflow: 'ellipsis', wordBreak: 'break-word'}}>
                        {warehouse.warehouse_name}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 border-r border-gray-200">{warehouse.warehouse_type || '–'}</td>
                    <td className="px-4 py-3 text-gray-600 border-r border-gray-200">{warehouse.warehouse_code || '–'}</td>
                    <td className="px-4 py-3 text-gray-600 border-r border-gray-200">
                      <div className="line-clamp-2" style={{display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden', textOverflow: 'ellipsis', wordBreak: 'break-word'}}>
                        {warehouse.warehouse_address || '–'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 border-r border-gray-200">
                      {getUserName ? getUserName(warehouse.warehouse_representative_user_id) : '–'}
                    </td>
                    <td className="px-4 py-3 border-r border-gray-200">
                      <span className={`font-semibold text-xs px-2 py-1 rounded-full ${
                        warehouse.warehouse_status === 'Active' ? 'bg-green-100 text-green-700' :
                        warehouse.warehouse_status === 'Inactive' ? 'bg-red-100 text-red-700' :
                        warehouse.warehouse_status === 'Under Maintenance' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {warehouse.warehouse_status === 'Active' ? 'نشط' : warehouse.warehouse_status === 'Inactive' ? 'غير نشط' : warehouse.warehouse_status === 'Under Maintenance' ? 'تحت الصيانة' : warehouse.warehouse_status || '–'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 text-center border-r border-gray-200">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => openWarehouseDetailsModal(warehouse)} className="group p-1.5 text-blue-600 hover:text-white hover:bg-blue-600 rounded-full transition-all" title="عرض">
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button onClick={() => { setSelectedWarehouse(warehouse); setCurrentView('edit'); }} className="group p-1.5 text-green-600 hover:text-white hover:bg-green-600 rounded-full transition-all" title="تعديل">
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button onClick={() => { setSelectedWarehouse(warehouse); setCurrentView('deleteConfirm'); }} className="group p-1.5 text-red-600 hover:text-white hover:bg-red-600 rounded-full transition-all" title="حذف">
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </>
                );
              }}
            />
          )}
        </>
      );
    }
  };

  return (
    <div className="p-4" dir="rtl">
      {renderContent()}
      {isWarehouseDetailsModalOpen && selectedWarehouse && (
        <WarehouseDetailsModal
          isOpen={isWarehouseDetailsModalOpen}
          onClose={closeWarehouseDetailsModal}
          warehouse={selectedWarehouse}
        />
      )}
    </div>
  );
}

export default WarehousesTab;
