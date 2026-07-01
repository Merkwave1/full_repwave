// src/components/dashboard/tabs/product-management/buttons/ButtonEditCategory.jsx
import React from 'react';
import { PencilIcon } from '@heroicons/react/24/outline';

export default function ButtonEditCategory({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="text-[#8B5FD6] hover:text-[#1A0F35] p-1 rounded-full hover:bg-[#f5f3ff] transition-colors duration-200"
      title="تعديل الفئة"
    >
      <PencilIcon className="h-5 w-5" />
    </button>
  );
}
