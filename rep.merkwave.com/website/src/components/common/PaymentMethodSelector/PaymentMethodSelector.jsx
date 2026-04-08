// src/components/common/PaymentMethodSelector/PaymentMethodSelector.jsx
import React, { useState, useEffect } from 'react';
import { ChevronDownIcon, CreditCardIcon } from '@heroicons/react/24/outline';
import { getPaymentMethods } from '../../../apis/payment_methods';
import { getPaymentMethodIcon, getPaymentMethodColor } from '../../../constants/paymentMethods';

const PaymentMethodSelector = ({ 
  value, 
  onChange, 
  error, 
  required = false,
  disabled = false,
  placeholder = "اختر طريقة الدفع" 
}) => {
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const fetchPaymentMethods = async () => {
    try {
      setLoading(true);
      const response = await getPaymentMethods();
      setPaymentMethods(response.payment_methods || []);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      setPaymentMethods([]);
    } finally {
      setLoading(false);
    }
  };

  const selectedMethod = paymentMethods.find(method => method.payment_methods_id === value);

  const handleSelect = (methodId) => {
    onChange(methodId);
    setIsOpen(false);
  };

  if (loading) {
    return (
      <div className="relative">
        <div className="w-full p-3 border border-gray-300 rounded-md bg-gray-50 animate-pulse">
          <div className="h-5 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Selected Value Display */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full text-right p-3 border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
          error ? 'border-red-500' : 'border-gray-300'
        } ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'hover:border-gray-400'}`}
      >
        <div className="flex items-center justify-between">
          <ChevronDownIcon className={`h-5 w-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          
          <div className="flex items-center gap-2">
            {selectedMethod ? (
              <>
                <span className="text-gray-900">{selectedMethod.payment_methods_name}</span>
                <span className="text-xl">
                  {getPaymentMethodIcon(selectedMethod.payment_methods_type)}
                </span>
              </>
            ) : (
              <span className="text-gray-500 flex items-center gap-2">
                <CreditCardIcon className="h-5 w-5" />
                {placeholder}
              </span>
            )}
          </div>
        </div>
      </button>

      {/* Dropdown Options */}
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {paymentMethods.length === 0 ? (
            <div className="p-3 text-center text-gray-500">
              لا توجد طرق دفع متاحة
            </div>
          ) : (
            paymentMethods.map((method) => (
              <button
                key={method.payment_methods_id}
                type="button"
                onClick={() => handleSelect(method.payment_methods_id)}
                className={`w-full text-right p-3 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none transition-colors ${
                  selectedMethod?.payment_methods_id === method.payment_methods_id 
                    ? 'bg-blue-50 border-l-4 border-blue-500' 
                    : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex flex-col items-start">
                    {method.payment_methods_description && (
                      <span className="text-xs text-gray-500 mt-1">
                        {method.payment_methods_description}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">
                      {method.payment_methods_name}
                    </span>
                    <span className={`text-xl p-1 rounded ${getPaymentMethodColor(method.payment_methods_type)}`}>
                      {getPaymentMethodIcon(method.payment_methods_type)}
                    </span>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}

      {/* Click Outside to Close */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default PaymentMethodSelector;
