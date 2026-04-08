// src/components/dashboard/tabs/product-management/UnitsTab.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { getAllBaseUnits, addBaseUnit, updateBaseUnit, deleteBaseUnit } from '../../../../apis/base_units';
import Loader from '../../../common/Loader/Loader';
import Alert from '../../../common/Alert/Alert';
import { Squares2X2Icon } from '@heroicons/react/24/outline';
import CustomPageHeader from '../../../common/CustomPageHeader/CustomPageHeader';
import UnitListView from './units/UnitListView';
import AddUnitForm from './units/AddUnitForm';
import UpdateUnitForm from './units/UpdateUnitForm';
import UnitDetailsModal from './units/UnitDetailsModal';
import DeleteConfirmationModal from '../../../common/DeleteConfirmationModal';

export default function UnitsTab() {
  const { setGlobalMessage, setChildRefreshHandler } = useOutletContext();
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState('list'); // 'list', 'add', 'edit', 'details', 'delete'
  const [selectedUnit, setSelectedUnit] = useState(null);

  // Function to load units from API
  const loadUnits = useCallback(async (forceApiRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllBaseUnits(forceApiRefresh);
      setUnits(data);
    } catch (e) {
      setError(e.message || 'Error loading base units');
      setGlobalMessage({ type: 'error', message: 'Failed to load base units.' });
    } finally {
      setLoading(false);
    }
  }, [setGlobalMessage]);

  // Initial load on component mount
  useEffect(() => {
    loadUnits();
  }, [loadUnits]);

  // Register refresh handler with parent layout
  useEffect(() => {
    setChildRefreshHandler(() => loadUnits);
    return () => setChildRefreshHandler(null);
  }, [setChildRefreshHandler, loadUnits]);

  // Handle adding a new unit
  const handleAddUnit = async (formData) => {
    setLoading(true);
    try {
      await addBaseUnit(formData.base_units_name);
      setGlobalMessage({ type: 'success', message: 'Base unit added successfully!' });
      setView('list'); // Go back to list view
      await loadUnits(true); // Reload units, forcing API refresh
    } catch (e) {
      setGlobalMessage({ type: 'error', message: e.message || 'Failed to add base unit.' });
    } finally {
      setLoading(false);
    }
  };

  // Handle updating an existing unit
  const handleUpdateUnit = async (formData) => {
    setLoading(true);
    try {
      await updateBaseUnit(selectedUnit.base_units_id, formData.base_units_name);
      setGlobalMessage({ type: 'success', message: 'Base unit updated successfully!' });
      setView('list'); // Go back to list view
      await loadUnits(true); // Reload units, forcing API refresh
    } catch (e) {
      setGlobalMessage({ type: 'error', message: e.message || 'Failed to update base unit.' });
    } finally {
      setLoading(false);
    }
  };

  // Handle deleting a unit
  const handleDeleteUnit = async () => {
    setLoading(true);
    try {
      await deleteBaseUnit(selectedUnit.base_units_id);
      setGlobalMessage({ type: 'success', message: 'Base unit deleted successfully!' });
      setView('list'); // Go back to list view
      setSelectedUnit(null); // Clear selected unit
      await loadUnits(true); // Reload units, forcing API refresh
    } catch (e) {
      setGlobalMessage({ type: 'error', message: e.message || 'Failed to delete base unit.' });
    } finally {
      setLoading(false);
    }
  };

  const totalUnits = useMemo(() => units.length, [units]);

  let content;
  switch (view) {
    case 'add':
      content = <AddUnitForm onAdd={handleAddUnit} onCancel={() => setView('list')} />;
      break;
    case 'edit':
      content = <UpdateUnitForm unit={selectedUnit} onUpdate={handleUpdateUnit} onCancel={() => setView('list')} />;
      break;
    case 'details':
      content = <UnitDetailsModal isOpen unit={selectedUnit} onClose={() => setView('list')} />;
      break;
    case 'delete':
      content = (
        <DeleteConfirmationModal
          isOpen
          message={`Are you sure you want to delete "${selectedUnit.base_units_name}"?`}
          onConfirm={handleDeleteUnit}
          onClose={() => setView('list')}
          deleteLoading={loading} // Use general loading for now, could be more specific
        />
      );
      break;
    default: // 'list' view
      content = (
        <>
          <CustomPageHeader
            title="إدارة الوحدات"
            subtitle="قائمة الوحدات وإدارتها"
            icon={<Squares2X2Icon className="h-6 w-6 text-white" />}
            statValue={totalUnits}
            statLabel="الوحدات"
            actionButton={(
              <button onClick={() => setView('add')} className="bg-white text-blue-600 font-bold py-2 px-4 rounded-md shadow-md">
                إضافة وحدة
              </button>
            )}
          />

          {loading && <Loader className="mt-8" />}
          {error && <Alert message={error} type="error" className="mb-4" />}
          {!loading && !error && (
            <UnitListView
              units={units}
              onEditClick={unit => { setSelectedUnit(unit); setView('edit'); }}
              onViewClick={unit => { setSelectedUnit(unit); setView('details'); }}
              onDeleteClick={unit => { setSelectedUnit(unit); setView('delete'); }}
            />
          )}
        </>
      );
  }

  return (
    <div className="p-4" dir="rtl">
      {content}
    </div>
  );
}
