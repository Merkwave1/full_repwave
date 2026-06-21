// src/components/dashboard/tabs/product-management/buttons/ButtonAddProduct.jsx
import React from 'react';
export default function ButtonAddProduct({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="bg-[#8B5FD6] hover:bg-[#7A52C2] text-white font-bold py-2 px-4 rounded-md shadow-md"
    >
      إضافة منتج جديد
    </button>
  );
}

