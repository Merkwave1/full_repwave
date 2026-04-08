// src/components/common/PrintableTable/PrintableTable.jsx
import React, { useRef } from 'react';
import { PrinterIcon } from '@heroicons/react/24/outline';
import { useReactToPrint } from 'react-to-print';

/**
 * PrintableTable Component
 * A reusable component for printing tables with custom styling
 * 
 * @param {Object} props
 * @param {Array} props.data - Array of data objects to display
 * @param {Array} props.columns - Array of column definitions
 * @param {string} props.title - Title of the report
 * @param {string} props.subtitle - Subtitle or description
 * @param {Object} props.metadata - Additional metadata (date range, filters, etc.)
 * @param {Function} props.formatCell - Optional custom cell formatter
 * @param {string} props.printButtonLabel - Label for print button
 * @param {string} props.printButtonClassName - Custom class for print button
 */
const PrintableTable = ({
  data = [],
  columns = [],
  title = 'تقرير',
  subtitle = '',
  metadata = {},
  formatCell = null,
  printButtonLabel = 'طباعة',
  printButtonClassName = '',
  children,
}) => {
  const contentRef = useRef(null);

  const handlePrint = useReactToPrint({
    contentRef,
    documentTitle: title,
    pageStyle: `
      @page {
        size: A4 landscape;
        margin: 15mm;
      }
      @media print {
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .no-print {
          display: none !important;
        }
      }
    `,
  });

  const defaultButtonClass = printButtonClassName || 
    'flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm';

  return (
    <>
      {/* Print Button */}
      <button
        onClick={handlePrint}
        className={defaultButtonClass}
        type="button"
      >
        <PrinterIcon className="h-5 w-5" />
        {printButtonLabel}
      </button>

      {/* Hidden Printable Content */}
      <div style={{ display: 'none' }}>
        <div ref={contentRef}>
          <PrintableContent
            data={data}
            columns={columns}
            title={title}
            subtitle={subtitle}
            metadata={metadata}
            formatCell={formatCell}
          >
            {children}
          </PrintableContent>
        </div>
      </div>
    </>
  );
};

/**
 * PrintableContent Component
 * The actual content that will be printed
 */
const PrintableContent = ({ data, columns, title, subtitle, metadata, formatCell, children }) => {
  const now = new Date().toLocaleString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div style={{ padding: '20px', fontFamily: 'Cairo, Arial, sans-serif', direction: 'rtl' }}>
      {/* Header */}
      <div style={{ marginBottom: '30px', borderBottom: '3px solid #2563eb', paddingBottom: '15px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1e40af', margin: 0 }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ fontSize: '14px', color: '#6b7280', margin: '8px 0 0 0' }}>
            {subtitle}
          </p>
        )}
        <p style={{ fontSize: '12px', color: '#9ca3af', margin: '8px 0 0 0' }}>
          تاريخ الطباعة: {now}
        </p>
      </div>

      {/* Metadata */}
      {metadata && Object.keys(metadata).length > 0 && (
        <div style={{ 
          marginBottom: '20px', 
          padding: '15px', 
          backgroundColor: '#f3f4f6', 
          borderRadius: '8px',
          border: '1px solid #e5e7eb'
        }}>
          <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px', color: '#374151' }}>
            معايير البحث:
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
            {Object.entries(metadata).map(([key, value]) => (
              value && (
                <div key={key} style={{ fontSize: '12px' }}>
                  <strong style={{ color: '#1f2937' }}>{key}:</strong>{' '}
                  <span style={{ color: '#4b5563' }}>{value}</span>
                </div>
              )
            ))}
          </div>
        </div>
      )}

      {/* Custom Children Content */}
      {children}

      {/* Table */}
      <table style={{ 
        width: '100%', 
        borderCollapse: 'collapse', 
        fontSize: '11px',
        marginTop: '15px'
      }}>
        <thead>
          <tr style={{ backgroundColor: '#2563eb', color: 'white' }}>
            {columns.map((col, idx) => (
              <th
                key={idx}
                style={{
                  padding: '12px 8px',
                  textAlign: col.align || 'right',
                  fontWeight: 'bold',
                  borderBottom: '2px solid #1e40af',
                }}
              >
                {col.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                style={{
                  padding: '40px',
                  textAlign: 'center',
                  color: '#9ca3af',
                  fontSize: '14px',
                }}
              >
                لا توجد بيانات للطباعة
              </td>
            </tr>
          ) : (
            data.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                style={{
                  backgroundColor: rowIdx % 2 === 0 ? '#ffffff' : '#f9fafb',
                  borderBottom: '1px solid #e5e7eb',
                }}
              >
                {columns.map((col, colIdx) => {
                  let cellContent = row[col.key];

                  // Use custom formatter if provided
                  if (formatCell && typeof formatCell === 'function') {
                    cellContent = formatCell(row, col.key, cellContent);
                  }
                  // Use column render function if available
                  else if (col.renderPrint && typeof col.renderPrint === 'function') {
                    cellContent = col.renderPrint(row);
                  }
                  // Use regular render function (but extract text only)
                  else if (col.render && typeof col.render === 'function') {
                    const rendered = col.render(row);
                    // Try to extract text content from React elements
                    if (typeof rendered === 'object' && rendered?.props?.children) {
                      cellContent = extractTextFromReactElement(rendered);
                    } else {
                      cellContent = rendered;
                    }
                  }

                  return (
                    <td
                      key={colIdx}
                      style={{
                        padding: '10px 8px',
                        textAlign: col.align || 'right',
                        color: '#1f2937',
                      }}
                    >
                      {cellContent ?? '-'}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Footer */}
      <div style={{ 
        marginTop: '30px', 
        paddingTop: '15px', 
        borderTop: '2px solid #e5e7eb',
        fontSize: '11px',
        color: '#6b7280',
        textAlign: 'center'
      }}>
        <p style={{ margin: 0 }}>
          إجمالي السجلات: <strong style={{ color: '#1f2937' }}>{data.length}</strong>
        </p>
      </div>
    </div>
  );
};

/**
 * Helper function to extract text from React elements
 */
function extractTextFromReactElement(element) {
  if (typeof element === 'string' || typeof element === 'number') {
    return element;
  }
  
  if (Array.isArray(element)) {
    return element.map(extractTextFromReactElement).join(' ');
  }
  
  if (element?.props?.children) {
    return extractTextFromReactElement(element.props.children);
  }
  
  return '';
}

export default PrintableTable;
