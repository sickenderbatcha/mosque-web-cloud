# Fix: marked-paid certificate not visible in member dashboard

## What I verified

For the marriage certificate cash request (approved and marked paid):

- The cash request row carries `user_id` for the member and `service_details.certificateType = marriage`.
- The matching `certificate_payments` row exists, `marriage`, `cash`, `completed`, with the running receipt already issued — but its **`user_id` is empty**.
- The member dashboard fetches certificate payments with `.eq("user_id", user.id)`, so a row with no owner never appears — hence no receipt and no certificate for the member.

Cause: the receipt dialog creates the payment row first (when it resolves the receipt number) and its call omits `user_id`; the admin tab's later call then finds an existing completed row and leaves it untouched.

## Changes

1. Cash receipt dialog passes the request's `user_id` when ensuring the payment record, so newly created rows are owned by the member.
2. The shared ensure-payment helper backfills `user_id` on an existing row when it is empty and the request has one — so ordering between the receipt dialog and "Mark as Paid" no longer matters.
3. Repair the existing marriage certificate payment row by setting its `user_id` to the requesting member, so that certificate and receipt appear immediately in that member's dashboard.

No schema, RLS, or dashboard changes needed — the dashboard logic is already correct.

## Technical notes

- `src/components/CashPaymentReceipt.tsx`: include `user_id: request.user_id ?? null` in the `ensureCompletedCashCertificatePayment` argument.
- `src/lib/cashPaymentReceipts.ts`: select `user_id` in the existing-row lookup; if `request.user_id` is set and the stored `user_id` is null, issue an update setting it (in addition to the current status/method reconciliation).
- Data repair: `update certificate_payments set user_id = <member uuid> where id = <payment id> and user_id is null`, matched via its `cash_payment_requests` row.
