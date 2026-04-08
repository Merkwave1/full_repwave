import React, { useMemo } from 'react';
import { format } from 'date-fns';
import GlobalTable from '../../../../common/GlobalTable/GlobalTable';

/**
 * Summary table: one row per product with total quantity (in base unit) across all inventory items.
 */
export default function ProductInventorySummary({ inventoryItems = [], enrichedInventory = [], products = [], packagingTypes = [], baseUnits = [], onShowDetails, searchTerm }) {
  // Always use provided inventoryItems if passed (even if empty); fallback only if undefined/null
  const source = Array.isArray(inventoryItems) ? inventoryItems : enrichedInventory;

  // Compute one row per option (variant). Group by variant_id when available, otherwise by variant_display_name.
  const filtered = useMemo(() => {
    if (!Array.isArray(source) || source.length === 0) return [];

    const groups = new Map();
    for (const item of source) {
      // Build a stable group key: prefer variant_id, fallback to variant_display_name or product+index
      const key = item.variant_id ? `v:${item.variant_id}` : `vd:${item.variant_display_name ?? `p:${item.products_id}`}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    }

    const rows = [];
    for (const [groupKey, items] of groups.entries()) {
      const first = items[0];
      const product = products.find(p => p.products_id === first.products_id);
      // derive base unit from product if available
      const baseUnit = product ? baseUnits.find(u => u.base_units_id === product.products_unit_of_measure_id) : undefined;
      const baseUnitName = baseUnit?.base_units_name || 'الوحدة';

      const variantId = first.variant_id ?? null;
      const displayName = first.variant_display_name || (
        // try to find variant name from product variants
        product?.variants?.find(v => v.variant_id === variantId)?.variant_name
      ) || `خيار ${variantId ?? ''}`;

      // counts
      const productionDatesSet = new Set();
      let totalBase = 0;
      items.forEach(it => {
        if (it.inventory_production_date) {
          try {
            const d = format(new Date(it.inventory_production_date), 'yyyy-MM-dd');
            productionDatesSet.add(d);
          } catch (e) {
            void e; // ignore invalid date and satisfy linters
          }
        }
        const packagingType = packagingTypes.find(pt => pt.packaging_types_id === it.packaging_type_id);
        const factor = parseFloat(packagingType?.packaging_types_default_conversion_factor) || 1;
        const qty = parseFloat(it.inventory_quantity) || 0;
        totalBase += qty * factor;
      });

      rows.push({
        variantId,
        groupKey,
        displayName,
        productionDatesCount: productionDatesSet.size,
        entriesCount: items.length,
        totalBase,
        baseUnitName,
        representativeProduct: product,
      });
    }

    // Apply search on option name
    let result = rows;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(r => (r.displayName || '').toLowerCase().includes(term));
    }

    // Sort by option name
    result.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || '', 'ar'));
    return result;
  }, [source, products, packagingTypes, baseUnits, searchTerm]);

  if (!filtered.length) {
    return (
      <div className="bg-white rounded-xl shadow border border-gray-200 p-10 text-center">
        <p className="text-gray-600 font-semibold">لا توجد بيانات مخزون لعرضها</p>
        <p className="text-gray-400 text-sm mt-2">تحقق من التصفية أو أضف مخزون جديد</p>
      </div>
    );
  }

  const columns = [
    {
      key: 'index',
      title: 'ID',
      className: 'w-20',
      headerAlign: 'center',
      align: 'center',
      sortable: true,
      sortAccessor: (row) => Number(row.variantId) || 0,
      render: (item) => {
        const variantId = item.variantId ?? '-';
        return (
          <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-1 rounded-full font-semibold">{variantId.toLocaleString('en-US')}</span>
        );
      },
    },
    {
      key: 'optionName',
      title: 'اسم المتغير',
      headerAlign: 'right',
      align: 'right',
      sortable: true,
      sortAccessor: (row) => row.displayName || '',
      render: (item) => <div className="font-semibold text-gray-800">{item.displayName}</div>,
    },
    {
      key: 'productName',
      title: 'اسم المنتج',
      headerAlign: 'right',
      align: 'right',
      sortable: true,
      sortAccessor: (row) => row.representativeProduct?.products_name || '',
      render: (item) => {
        const productName = item.representativeProduct?.products_name || '-';
        return <div className="text-gray-800">{productName}</div>;
      },
    },
    {
      key: 'entriesCount',
      title: 'الخيارات',
      headerAlign: 'center',
      align: 'center',
      sortable: true,
      sortKey: 'entriesCount',
      render: (item) => (item.entriesCount || 0).toLocaleString('en-US'),
    },
    {
      key: 'totalBase',
      title: 'إجمالي الكمية (بالوحدة الأساسية)',
      headerAlign: 'center',
      align: 'center',
      sortable: true,
      sortKey: 'totalBase',
      render: (item) => (Number.isFinite(item.totalBase) ? item.totalBase.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'),
    },
    {
      key: 'baseUnitName',
      title: 'الوحدة الأولية',
      headerAlign: 'center',
      align: 'center',
      sortable: true,
      sortAccessor: (row) => row.baseUnitName || '',
      render: (item) => item.baseUnitName,
    },
    {
      key: 'actions',
      title: 'الإجراءات',
      headerAlign: 'center',
      align: 'center',
      render: (item) => (
        <button
          onClick={() => onShowDetails && onShowDetails({ product: item.representativeProduct, variantId: item.variantId })}
          aria-label={`تفاصيل ${item.displayName}`}
          className="text-indigo-600 font-semibold hover:text-white hover:bg-indigo-600 transition px-3 py-1 rounded-full text-xs border border-indigo-200"
          disabled={!onShowDetails}
        >
          تفاصيل
        </button>
      ),
    },
  ];

  return (
    <GlobalTable
      data={filtered}
      rowKey="groupKey"
      columns={columns}
      initialSort={{ key: 'index', direction: 'asc' }}
      totalCount={filtered.length}
      searchTerm={searchTerm}
      showSummary={false}
      showColumnTotals={true}
      columnTotalsLabel="الإجمالي"
      totalsColumns={['totalBase', 'entriesCount']}
    />
  );
}
