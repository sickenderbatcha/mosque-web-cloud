DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.relname AS tbl, t.tgname
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_proc p ON p.oid = t.tgfoid
    WHERE NOT t.tgisinternal
      AND c.relnamespace = 'public'::regnamespace
      AND t.tgname <> (
        SELECT min(t2.tgname)
        FROM pg_trigger t2
        WHERE t2.tgrelid = t.tgrelid
          AND t2.tgfoid = t.tgfoid
          AND t2.tgtype = t.tgtype
          AND NOT t2.tgisinternal
      )
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', r.tgname, r.tbl);
  END LOOP;
END $$;