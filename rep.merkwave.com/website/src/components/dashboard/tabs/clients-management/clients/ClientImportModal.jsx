import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { XMarkIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { addClient } from '../../../../../apis/clients';
import { CLIENT_STATUS_OPTIONS, getClientStatusLabel, normalizeClientStatus } from '../../../../../constants/clientStatus';

const headerMap = {
  // Arabic
  'اسم العميل': 'clients_company_name',
  'اسم الشركة': 'clients_company_name',
  'جهة الاتصال': 'clients_contact_name',
  'الهاتف': 'clients_contact_phone_1',
  'هاتف 2': 'clients_contact_phone_2',
  'البريد': 'clients_email',
  'العنوان': 'clients_address',
  'المدينة': 'clients_city',
  'الحالة': 'clients_status',
  'النوع': 'clients_type',
  'معرف المنطقة': 'clients_area_tag_id',
  'معرف الصناعة': 'clients_industry_id',
  'معرف المندوب': 'clients_rep_user_id',
  'الضريبة': 'clients_vat_number',
  // English
  'client': 'clients_company_name',
  'client_name': 'clients_company_name',
  'company': 'clients_company_name',
  'company_name': 'clients_company_name',
  'contact': 'clients_contact_name',
  'contact_name': 'clients_contact_name',
  'phone': 'clients_contact_phone_1',
  'phone1': 'clients_contact_phone_1',
  'phone_1': 'clients_contact_phone_1',
  'phone2': 'clients_contact_phone_2',
  'phone_2': 'clients_contact_phone_2',
  'email': 'clients_email',
  'address': 'clients_address',
  'city': 'clients_city',
  'status': 'clients_status',
  'type': 'clients_type',
  'area_tag_id': 'clients_area_tag_id',
  'industry_id': 'clients_industry_id',
  'rep_user_id': 'clients_rep_user_id',
  'vat': 'clients_vat_number',
  'vat_number': 'clients_vat_number'
};

function normalizeKey(k) {
  return String(k || '')
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u0652]/g, '') // Arabic diacritics
    .replace(/\s+/g, ' ')
    .replace(/[\s_-]+/g, '_');
}

function normalizeValue(field, val) {
  if (field === 'clients_status') {
    return normalizeClientStatus(val);
  }
  if (field === 'clients_type') {
    const s = String(val || '').toLowerCase();
    if (['store', 'متجر'].includes(s)) return 'store';
    if (['importer', 'مستورد'].includes(s)) return 'importer';
    if (['distributor', 'موزع'].includes(s)) return 'distributor';
    return '';
  }
  return val ?? '';
}

export default function ClientImportModal({ open, onClose, onDone }) {
  const [rows, setRows] = useState([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, errors: [] });

  const requiredFields = useMemo(() => ['clients_company_name', 'clients_contact_phone_1'], []);

  const handleDownloadTemplate = () => {
    const headers = [
      'اسم العميل', 'جهة الاتصال', 'الهاتف', 'هاتف 2', 'البريد', 'العنوان', 'المدينة', 'الحالة', 'النوع', 'معرف المنطقة', 'معرف الصناعة', 'معرف المندوب', 'الضريبة'
    ];
    const wb = XLSX.utils.book_new();
  const defaultStatusLabel = CLIENT_STATUS_OPTIONS[0]?.label || 'نشط';
  const ws = XLSX.utils.aoa_to_sheet([headers, ['مثال شركة', 'أحمد', '01000000000', '', 'user@example.com', 'شارع التحرير', 'القاهرة', defaultStatusLabel, 'متجر', '', '', '', '']]);
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'clients_import_template.xlsx');
  };

  const parseFile = async (file) => {
    try {
      setParsing(true);
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws, { defval: '' });

      // Map headers
      const mapped = json.map((r) => {
        const out = {};
        Object.keys(r).forEach((key) => {
          const norm = normalizeKey(key);
          const mappedField = headerMap[norm] || headerMap[key] || headerMap[(key || '').toLowerCase()] || null;
          if (mappedField) {
            out[mappedField] = normalizeValue(mappedField, r[key]);
          }
        });
        return out;
      });

      // Filter out empty rows (without company name and phone)
      const filtered = mapped.filter(row => Object.keys(row).length > 0);
      setRows(filtered);
    } catch (e) {
      console.error('Parse error:', e);
      alert('تعذر قراءة الملف. تأكد أن الملف Excel أو CSV بصيغة صحيحة.');
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    if (!rows.length) return;
    setImporting(true);
    setProgress({ done: 0, total: rows.length, errors: [] });

    const errs = [];
    let done = 0;
    for (const row of rows) {
      // Validate required
      const missing = requiredFields.filter(f => !row[f] || String(row[f]).trim() === '');
      if (missing.length) {
        errs.push({ row, error: `حقول إجبارية مفقودة: ${missing.join(', ')}` });
        done += 1; setProgress({ done, total: rows.length, errors: errs });
        continue;
      }
      try {
        await addClient(row);
      } catch (e) {
        errs.push({ row, error: e?.message || 'فشل إضافة العميل' });
      } finally {
        done += 1;
        setProgress({ done, total: rows.length, errors: errs });
      }
    }

    setImporting(false);
    if (errs.length === 0) {
      onDone?.();
      onClose?.();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" dir="rtl">
      <div className="bg-white w-full max-w-3xl rounded-xl shadow-lg overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold">استيراد العملاء من Excel</h3>
          <button onClick={onClose} className="p-2 rounded hover:bg-gray-100"><XMarkIcon className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => e.target.files?.[0] && parseFile(e.target.files[0])} />
            <button onClick={handleDownloadTemplate} className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded">
              <ArrowDownTrayIcon className="w-4 h-4" /> تنزيل قالب
            </button>
          </div>
          <p className="text-xs text-gray-500">
            القيم المسموح بها للحالة: {CLIENT_STATUS_OPTIONS.map((option) => option.label).join('، ')}
          </p>
          {parsing && <div className="text-sm text-gray-500">جاري قراءة الملف...</div>}
          {rows.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <div className="px-3 py-2 bg-gray-50 border-b text-sm text-gray-700">معاينة ({rows.length} صف)</div>
              <div className="max-h-64 overflow-auto text-sm">
                <table className="min-w-full">
                  <thead>
                    <tr className="text-xs text-gray-500 bg-gray-50">
                      <th className="px-3 py-2 text-right">العميل</th>
                      <th className="px-3 py-2 text-right">الهاتف</th>
                      <th className="px-3 py-2 text-right">البريد</th>
                      <th className="px-3 py-2 text-right">المدينة</th>
                      <th className="px-3 py-2 text-right">الحالة</th>
                      <th className="px-3 py-2 text-right">النوع</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 20).map((r, i) => (
                      <tr key={i} className="odd:bg-white even:bg-gray-50">
                        <td className="px-3 py-2">{r.clients_company_name || '—'}</td>
                        <td className="px-3 py-2">{r.clients_contact_phone_1 || '—'}</td>
                        <td className="px-3 py-2">{r.clients_email || '—'}</td>
                        <td className="px-3 py-2">{r.clients_city || '—'}</td>
                        <td className="px-3 py-2">{(() => {
                          const normalizedStatus = normalizeClientStatus(r.clients_status, '');
                          return normalizedStatus ? getClientStatusLabel(normalizedStatus) : '—';
                        })()}</td>
                        <td className="px-3 py-2">{r.clients_type || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {progress.total > 0 && (
            <div className="text-sm">
              <div className="mb-1">تم الاستيراد: {progress.done} / {progress.total}</div>
              {progress.errors.length > 0 && (
                <div className="mt-2 p-2 bg-red-50 text-red-700 rounded">
                  حدثت أخطاء في {progress.errors.length} صفوف. تحقق من البيانات.
                </div>
              )}
            </div>
          )}
        </div>
        <div className="px-5 py-4 border-t flex items-center justify-end gap-2 bg-gray-50">
          <button onClick={onClose} className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300">إلغاء</button>
          <button disabled={!rows.length || importing} onClick={handleImport} className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">
            {importing ? 'جارٍ الاستيراد...' : 'استيراد'}
          </button>
        </div>
      </div>
    </div>
  );
}
