// Wrapper tab to show only invoiced sales orders (status = 'Invoiced')
import React from 'react';
import SalesOrdersTab from '../sales-orders/SalesOrdersTab.jsx';

export default function SalesInvoicesTab() {
  return <SalesOrdersTab lockedStatusFilter="Invoiced" title="فواتير المبيعات" subtitle="ادارة وتتبع فواتير المبياعت" statLabel="اجمالى الفواتير" printMode="invoice" />;
}
