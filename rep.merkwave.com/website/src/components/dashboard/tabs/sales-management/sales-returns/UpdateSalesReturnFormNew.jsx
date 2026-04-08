import React from 'react';
import SalesReturnForm from './SalesReturnForm';

export default function UpdateSalesReturnForm(props) {
  return <SalesReturnForm {...props} isEditMode={true} />;
}