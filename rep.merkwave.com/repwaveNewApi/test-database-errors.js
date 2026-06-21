// اختبار ترجمة أخطاء قاعدة البيانات
// Test Database Error Translations

import { getErrorMessage, translateError } from '../src/utils/errorTranslations.js';

console.log('🧪 اختبار ترجمة أخطاء قاعدة البيانات\n');
console.log('=' .repeat(80));

// اختبار 1: Foreign Key Constraint مع اسم الجدول
console.log('\n1️⃣  اختبار Foreign Key مع اسم الجدول:');
const fkError1 = new Error(
  'Internal Error: Cannot delete or update a parent row: a foreign key constraint fails ' +
  '(`u858707266_boslattest`.`payments`, CONSTRAINT `fk_payments_client` FOREIGN KEY ' +
  '(`payments_client_id`) REFERENCES `clients` (`clients_id`) ON UPDATE CASCADE)'
);
console.log('الأصلي:', fkError1.message);
console.log('المترجم:', getErrorMessage(fkError1));

// اختبار 2: Foreign Key عام
console.log('\n2️⃣  اختبار Foreign Key عام:');
const fkError2 = new Error('Cannot delete or update a parent row: a foreign key constraint fails');
console.log('الأصلي:', fkError2.message);
console.log('المترجم:', getErrorMessage(fkError2));

// اختبار 3: Internal Error مع Foreign Key
console.log('\n3️⃣  اختبار Internal Error:');
const fkError3 = new Error('Internal Error: foreign key constraint');
console.log('الأصلي:', fkError3.message);
console.log('المترجم:', getErrorMessage(fkError3));

// اختبار 4: Duplicate Entry
console.log('\n4️⃣  اختبار Duplicate Entry:');
const dupError = new Error("Duplicate entry 'test@example.com' for key 'clients.email'");
console.log('الأصلي:', dupError.message);
console.log('المترجم:', getErrorMessage(dupError));

// اختبار 5: جداول مختلفة
console.log('\n5️⃣  اختبار جداول مختلفة:');
const tables = [
  'payments',
  'sales_orders', 
  'sales_invoices',
  'visits',
  'inventory',
  'products',
  'unknown_table'
];

tables.forEach(table => {
  const error = new Error(
    `foreign key constraint fails (\`db\`.\`${table}\`, CONSTRAINT \`fk\` ` +
    `FOREIGN KEY (\`id\`) REFERENCES \`clients\` (\`clients_id\`))`
  );
  const translated = translateError(error.message);
  console.log(`  - ${table}: ${translated}`);
});

// اختبار 6: أخطاء قاعدة بيانات أخرى
console.log('\n6️⃣  اختبار أخطاء أخرى:');
const otherErrors = [
  'Database error',
  'SQL syntax error',
  'Table does not exist',
  'Column not found',
  'Data too long',
  'Out of range value'
];

otherErrors.forEach(errorMsg => {
  console.log(`  - ${errorMsg}: ${translateError(errorMsg)}`);
});

// اختبار 7: رسائل عربية (يجب أن تبقى كما هي)
console.log('\n7️⃣  اختبار الرسائل العربية:');
const arabicMsg = 'لا يمكن الحذف. هذا السجل مرتبط ببيانات أخرى.';
console.log('الأصلي:', arabicMsg);
console.log('المترجم:', translateError(arabicMsg));
console.log('متطابق؟', arabicMsg === translateError(arabicMsg) ? '✅' : '❌');

console.log('\n' + '='.repeat(80));
console.log('✅ انتهى الاختبار');

// تصدير للاستخدام في Console
if (typeof window !== 'undefined') {
  window.testDatabaseErrors = () => {
    console.clear();
    console.log('🧪 اختبار ترجمة أخطاء قاعدة البيانات في Console\n');
    
    const testError = new Error(
      'Internal Error: Cannot delete or update a parent row: a foreign key constraint fails ' +
      '(`database`.`payments`, CONSTRAINT `fk_payments_client` FOREIGN KEY ' +
      '(`payments_client_id`) REFERENCES `clients` (`clients_id`))'
    );
    
    console.log('الخطأ الأصلي:');
    console.log(testError.message);
    console.log('\nالرسالة المترجمة:');
    console.log(getErrorMessage(testError));
  };
  
  console.log('\n💡 نصيحة: استخدم window.testDatabaseErrors() لاختبار سريع في Console');
}
