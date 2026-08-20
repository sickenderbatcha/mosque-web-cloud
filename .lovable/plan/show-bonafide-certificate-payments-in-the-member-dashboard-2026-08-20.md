# Show bonafide certificate payments in the member dashboard

## What's wrong

The cash transaction itself worked correctly. Checking the records for GB2026:

- The cash payment request is marked `paid`.
- A certificate payment row exists (type `bonafide`, status `completed`) tied to that member's account.
- The ledger already issued the running receipt number `CERT-2026-0003`.

The only problem is display: the dashboard deliberately fetches certificate payments of type marriage, death and outside marriage only, so bonafide rows are filtered out. The Payments tab is separately limited to mahal bookings, so no certificate payment of any kind appears there.

## Changes

1. Certificates tab
   - Include `bonafide` in the certificate payments fetched for the signed-in member.
   - Add a label for it ("பொனாபைடு சான்றிதழ் (Bonafide)") and update the card description to mention bonafide.
   - Show the Paid badge, amount, date, receipt number and the Receipt button as with other types.
   - Hide the "certificate preview" button for bonafide, since bonafide has no register record to preview (its reference points at the member record, not a register). Receipt viewing stays available.

2. Payments tab
   - Alongside paid bookings, list completed certificate payments (all types, including bonafide) with type, amount, date, cash/online method, receipt number and a View Receipt button.
   - Empty state only shows when there are neither paid bookings nor completed certificate payments.

No database or approval-flow changes are needed — the data is already correct.

## Technical notes

- `src/pages/UserDashboard.tsx`: extend the `certificate_payments` query `.in("certificate_type", [...])` list with `bonafide`; extend `certTypeLabel`; guard the register-preview button on non-bonafide types; render certificate payments in the `payments` TabsContent using the existing `certReceiptNumberMap` and `CertificateReceipt` dialog state.
- Receipt numbers already resolve through `getLatestSequentialReceiptMap` for completed certificate payment IDs, so bonafide receipts will pick up `CERT-2026-0003` with no extra lookup work.
