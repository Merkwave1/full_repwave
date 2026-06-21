// src/components/dashboard/tabs/product-management/buttons/ButtonBaseUnitManagement.jsx
import React from 'react';
import { ScaleIcon } from '@heroicons/react/24/outline';
export default function ButtonBaseUnitManagement({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-md shadow-md flex items-center"
    >
      <ScaleIcon className="h-5 w-5 ml-2" /> إدارة الوحدات
    </button>
  );
}
