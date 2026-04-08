import React from 'react';
import SalesReturnForm from './SalesReturnForm';

export default function AddSalesReturnForm(props) {
  return <SalesReturnForm {...props} isEditMode={false} />;
}