// src/components/dashboard/tabs/purchases-management/supplier-payments/AddSupplierPaymentForm.jsx
import React, { useState, useEffect } from 'react';
import { XMarkIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';
import Loader from '../../../../common/Loader/Loader';
import SearchableSelect from '../../../../common/SearchableSelect/SearchableSelect';
import { addSupplierPayment } from '../../../../../apis/supplier_payments';
import NumberInput from '../../../../common/NumberInput/NumberInput';
import { getAllSuppliers } from '../../../../../apis/suppliers';
import useCurrency from '../../../../../hooks/useCurrency';
import { getCurrentLocalDateTime } from '../../../../../utils/dateUtils';

const AddSupplierPaymentForm = ({ 
  onClose, 
  onSubmit, 
  safes = []
}) => {
  const { symbol, formatCurrency: formatMoney } = useCurrency();
  
  const [formData, setFormData] = useState({
    supplier_id: '',
    safe_id: '',
    amount: '',
    date: getCurrentLocalDateTime(),
    notes: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSupplierBalance, setSelectedSupplierBalance] = useState(null);
  const [selectedSafeBalance, setSelectedSafeBalance] = useState(null);

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      const suppliersData = await getAllSuppliers();
      setSuppliers(suppliersData || []);
    } catch (error) {
      console.error('Error loading suppliers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Update supplier balance when supplier changes
    if (field === 'supplier_id') {
      const selectedSupplier = suppliers.find(s => s.supplier_id == value);
      if (selectedSupplier) {
        // Handle different possible field names and convert to number
        const balance = selectedSupplier.supplier_balance || selectedSupplier.balance || 0;
        setSelectedSupplierBalance(parseFloat(balance) || 0);
      } else {
        setSelectedSupplierBalance(null);
      }
    }

    // Update safe balance when safe changes
    if (field === 'safe_id') {
      const selectedSafe = safes.find(s => s.safes_id == value);
      if (selectedSafe) {
        const balance = selectedSafe.safes_balance || 0;
        setSelectedSafeBalance(parseFloat(balance) || 0);
      } else {
        setSelectedSafeBalance(null);
      }
    }

    // Clear related errors
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.supplier_id) {
      newErrors.supplier_id = 'المورد مطلوب';
    }

    if (!formData.safe_id) {
      newErrors.safe_id = 'الخزنة مطلوبة';
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'مبلغ صحيح مطلوب';
    }

    if (!formData.date) {
      newErrors.date = 'التاريخ مطلوب';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    const selectedSupplier = suppliers.find(s => String(s.supplier_id) === String(formData.supplier_id));
    const supplierName = selectedSupplier?.supplier_name || selectedSupplier?.name || 'هذا المورد';
    const amountDisplay = formatMoney(parseFloat(formData.amount || 0) || 0);

    const confirmSave = window.confirm(`هل تريد حفظ دفعة بقيمة ${amountDisplay} للمورد ${supplierName}؟`);
    if (!confirmSave) return;
    
    setIsSubmitting(true);
    
    try {
      const paymentData = {
        supplier_payments_supplier_id: formData.supplier_id,
        supplier_payments_method_id: 1, // Default payment method (cash)
        supplier_payments_amount: formData.amount,
        supplier_payments_date: formData.date,
        supplier_payments_safe_id: formData.safe_id,
        supplier_payments_notes: formData.notes || null,
        supplier_payments_type: 'Payment', // Default type
        supplier_payments_status: 'Completed' // Default status
      };

      await addSupplierPayment(paymentData);
      onSubmit();
      onClose();
    } catch (error) {
      setErrors({ submit: error.message || 'حدث خطأ أثناء إضافة الدفعة' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Prepare supplier options
  const supplierOptions = suppliers.map(supplier => ({
    value: supplier.supplier_id,
    label: `${supplier.supplier_name} - ${formatMoney(supplier.supplier_balance || 0)}`
  }));

  // Prepare safe options
  const safeOptions = safes.map(safe => ({
    value: safe.safes_id,
    label: `${safe.safes_name} - ${formatMoney(safe.safes_balance || 0)}`
  }));

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
          <Loader className="mt-8" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-green-100 to-emerald-100 px-6 py-4 border-b border-gray-300">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
              إضافة دفعة مورد جديدة
            </h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-all"
            >
              <XMarkIcon className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6" dir="rtl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {errors.submit && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                {errors.submit}
              </div>
            )}

            {/* Supplier and Safe - Two fields per row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Supplier */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  المورد <span className="text-red-500">*</span>
                </label>
                <SearchableSelect
                  options={supplierOptions}
                  value={formData.supplier_id}
                  onChange={(value) => handleInputChange('supplier_id', value)}
                  placeholder="اختر المورد..."
                  className="w-full"
                />
                {errors.supplier_id && (
                  <p className="text-red-500 text-sm mt-1">{errors.supplier_id}</p>
                )}
                {/* Supplier Balance Label */}
                {formData.supplier_id && selectedSupplierBalance !== null && (
                  <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                    <p className="text-xs text-gray-600">
                      رصيد المورد: <span className={`font-semibold ${selectedSupplierBalance > 0 ? 'text-blue-600' : selectedSupplierBalance < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                        {formatMoney(selectedSupplierBalance)}
                      </span>
                    </p>
                  </div>
                )}
              </div>

              {/* Safe */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الخزنة <span className="text-red-500">*</span>
                </label>
                <SearchableSelect
                  options={safeOptions}
                  value={formData.safe_id}
                  onChange={(value) => handleInputChange('safe_id', value)}
                  placeholder="اختر الخزنة..."
                  className="w-full"
                />
                {errors.safe_id && (
                  <p className="text-red-500 text-sm mt-1">{errors.safe_id}</p>
                )}
                {/* Safe Balance Label */}
                {formData.safe_id && selectedSafeBalance !== null && (
                  <div className="mt-2 p-2 bg-green-50 rounded border border-green-200">
                    <p className="text-xs text-gray-600">
                      رصيد الخزنة: <span className={`font-semibold ${selectedSafeBalance > 0 ? 'text-green-600' : selectedSafeBalance < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                        {formatMoney(selectedSafeBalance)}
                      </span>
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Amount and Date - Two fields per row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  المبلغ ({symbol}) <span className="text-red-500">*</span>
                </label>
                <NumberInput
                  value={formData.amount}
                  onChange={(v) => handleInputChange('amount', v)}
                  className="w-full"
                  placeholder="0.00"
                />
                {errors.amount && (
                  <p className="text-red-500 text-sm mt-1">{errors.amount}</p>
                )}
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  التاريخ <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={formData.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
                {errors.date && (
                  <p className="text-red-500 text-sm mt-1">{errors.date}</p>
                )}
              </div>
            </div>

            {/* Notes - Full width */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ملاحظات
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={3}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="أضف أي ملاحظات..."
              />
            </div>

            {/* Form Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'جاري الحفظ...' : 'حفظ الدفعة'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-300 text-gray-700 py-3 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddSupplierPaymentForm;
