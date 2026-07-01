import React from "react";
import {
  TruckIcon,
  CalendarIcon,
  PrinterIcon,
} from "@heroicons/react/24/outline";
import Loader from "../../../../common/Loader/Loader";
import AppModalShell, {
  modalPrimaryBtnClass,
  modalSecondaryBtnClass,
  modalHeaderActionClass,
  modalSectionClass,
} from "../../../../common/AppModalShell.jsx";

export default function SalesDeliveryDetailsModal({
  open,
  delivery,
  details,
  loading = false,
  onClose,
  onPrint,
  warehouses = [],
  clients = [],
}) {
  if (!open || !delivery) return null;

  const resolveWarehouseName = () => {
    const id = delivery.sales_deliveries_warehouse_id || delivery.warehouse_id;
    if (warehouses?.length) {
      return (
        warehouses.find((w) => w.warehouse_id === id)?.warehouse_name ||
        "غير محدد"
      );
    }
    return delivery.warehouse_name || delivery.warehouses_name || "غير محدد";
  };

  const resolveClientName = () => {
    const id =
      delivery.sales_deliveries_client_id ||
      delivery.client_id ||
      delivery.clients_id;
    if (clients?.length) {
      return clients.find((c) => c.client_id === id)?.client_name || "غير محدد";
    }
    return delivery.client_name || delivery.clients_company_name || "غير محدد";
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return { date: "-", time: "-", full: "-" };
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString("en-GB"),
      time: date.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      full: date.toLocaleString("en-GB"),
    };
  };

  const dateVal =
    delivery.sales_deliveries_delivery_date ||
    delivery.delivery_date ||
    delivery.created_at;
  const dateParts = formatDateTime(dateVal);
  const notes =
    delivery.sales_deliveries_notes ||
    delivery.sales_deliveries_delivery_notes ||
    delivery.delivery_notes ||
    "لا توجد ملاحظات";
  const items = details?.items || [];

  return (
    <AppModalShell
      open={open}
      onClose={onClose}
      title={`تفاصيل التسليم #${delivery.sales_deliveries_id || delivery.delivery_id}`}
      icon={TruckIcon}
      size="2xl"
      headerActions={
        onPrint ? (
          <button
            type="button"
            onClick={() => onPrint(delivery)}
            className={modalHeaderActionClass}
            title="طباعة سند التسليم"
          >
            <PrinterIcon className="h-4 w-4 inline ml-1" />
            طباعة
          </button>
        ) : null
      }
      footer={
        <div className="flex flex-col-reverse sm:flex-row justify-between items-stretch sm:items-center gap-3">
          {onPrint && (
            <button
              type="button"
              onClick={() => onPrint(delivery)}
              className={modalPrimaryBtnClass}
            >
              <PrinterIcon className="h-4 w-4 inline ml-1" /> طباعة سند التسليم
            </button>
          )}
          <button type="button" onClick={onClose} className={modalSecondaryBtnClass}>
            إغلاق
          </button>
        </div>
      }
    >
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader />
            </div>
          ) : (
            <>
              <div className={`${modalSectionClass} grid grid-cols-1 md:grid-cols-3 gap-6 p-4 mb-6`}>
                <InfoBlock
                  label="رقم التسليم"
                  value={`#${delivery.sales_deliveries_id || delivery.delivery_id}`}
                />
                <InfoBlock
                  label="رقم الطلب"
                  value={`#${delivery.sales_deliveries_sales_order_id || delivery.sales_order_id || "—"}`}
                />
                <InfoBlock label="المستودع" value={resolveWarehouseName()} />
                <InfoBlock label="العميل" value={resolveClientName()} />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    تاريخ التسليم الكامل
                  </label>
                  <div className="bg-[#FAFAFE] p-2 rounded border border-[#EDE7FF]">
                    <p className="text-sm text-gray-900">{dateParts.full}</p>
                    <div className="flex items-center mt-2 text-xs text-gray-500">
                      <CalendarIcon className="h-4 w-4 ml-1" />
                      <span>التاريخ: {dateParts.date}</span>
                      <span className="mx-2">•</span>
                      <span>الوقت: {dateParts.time}</span>
                    </div>
                  </div>
                </div>
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ملاحظات
                  </label>
                  <p className="text-sm text-gray-900 bg-[#FAFAFE] p-2 rounded min-h-[60px] whitespace-pre-wrap border border-[#EDE7FF]">
                    {notes}
                  </p>
                </div>
              </div>

              {items && items.length > 0 ? (
                <div className="border-t border-[#EDE7FF] pt-6">
                  <h4 className="text-lg font-medium text-[#2D1B69] mb-4">
                    المنتجات المُسلَّمة ({items.length})
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-[#EDE7FF]">
                      <thead className="bg-[#FAFAFE]">
                        <tr>
                          <Th>#</Th>
                          <Th>اسم الصنف</Th>
                          <Th>كود الصنف</Th>
                          <Th>نوع العبوة</Th>
                          <Th>الكمية المُسلَّمة</Th>
                          <Th>ملاحظات</Th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-[#EDE7FF]">
                        {items.map((item, index) => (
                          <tr key={index} className="hover:bg-[#FAFAFE]">
                            <Td center>{index + 1}</Td>
                            <Td>
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-gray-900">
                                  {item.variant_name ||
                                    item.products_name ||
                                    "غير محدد"}
                                </span>
                                {item.products_name &&
                                  item.variant_name &&
                                  item.products_name !== item.variant_name && (
                                    <span className="text-gray-500 text-xs">
                                      ({item.products_name})
                                    </span>
                                  )}
                              </div>
                            </Td>
                            <Td center>
                              {item.variant_sku ||
                                item.sales_order_items_variant_id ||
                                "-"}
                            </Td>
                            <Td center>
                              {item.packaging_types_name || "غير محدد"}
                            </Td>
                            <Td center className="font-medium text-[#8B5FD6]">
                              {parseFloat(
                                item.sales_delivery_items_quantity_delivered ||
                                  0,
                              ).toFixed(2)}
                            </Td>
                            <Td center>
                              {item.sales_delivery_items_notes || "-"}
                            </Td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="border-t border-[#EDE7FF] pt-6">
                  <div className="text-center text-gray-500 py-8">
                    لا توجد تفاصيل إضافية متاحة لهذا التسليم
                  </div>
                </div>
              )}
            </>
          )}
    </AppModalShell>
  );
}

const InfoBlock = ({ label, value }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {label}
    </label>
    <p className="text-sm text-gray-900 bg-[#FAFAFE] p-2 rounded border border-[#EDE7FF]">{value}</p>
  </div>
);

const Th = ({ children }) => (
  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
    {children}
  </th>
);

const Td = ({ children, center }) => (
  <td
    className={`px-6 py-4 ${center ? "text-center" : ""} text-sm text-gray-500`}
  >
    {children}
  </td>
);
