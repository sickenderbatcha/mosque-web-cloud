# Fix: fully-paid member still shown as "subscription pending"

## What I confirmed in the data

Member GB2026 has all 8 months (January–August 2026) recorded as paid in the subscription slots, from a completed online payment. So the "pending months" warning is wrong.

Root cause: the database helper that lists a member's paid months refuses to answer unless the visitor is signed in (it raises an authorization error for anonymous visitors). The subscription page is a public page, so for a signed-out visitor the call fails, the page treats the result as "no months paid at all", and therefore lists every month from the configured start (January 2026) to today as pending — and because the "force pending months first" setting is on, the form locks to those months.

Second issue: even when the paid-month lookup succeeds and nothing is pending, the form still defaults the "from" month to the current month (August 2026), which is already paid — so the user hits the "already paid" warning instead of being offered the next free month.

## Changes

1. Database
   - Allow the paid-months lookup to run for public (signed-out) visitors on the public subscription page, still scoped strictly to the membership number passed in and returning only year/month pairs (no names, amounts, or payment details). Signed-in behaviour is unchanged.

2. Subscription page (`src/pages/DonationPage.tsx`)
   - Treat a failed paid-months lookup as an error state, not as "nothing paid": don't build a pending-month list from a failed call, and show a short retry notice instead of falsely locking the form.
   - When there are no pending months, default the "from" month/year to the first month after the last paid month (for GB2026 that is September 2026) so the member can pay future months right away.
   - When there are no pending months, show a brief "no pending months — you can pay for upcoming months" note in place of the pending-months banner, and keep the month/count fields editable.

## Technical notes

- Function involved: `public.get_paid_subscription_months(_member_id text)` — currently `SECURITY DEFINER` with an `auth.uid() IS NULL` guard; the guard is what breaks the anonymous path. It will be replaced by a strict input check (non-empty membership id) and grants for anon plus authenticated.
- Frontend logic touched: `checkPendingMonths`, `checkAlreadyPaidMonths`, and the pending-months banner/summary block; the "force pending" behaviour (`force_pending_subscription = true`) is kept as-is for members who genuinely have unpaid months.
- No data backfill needed — GB2026's records are already correct.
