-- Drop all tables in the public schema
DO $$ 
DECLARE
  r RECORD;
BEGIN
  -- Disable all triggers first
  FOR r IN (SELECT trigger_name, event_object_table FROM information_schema.triggers WHERE trigger_schema = 'public') 
  LOOP
    EXECUTE 'ALTER TABLE ' || r.event_object_table || ' DISABLE TRIGGER ' || r.trigger_name;
  END LOOP;

  -- Drop all foreign key constraints
  FOR r IN (
    SELECT tc.constraint_name, tc.table_name 
    FROM information_schema.table_constraints tc 
    WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.constraint_schema = 'public'
  )
  LOOP
    EXECUTE 'ALTER TABLE ' || r.table_name || ' DROP CONSTRAINT IF EXISTS ' || r.constraint_name || ' CASCADE';
  END LOOP;

  -- Drop all tables
  FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') 
  LOOP
    EXECUTE 'DROP TABLE IF EXISTS "' || r.tablename || '" CASCADE';
  END LOOP;

  -- Drop all views
  FOR r IN (SELECT table_name FROM information_schema.views WHERE table_schema = 'public') 
  LOOP
    EXECUTE 'DROP VIEW IF EXISTS "' || r.table_name || '" CASCADE';
  END LOOP;

  -- Drop all functions
  FOR r IN (
    SELECT ns.nspname || '.' || proname || '(' || oidvectortypes(proargtypes) || ')' as function_name
    FROM pg_proc INNER JOIN pg_namespace ns ON (pg_proc.pronamespace = ns.oid)
    WHERE ns.nspname = 'public'
  ) 
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.function_name || ' CASCADE';
  END LOOP;

  -- Drop all types
  FOR r IN (
    SELECT pg_type.typname as type_name
    FROM pg_type 
    JOIN pg_namespace ON pg_type.typnamespace = pg_namespace.oid
    WHERE pg_namespace.nspname = 'public'
    AND pg_type.typtype = 'e'
  ) 
  LOOP
    EXECUTE 'DROP TYPE IF EXISTS ' || r.type_name || ' CASCADE';
  END LOOP;
END $$; 