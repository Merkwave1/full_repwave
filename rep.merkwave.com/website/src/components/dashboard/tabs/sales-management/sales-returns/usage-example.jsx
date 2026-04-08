// ملف اختبار لتوضيح الاستخدام
import React from 'react';
import { SalesReturnForm } from './index';

// مثال للاستخدام في وضع الإضافة
const AddExample = () => (
  <SalesReturnForm
    isEditMode={false}
    onSubmit={(data) => console.log('Add:', data)}
    onCancel={() => console.log('Cancel add')}
    clients={[
      { clients_id: 1, clients_company_name: 'شركة المثال' },
      { clients_id: 2, clients_company_name: 'شركة أخرى' }
    ]}
  />
);

// مثال للاستخدام في وضع التعديل
const EditExample = () => (
  <SalesReturnForm
    isEditMode={true}
    returnItem={{ returns_id: 123 }}
    onSubmit={(data) => console.log('Update:', data)}
    onCancel={() => console.log('Cancel edit')}
    clients={[
      { clients_id: 1, clients_company_name: 'شركة المثال' },
      { clients_id: 2, clients_company_name: 'شركة أخرى' }
    ]}
  />
);

export { AddExample, EditExample };