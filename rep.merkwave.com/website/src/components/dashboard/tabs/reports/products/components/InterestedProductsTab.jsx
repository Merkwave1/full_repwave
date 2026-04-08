import React, { useCallback, useMemo, useState } from 'react';
import { UserGroupIcon, EyeIcon } from '@heroicons/react/24/outline';

import CustomPageHeader from '../../../../../common/CustomPageHeader/CustomPageHeader.jsx';
import FilterBar from '../../../../../common/FilterBar/FilterBar.jsx';
import GlobalTable from '../../../../../common/GlobalTable/GlobalTable.jsx';
import Modal from '../../../../../common/Modal/Modal.jsx';
import Loader from '../../../../../common/Loader/Loader.jsx';
import Alert from '../../../../../common/Alert/Alert.jsx';

import { getInterestedProductClients } from '../../../../../../apis/products.js';

const formatNumber = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    try {
      return value.toLocaleString('ar-EG');
    } catch {
      return value.toString();
    }
  }
  return value ?? '0';
};

const InterestedProductsTab = ({ data, loading }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState(null);
  const [clients, setClients] = useState([]);
  const [productMeta, setProductMeta] = useState(null);

  const summary = data?.summary ?? {};
  const products = useMemo(() => {
    if (!data || !Array.isArray(data.products)) {
      return [];
    }
    return data.products;
  }, [data]);

  const totalUniqueClients = summary.unique_clients ?? summary.total_interests ?? 0;
  const totalProducts = summary.total_products ?? products.length;
  const topProduct = summary.top_product;

  const categoryOptions = useMemo(() => {
    const categoriesSource = Array.isArray(data?.categories) && data.categories.length
      ? data.categories
      : products.map((item) => item.products_category).filter(Boolean);

    const unique = Array.from(new Set(categoriesSource));

    unique.sort((a, b) => a.localeCompare(b, 'ar'));

    return [
      { value: 'all', label: 'جميع الفئات' },
      ...unique.map((cat) => ({ value: cat, label: cat })),
    ];
  }, [data?.categories, products]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return products.filter((product) => {
      const matchesCategory = selectedCategory === 'all' || product.products_category === selectedCategory;

      if (!normalizedSearch) {
        return matchesCategory;
      }

      const haystacks = [
        product.products_name,
        product.products_brand,
        product.products_category,
      ];

      const matchesSearch = haystacks.some((field) => (
        field ? field.toString().toLowerCase().includes(normalizedSearch) : false
      ));

      return matchesCategory && matchesSearch;
    });
  }, [products, searchTerm, selectedCategory]);

  const handleSearchChange = useCallback((value) => {
    setSearchTerm(value);
  }, []);

  const handleCategoryChange = useCallback((value) => {
    setSelectedCategory(value || 'all');
  }, []);

  const activeChips = useMemo(() => {
    const chips = [];

    if (searchTerm) {
      chips.push({
        key: 'search',
        label: 'البحث',
        value: searchTerm,
        tone: 'blue',
        onRemove: () => setSearchTerm(''),
      });
    }

    if (selectedCategory !== 'all') {
      const label = categoryOptions.find((option) => option.value === selectedCategory)?.label || selectedCategory;
      chips.push({
        key: 'category',
        label: 'الفئة',
        value: label,
        tone: 'green',
        onRemove: () => setSelectedCategory('all'),
      });
    }

    return chips;
  }, [categoryOptions, searchTerm, selectedCategory]);

  const openDetails = useCallback(async (product) => {
    if (!product?.products_id) return;

    setDetailsOpen(true);
    setDetailsLoading(true);
    setDetailsError(null);
    setClients([]);

    try {
      const response = await getInterestedProductClients(product.products_id);
      setClients(Array.isArray(response?.clients) ? response.clients : []);
      setProductMeta(response?.product ?? product);
    } catch (err) {
      setDetailsError(err.message || 'حدث خطأ أثناء تحميل بيانات العملاء.');
      setClients([]);
      setProductMeta(product);
    } finally {
      setDetailsLoading(false);
    }
  }, []);

  const closeDetails = useCallback(() => {
    setDetailsOpen(false);
    setClients([]);
    setDetailsError(null);
  }, []);

  const productColumns = useMemo(() => ([
    {
      key: 'index',
      title: '#',
      align: 'center',
      headerAlign: 'center',
      // Render row number (1-based). The third arg is the displayed data array.
      render: (item, index) => (
        <div className="text-center">
          <span className="text-sm font-semibold text-gray-700">{index + 1}</span>
        </div>
      ),
      showDivider: true,
    },
    {
      key: 'products_name',
      title: 'المنتج',
      align: 'right',
      headerAlign: 'right',
      sortable: true,
      sortKey: 'products_name',
      render: (item) => (
        // place product text at the start (right) and image after it
        <div className="flex items-center gap-3 flex-row-reverse justify-end" dir="rtl">
          <div className="text-right flex-1">
            <p className="text-sm font-semibold text-gray-900">{item.products_name}</p>
            {item.products_brand && (
              <p className="text-xs text-gray-500">{item.products_brand}</p>
            )}
          </div>
          {item.products_image_url ? (
            <img
              src={item.products_image_url}
              alt={item.products_name}
              className="w-12 h-12 rounded-lg object-cover border border-gray-200"
            />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-lg font-semibold">
              {item.products_name?.charAt(0) ?? 'م'}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'products_category',
      title: 'الفئة',
      align: 'right',
      headerAlign: 'right',
      sortable: true,
      sortKey: 'products_category',
      render: (item) => item.products_category || 'غير مصنف',
    },
    {
      key: 'interested_clients_count',
      title: 'عدد العملاء المهتمين',
      align: 'center',
      sortable: true,
      render: (item) => (
        <span className="text-base font-bold text-blue-600">
          {formatNumber(item.interested_clients_count)}
        </span>
      ),
    },
    {
      key: 'actions',
      title: 'التفاصيل',
      align: 'center',
      showDivider: false,
      render: (item) => (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            openDetails(item);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          <EyeIcon className="w-4 h-4" />
          عرض العملاء
        </button>
      ),
    },
    // index column intentionally only defined once (at the start)
  ]), [openDetails]);

  const clientColumns = useMemo(() => ([
    {
      key: 'client_display_name',
      title: 'العميل',
      align: 'right',
      render: (item) => (
        <div className="text-right">
          <p className="font-semibold text-gray-900">{item.client_display_name}</p>
          {item.clients_contact_name && item.clients_contact_name !== item.client_display_name && (
            <p className="text-xs text-gray-500">مسؤول الاتصال: {item.clients_contact_name}</p>
          )}
        </div>
      ),
    },
    {
      key: 'clients_contact_phone_1',
      title: 'الهاتف',
      align: 'center',
      render: (item) => item.clients_contact_phone_1 || '—',
    },
    {
      key: 'clients_city',
      title: 'المدينة',
      align: 'center',
      render: (item) => item.clients_city || '—',
    },
    {
      key: 'representative_name',
      title: 'المندوب المسؤول',
      align: 'center',
      render: (item) => item.representative_name || '—',
    },
    {
      key: 'clients_status',
      title: 'الحالة',
      align: 'center',
      render: (item) => item.clients_status || 'غير محدد',
    },
  ]), []);

  if (loading && !data) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500" />
      </div>
    );
  }

  if (!loading && !data) {
    return (
      <div className="bg-white border border-dashed border-gray-300 rounded-xl p-12 text-center text-gray-600">
        لم يتم تحميل بيانات اهتمام المنتجات بعد.
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <CustomPageHeader
        title="اهتمامات العملاء بالمنتجات"
        subtitle={topProduct
          ? `أكثر منتج اهتماماً: ${topProduct.products_name} (${formatNumber(topProduct.interested_clients_count)} عميل)`
          : 'تعرف على المنتجات الأكثر جذباً لاهتمام العملاء'}
        icon={<UserGroupIcon className="h-8 w-8 text-white" />}
        statValue={formatNumber(totalUniqueClients)}
        statLabel="إجمالي العملاء المهتمين"
        statSecondaryValue={formatNumber(totalProducts)}
        statSecondaryLabel="عدد المنتجات"
      />

      <FilterBar
        title="أدوات التصفية"
        searchConfig={{
          value: searchTerm,
          onChange: handleSearchChange,
          onClear: () => handleSearchChange(''),
          placeholder: 'ابحث باسم المنتج أو العلامة التجارية',
          searchWhileTyping: true,
        }}
        selectFilters={[
          {
            key: 'category',
            value: selectedCategory,
            onChange: handleCategoryChange,
            options: categoryOptions,
            placeholder: 'الفئة',
          },
        ]}
        activeChips={activeChips}
        onClearAll={activeChips.length ? () => {
          setSearchTerm('');
          setSelectedCategory('all');
        } : null}
      />

      <GlobalTable
        data={filteredProducts}
        loading={loading && !filteredProducts.length}
        columns={productColumns}
        rowKey="products_id"
        onRowClick={(item) => openDetails(item)}
        totalCount={filteredProducts.length}
        searchTerm={searchTerm}
        showSummary={false}
        emptyState={{
          icon: '🛒',
          title: 'لا توجد منتجات مهتم بها العملاء للفلاتر الحالية',
          description: 'حاول تعديل معايير البحث أو اختيار فئة مختلفة.',
        }}
      />

      <Modal
        isOpen={detailsOpen}
        onClose={closeDetails}
        title={productMeta ? `العملاء المهتمون – ${productMeta.products_name}` : 'العملاء المهتمون'}
        size="xlarge"
      >
        <div className="space-y-4" dir="rtl">
          {productMeta && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                {productMeta.products_image_url ? (
                  <img
                    src={productMeta.products_image_url}
                    alt={productMeta.products_name}
                    className="w-16 h-16 rounded-lg object-cover border border-gray-200"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-xl font-semibold">
                    {productMeta.products_name?.charAt(0) ?? 'م'}
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{productMeta.products_name}</h3>
                  <p className="text-sm text-gray-500">
                    {productMeta.products_category || 'غير مصنف'}
                    {productMeta.products_brand ? ` • ${productMeta.products_brand}` : ''}
                  </p>
                  {typeof productMeta.products_description === 'string' && productMeta.products_description.trim() && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{productMeta.products_description}</p>
                  )}
                </div>
              </div>
              <div className="text-sm text-gray-600">
                إجمالي العملاء المهتمين: <span className="font-bold text-blue-600">{formatNumber(clients.length)}</span>
              </div>
            </div>
          )}

          {detailsLoading ? (
            <div className="flex justify-center py-10">
              <Loader />
            </div>
          ) : detailsError ? (
            <Alert message={detailsError} type="error" />
          ) : (
            <GlobalTable
              data={clients}
              columns={clientColumns}
              rowKey="clients_id"
              tableClassName="text-sm"
              headerClassName="text-sm"
              highlightOnHover={false}
              emptyState={{
                icon: '👥',
                title: 'لا يوجد عملاء مهتمون بهذا المنتج حالياً',
                description: 'عند إضافة عملاء مهتمين سيظهرون هنا.',
              }}
            />
          )}
        </div>
      </Modal>
    </div>
  );
};

export default InterestedProductsTab;
