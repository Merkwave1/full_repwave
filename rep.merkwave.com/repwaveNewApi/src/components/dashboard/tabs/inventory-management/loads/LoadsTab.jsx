// src/components/dashboard/tabs/inventory-management/loads/LoadsTab.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  FunnelIcon,
  EyeIcon,
  PlusIcon,
  TruckIcon,
  CalendarIcon,
} from "@heroicons/react/24/outline";
import GlobalTable from "../../../../common/GlobalTable/GlobalTable";

// Common Components
import Loader from "../../../../common/Loader/Loader";
import Alert from "../../../../common/Alert/Alert";
import SearchableSelect from "../../../../common/SearchableSelect/SearchableSelect";
import ConfirmActionModal from "../../../../common/ConfirmActionModal";
import CustomPageHeader from "../../../../common/CustomPageHeader/CustomPageHeader";
import FilterBar from "../../../../common/FilterBar/FilterBar";

// API Imports
import {
  getAllTransferRequests,
  updateTransferRequestStatus,
} from "../../../../../apis/transfer_requests";
import { addTransfer } from "../../../../../apis/transfers";
import { getAllInventory } from "../../../../../apis/inventory";
import {
  getAppWarehouses,
  getAppProducts,
  getAppPackagingTypes,
  getAppBaseUnits,
  invalidateInventoryCache,
} from "../../../../../apis/auth";

// Load-specific components
import RequestDetailsModal from "./RequestDetailsModal";

export default function LoadsTab() {
  const { setGlobalMessage, setChildRefreshHandler } = useOutletContext();

  const [requests, setRequests] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [packagingTypes, setPackagingTypes] = useState([]);
  const [baseUnits, setBaseUnits] = useState([]);
  const [allInventoryItems, setAllInventoryItems] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // UI States
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("");
  const [selectedSourceWarehouseFilter, setSelectedSourceWarehouseFilter] =
    useState("");
  const [
    selectedDestinationWarehouseFilter,
    setSelectedDestinationWarehouseFilter,
  ] = useState("");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isRequestDetailsModalOpen, setIsRequestDetailsModalOpen] =
    useState(false);

  const tabName = "loads";

  const unwrapList = (response) => {
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.data)) return response.data;
    if (Array.isArray(response?.data?.data)) return response.data.data;
    return [];
  };

  const getRequestDate = (request) =>
    request?.request_created_at || request?.request_date || null;

  const getSourceWarehouseName = (request) =>
    request?.source_warehouse_name ||
    warehouses.find(
      (w) =>
        String(w.warehouse_id) ===
        String(request?.request_source_warehouse_id),
    )?.warehouse_name ||
    "غير محدد";

  const getDestinationWarehouseName = (request) =>
    request?.destination_warehouse_name ||
    warehouses.find(
      (w) =>
        String(w.warehouse_id) ===
        String(request?.request_destination_warehouse_id),
    )?.warehouse_name ||
    "غير محدد";

  // Function to load all necessary data
  const loadAllLoadsData = useCallback(
    async (forceApiRefresh = false) => {
      if (forceApiRefresh) {
        setLoading(true);
        setGlobalMessage({
          type: "info",
          message: "جاري تحديث بيانات طلبات التحميل...",
        });
      }
      setError("");
      try {
        const [
          requestsResponse,
          warehousesResponse,
          inventoryResponse,
          productsResponse,
          unitsResponse,
          packagingTypesResponse,
        ] = await Promise.all([
          getAllTransferRequests({ status: "" }),
          getAppWarehouses(),
          getAllInventory(),
          getAppProducts(),
          getAppBaseUnits(),
          getAppPackagingTypes(),
        ]);

        setRequests(unwrapList(requestsResponse));
        setWarehouses(unwrapList(warehousesResponse));
        setAllInventoryItems(unwrapList(inventoryResponse));
        setProducts(unwrapList(productsResponse));
        setBaseUnits(unwrapList(unitsResponse));
        setPackagingTypes(unwrapList(packagingTypesResponse));

        if (forceApiRefresh) {
          setGlobalMessage({
            type: "success",
            message: "تم تحديث طلبات التحميل بنجاح!",
          });
        }
      } catch (error) {
        console.error("❌ LoadsTab - Error loading requests:", error);
        const errorMessage = error.message || "Error loading loads data";
        setError(errorMessage);
        setGlobalMessage({
          type: "error",
          message: `فشل في تحميل بيانات طلبات التحميل: ${errorMessage}`,
        });
        setRequests([]);
      } finally {
        setLoading(false);
      }
    },
    [setGlobalMessage],
  );

  // Initial data loading
  useEffect(() => {
    loadAllLoadsData();
  }, [loadAllLoadsData]);

  // Register refresh handler
  useEffect(() => {
    if (setChildRefreshHandler) {
      setChildRefreshHandler(() => loadAllLoadsData(true));
    }
    return () => {
      if (setChildRefreshHandler) {
        setChildRefreshHandler(null);
      }
    };
  }, [loadAllLoadsData, setChildRefreshHandler]);

  // Enrich inventory items with product and warehouse information
  const enrichedInventoryForForm = useMemo(() => {
    return allInventoryItems.map((item) => {
      const product = products.find(
        (p) =>
          String(p.products_id) === String(item.products_id ?? item.product_id),
      );
      const variant = product?.variants?.find(
        (v) => String(v.variant_id) === String(item.variant_id),
      );
      const warehouse = warehouses.find(
        (w) => String(w.warehouse_id) === String(item.warehouse_id),
      );
      const packaging = packagingTypes.find(
        (pt) =>
          String(pt.packaging_types_id) === String(item.packaging_type_id),
      );
      const unit = baseUnits.find(
        (u) => String(u.base_units_id ?? u.base_unit_id) === String(item.base_unit_id),
      );

      return {
        ...item,
        product_name:
          product?.products_name || product?.product_name || "منتج غير معروف",
        variant_name: variant?.variant_name || "متغير غير معروف",
        warehouse_name: warehouse?.warehouse_name || "مخزن غير معروف",
        packaging_type_name:
          packaging?.packaging_types_name || "تعبئة غير محددة",
        unit_name: unit?.base_units_name || unit?.unit_name || "وحدة غير محددة",
      };
    });
  }, [allInventoryItems, products, warehouses, packagingTypes, baseUnits]);

  // Filter and search logic
  const filteredRequests = useMemo(() => {
    let currentFiltered = [...requests];

    // Search filter
    const term = searchTerm.trim().toLowerCase();
    if (term) {
      currentFiltered = currentFiltered.filter(
        (request) =>
          String(request.request_id || "").includes(term) ||
          String(request.request_notes || "")
            .toLowerCase()
            .includes(term) ||
          String(request.created_by_name || "")
            .toLowerCase()
            .includes(term) ||
          warehouses
            .find((w) => w.warehouse_id === request.request_source_warehouse_id)
            ?.warehouse_name.toLowerCase()
            .includes(term) ||
          warehouses
            .find(
              (w) =>
                w.warehouse_id === request.request_destination_warehouse_id,
            )
            ?.warehouse_name.toLowerCase()
            .includes(term),
      );
    }

    // Status filter
    if (selectedStatusFilter) {
      currentFiltered = currentFiltered.filter(
        (request) => request.request_status === selectedStatusFilter,
      );
    }

    // Source warehouse filter
    if (selectedSourceWarehouseFilter) {
      currentFiltered = currentFiltered.filter(
        (request) =>
          String(request.request_source_warehouse_id) ===
          selectedSourceWarehouseFilter,
      );
    }

    // Destination warehouse filter
    if (selectedDestinationWarehouseFilter) {
      currentFiltered = currentFiltered.filter(
        (request) =>
          String(request.request_destination_warehouse_id) ===
          selectedDestinationWarehouseFilter,
      );
    }

    return currentFiltered;
  }, [
    requests,
    searchTerm,
    selectedStatusFilter,
    selectedSourceWarehouseFilter,
    selectedDestinationWarehouseFilter,
    warehouses,
  ]);

  // Action Handlers
  const handleViewRequest = (request) => {
    setSelectedRequest(request);
    setIsRequestDetailsModalOpen(true);
  };

  const closeRequestDetailsModal = () => {
    setIsRequestDetailsModalOpen(false);
    setSelectedRequest(null);
  };

  const handleApproveAllocateRequest = async (
    requestId,
    allocations,
    adminNote,
  ) => {
    if (!requestId) return;
    setLoading(true);
    try {
      if (!Array.isArray(allocations) || allocations.length === 0) {
        throw new Error("برجاء اختيار الدُفعات والكميات قبل إنشاء التحويل.");
      }

      const items = allocations
        .map((a) => {
          const inv = allInventoryItems.find(
            (i) => i.inventory_id === a.inventory_id,
          );
          return {
            variant_id: inv?.variant_id,
            packaging_type_id: inv?.packaging_type_id,
            quantity: a.quantity,
          };
        })
        .filter((item) => item.variant_id);

      if (items.length === 0) {
        throw new Error(
          "لم يتم العثور على بيانات المنتجات للدُفعات المختارة.",
        );
      }

      await addTransfer({
        from_warehouse_id: selectedRequest?.request_source_warehouse_id,
        to_warehouse_id: selectedRequest?.request_destination_warehouse_id,
        status: "Completed",
        notes: `From Request REQ-${requestId}${adminNote ? " - " + adminNote : ""}`,
        items,
      });
      await updateTransferRequestStatus(requestId, "Approved", adminNote);

      invalidateInventoryCache();
      setGlobalMessage({
        type: "success",
        message: "تم تخصيص المخزون وإنشاء التحويل بنجاح",
      });
      await loadAllLoadsData(true);
      closeRequestDetailsModal();
    } catch (error) {
      console.error("Error completing request:", error);
      setGlobalMessage({
        type: "error",
        message: error.message || "حدث خطأ أثناء معالجة الطلب",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRejectRequestFromModal = async (requestId, adminNote) => {
    try {
      await updateTransferRequestStatus(requestId, "Rejected", adminNote);
      setGlobalMessage({
        type: "success",
        message: "تم رفض طلب التحميل",
      });
      await loadAllLoadsData(true);
      closeRequestDetailsModal();
    } catch (error) {
      console.error("Error rejecting request:", error);
      setGlobalMessage({
        type: "error",
        message: "حدث خطأ أثناء رفض الطلب",
      });
    }
  };

  // Options for filters
  const statusOptions = useMemo(
    () => [
      { value: "", label: "جميع الحالات" },
      { value: "Pending", label: "في الانتظار" },
      { value: "Approved", label: "مقبول" },
      { value: "Rejected", label: "مرفوض" },
      { value: "Cancelled", label: "ملغي" },
    ],
    [],
  );

  const warehouseOptions = useMemo(
    () => [
      { value: "", label: "جميع المخازن" },
      ...warehouses.map((w) => ({
        value: String(w.warehouse_id),
        label: w.warehouse_name,
      })),
    ],
    [warehouses],
  );

  const selectFilters = useMemo(
    () => [
      {
        key: "sourceWarehouse",
        options: warehouseOptions,
        value: selectedSourceWarehouseFilter,
        onChange: setSelectedSourceWarehouseFilter,
        placeholder: "اختر المخزن المصدر...",
      },
      {
        key: "destinationWarehouse",
        options: warehouseOptions,
        value: selectedDestinationWarehouseFilter,
        onChange: setSelectedDestinationWarehouseFilter,
        placeholder: "اختر المخزن الوجهة...",
      },
      {
        key: "status",
        options: statusOptions,
        value: selectedStatusFilter,
        onChange: setSelectedStatusFilter,
        placeholder: "اختر الحالة...",
      },
    ],
    [
      warehouseOptions,
      statusOptions,
      selectedSourceWarehouseFilter,
      selectedDestinationWarehouseFilter,
      selectedStatusFilter,
    ],
  );

  const activeChips = useMemo(() => {
    const chips = [];
    if (selectedSourceWarehouseFilter) {
      const option = warehouseOptions.find(
        (o) => o.value === selectedSourceWarehouseFilter,
      );
      if (option)
        chips.push({
          key: "sourceWarehouse",
          label: "المخزن المصدر",
          value: option.label,
          onRemove: () => setSelectedSourceWarehouseFilter(""),
        });
    }
    if (selectedDestinationWarehouseFilter) {
      const option = warehouseOptions.find(
        (o) => o.value === selectedDestinationWarehouseFilter,
      );
      if (option)
        chips.push({
          key: "destinationWarehouse",
          label: "المخزن الوجهة",
          value: option.label,
          onRemove: () => setSelectedDestinationWarehouseFilter(""),
        });
    }
    if (selectedStatusFilter) {
      const option = statusOptions.find(
        (o) => o.value === selectedStatusFilter,
      );
      if (option)
        chips.push({
          key: "status",
          label: "الحالة",
          value: option.label,
          onRemove: () => setSelectedStatusFilter(""),
        });
    }
    return chips;
  }, [
    selectedSourceWarehouseFilter,
    selectedDestinationWarehouseFilter,
    selectedStatusFilter,
    warehouseOptions,
    statusOptions,
  ]);

  const handleClearAll = () => {
    setSearchTerm("");
    setSelectedSourceWarehouseFilter("");
    setSelectedDestinationWarehouseFilter("");
    setSelectedStatusFilter("");
  };

  const getStatusBadge = (status) => {
    const normalizedStatus = status?.toLowerCase();
    const statusMap = {
      pending: { color: "bg-yellow-100 text-yellow-800", text: "في الانتظار" },
      approved: { color: "bg-green-100 text-green-800", text: "مقبول" },
      rejected: { color: "bg-red-100 text-red-800", text: "مرفوض" },
      cancelled: { color: "bg-gray-100 text-gray-800", text: "ملغي" },
    };

    const statusInfo = statusMap[normalizedStatus] || {
      color: "bg-gray-100 text-gray-800",
      text: status,
    };

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}
      >
        {statusInfo.text}
      </span>
    );
  };

  if (loading) return <Loader />;

  return (
    <div
      className="p-4 overflow-visible"
      dir="rtl"
      style={{ position: "relative", zIndex: 1 }}
    >
      <CustomPageHeader
        title="طلبات التحميل"
        subtitle="إدارة طلبات تحميل المنتجات"
        icon={<TruckIcon className="h-8 w-8 text-[#1A0F35]" />}
        statValue={filteredRequests.length}
        statLabel="إجمالي الطلبات"
      />

      {error && <Alert type="error" message={error} className="mb-4" />}

      {/* Search and Filters */}
      <FilterBar
        searchConfig={{
          value: searchTerm,
          onChange: setSearchTerm,
          placeholder: "البحث في الطلبات...",
        }}
        selectFilters={selectFilters}
        activeChips={activeChips}
        onClearAll={handleClearAll}
        className="mb-6"
      />

      {/* Requests Table */}
      <div className="mb-4">
        <GlobalTable
          data={filteredRequests}
          loading={loading}
          error={error}
          rowKey="request_id"
          tableClassName=""
          headerClassName=""
          bodyClassName=""
          showSummary={false}
          initialSort={{ key: "request_id", direction: "desc" }}
          columns={[
            {
              key: "request_id",
              title: "رقم الطلب",
              className: "w-16",
              sortable: true,
              render: (req) => (
                <span className="font-medium text-[#1A0F35]">
                  #{req.request_id}
                </span>
              ),
            },
            {
              key: "sourceWarehouse",
              title: "المخزن المصدر",
              className: "",
              sortable: true,
              render: (req) => getSourceWarehouseName(req),
            },
            {
              key: "destinationWarehouse",
              title: "المخزن الوجهة",
              className: "",
              sortable: true,
              render: (req) => getDestinationWarehouseName(req),
            },
            {
              key: "created_by_name",
              title: "منشئ الطلب",
              className: "min-w-[140px]",
              sortable: true,
              render: (req) => req.created_by_name || "غير محدد",
            },
            {
              key: "request_status",
              title: "الحالة",
              className: "",
              sortable: true,
              render: (req) => getStatusBadge(req.request_status),
            },
            {
              key: "request_created_at",
              title: "تاريخ الإنشاء",
              className: "min-w-[180px]",
              sortable: true,
              render: (req) => {
                const dateValue = getRequestDate(req);
                if (!dateValue) return "غير محدد";
                return (
                <div className="flex items-center">
                  <CalendarIcon className="h-4 w-4 ml-1 text-gray-400" />
                  {new Date(dateValue).toLocaleDateString("ar-EG")}
                </div>
                );
              },
            },
            {
              key: "actions",
              title: "الإجراءات",
              className: "w-32 text-center ",
              sortable: false,
              mobileFullWidth: true,
              render: (req) => (
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => handleViewRequest(req)}
                    title="عرض التفاصيل"
                    className="p-1.5 rounded-full text-sky-700 bg-sky-100 hover:bg-sky-500 hover:text-white hover:shadow-[0_0_12px_rgba(56,189,248,0.45)] transition-all duration-200 hover:scale-110"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </button>
                </div>
              ),
            },
          ]}
          renderRow={(request) => (
              <>
                <td className="px-4 py-4 text-sm font-medium text-[#1A0F35] ">
                  #{request.request_id}
                </td>
                <td className="px-4 py-4 text-sm text-gray-500 ">
                  {getSourceWarehouseName(request)}
                </td>
                <td className="px-4 py-4 text-sm text-gray-500 ">
                  {getDestinationWarehouseName(request)}
                </td>
                <td className="px-4 py-4 text-sm text-gray-500 ">
                  {request.created_by_name || "غير محدد"}
                </td>
                <td className="px-4 py-4 ">
                  {getStatusBadge(request.request_status)}
                </td>
                <td className="px-4 py-4 text-sm text-gray-500 ">
                  {getRequestDate(request) ? (
                  <div className="flex items-center">
                    <CalendarIcon className="h-4 w-4 ml-1 text-gray-400" />
                    {new Date(getRequestDate(request)).toLocaleDateString(
                      "ar-EG",
                    )}
                  </div>
                  ) : (
                    "غير محدد"
                  )}
                </td>
                <td className="px-4 py-4 text-sm font-medium text-center ">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleViewRequest(request)}
                      title="عرض التفاصيل"
                      className="p-1.5 rounded-full 
                   text-sky-700 bg-sky-100
                   hover:bg-sky-500 hover:text-white
                   hover:shadow-[0_0_12px_rgba(56,189,248,0.45)]
                   transition-all duration-200 hover:scale-110"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </>
          )}
        />
      </div>

      {/* Request Details Modal */}
      {isRequestDetailsModalOpen && selectedRequest && (
        <RequestDetailsModal
          isOpen={isRequestDetailsModalOpen}
          onClose={closeRequestDetailsModal}
          request={selectedRequest}
          warehouses={warehouses}
          products={products}
          packagingTypes={packagingTypes}
          allInventoryItems={allInventoryItems}
          enrichedInventoryForForm={enrichedInventoryForForm}
          onApproveAllocate={handleApproveAllocateRequest}
          onReject={handleRejectRequestFromModal}
          setGlobalMessage={setGlobalMessage}
          refreshData={() => loadAllLoadsData(true)}
        />
      )}
    </div>
  );
}
