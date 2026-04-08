// src/components/dashboard/tabs/product-management/buttons/ButtonAddProduct.jsx
import React from 'react';
export default function ButtonAddProduct({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md shadow-md"
    >
      إضافة منتج جديد
    </button>
  );
}

