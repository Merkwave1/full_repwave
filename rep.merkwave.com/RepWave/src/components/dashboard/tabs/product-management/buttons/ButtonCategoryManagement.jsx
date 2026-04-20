// src/components/dashboard/tabs/product-management/buttons/ButtonCategoryManagement.jsx
import React from 'react';
import { TagIcon } from '@heroicons/react/24/outline';

export default function ButtonCategoryManagement({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="
        bg-purple-600 hover:bg-purple-700
        text-white font-bold
        py-2 px-4 rounded-md shadow-md
        transition duration-300 ease-in-out transform
        hover:scale-105
        focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50
        flex items-center
      "
    >
      <TagIcon className="h-5 w-5 ml-2" />
      إدارة الفئات
    </button>
  );
}
