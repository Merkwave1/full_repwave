import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
    PlusIcon,
    EyeIcon,
    PencilSquareIcon,
    PrinterIcon,
    BanknotesIcon,
    HashtagIcon,
    UserCircleIcon,
    BuildingLibraryIcon,
    CreditCardIcon,
    CalendarDaysIcon,
    CurrencyDollarIcon,
    ChatBubbleBottomCenterTextIcon,
    LinkIcon,
} from '@heroicons/react/24/outline';

// Mocked imports for components that were used but not imported in the original snippet
// You should replace these with your actual component imports
import Loader from '../../../../common/Loader/Loader';
import Alert from '../../../../common/Alert/Alert';
import CustomPageHeader from '../../../../common/CustomPageHeader/CustomPageHeader';
import FilterBar from '../../../../common/FilterBar/FilterBar';
import GlobalTable from '../../../../common/GlobalTable/GlobalTable';
import PaginationHeaderFooter from '../../../../common/PaginationHeaderFooter/PaginationHeaderFooter';
import AddClientPaymentForm from '../client-payments/AddClientPaymentForm.jsx';
import UpdateClientPaymentForm from '../client-payments/UpdateClientPaymentForm.jsx';
import AddClientRefundForm from '../client-refunds/AddClientRefundForm.jsx';
import UpdateClientRefundForm from '../client-refunds/UpdateClientRefundForm.jsx';
import ClientPaymentDetailsModal from '../client-payments/ClientPaymentDetailsModal.jsx';
import ClientRefundDetailsModal from '../client-refunds/ClientRefundDetailsModal.jsx';
// import DateRangePicker from '../../../../common/DateRangePicker/DateRangePicker.jsx';
// import SearchableSelect from '../../../../common/SearchableSelect/SearchableSelect.jsx';

// Mocked API functions - replace with your actual API calls
import { getClientCashMovements } from '../../../../../apis/client_cash.js';
import { getAppPaymentMethods, getAppSafes, getAppClients } from '../../../../../apis/auth.js';


export default function ClientCashTab() {
    const { setGlobalMessage, setChildRefreshHandler } = useOutletContext() || {};

    // State for data and loading
    const [movements, setMovements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // State for context data (dropdowns)
    const [safes, setSafes] = useState([]);
    const [clients, setClients] = useState([]);
    const [paymentMethods, setPaymentMethods] = useState([]);

    // State for UI control
    const [currentView, setCurrentView] = useState('list'); // 'list', 'add', 'edit', 'details'
    const [currentType, setCurrentType] = useState('payment'); // 'payment' or 'refund'
    const [selectedItem, setSelectedItem] = useState(null);

    // State for pagination
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [serverTotals, setServerTotals] = useState({ 
        payments_total: 0, 
        refunds_total: 0, 
        overall_total: 0,
        payments_amount_total: 0,
        refunds_amount_total: 0
    });
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    // State for filters
    const [searchTerm, setSearchTerm] = useState('');
    const [pendingSearch, setPendingSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [selectedClient, setSelectedClient] = useState('');
    const [selectedSafe, setSelectedSafe] = useState('');
    const [selectedMethod, setSelectedMethod] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const appliedFilters = useMemo(() => ({
        searchTerm,
        type: typeFilter,
        clientId: selectedClient,
        safeId: selectedSafe,
        methodId: selectedMethod,
        dateFrom,
        dateTo,
    }), [searchTerm, typeFilter, selectedClient, selectedSafe, selectedMethod, dateFrom, dateTo]);

    const hasPendingChanges = pendingSearch !== searchTerm;

    const applySearchFilter = useCallback((value) => {
        const rawValue = value !== undefined ? value : pendingSearch;
        const normalized = typeof rawValue === 'string' ? rawValue.trim() : '';
        setPendingSearch(rawValue ?? '');
        setSearchTerm(normalized);
        setPage(1);
    }, [pendingSearch]);
    const clearSearchFilter = useCallback(() => {
        setPendingSearch('');
        setSearchTerm('');
        setPage(1);
    }, []);

    const clearAllFilters = useCallback(() => {
        setPendingSearch('');
        setSearchTerm('');
        setTypeFilter('all');
        setSelectedClient('');
        setSelectedSafe('');
        setSelectedMethod('');
        setDateFrom('');
        setDateTo('');
        setPage(1);
    }, []);

    const loadContext = useCallback(async () => {
        try {
            const [safesData, clientsData, methodsData] = await Promise.all([
                getAppSafes(),
                getAppClients(),
                getAppPaymentMethods(),
            ]);
            setSafes(Array.isArray(safesData) ? safesData : []);
            setClients(Array.isArray(clientsData) ? clientsData : []);
            setPaymentMethods(Array.isArray(methodsData) ? methodsData : []);
        } catch {
            setError('Failed to load context data.');
            setGlobalMessage?.({ type: 'error', message: 'فشل تحميل بيانات الفلاتر.' });
        }
    }, [setGlobalMessage]);

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = {
                page,
                limit: perPage,
            };

            if (appliedFilters.searchTerm) params.search = appliedFilters.searchTerm;
            if (appliedFilters.type && appliedFilters.type !== 'all') params.type = appliedFilters.type;
            if (appliedFilters.clientId) params.client_id = appliedFilters.clientId;
            if (appliedFilters.safeId) params.safe_id = appliedFilters.safeId;
            if (appliedFilters.methodId) params.payment_method_id = appliedFilters.methodId;
            if (appliedFilters.dateFrom) params.from_date = appliedFilters.dateFrom;
            if (appliedFilters.dateTo) params.to_date = appliedFilters.dateTo;

            const response = await getClientCashMovements(params);
            const data = response?.data ?? response ?? {};
            const movementList = Array.isArray(data.movements) ? data.movements : [];
            setMovements(movementList);

            const totals = data.totals ?? {};
            const payments_total = Number(totals.payments_total ?? 0) || 0;
            const refunds_total = Number(totals.refunds_total ?? 0) || 0;
            const overall_total = Number(totals.overall_total ?? (payments_total + refunds_total)) || (payments_total + refunds_total);
            const payments_amount_total = Number(totals.payments_amount_total ?? 0) || 0;
            const refunds_amount_total = Number(totals.refunds_amount_total ?? 0) || 0;
            setServerTotals({ payments_total, refunds_total, overall_total, payments_amount_total, refunds_amount_total });

            const pagination = data.pagination ?? {};
            const nextTotalCount = Number(pagination.total_count ?? overall_total ?? movementList.length) || 0;
            const nextTotalPages = Number(pagination.total_pages ?? (overall_total > 0 && perPage ? Math.ceil(overall_total / perPage) : 1)) || 1;

            setTotalCount(nextTotalCount);
            setTotalPages(nextTotalPages);

            if (pagination.page && pagination.page !== page) {
                setPage(pagination.page);
            }
        } catch (e) {
            const message = e?.message || 'Error loading client cash';
            setError(message);
            setGlobalMessage?.({ type: 'error', message: 'فشل في تحميل حركات العملاء.' });
            setMovements([]);
            setServerTotals({ payments_total: 0, refunds_total: 0, overall_total: 0, payments_amount_total: 0, refunds_amount_total: 0 });
            setTotalCount(0);
            setTotalPages(1);
        } finally {
            setLoading(false);
        }
    }, [setGlobalMessage, appliedFilters, page, perPage]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        loadContext();
    }, [loadContext]);

    useEffect(() => {
        if (setChildRefreshHandler) {
            setChildRefreshHandler(() => loadData);
            return () => setChildRefreshHandler(null);
        }
    }, [setChildRefreshHandler, loadData]);

    const formatDate = useCallback((value) => {
        try {
            const date = value instanceof Date ? value : new Date(value);
            if (isNaN(date)) return value || '-';
            return date.toLocaleString('en-GB', {
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
            });
        } catch {
            return value || '-';
        }
    }, []);

    const formatCurrency = useCallback((amount) => {
        if (!amount && amount !== 0) return '0.00';
        const num = Number(amount);
        return Number.isNaN(num) ? '0.00' : num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }, []);

    const normalizedRows = useMemo(() => {
        const toDate = (value) => {
            if (!value) return null;
            if (value instanceof Date) return value;
            const parsed = new Date(value);
            return Number.isNaN(parsed.getTime()) ? null : parsed;
        };

        return (movements || []).map((row, index) => {
            const type = row.movement_type || row.type || (row.client_payments_id ? 'payment' : 'refund');
            const isPayment = type === 'payment';
            const id = isPayment
                ? (row.client_payments_id ?? row.movement_id ?? row.id ?? row.client_refunds_id)
                : (row.client_refunds_id ?? row.movement_id ?? row.id ?? row.client_payments_id);

            const rawDate = row.movement_date
                ?? (isPayment ? row.client_payments_date : row.client_refunds_date)
                ?? row.client_payments_datetime
                ?? row.client_refunds_datetime
                ?? row.date;
            const tsValue = row.sort_datetime ?? rawDate ?? row.created_at ?? row.updated_at;
            const ts = toDate(tsValue) || toDate(rawDate);

            const rawAmount = isPayment
                ? (row.movement_amount ?? row.client_payments_amount ?? row.amount)
                : (row.movement_amount ?? row.client_refunds_amount ?? row.amount);
            const amount = Number.isNaN(Number(rawAmount)) ? 0 : Number(rawAmount);

            const notes = isPayment
                ? (row.client_payments_notes ?? row.movement_notes ?? row.notes ?? '')
                : (row.client_refunds_notes ?? row.movement_notes ?? row.notes ?? '');

            const clientName = row.client_name ?? row.clients_company_name ?? row.client ?? '-';
            const safeName = row.safe_name ?? row.safes_name ?? '';
            const methodName = row.method_name ?? row.payment_method_name ?? row.method ?? '';
            const odooId = row.odoo_id ?? null;

            return {
                uid: `${type}-${id ?? `idx-${index}`}`,
                type,
                id: id ?? 0,
                odoo_id: odooId,
                client_name: clientName,
                safe_name: safeName,
                method_name: methodName,
                date: rawDate,
                ts,
                amount,
                notes,
                original: row,
            };
        }).sort((a, b) => (b.ts?.getTime() || 0) - (a.ts?.getTime() || 0));
    }, [movements]);

    const totalItems = useMemo(() => {
        if (typeFilter === 'payment') return Number(serverTotals.payments_total) || 0;
        if (typeFilter === 'refund') return Number(serverTotals.refunds_total) || 0;
        return Number(totalCount) || 0;
    }, [typeFilter, serverTotals, totalCount]);
    const currentPage = Math.min(page, totalPages || 1);

    useEffect(() => { setPage(1); }, [appliedFilters]);

    const handlePerPageChange = useCallback((value) => {
        setPerPage(value);
        setPage(1);
    }, []);

    // Filter Options
    const typeOptions = useMemo(() => ([
        { value: 'all', label: 'الكل' },
        { value: 'payment', label: 'تحصيل' },
        { value: 'refund', label: 'مرتجع' },
    ]), []);
    const clientOptions = useMemo(
        () => (clients || []).map((c) => ({
            value: c.clients_id || c.id || c.client_id,
            label: c.clients_company_name || c.company_name || c.name || 'بدون اسم',
        })),
        [clients]
    );
    const safeOptions = useMemo(
        () => (safes || []).map((s) => ({
            value: s.safes_id || s.id || s.safe_id,
            label: s.safes_name || s.name || s.safe_name || 'غير محدد',
        })),
        [safes]
    );
    const methodOptions = useMemo(
        () => (paymentMethods || []).map((m) => ({
            value: m.payment_methods_id || m.id || m.method_id,
            label: m.payment_methods_name || m.name || m.method_name || 'غير محدد',
        })),
        [paymentMethods]
    );

    const activeFilterChips = useMemo(() => {
        const chips = [];
        if (appliedFilters.searchTerm) chips.push({ key: 'search', label: 'بحث', value: appliedFilters.searchTerm, tone: 'blue', onRemove: clearSearchFilter });
        if (appliedFilters.dateFrom || appliedFilters.dateTo) chips.push({ key: 'date', label: 'التاريخ', value: `${appliedFilters.dateFrom || '...'} - ${appliedFilters.dateTo || '...'}`, tone: 'green', onRemove: () => { setDateFrom(''); setDateTo(''); } });
        if (appliedFilters.type !== 'all') chips.push({ key: 'type', label: 'النوع', value: typeOptions.find(opt => opt.value === appliedFilters.type)?.label, tone: 'purple', onRemove: () => setTypeFilter('all') });
        if (appliedFilters.clientId) chips.push({ key: 'client', label: 'العميل', value: clientOptions.find(opt => opt.value === appliedFilters.clientId)?.label, tone: 'yellow', onRemove: () => setSelectedClient('') });
        if (appliedFilters.safeId) chips.push({ key: 'safe', label: 'الخزنة', value: safeOptions.find(opt => opt.value === appliedFilters.safeId)?.label, tone: 'indigo', onRemove: () => setSelectedSafe('') });
        if (appliedFilters.methodId) chips.push({ key: 'method', label: 'طريقة الدفع', value: methodOptions.find(opt => opt.value === appliedFilters.methodId)?.label, tone: 'teal', onRemove: () => setSelectedMethod('') });
        return chips;
    }, [appliedFilters, clearSearchFilter, typeOptions, clientOptions, safeOptions, methodOptions]);


    const handleAdd = useCallback(() => { setCurrentType('payment'); setCurrentView('add'); }, []);
    const handleEdit = useCallback((row) => { setSelectedItem(row); setCurrentType(row.type); setCurrentView('edit'); }, []);
    const handleView = useCallback((row) => { setSelectedItem(row); setCurrentType(row.type); setCurrentView('details'); }, []);

        const handlePrint = useCallback(async (row) => {
            try {
                setGlobalMessage?.({ type: 'info', message: 'جاري تحضير الطباعة...' });

                const dataRow = row.original || row;
                const type = dataRow.movement_type || dataRow.type || (dataRow.client_payments_id ? 'payment' : 'refund');

                let details = null;
                if (type === 'payment') {
                    // Prefer fetching detailed data for payments
                    try {
                        const { getClientPaymentDetails } = await import('../../../../../apis/client_payments.js');
                        const resp = await getClientPaymentDetails(dataRow.client_payments_id || dataRow.id || dataRow.payment_id);
                        details = resp?.payment_details || resp?.data || resp || null;
                    } catch {
                        console.warn('Failed to fetch payment details, falling back to row data');
                        details = dataRow;
                    }
                } else {
                    // Refunds: attempt to fetch via client_refunds API if available, otherwise fall back
                    try {
                        const mod = await import('../../../../../apis/client_refunds.js').catch(() => null);
                        if (mod && typeof mod.getClientRefundDetails === 'function') {
                            const resp = await mod.getClientRefundDetails(dataRow.client_refunds_id || dataRow.id);
                            details = resp?.refund_details || resp?.data || resp || dataRow;
                        } else {
                            details = dataRow;
                        }
                    } catch {
                        details = dataRow;
                    }
                }

                const amount = details.client_payments_amount ?? details.movement_amount ?? details.client_refunds_amount ?? details.amount ?? 0;
                const dateStr = details.client_payments_date ?? details.movement_date ?? details.client_refunds_date ?? details.date ?? details.created_at ?? '';

                const html = `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><title>حركة عميل</title><style>
                    body{font-family:Arial,Helvetica,sans-serif;padding:18px;color:#000;background:#fff}
                    .header{text-align:center;margin-bottom:12px}
                    .row{display:flex;justify-content:space-between;margin:8px 0}
                    .label{font-weight:700}
                    @media print{body{padding:6px}}</style></head><body>
                    <div class="header"><h2>سند حركة عميل</h2></div>
                    <div class="row"><div class="label">الرقم</div><div>#${details.client_payments_id ?? details.client_refunds_id ?? details.id ?? '-'}</div></div>
                    <div class="row"><div class="label">العميل</div><div>${details.client_name ?? details.clients_company_name ?? details.client ?? '-'}</div></div>
                    <div class="row"><div class="label">الخزنة</div><div>${details.safe_name ?? details.safes_name ?? '-'}</div></div>
                    <div class="row"><div class="label">طريقة الدفع</div><div>${details.method_name ?? details.payment_method_name ?? '-'}</div></div>
                    <div class="row"><div class="label">التاريخ</div><div>${new Date(dateStr).toLocaleString('en-GB') || '-'}</div></div>
                    <div class="row"><div class="label">المبلغ</div><div>${amount}</div></div>
                    <div class="row"><div class="label">الملاحظات</div><div>${details.notes ?? details.client_payments_notes ?? details.client_refunds_notes ?? '-'}</div></div>
                    <script>window.onload=function(){}</script>
                    </body></html>`;

                const { printHtml } = await import('../../../../../utils/printUtils.js');
                await printHtml(html, { title: 'طباعة حركة عميل', mode: 'iframe', closeAfter: 600 });

                setGlobalMessage?.({ type: 'success', message: 'تم تحضير الطباعة بنجاح.' });
            } catch (err) {
                console.error('Print failed', err);
                setGlobalMessage?.({ type: 'error', message: 'فشل في تحضير الطباعة.' });
            }
        }, [setGlobalMessage]);

    const handleFormSubmit = async () => {
        setGlobalMessage?.({ type: 'success', message: 'تم حفظ الحركة بنجاح.' });
        await loadData();
        setCurrentView('list');
        setSelectedItem(null);
    };
    const handleCloseModal = () => { setCurrentView('list'); setSelectedItem(null); };

    const AddMovementWrapper = ({ onDone, onClose }) => {
        const [addType, setAddType] = useState(currentType || 'payment');
        const selector = (
            <div className="flex items-center gap-2" dir="rtl">
                <label className="text-sm text-gray-700">النوع</label>
                <select value={addType} onChange={(e) => setAddType(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                    <option value="payment">تحصيل</option>
                    <option value="refund">مرتجع</option>
                </select>
            </div>
        );
        return (
            <div className="space-y-4">
                {addType === 'payment' ? (
                    <AddClientPaymentForm title="اضافة حركة" extraHeaderRight={selector} onClose={onClose} onSubmit={onDone} safes={safes} clients={clients} paymentMethods={paymentMethods} />
                ) : (
                    <AddClientRefundForm title="اضافة حركة" extraHeaderRight={selector} onClose={onClose} onSubmit={onDone} safes={safes} clients={clients} paymentMethods={paymentMethods} />
                )}
            </div>
        );
    };

    const columnsMemo = useMemo(() => ([
        {
            key: 'id',
            title: 'ID',
            headerAlign: 'center',
            align: 'center',
            className: 'w-24',
            sortable: true,
            sortAccessor: (item) => Number(item.id ?? 0),
            render: (item) => (
                <span className="inline-flex items-center justify-center gap-1 px-3 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-700">
                    <HashtagIcon className="h-3.5 w-3.5" />
                    {item.id ?? (item.original?.id ?? '—')}
                </span>
            ),
        },
        {
            key: 'odoo_id',
            title: 'Odoo',
            headerAlign: 'center',
            align: 'center',
            className: 'w-24',
            sortable: true,
            sortAccessor: (item) => Number(item.odoo_id ?? 0),
            render: (item) => {
                const odooId = item.odoo_id ?? item.original?.odoo_id;
                if (!odooId) {
                    return (
                        <span className="inline-flex items-center justify-center px-2 py-1 text-xs text-gray-400">
                            —
                        </span>
                    );
                }
                return (
                    <span className="inline-flex items-center justify-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-700">
                        <LinkIcon className="h-3.5 w-3.5" />
                        {odooId}
                    </span>
                );
            },
        },
        {
            key: 'type',
            title: 'النوع',
            headerAlign: 'center',
            align: 'center',
            className: 'w-32',
            sortable: true,
            render: (item) => (
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${item.type === 'payment' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    <BanknotesIcon className="h-4 w-4" />
                    {item.type === 'payment' ? 'تحصيل' : 'مرتجع'}
                </span>
            ),
        },
        {
            key: 'client_name',
            title: 'العميل',
            className: 'min-w-[200px]',
            sortable: true,
            render: (item) => (
                <div className="flex items-start gap-2">
                    <UserCircleIcon className="h-5 w-5 text-blue-500" />
                    <div className="text-sm font-medium text-gray-900 leading-5">
                        {item.client_name || 'غير محدد'}
                    </div>
                </div>
            ),
        },
        {
            key: 'safe_name',
            title: 'الخزنة',
            className: 'min-w-[170px]',
            sortable: true,
            render: (item) => (
                <div className="flex items-center gap-2 text-sm text-gray-700">
                    <BuildingLibraryIcon className="h-4 w-4 text-amber-500" />
                    <span>{item.safe_name || 'غير محدد'}</span>
                </div>
            ),
        },
        {
            key: 'method_name',
            title: 'طريقة الدفع',
            className: 'min-w-[170px]',
            sortable: true,
            render: (item) => (
                <div className="flex items-center gap-2 text-sm text-gray-700">
                    <CreditCardIcon className="h-4 w-4 text-emerald-500" />
                    <span>{item.method_name || 'غير محدد'}</span>
                </div>
            ),
        },
        {
            key: 'date',
            title: 'التاريخ/الوقت',
            className: 'min-w-[190px]',
            sortable: true,
            sortAccessor: (item) => item.ts ? item.ts.getTime() : 0,
            render: (item) => (
                <div className="flex items-center gap-2 text-sm text-gray-700">
                    <CalendarDaysIcon className="h-4 w-4 text-sky-500" />
                    <span>{formatDate(item.ts || item.date)}</span>
                </div>
            ),
        },
        {
            key: 'amount',
            title: 'المبلغ',
            align: 'center',
            className: 'min-w-[150px]',
            sortable: true,
            sortAccessor: (item) => Number(item.amount ?? 0),
            render: (item) => (
                <div className="flex items-center justify-center gap-2 text-sm font-semibold text-indigo-700">
                    <CurrencyDollarIcon className="h-4 w-4" />
                    <span>{formatCurrency(item.amount)}</span>
                </div>
            ),
        },
        {
            key: 'notes',
            title: 'الملاحظات',
            className: 'min-w-[220px]',
            sortable: true,
            render: (item) => (
                <div className="flex items-start gap-2 text-sm text-gray-600 leading-5">
                    <ChatBubbleBottomCenterTextIcon className="h-4 w-4 text-gray-400 flex-shrink-0 mt-1" />
                    <span>{item.notes || 'لا توجد ملاحظات'}</span>
                </div>
            ),
        },
        {
            key: 'actions',
            title: 'الإجراءات',
            headerAlign: 'center',
            align: 'center',
            className: 'w-44',
            render: (item) => (
                <div className="flex items-center justify-center gap-2">
                    <button
                        title="عرض"
                        type="button"
                        onClick={() => handleView(item)}
                        className="group p-1.5 text-blue-600 hover:text-white hover:bg-blue-600 rounded-full transition"
                    >
                        <EyeIcon className="h-4 w-4" />
                    </button>
                    <button
                        title="تعديل"
                        type="button"
                        onClick={() => handleEdit(item)}
                        className="group p-1.5 text-emerald-600 hover:text-white hover:bg-emerald-600 rounded-full transition"
                    >
                        <PencilSquareIcon className="h-4 w-4" />
                    </button>
                    <button
                        title="طباعة"
                        type="button"
                        onClick={() => handlePrint(item)}
                        className="group p-1.5 text-gray-700 hover:text-white hover:bg-gray-700 rounded-full transition"
                    >
                        <PrinterIcon className="h-4 w-4" />
                    </button>
                </div>
            ),
        },
    ]), [formatDate, formatCurrency, handleView, handleEdit, handlePrint]);


    const renderPagination = () => (
        <PaginationHeaderFooter
            total={totalItems}
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={perPage}
            onItemsPerPageChange={handlePerPageChange}
            onFirst={() => setPage(1)}
            onPrev={() => setPage((prev) => Math.max(1, prev - 1))}
            onNext={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            onLast={() => setPage(totalPages)}
            loading={loading}
            onNavigateStart={() => setLoading(true)}
        />
    );

    const renderListView = () => (
        <>
            <CustomPageHeader
                title="مدفوعات العملاء"
                subtitle="إدارة حركات التحصيل والمرتجعات للعملاء"
                icon={<BanknotesIcon className="h-8 w-8 text-white" />}
                statValue={totalItems}
                statLabel="إجمالي الحركات"
                statSecondaryValue={` التحصيل: ${formatCurrency(serverTotals.payments_amount_total)} `}
                statSecondaryLabel={` المرتجع: ${formatCurrency(serverTotals.refunds_amount_total)}`}
                actionButton={(
                    <button onClick={handleAdd} className="bg-white text-blue-700 font-bold py-2 px-4 rounded-md shadow-md hover:bg-blue-50 flex items-center gap-2 transition-colors">
                        <PlusIcon className="h-5 w-5" />
                        إضافة حركة
                    </button>
                )}
            />

            <FilterBar
                title="بحث وفلاتر الحركات"
                searchConfig={{
                    placeholder: 'ابحث في الحركات، العملاء...',
                    value: pendingSearch,
                    onChange: setPendingSearch,
                    onClear: clearSearchFilter,
                    searchWhileTyping: false,
                    onSubmit: applySearchFilter,
                    showApplyButton: true,
                    applyLabel: 'تطبيق',
                    isDirty: hasPendingChanges,
                }}
                dateRangeConfig={{
                    from: dateFrom, to: dateTo,
                    onChange: (from, to) => { setDateFrom(from); setDateTo(to); },
                    onClear: () => { setDateFrom(''); setDateTo(''); },
                }}
                selectFilters={[
                    { key: 'type', label: 'نوع الحركة', value: typeFilter, onChange: setTypeFilter, options: typeOptions },
                    { key: 'client', label: 'العميل', value: selectedClient, onChange: setSelectedClient, options: clientOptions },
                    { key: 'safe', label: 'الخزنة', value: selectedSafe, onChange: setSelectedSafe, options: safeOptions },
                    { key: 'method', label: 'طريقة الدفع', value: selectedMethod, onChange: setSelectedMethod, options: methodOptions },
                ]}
                activeChips={activeFilterChips}
                onClearAll={clearAllFilters}
            />

            <div className="mt-4">{renderPagination()}</div>

            <div className="mt-4">
                <GlobalTable
                    data={normalizedRows}
                    rowKey="uid"
                    loading={loading}
                    error={error}
                    columns={columnsMemo}
                    totalCount={totalItems}
                    searchTerm={searchTerm}
                    tableClassName="text-sm"
                    headerClassName="text-xs"
                    showSummary
                    initialSort={{ key: 'date', direction: 'desc' }}
                />
            </div>

            <div className="mt-4">{renderPagination()}</div>
        </>
    );

    const renderContent = () => {
    if (loading && currentView === 'list' && !movements.length) return <Loader />;
        if (error && currentView === 'list') return <Alert type="error" message={error} />;

        switch (currentView) {
            case 'add':
                return <AddMovementWrapper onDone={handleFormSubmit} onClose={handleCloseModal} />;
            case 'edit':
                if (currentType === 'payment') {
                    return <UpdateClientPaymentForm onClose={handleCloseModal} onSubmit={handleFormSubmit} safes={safes} clients={clients} paymentMethods={paymentMethods} payment={selectedItem?.original} />;
                }
                return <UpdateClientRefundForm onClose={handleCloseModal} onSubmit={handleFormSubmit} safes={safes} clients={clients} paymentMethods={paymentMethods} refund={selectedItem?.original} />;
            case 'details':
                if (currentType === 'payment') {
                    return <ClientPaymentDetailsModal onClose={handleCloseModal} payment={selectedItem?.original} clients={clients} safes={safes} paymentMethods={paymentMethods} />;
                }
                return <ClientRefundDetailsModal onClose={handleCloseModal} refund={selectedItem?.original} clients={clients} safes={safes} paymentMethods={paymentMethods} />;
            default:
                return renderListView();
        }
    };

    return <div className="p-4" dir="rtl">{renderContent()}</div>;
}
