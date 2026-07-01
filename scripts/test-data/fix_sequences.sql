-- Reset identity sequences for all tables that may have out-of-sync PKs
-- Run this in each tenant database

DO $$
DECLARE
  rec RECORD;
  seq_name TEXT;
  max_id BIGINT;
  sql_stmt TEXT;
BEGIN
  FOR rec IN
    SELECT
      kcu.table_name,
      kcu.column_name
    FROM information_schema.key_column_usage kcu
    JOIN information_schema.table_constraints tc
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'PRIMARY KEY'
      AND kcu.table_schema = 'public'
  LOOP
    BEGIN
      seq_name := pg_get_serial_sequence('"' || rec.table_name || '"', rec.column_name);
      IF seq_name IS NOT NULL THEN
        EXECUTE format('SELECT COALESCE(MAX(%I), 0) FROM %I', rec.column_name, rec.table_name) INTO max_id;
        PERFORM setval(seq_name, GREATEST(max_id, 1), true);
        RAISE NOTICE 'Reset % to %', seq_name, max_id;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skipped %.%: %', rec.table_name, rec.column_name, SQLERRM;
    END;
  END LOOP;
END $$;
