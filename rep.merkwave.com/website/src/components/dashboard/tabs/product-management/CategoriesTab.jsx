// src/components/dashboard/tabs/product-management/CategoriesTab.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { getAllCategories, addCategory, updateCategory, deleteCategory } from '../../../../apis/categories';
import Loader from '../../../common/Loader/Loader';
import Alert from '../../../common/Alert/Alert';
import { MagnifyingGlassIcon, PlusIcon } from '@heroicons/react/24/outline';
import CategoryListView from './categories/CategoryListView';
import CustomPageHeader from '../../../common/CustomPageHeader/CustomPageHeader';
import AddCategoryForm from './categories/AddCategoryForm';
import UpdateCategoryForm from './categories/UpdateCategoryForm';
import CategoryDetailsModal from './categories/CategoryDetailsModal';
import DeleteConfirmationModal from '../../../common/DeleteConfirmationModal';

export default function CategoryTab() {
  const { setGlobalMessage, setChildRefreshHandler } = useOutletContext();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [view, setView]         = useState('list');
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllCategories();
      setCategories(data);
    } catch (e) {
      setError(e.message || 'Error loading categories');
      setGlobalMessage({ type: 'error', message: 'Failed to load categories.' });
    } finally {
      setLoading(false);
    }
  }, [setGlobalMessage]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    setChildRefreshHandler(() => load);
    return () => setChildRefreshHandler(null);
  }, [setChildRefreshHandler, load]);

  const handleAdd = async formData => {
    setLoading(true);
    try {
      await addCategory(formData);
      setGlobalMessage({ type: 'success', message: 'Category added!' });
      setView('list');
      await load();
    } catch (e) {
      setGlobalMessage({ type: 'error', message: e.message || 'Add failed' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async formData => {
    setLoading(true);
    try {
      await updateCategory(selected.categories_id, formData);
      setGlobalMessage({ type: 'success', message: 'Category updated!' });
      setView('list');
      await load();
    } catch (e) {
      setGlobalMessage({ type: 'error', message: e.message || 'Update failed' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await deleteCategory(selected.categories_id);
      setGlobalMessage({ type: 'success', message: 'Category deleted!' });
      setView('list');
      setSelected(null);
      await load();
    } catch (e) {
      setGlobalMessage({ type: 'error', message: e.message || 'Delete failed' });
    } finally {
      setLoading(false);
    }
  };

  let content;
  switch (view) {
    case 'add':
      content = <AddCategoryForm onAdd={handleAdd} onCancel={() => setView('list')} />;
      break;
    case 'edit':
      content = <UpdateCategoryForm category={selected} onUpdate={handleUpdate} onCancel={() => setView('list')} />;
      break;
    case 'details':
      content = <CategoryDetailsModal isOpen category={selected} onClose={() => setView('list')} />;
      break;
    case 'delete':
      content = (
        <DeleteConfirmationModal
          isOpen
          message={`Delete "${selected.categories_name}"?`}
          onConfirm={handleDelete}
          onClose={() => setView('list')}
          deleteLoading={loading}
        />
      );
      break;
    default:
          content = (
            <>
              <CustomPageHeader
                title="إدارة الفئات"
                subtitle="قائمة الفئات وإدارتها"
                icon={<MagnifyingGlassIcon className="h-6 w-6 text-white" />}
                statValue={categories.length}
                statLabel="الفئات"
                actionButton={(
                  <button onClick={() => setView('add')} className="px-3 py-2 bg-white text-blue-600 rounded-md font-semibold flex items-center gap-2">
                    <PlusIcon className="h-4 w-4" />
                    إضافة فئة
                  </button>
                )}
              />

              {loading && <Loader className="mt-8" />}
              {error && <Alert message={error} type="error" className="mb-4" />}
              {!loading && !error && (
                <CategoryListView
                  categories={categories}
                  loading={loading}
                  error={error}
                  onEditClick={cat => { setSelected(cat); setView('edit'); }}
                  onViewClick={cat => { setSelected(cat); setView('details'); }}
                  onDeleteClick={cat => { setSelected(cat); setView('delete'); }}
                />
              )}
            </>
          );
  }

  return <div className="p-4" dir="rtl">{content}</div>;
}
