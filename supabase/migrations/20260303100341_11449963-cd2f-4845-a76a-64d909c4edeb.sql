-- Backfill legacy booking receipt numbers in income to sequential format
-- and synchronize receipt_sequences for future generation.
DO $$
DECLARE
  v_booking_prefix TEXT;
BEGIN
  -- Use configured prefix or fallback
  SELECT COALESCE(value, 'BK-')
    INTO v_booking_prefix
  FROM public.app_settings
  WHERE key = 'receipt_num_prefix_booking';

  IF v_booking_prefix IS NULL OR btrim(v_booking_prefix) = '' THEN
    v_booking_prefix := 'BK-';
  END IF;

  -- 1) Backfill only legacy/non-sequential booking rows
  WITH existing_seq AS (
    SELECT
      COALESCE((substring(receipt_number FROM '(\d{4})-\d{4}$'))::INT,
               EXTRACT(YEAR FROM COALESCE(income_date, created_at)::date)::INT) AS yr,
      MAX((substring(receipt_number FROM '(\d{4})$'))::INT) AS max_serial
    FROM public.income
    WHERE reference_type = 'booking'
      AND receipt_number ~ '\d{4}-\d{4}$'
    GROUP BY 1
  ),
  legacy_rows AS (
    SELECT
      i.id,
      EXTRACT(YEAR FROM COALESCE(i.income_date, i.created_at)::date)::INT AS yr,
      ROW_NUMBER() OVER (
        PARTITION BY EXTRACT(YEAR FROM COALESCE(i.income_date, i.created_at)::date)::INT
        ORDER BY COALESCE(i.income_date, i.created_at), i.created_at, i.id
      ) AS rn
    FROM public.income i
    WHERE i.reference_type = 'booking'
      AND (
        i.receipt_number IS NULL
        OR i.receipt_number !~ '\d{4}-\d{4}$'
      )
  )
  UPDATE public.income i
  SET receipt_number =
      v_booking_prefix
      || lr.yr::TEXT
      || '-'
      || LPAD((COALESCE(es.max_serial, 0) + lr.rn)::TEXT, 4, '0')
  FROM legacy_rows lr
  LEFT JOIN existing_seq es ON es.yr = lr.yr
  WHERE i.id = lr.id;

  -- 2) Sync receipt_sequences for booking across all years present in income
  WITH seq_max AS (
    SELECT
      COALESCE((substring(receipt_number FROM '(\d{4})-\d{4}$'))::INT,
               EXTRACT(YEAR FROM COALESCE(income_date, created_at)::date)::INT) AS yr,
      MAX((substring(receipt_number FROM '(\d{4})$'))::INT) AS max_serial
    FROM public.income
    WHERE reference_type = 'booking'
      AND receipt_number ~ '\d{4}-\d{4}$'
    GROUP BY 1
  )
  INSERT INTO public.receipt_sequences (receipt_type, year, last_number)
  SELECT 'booking', yr, max_serial
  FROM seq_max
  ON CONFLICT (receipt_type, year)
  DO UPDATE SET
    last_number = GREATEST(public.receipt_sequences.last_number, EXCLUDED.last_number),
    updated_at = now();
END $$;