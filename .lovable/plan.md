# Fix: bookings never auto-expire, dates stay blocked

## What's actually wrong

The scheduled job that cancels unpaid bookings has been running every 15 minutes but failing every single time. Verified from the backend:

- The 1-hour timeout setting is stored correctly (`booking_payment_timeout_hours = 1`).
- Every scheduled call for the last hours returned `401 Unauthorized` — the job's most recent responses are all errors, so the cancellation code never executed once.
- Cause: the job sends only the public anon key, but the function now requires either a signed-in admin or a shared cron secret header (`x-cron-secret`). Neither is sent.
- Result: one pending unpaid booking from 01:21 UTC (event date 23/08/2026) is still `pending`, so its date still shows as occupied.

## The fix

1. Generate/confirm a `CRON_SECRET` value in backend secrets so the function and the scheduler share the same key.
2. Re-create the scheduled job so it sends the `x-cron-secret` header along with the request, and run it every 5 minutes instead of 15 so a 1-hour timeout expires promptly.
3. Run the cancellation once immediately to clear the currently stuck booking, so the 23/08 date is released.
4. Verify: check the job's response is `200` and that the stuck booking flips to `cancelled` and the date frees up in the availability calendar.

## Technical notes

- Job `auto-cancel-expired-bookings` (jobid 1) is rescheduled via `cron.unschedule` + `cron.schedule` with the secret in the headers JSON (done through a data insert, not a migration, since it contains project-specific keys).
- No changes needed in `supabase/functions/auto-cancel-expired-bookings/index.ts` — its logic (expire cash requests, cancel pending bookings, SMS + admin notification) is correct and already reads the configurable timeout.
- Mahal availability is derived from active bookings, so cancelling the row releases the date automatically; no separate calendar change.
