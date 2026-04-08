// src\components\dashboard\tabs\inventory-management\packaging_types\PackagingTypesTab.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Squares2X2Icon } from '@heroicons/react/24/outline';
import { getAllPackagingTypes, addPackagingType, updatePackagingType, deletePackagingType } from '../../../../../apis/packaging_types';
import { getAllBaseUnits } from '../../../../../apis/base_units'; // Needed for compatible_base_unit_name lookup

import Loader from '../../../../common/Loader/Loader';
import Alert from '../../../../common/Alert/Alert';
import CustomPageHeader from '../../../../common/CustomPageHeader/CustomPageHeader';
import DeleteConfirmationModal from '../../../../common/DeleteConfirmationModal';

// Sub-components for Packaging Types - UPDATED PATHS
import PackagingTypeListView from './PackagingTypeListView';
import AddPackagingTypeForm from './AddPackagingTypeForm';
import UpdatePackagingTypeForm from './UpdatePackagingTypeForm';
import PackagingTypeDetailsModal from './PackagingTypeDetailsModal';

export default function PackagingTypesTab() {
  const { setGlobalMessage, setChildRefreshHandler } = useOutletContext();
  const [packagingTypes, setPackagingTypes] = useState([]);
  const [baseUnits, setBaseUnits] = useState([]); // To map compatible_base_unit_id to name
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentView, setCurrentView] = useState('list'); // 'list', 'add', 'edit', 'details', 'deleteConfirm'
  const [selectedPackagingType, setSelectedPackagingType] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Load Packaging Types and Base Units
  const loadPackagingTypesAndBaseUnits = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [typesData, unitsData] = await Promise.all([
        getAllPackagingTypes(),
        getAllBaseUnits() // Assuming this fetches all base units for dropdowns
      ]);
      setPackagingTypes(typesData);
      setBaseUnits(unitsData);
    } catch (e) {
      setError(e.message || 'Error loading packaging types or base units');
      setGlobalMessage({ type: 'error', message: 'Failed to load packaging types data.' });
    } finally {
      setLoading(false);
    }
  }, [setGlobalMessage]);

  useEffect(() => {
    loadPackagingTypesAndBaseUnits();
  }, [loadPackagingTypesAndBaseUnits]);

  useEffect(() => {
    setChildRefreshHandler(() => loadPackagingTypesAndBaseUnits);
    return () => setChildRefreshHandler(null);
  }, [setChildRefreshHandler, loadPackagingTypesAndBaseUnits]);

  const handleAdd = async (formData) => {
    setLoading(true);
    try {
      await addPackagingType(formData);
      setGlobalMessage({ type: 'success', message: 'Packaging type added successfully!' });
      setCurrentView('list');
      await loadPackagingTypesAndBaseUnits(true); // Force refresh
    } catch (e) {
      setGlobalMessage({ type: 'error', message: e.message || 'Failed to add packaging type.' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (formData) => {
    setLoading(true);
    try {
      await updatePackagingType(selectedPackagingType.packaging_types_id, formData);
      setGlobalMessage({ type: 'success', message: 'Packaging type updated successfully!' });
      setCurrentView('list');
      await loadPackagingTypesAndBaseUnits(true); // Force refresh
    }  catch (e) {
      setGlobalMessage({ type: 'error', message: e.message || 'Failed to update packaging type.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPackagingType) return;
    setDeleteLoading(true);
    try {
      await deletePackagingType(selectedPackagingType.packaging_types_id);
      setGlobalMessage({ type: 'success', message: 'Packaging type deleted successfully!' });
      setCurrentView('list');
      setSelectedPackagingType(null);
      await loadPackagingTypesAndBaseUnits(true); // Force refresh
    } catch (e) {
      setGlobalMessage({ type: 'error', message: e.message || 'Failed to delete packaging type.' });
    } finally {
      setDeleteLoading(false);
    }
  };

  const renderContent = () => {
    switch (currentView) {
      case 'add':
        return <AddPackagingTypeForm onAdd={handleAdd} onCancel={() => setCurrentView('list')} baseUnits={baseUnits} />;
      case 'edit':
        return <UpdatePackagingTypeForm packagingType={selectedPackagingType} onUpdate={handleUpdate} onCancel={() => setCurrentView('list')} baseUnits={baseUnits} />;
      case 'details':
        return <PackagingTypeDetailsModal isOpen packagingType={selectedPackagingType} onClose={() => setCurrentView('list')} />;
      case 'deleteConfirm':
        return (
          <DeleteConfirmationModal
            isOpen={true}
            onClose={() => { setCurrentView('list'); setSelectedPackagingType(null); }}
            onConfirm={handleDelete}
            message={`هل أنت متأكد أنك تريد حذف نوع التعبئة "${selectedPackagingType?.packaging_types_name}"؟`}
            itemName={selectedPackagingType?.packaging_types_name}
            deleteLoading={deleteLoading}
          />
        );
      case 'list':
      default:
        return (
          <>
            <CustomPageHeader
              title="إدارة أنواع التعبئة"
              subtitle="قائمة أنواع التعبئة وإدارتها"
              icon={<Squares2X2Icon className="h-6 w-6 text-white" />}
              statValue={packagingTypes.length}
              statLabel="أنواع التعبئة"
              actionButton={(
                <button onClick={() => setCurrentView('add')} className="bg-white text-blue-600 font-bold py-2 px-4 rounded-md shadow-md">
                  إضافة نوع تعبئة
                </button>
              )}
            />

            {loading && <Loader className="mt-8" />}
            {error && <Alert message={error} type="error" className="mb-4" />}

            {!loading && !error && (
              <PackagingTypeListView
                packagingTypes={packagingTypes}
                loading={loading}
                error={error}
                onEditClick={type => { setSelectedPackagingType(type); setCurrentView('edit'); }}
                onViewClick={type => { setSelectedPackagingType(type); setCurrentView('details'); }}
                onDeleteClick={type => { setSelectedPackagingType(type); setCurrentView('deleteConfirm'); }}
                baseUnits={baseUnits} // Pass baseUnits for name lookup in list view
              />
            )}
          </>
        );
    }
  };

  return (
    <div className="p-4" dir="rtl">
      {renderContent()}
    </div>
  );
}
