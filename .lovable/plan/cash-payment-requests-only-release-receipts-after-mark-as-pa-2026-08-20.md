# Cash payment requests: only release receipts after "Mark as Paid"

## Problem (verified in code)

In the admin Cash Payment Requests tab, approving a request immediately calls the routine that flips the linked service to paid — for a marriage certificate it sets the `certificate_payments` row to `payment_status = completed`, `payment_method = cash`.

The member dashboard's Certificates tab enables the receipt and certificate print/download buttons whenever that payment row is `completed`. So a request that is only *approved* (not yet marked paid, i.e. cash not actually collected) already exposes the receipt and certificate.

## Fix

1. Approval no longer settles payment. On "Approve", update only the cash request itself (status `approved`, admin notes, processed timestamp). Do not run the service payment update.
2. "Mark as Paid" becomes the single point that settles payment — it already calls the same routine and sets the request to `paid`, so certificates/receipts appear in the member dashboard only from that moment.
3. This applies uniformly to every service type handled by that routine (marriage, death, outside marriage, bonafide certificates, NOC, heir, donations, subscriptions, bookings), so no service leaks a receipt on approval alone.

## Status cards

Add a third card, "பணம் பெறப்பட்டது (Cash Paid)", to the summary row of the Cash Payment Requests page: count and total amount of requests with status `paid`. The stats query currently only computes pending and approved; it will also aggregate the paid bucket. Layout moves from a 3-column to a 4-column grid on desktop (Pending, Approved, Cash Paid, and the existing third card), stacking on mobile.

## Technical notes

- Files: `src/pages/admin/tabs/CashPaymentRequestsTab.tsx` only.
- `processMutation`: drop the `if (status === "approved") await updateServicePaymentStatus(...)` branch.
- `markAsPaidMutation`: unchanged (already calls `updateServicePaymentStatus` then sets `status: "paid"`).
- `cash-payment-requests-stats` query: add `paidCount` / `paidAmount` from rows with `status === "paid"`.
- No database or member dashboard changes needed; the dashboard already gates on `payment_status === "completed"`.
- Existing records that were approved before this change keep their already-completed payment rows; they can be corrected manually if needed.
