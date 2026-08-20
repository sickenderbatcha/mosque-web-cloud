# Bookings Status Cards Cleanup

## Goal
Remove the misleading cash-vs-online payment split in the Bookings tab status cards and replace them with three simple status counts: **Approved**, **Pending Approval**, and **Cancelled**. Keep **Total Bookings** and **Total Revenue** unchanged.

## Changes

### UI: Bookings tab status cards
File: `src/pages/admin/tabs/BookingsTab.tsx`

Replace the current 7-card status grid (Total Bookings, Pending, Approved, Paid, Online Payment Completed / Pending Approval, Online Payment Completed / Approved, Total Revenue) with a 5-card grid:

- **Total Bookings** — all bookings count (unchanged).
- **Approved** — count of bookings where `status === 'approved'` (this already includes paid and online-completed bookings once they are approved).
- **Pending Approval** — count of bookings where `status === 'pending'`.
- **Cancelled** — count of bookings where `status === 'cancelled'`.
- **Total Revenue** — sum of `booking_amount` for bookings with `payment_status === 'paid'` or `payment_status === 'completed'` (unchanged).

Adjust the grid column classes so the 5 cards lay out cleanly across mobile, tablet, and desktop breakpoints.

No table, receipt, dialog, or action-button logic is changed.

## Verification
- Build the project and check the Bookings tab renders the new five cards.
- Confirm the counts match the data visible in the bookings table.
