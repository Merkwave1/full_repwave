// src/components/dashboard/tabs/product-management/buttons/ButtonEditCategory.jsx
import React from 'react';
import { PencilIcon } from '@heroicons/react/24/outline';

export default function ButtonEditCategory({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="text-indigo-600 hover:text-indigo-900 p-1 rounded-full hover:bg-indigo-50 transition-colors duration-200"
      title="تعديل الفئة"
    >
      <PencilIcon className="h-5 w-5" />
    </button>
  );
}
