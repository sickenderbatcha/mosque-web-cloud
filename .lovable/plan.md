# Fix: cash payment approval shows "Pending sync" instead of a receipt number

## What I confirmed

- The two approved cash requests for certificates (bonafide, amount 1000) have **no** matching payment record and **no** income entry, so no running receipt number exists for them.
- The `certificate_payments` table is currently empty, yet the approval code for the `certificate` service type tries to update `certificate_payments` by `id = reference_id`. For certificate cash requests the `reference_id` is the register/member record id, not a payment id — so the update matches nothing and no payment record is ever created.
- Receipt numbers for certificates are minted by a database trigger that fires when a `certificate_payments` row becomes `completed`. No row, no trigger, no number — hence "Pending sync" and disabled Print/Download.
- The same gap applies to `outside_marriage_certificate` requests. NOC and Heir already create the missing payment row, which is why they work.
- Separately, the cash receipt for **bookings** displays a made-up `BK-XXXXXXXX` number derived from the booking id, while the ledger holds the real running number (e.g. `BK-2026-0001`).

## What will change

1. When a cash payment request is approved (and when it is marked as paid), the app will always make sure a completed payment record exists for the service, whichever service it is:
   - Bonafide / Marriage / Death certificates and Outside Marriage certificates get a payment record created and completed using the certificate type carried in the request details.
   - NOC and Heir keep their current behaviour.
   - Donation, Subscription and Booking keep their current behaviour (their own records already mint numbers).
2. Because a completed payment record now exists, the database issues a proper running receipt number automatically for every cash-approved certificate.
3. The cash receipt screen will look up the number the same way, so the number appears and Print/Download become enabled instead of staying greyed out.
4. Booking cash receipts will show the real running number from the ledger instead of the derived `BK-XXXXXXXX` code, so printed receipts match the accounts.
5. The two already-approved certificate requests that have no number will be repaired so they can be printed.

If a number genuinely cannot be issued yet, the screen keeps showing "Pending sync" with buttons disabled, as today.

## Technical detail

- `src/pages/admin/tabs/CashPaymentRequestsTab.tsx`: widen `ensureCompletedCertificatePayment` to accept any certificate type (resolved from `service_details.certificateType`, defaulting to `outside_marriage` for `outside_marriage_certificate`), and call it from the `certificate` and `outside_marriage_certificate` branches of `updateServicePaymentStatus` instead of the current no-op `update ... eq("id", reference_id)`. Idempotent: reuse an existing row for the same `reference_id` + `certificate_type`, otherwise insert `pending` then flip to `completed` so `add_certificate_payment_to_income` fires and calls `get_next_receipt_number`.
- `src/components/CashPaymentReceipt.tsx`: reuse the same ensure-payment helper for all certificate service types (extract it to a shared module, e.g. `src/lib/cashPaymentReceipts.ts`, used by both tab and receipt) and poll `income` with `reference_id = certificate_payments.id`, `reference_type = 'certificate_payment'`. For `booking`, replace the deterministic `BK-` string with the existing `get_booking_receipt_number` RPC (same retry loop, 12 attempts × 800 ms) and keep `isSequentialReceiptNumber` validation before enabling the buttons.
- Data repair (insert/update only, no schema change): for the two approved `cash_payment_requests` of type `certificate` with no payment record, insert a completed `certificate_payments` row with `payment_method = 'cash'` so the trigger issues their running numbers.
- No schema or RLS changes.
