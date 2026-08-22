# Fix wrong receipt number on the certificate request card

## Problem

On the Services page, after a certificate fee is paid, the green "கட்டணம் செலுத்தப்பட்டது" row shows a badge with `CASH-73074C7B`. That value is the internal payment transaction ID, not the official receipt number. The real receipt number is the running number issued into the income ledger (for example `CERT-2026-0004`), which is what the printed receipt shows. So the screen and the printed receipt disagree.

This affects the marriage certificate card and the other certificate cards on the same page (bonafide, death), because they all render the same badge.

## Fix

- After a completed payment is detected, look up the sequential receipt number from the income ledger for that payment and show it in the badge.
- If the ledger number is not available yet (rare, right after payment), show the status text without a misleading badge, and retry briefly rather than falling back to the transaction ID.
- Keep the payment method / transaction reference out of this badge; it stays available on the receipt itself.

## Technical details

- File: `src/pages/ServicesPage.tsx`
  - In the `syncPaymentStatus` effect (~line 363), after `getCertificateAccessStatus` returns a `completedPayment`, call `getLatestSequentialReceiptNumber` from `src/lib/certificatePayments.ts` with `referenceId: completedPayment.id` and `referenceTypes: ["certificate_payment"]`, and store the result in new state (e.g. `receiptNumber`).
  - Replace the two badge blocks (~lines 834-837 and ~1031-1034) so they render `receiptNumber` instead of `certificatePayment.transaction_id`, and render nothing when it is null.
- No database, RLS, or receipt-generation logic changes; this is a display fix only.
