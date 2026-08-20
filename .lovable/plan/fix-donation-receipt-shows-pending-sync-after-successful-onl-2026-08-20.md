# Fix: donation receipt shows "Pending sync" after successful online payment

## What I confirmed

- Every recent completed donation (all anonymous) already has a running receipt number issued in the income ledger: `DON-2026-0001` through `DON-2026-0005`. The database side works.
- The donation receipt resolves that number by querying the income ledger directly, and the ledger only allows reads for signed-in users. There is no read access for signed-out visitors.
- Donations can be made without signing in, so the lookup returns nothing, the receipt shows "Pending sync", and Print/Download stay disabled even though the number exists.
- The number stored on the donation row itself (e.g. `DON-20260820-1453`) is the old random-style number and is deliberately not accepted as a running number.

## What will change

Give the donation receipt a safe, dedicated way to fetch just its own receipt number, instead of reading the whole income ledger:

1. A small database function returns the running receipt number for one donation id and nothing else (no amounts, no other ledger rows). Callable by signed-out visitors and signed-in users alike.
2. The donation receipt uses that function, keeping the existing retry-and-wait behaviour so the number appears within a moment of a successful payment.
3. Once resolved, the number is shown and Print/Download become enabled — in the public donation flow, the user dashboard and the admin Donations tab.
4. If a donation genuinely has no number yet (payment not completed), the receipt keeps showing "Pending sync" with buttons disabled, as today.

No change to who can see the income ledger itself.

## Technical detail

- Migration: `create function public.get_donation_receipt_number(_donation_id uuid) returns text language sql stable security definer set search_path = public` selecting the latest `income.receipt_number` where `reference_id = _donation_id and reference_type = 'donation'`; `grant execute` to `anon` and `authenticated`.
- `src/components/DonationReceipt.tsx`: replace the `getLatestSequentialReceiptNumber` income query with `supabase.rpc("get_donation_receipt_number", { _donation_id })`, keeping the same 12-attempt / 800 ms retry loop and the `isSequentialReceiptNumber` validation before enabling the buttons.
