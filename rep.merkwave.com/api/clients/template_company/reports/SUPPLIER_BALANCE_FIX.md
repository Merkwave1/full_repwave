# إصلاح عرض إجمالي أرصدة الموردين في لوحة المعلومات الشاملة

## المشكلة
كان حقل "إجمالي أرصدة الموردين" في لوحة المعلومات الشاملة يعرض دائمًا القيمة 0 بدلاً من جلب البيانات الفعلية من API.

## الحل
تم إضافة قسم جديد في ملف `dashboard_comprehensive.php` لجلب إحصائيات الموردين من قاعدة البيانات.

## التغييرات التي تم إجراؤها

### 1. Backend (PHP)
**الملف:** `Sales_Rep_Backend_Files_ToUpload/reports/dashboard_comprehensive.php`

تم إضافة القسم التالي بعد قسم إحصائيات العملاء:

```php
// ========== 6. Supplier Statistics ==========

$supplier_stats = $conn->prepare("
    SELECT 
        COUNT(CASE WHEN s.suppliers_created_at >= ? THEN 1 END) as new_suppliers_30d,
        COUNT(CASE WHEN s.suppliers_created_at >= ? THEN 1 END) as new_suppliers_7d,
        COUNT(*) as total_active_suppliers,
        COALESCE(SUM(s.suppliers_credit_balance), 0) as total_balance
    FROM suppliers s 
    WHERE s.suppliers_status = 'active'
");

$supplier_stats->bind_param("ss", $last_30_days, $last_7_days);
$supplier_stats->execute();
$supplier_result = $supplier_stats->get_result()->fetch_assoc();

$dashboard_data['suppliers'] = $supplier_result;
```

### 2. البيانات المُرجعة
يتم الآن إرجاع البيانات التالية للموردين:
- `new_suppliers_30d`: عدد الموردين الجدد في آخر 30 يوم
- `new_suppliers_7d`: عدد الموردين الجدد في آخر 7 أيام
- `total_active_suppliers`: إجمالي عدد الموردين النشطين
- `total_balance`: **إجمالي أرصدة الموردين** (المجموع التراكمي لحقل `suppliers_credit_balance`)

### 3. Frontend
الواجهة الأمامية كانت جاهزة بالفعل لاستقبال هذه البيانات:

```jsx
suppliers: {
  totalBalance: toNumber(raw.suppliers?.total_balance ?? 0)
}
```

وعرضها في البطاقة:
```jsx
<StatCard
  title="إجمالي أرصدة الموردين"
  value={formatAmount(data?.suppliers?.totalBalance)}
  icon={BanknotesIcon}
  color={data?.suppliers?.totalBalance >= 0 ? "green" : "red"}
/>
```

## النتيجة
- يتم الآن جلب إجمالي أرصدة الموردين من قاعدة البيانات بشكل صحيح
- يتم عرض الرصيد بنفس الطريقة التي يتم بها عرض إجمالي أرصدة العملاء
- يتغير لون البطاقة إلى اللون الأخضر إذا كان الرصيد موجب والأحمر إذا كان سالب

## ملاحظات
- يتم حساب الرصيد فقط للموردين النشطين (`suppliers_status = 'active'`)
- يتم استخدام `COALESCE` للتأكد من إرجاع 0 في حالة عدم وجود موردين
- تم تحديث أرقام الأقسام في التعليقات لتعكس إضافة القسم الجديد
