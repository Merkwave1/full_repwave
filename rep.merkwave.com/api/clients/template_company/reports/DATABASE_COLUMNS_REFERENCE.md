# Database Column Reference - Representatives Reports

## Tables and Columns Used

### 1. `users` Table
```sql
- users_id (INT)
- users_name (VARCHAR)
- users_email (VARCHAR)
- users_phone (VARCHAR)
- users_role (VARCHAR) - Values: 'rep', 'admin', 'manager', 'superadmin'
- users_status (TINYINT) - 1 = active, 0 = inactive
```

### 2. `representative_attendance` Table
```sql
- attendance_id (INT)
- user_id (INT)
- attendance_date (DATE)
- shift_start_time (DATETIME)
- shift_end_time (DATETIME)
- start_latitude (DECIMAL)
- start_longitude (DECIMAL)
- end_latitude (DECIMAL)
- end_longitude (DECIMAL)
- total_work_duration_sec (INT)
- attendance_status (VARCHAR)
```

### 3. `attendance_break_logs` Table
```sql
- break_log_id (INT)
- attendance_id (INT)
- break_type (VARCHAR)
- break_timestamp (DATETIME)
- resume_timestamp (DATETIME)
- break_reason (TEXT)
```

### 4. `visits` Table
```sql
- visits_id (INT)
- visits_client_id (INT)
- visits_rep_user_id (INT) - FK to users.users_id
- visits_start_time (DATETIME) - NOT visit_date!
- visits_end_time (DATETIME)
- visits_start_latitude (DECIMAL)
- visits_start_longitude (DECIMAL)
- visits_end_latitude (DECIMAL)
- visits_end_longitude (DECIMAL)
- visits_status (ENUM: 'Started', 'Completed', 'Cancelled')
```

### 5. `rep_location_tracking` Table
```sql
- id (INT)
- user_id (INT)
- latitude (DECIMAL)
- longitude (DECIMAL)
- tracking_time (DATETIME)
- battery_level (TINYINT UNSIGNED)
- phone_info (VARCHAR)
```

## Common Mistakes to Avoid

### ❌ Wrong Column Names
```sql
-- WRONG
WHERE user_type = 'rep'           -- Column doesn't exist
WHERE users_archived = 0          -- Column doesn't exist
WHERE visit_date = '2025-10-02'   -- Column doesn't exist
WHERE representative_id = 5       -- Column doesn't exist
```

### ✅ Correct Column Names
```sql
-- CORRECT
WHERE users_role = 'rep'
WHERE users_status = 1
WHERE DATE(visits_start_time) = '2025-10-02'
WHERE visits_rep_user_id = 5
```

## Date Filtering Examples

### For `representative_attendance`:
```sql
-- Filter by date
WHERE attendance_date BETWEEN '2025-10-01' AND '2025-10-02'

-- Filter by month/year
WHERE MONTH(attendance_date) = 10 AND YEAR(attendance_date) = 2025
```

### For `visits`:
```sql
-- Filter by date (extract date from datetime)
WHERE DATE(visits_start_time) BETWEEN '2025-10-01' AND '2025-10-02'

-- Filter by month/year
WHERE MONTH(visits_start_time) = 10 AND YEAR(visits_start_time) = 2025
```

### For `rep_location_tracking`:
```sql
-- Filter by date (extract date from datetime)
WHERE DATE(tracking_time) BETWEEN '2025-10-01' AND '2025-10-02'
```

## Join Examples

### Get Rep Names with Attendance:
```sql
SELECT 
    ra.*,
    u.users_name,
    u.users_email
FROM representative_attendance ra
LEFT JOIN users u ON ra.user_id = u.users_id
WHERE u.users_role = 'rep' AND u.users_status = 1
```

### Get Rep Names with Visits:
```sql
SELECT 
    v.*,
    u.users_name
FROM visits v
LEFT JOIN users u ON v.visits_rep_user_id = u.users_id
WHERE u.users_role = 'rep'
```

### Get Last Location per Rep:
```sql
SELECT 
    rlt.*,
    u.users_name,
    u.users_email
FROM rep_location_tracking rlt
INNER JOIN (
    SELECT user_id, MAX(tracking_time) as max_time
    FROM rep_location_tracking
    GROUP BY user_id
) latest ON rlt.user_id = latest.user_id AND rlt.tracking_time = latest.max_time
LEFT JOIN users u ON rlt.user_id = u.users_id
WHERE u.users_role = 'rep' AND u.users_status = 1
```

## Schema Verification Command

To check table structure in the database:
```sql
DESCRIBE table_name;
-- OR
SHOW CREATE TABLE table_name;
```

## Quick Reference Summary

| Table | Date Column | Representative FK | Status/Role Column |
|-------|-------------|-------------------|-------------------|
| users | - | users_id (PK) | users_role, users_status |
| representative_attendance | attendance_date | user_id | attendance_status |
| visits | visits_start_time | visits_rep_user_id | visits_status |
| rep_location_tracking | tracking_time | user_id | - |
