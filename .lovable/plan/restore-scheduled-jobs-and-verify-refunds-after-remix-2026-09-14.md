# Restore scheduled jobs and verify refunds after remix

## What I found

- The remixed backend has **no scheduled jobs at all** — the schedule list is empty, so nothing is running automatically right now (expired bookings are never cancelled, backups never run, event reminders never send).
- The scheduling extensions themselves are installed and ready.
- The refund requests table is **empty** — there are no refunds in this copy of the data, so the admin Refunds tab correctly shows nothing. Whether new refunds arrive can only be confirmed by creating one.

## Plan

### 1. Re-create the scheduled jobs
Recreate each job with the correct secret header, so they stop failing the way the old 401 problem did:

- Expired booking cancellation — every 5 minutes (frees held dates, keeps calendar availability accurate)
- Daily automatic backup — once a day, early morning
- Event reminders — once a day

### 2. Run each job once, immediately
Trigger each job manually right after scheduling and read its response, so we see success or the exact error instead of waiting for the next tick.

### 3. Verify the effects
- Confirm expired/stale pending bookings were cancelled and their dates released.
- Confirm a backup record was written.
- Confirm the Job Health section in Settings shows the new successful runs.

### 4. Confirm refunds reach the admin tab
Create one cancellation that should generate a refund (in the backend, on a test booking), then:
- Check the refund row is created with a pending status.
- Open the admin Refunds tab in a browser session and confirm the request is listed.
- Approve it and confirm the running voucher number is allocated (REF- prefix with a serial, not an internal id).
- Remove the test data afterwards.

If the refund does not appear, I will trace where it stops (missing trigger after the remix, or access rules) and fix it in the same pass.

## Technical notes

- Jobs recreated via `cron.schedule` + `net.http_post`, passing `x-cron-secret` from the freshly set `CRON_SECRET` plus the anon key, against `auto-cancel-expired-bookings`, `auto-backup`, `send-event-reminders`.
- Remixes do not copy `cron.job` rows, which is why the list is empty; the DB triggers that create refund rows on cancellation should be checked at the same time, since triggers were previously lost in a similar way.
- Verification uses direct queries plus a Playwright session on the admin Refunds tab.
