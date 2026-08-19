# Fix: booking receipt stays "Pending sync" after successful online payment

## What I confirmed

- The newest online-paid booking (created today 13:48) is marked `completed` and **does** have a running receipt number issued: `BK-2026-0002`. So the database side works.
- The receipt component reads that number directly from the income ledger, and the ledger only allows reads for **signed-in** users (admins, or any authenticated user). There is no read access for signed-out visitors.
- The public Mahal booking page can be used without signing in. In that case the lookup returns nothing, the receipt shows "Pending sync", and Print/Download stay disabled — even though the number exists.

## What will change

Give the booking receipt a safe, dedicated way to fetch just its own receipt number, instead of querying the whole income ledger:

1. A small database function returns the running receipt number for one booking id and nothing else (no amounts, no other ledger data). It is callable by signed-out visitors and signed-in users alike.
2. The booking receipt uses that function to resolve the number, keeping the existing retry-and-wait behaviour so the number appears within a moment of payment.
3. Once resolved, the number is displayed and Print/Download become enabled — in the public booking flow, the user dashboard and the admin Bookings tab.
4. If a booking genuinely has no number yet (unpaid booking), the receipt keeps showing "Pending sync" with the buttons disabled, as today.

No change to who can see the income ledger itself.

## Technical detail

- Migration: `create function public.get_booking_receipt_number(_booking_id uuid) returns text language sql stable security definer set search_path = public` selecting the latest `income.receipt_number` where `reference_id = _booking_id and reference_type = 'booking'`; `grant execute` to `anon` and `authenticated`.
- `src/components/BookingReceipt.tsx`: replace the `getLatestSequentialReceiptNumber` income query with `supabase.rpc("get_booking_receipt_number", { _booking_id })`, keeping the same retry loop (12 attempts, 800 ms) and the `isSequentialReceiptNumber` validation before enabling the buttons.
