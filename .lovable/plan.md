# Alerting and visible logs for the booking expiration job

The auto-cancel job silently returned 401 on every run for hours. This adds a permanent record of every run plus an admin alert whenever a run fails.

## What gets built

1. **Run log storage** — a new `cron_job_runs` table recording, for each run: job name, trigger source (schedule or manual), status (success / failure), HTTP status, message, counts (processed, cancelled, notifications sent), errors, and timestamp.

2. **The function logs itself** — `auto-cancel-expired-bookings` writes a run row for every invocation:
   - an auth rejection (401) is logged before the error response is returned, so a misconfigured scheduler is recorded instead of vanishing;
   - a completed run logs its results, and a run with any internal errors (e.g. failed SMS) is marked failure with the error list;
   - an unhandled exception logs a failure row with the message.

3. **Watchdog for calls that never reach the function** — a small scheduled check reads the scheduler's HTTP response history for this job and records any non-2xx response as a failure run, covering the exact case that broke last time (job rejected at the edge).

4. **Admin bell alert on failure** — every failure run also inserts an `admin_notifications` entry ("Scheduled job failed: auto-cancel-expired-bookings") with the HTTP status and error text, so it appears in the existing notification bell. Repeat failures are throttled to at most one notification per hour per job so a broken job does not flood the bell.

5. **"Job Health" section in Settings** — a new section in the superadmin Settings tab showing:
   - each job with last run time, status badge (green/red), and next schedule;
   - a warning banner when the last run failed or when no successful run has happened in the last 2 hours;
   - a table of the most recent 25 runs with status, HTTP code, counts and error text (expandable);
   - a "Run now" button to trigger the job manually and refresh the log.

## Technical notes

- Migration: `public.cron_job_runs` (uuid pk, `job_name text`, `source text`, `status text`, `http_status int`, `message text`, `details jsonb`, `created_at timestamptz`), with `GRANT SELECT` to `authenticated`, `GRANT ALL` to `service_role`, RLS enabled, and a select policy limited to admin/superadmin via `has_role`. Index on `(job_name, created_at desc)`.
- Logging + notification insert are done through a `SECURITY DEFINER` function `public.log_cron_job_run(...)` so both the edge function (service role) and the watchdog use one code path, including the one-hour notification throttle.
- Watchdog: a `pg_cron` job (every 15 min) calling a `SECURITY DEFINER` SQL function that inspects `net._http_response` rows for the job's request ids and logs any non-2xx as a failure. Scheduled via a data insert (contains project-specific values), not a migration.
- UI: new component `src/components/admin/JobHealthCard.tsx`, rendered inside `src/pages/admin/tabs/SuperAdminSettingsTab.tsx`. Manual trigger uses `supabase.functions.invoke` with the caller's admin session (the function already accepts admin callers).
- No change to the job's cancellation logic or its 5-minute schedule.
