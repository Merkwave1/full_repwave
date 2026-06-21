SELECT attname, attidentity FROM pg_attribute 
JOIN pg_class ON pg_class.oid = pg_attribute.attrelid
WHERE pg_class.relname = 'Governorates' AND attidentity != '';
