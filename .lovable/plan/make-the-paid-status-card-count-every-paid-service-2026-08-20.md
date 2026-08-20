# Make the "Paid" status card count every paid service

## What's wrong

The member dashboard's "பணம் செலுத்தியது" (Paid) card counts only mahal bookings:

`bookings.filter(b => b.payment_status === 'paid').length`

So the bonafide certificate cash payment (and every other certificate, NOC and heir payment) is invisible in that card even though the payment record exists and has a receipt number.

## Change

Count all payments the member has completed, not just bookings:

1. Paid mahal bookings (`payment_status === 'paid'`) — as today.
2. Completed certificate payments already loaded on the dashboard (bonafide, marriage, death, outside marriage) — `payment_status === 'completed'`.
3. Completed NOC and heir certificate requests (`payment_status` of `completed` or `paid`), matching how the Certificates tab already decides paid status.

The card label stays the same; only the number changes. No database or payment-flow changes — the data is already fetched on this screen.

## Technical notes

- `src/pages/UserDashboard.tsx`: add a memoised `paidCount` derived from `bookings`, `certificatePayments`, `nocRequests` and `heirRequests`, and use it in the stats card at the top of the dashboard (currently line 1075).
- De-duplicate: NOC/heir rows are counted from their own request lists, and certificate payment rows for NOC/heir are not part of `certificatePayments` (that query filters to marriage/death/outside_marriage/bonafide), so no double counting occurs.
