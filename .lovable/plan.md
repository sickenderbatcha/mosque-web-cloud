# Fix: paid cash certificate not showing in member dashboard

## What I found (verified against the live records)

For the marriage certificate cash request that was approved and marked paid:

- The cash request is `paid`.
- A certificate payment row exists, `completed`, method `cash`, ₹1000.
- The income ledger already issued receipt `CERT-2026-0006`.

But that certificate payment row has **no owner** — its `user_id` is empty, even though the cash request itself is linked to the member's account. The member dashboard only lists certificate payments belonging to the signed-in user, and the access rules also hide unowned rows, so the receipt and the certificate never appear for the member.

Cause: the row is created when the admin opens the cash receipt dialog, and that call passes the request details without the requester's account id. The shared helper then writes the row with an empty owner. The "Mark as Paid" path does pass the account id, but by then the row already exists and the helper leaves the owner untouched.

## Changes

1. Pass the requester's account id when the receipt dialog creates/settles the certificate payment, so new rows are owned from the start.
2. In the shared helper, backfill the owner on an existing row whenever it is missing and the request carries one — so already-created rows get repaired the next time they are settled.
3. One-off data correction: set the owner on the existing marriage certificate payment row (and any other completed cash certificate payment rows whose owner is empty but whose cash request has one), so the member sees the receipt and certificate immediately.

No change to the approval/mark-as-paid rule: certificates and receipts still unlock only after the request is marked paid.

## Technical notes

- `src/components/CashPaymentReceipt.tsx`: include `user_id` in the object passed to `ensureCompletedCashCertificatePayment` (add `user_id` to the component's `request` prop type and to the admin tab's usage if not already provided).
- `src/lib/cashPaymentReceipts.ts`: in the existing-row branch, also update when `user_id` is null and `request.user_id` is set; include `user_id` in the update payload.
- Migration: `UPDATE certificate_payments cp SET user_id = r.user_id FROM cash_payment_requests r WHERE cp.reference_id = r.reference_id AND cp.user_id IS NULL AND r.user_id IS NOT NULL AND cp.payment_method = 'cash';`
