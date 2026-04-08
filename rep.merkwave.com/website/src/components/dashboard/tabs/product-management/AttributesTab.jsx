// src/components/dashboard/tabs/product-management/AttributesTab.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { getAllProductAttributesWithValues, addProductAttributeWithValues, updateProductAttributeWithValues, deleteProductAttribute } from '../../../../apis/product_attributes';
import Loader from '../../../common/Loader/Loader';
import Alert from '../../../common/Alert/Alert';
import { Squares2X2Icon, PlusIcon } from '@heroicons/react/24/outline';
import CustomPageHeader from '../../../common/CustomPageHeader/CustomPageHeader';
import AttributeListView from './attributes/AttributeListView';
import AddAttributeForm from './attributes/AddAttributeForm';
import UpdateAttributeForm from './attributes/UpdateAttributeForm';
import AttributeDetailsModal from './attributes/AttributeDetailsModal';
import DeleteConfirmationModal from '../../../common/DeleteConfirmationModal';

export default function AttributesTab() {
  const { setGlobalMessage, setChildRefreshHandler } = useOutletContext();
  const [attributes, setAttributes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState('list'); // 'list', 'add', 'edit', 'details', 'delete'
  const [selectedAttribute, setSelectedAttribute] = useState(null);

  // Function to load attributes from API
  const loadAttributes = useCallback(async (forceApiRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllProductAttributesWithValues(forceApiRefresh);
      setAttributes(data);
    } catch (e) {
      setError(e.message || 'Error loading product attributes');
      setGlobalMessage({ type: 'error', message: 'Failed to load product attributes.' });
    } finally {
      setLoading(false);
    }
  }, [setGlobalMessage]);

  // Initial load on component mount
  useEffect(() => {
    loadAttributes();
  }, [loadAttributes]);

  // Register refresh handler with parent layout
  useEffect(() => {
    setChildRefreshHandler(() => loadAttributes);
    return () => setChildRefreshHandler(null);
  }, [setChildRefreshHandler, loadAttributes]);

  // Handle adding a new attribute
  const handleAddAttribute = async (formData) => {
    setLoading(true);
    try {
      await addProductAttributeWithValues(formData.attribute_name, formData.attribute_values);
      setGlobalMessage({ type: 'success', message: 'Product attribute added successfully!' });
      setView('list'); // Go back to list view
      await loadAttributes(true); // Reload attributes, forcing API refresh
    } catch (e) {
      setGlobalMessage({ type: 'error', message: e.message || 'Failed to add product attribute.' });
    } finally {
      setLoading(false);
    }
  };

  // Handle updating an existing attribute
  const handleUpdateAttribute = async (formData) => {
    setLoading(true);
    try {
      await updateProductAttributeWithValues(selectedAttribute.attribute_id, formData.attribute_name, formData.attribute_values);
      setGlobalMessage({ type: 'success', message: 'Product attribute updated successfully!' });
      setView('list'); // Go back to list view
      await loadAttributes(true); // Reload attributes, forcing API refresh
    } catch (e) {
      setGlobalMessage({ type: 'error', message: e.message || 'Failed to update product attribute.' });
    } finally {
      setLoading(false);
    }
  };

  // Handle deleting an attribute
  const handleDeleteAttribute = async () => {
    setLoading(true);
    try {
      await deleteProductAttribute(selectedAttribute.attribute_id);
      setGlobalMessage({ type: 'success', message: 'Product attribute deleted successfully!' });
      setView('list'); // Go back to list view
      setSelectedAttribute(null); // Clear selected attribute
      await loadAttributes(true); // Reload attributes, forcing API refresh
    } catch (e) {
      setGlobalMessage({ type: 'error', message: e.message || 'Failed to delete product attribute.' });
    } finally {
      setLoading(false);
    }
  };

  const totalValues = useMemo(() => {
    return attributes.reduce((acc, a) => acc + (Array.isArray(a.values) ? a.values.length : 0), 0);
  }, [attributes]);

  let content;
  switch (view) {
    case 'add':
      content = <AddAttributeForm onAdd={handleAddAttribute} onCancel={() => setView('list')} />;
      break;
    case 'edit':
      content = <UpdateAttributeForm attribute={selectedAttribute} onUpdate={handleUpdateAttribute} onCancel={() => setView('list')} />;
      break;
    case 'details':
      content = <AttributeDetailsModal isOpen attribute={selectedAttribute} onClose={() => setView('list')} />;
      break;
    case 'delete':
      content = (
        <DeleteConfirmationModal
          isOpen
          message={`Are you sure you want to delete "${selectedAttribute.attribute_name}"? This will also delete all associated values.`}
          onConfirm={handleDeleteAttribute}
          onClose={() => setView('list')}
          deleteLoading={loading} // Use general loading for now, could be more specific
        />
      );
      break;
    default: // 'list' view
      content = (
        <>
          <CustomPageHeader
            title="إدارة الخصائص"
            subtitle="قائمة الخصائص وإدارتها"
            icon={<Squares2X2Icon className="h-6 w-6 text-white" />}
            statValue={attributes.length}
            statLabel="الخصائص"
            statSecondaryValue={totalValues}
            statSecondaryLabel="القيم"
            actionButton={(
              <button onClick={() => setView('add')} className="bg-white text-blue-600 font-bold py-2 px-4 rounded-md shadow-md">
                إضافة خاصية
              </button>
            )}
          />

          {loading && <Loader className="mt-8" />}
          {error && <Alert message={error} type="error" className="mb-4" />}
          {!loading && !error && (
            <AttributeListView
              attributes={attributes}
              onEditClick={attr => { setSelectedAttribute(attr); setView('edit'); }}
              onViewClick={attr => { setSelectedAttribute(attr); setView('details'); }}
              onDeleteClick={attr => { setSelectedAttribute(attr); setView('delete'); }}
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
