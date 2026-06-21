
// src/components/dashboard/tabs/product-management/buttons/ButtonAttributeManagement.jsx
import React from 'react';
import { PuzzlePieceIcon } from '@heroicons/react/24/outline';
export default function ButtonAttributeManagement({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md shadow-md flex items-center"
    >
      <PuzzlePieceIcon className="h-5 w-5 ml-2" /> إدارة السمات
    </button>
  );
}