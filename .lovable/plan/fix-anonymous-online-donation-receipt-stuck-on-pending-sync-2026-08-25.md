# Fix: anonymous online donation receipt stuck on "Pending sync"

## What I confirmed

- The latest online anonymous donation (25/08/2026, 06:08) is marked completed and **does** have a running receipt number in the ledger: `DON-2026-0013`.
- The lookup the receipt uses works for signed-out visitors: calling it anonymously against the live backend returns `DON-2026-0013`.
- The ledger entry was written about 37 seconds after the donation record was created, i.e. at payment-verification time.
- The receipt screen only waits about 10 seconds (12 tries, 0.8s apart) and then gives up permanently, showing "Pending sync" with Print/Download greyed out, with no way to try again without redoing the payment.

So the number exists and is reachable; the receipt screen simply stops waiting too early and has no recovery path.

## What will change

1. The donation receipt waits longer for the number to appear (up to about a minute) instead of roughly ten seconds.
2. If it still hasn't appeared, a "Retry" action appears next to "Pending sync" so the visitor can fetch it without redoing anything; once found, the number shows and Print/Download become enabled.
3. Any lookup error is logged to the console instead of silently ending the wait, so a genuine failure is diagnosable.
4. Behaviour is unchanged when the number already exists (shows instantly) and when a donation genuinely has no number yet (still "Pending sync", buttons disabled).

No database, access-rule or ledger changes.

## Technical detail

- `src/components/DonationReceipt.tsx`: change the `get_donation_receipt_number` retry loop from 12 x 800 ms to 40 x 1500 ms; do not break the loop on a transient RPC error (log and continue); add a `retryToken` state included in the effect deps and a small "Retry / மீண்டும் முயற்சி" button rendered in the actions bar when `!receiptLoading && !receiptNumber`.
- Keep `isSequentialReceiptNumber` validation as the gate for enabling Print/Download.
