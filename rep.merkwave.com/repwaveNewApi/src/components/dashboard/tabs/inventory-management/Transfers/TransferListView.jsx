// src/components/dashboard/tabs/inventory-management/Transfers/TransferListView.jsx
import React, { useMemo } from 'react';
import { EyeIcon, PencilIcon, TrashIcon, CheckCircleIcon, XCircleIcon, TruckIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';

export default function TransferListView({
  transfers,
  warehouses, // To display warehouse names
  onViewDetails,
  // onEdit, onDelete, // Add these props if you implement actions later
}) {

  // Enrich transfers with warehouse names for display
  const enrichedTransfers = useMemo(() => {
    if (!Array.isArray(transfers) || !Array.isArray(warehouses)) return [];

    return transfers.map(transfer => {
      // Prefer pre-enriched names (when passed from TransfersTab/LoadRequestsTab normalization),
      // fall back to warehouse lookup using the correct API field names.
      const sourceWarehouse = warehouses.find(w => w.warehouse_id === (transfer.transfer_from_warehouse_id ?? transfer.transfer_source_warehouse_id));
      const destinationWarehouse = warehouses.find(w => w.warehouse_id === (transfer.transfer_to_warehouse_id ?? transfer.transfer_destination_warehouse_id));
      
      // Resolve date from transfer_date (API) or created_at (normalized)
      const dateValue = transfer.transfer_date || transfer.created_at;
      // Resolve status from transfer_status (API) or status (normalized)
      const statusValue = transfer.transfer_status || transfer.status;
      // Resolve notes from transfer_notes (API) or notes (normalized)
      const notesValue = transfer.transfer_notes ?? transfer.notes;

      return {
        ...transfer,
        _rowKey: `${transfer.type || 'transfer'}-${transfer.transfer_id}`,
        display_id: transfer.display_id || transfer.transfer_id,
        source_warehouse_name: transfer.source_warehouse_name || sourceWarehouse?.warehouse_name || 'غير معروف',
        destination_warehouse_name: transfer.destination_warehouse_name || destinationWarehouse?.warehouse_name || 'غير معروف',
        formatted_transfer_date: dateValue ? format(new Date(dateValue), 'yyyy-MM-dd HH:mm') : 'N/A',
        status: statusValue,
        notes: notesValue,
      };
    });
  }, [transfers, warehouses]);

  if (enrichedTransfers.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow border border-gray-200 p-12 text-center animate-fadeIn">
        <div className="text-4xl mb-4 text-blue-300">📦</div>
        <p className="text-gray-700 text-lg font-semibold">لا توجد تحويلات مخزون لعرضها</p>
        <p className="text-gray-500 text-sm mt-2">يمكنك إضافة تحويل جديد باستخدام الزر أعلاه.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden animate-fadeIn">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm  divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                #ID
              </th>
              <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                المخزن المصدر
              </th>
              <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                المخزن الوجهة
              </th>
              <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                الحالة
              </th>
              <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                التاريخ
              </th>
              <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                ملاحظات
              </th>
              <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                الإجراءات
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {enrichedTransfers.map((transfer) => (
              <tr key={transfer._rowKey} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  <div className="flex items-center gap-2 rtl:flex-row-reverse">
                    <span>{transfer.display_id}</span>
                    {transfer.type === 'request' && (
                      <span className="px-2 py-0.5 text-[10px] rounded-full bg-purple-100 text-purple-700">طلب</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {transfer.source_warehouse_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {transfer.destination_warehouse_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    transfer.status === 'Completed' ? 'bg-green-100 text-green-800' :
                    transfer.status === 'In Transit' ? 'bg-[#EDE7FF] text-[#2D1B69]' :
                    transfer.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {transfer.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {transfer.formatted_transfer_date}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 max-w-xs overflow-hidden text-ellipsis">
                  {transfer.notes || 'لا يوجد'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                  <div className="flex items-center justify-center space-x-2 rtl:space-x-reverse">
                    {/* View Details Button */}
                    <button
                      onClick={() => onViewDetails(transfer)}
                      className="group p-1.5 text-[#8B5FD6] hover:text-white hover:bg-[#8B5FD6] rounded-full transition-all"
                      title="عرض التفاصيل"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </button>
                    {/* Removed status update and cancel buttons from list view */}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
