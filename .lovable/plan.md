# Fix Mahal booking receipt numbers

## What's wrong today

Confirmed from the live data and database logic:

- The two approved bookings still have payment status "pending", and there is no ledger entry for any booking. The receipt number is only created together with the ledger entry, which happens only when the payment status becomes paid/completed — so the receipt shows "Pending sync" and Print/Download stay disabled.
- Even when a ledger entry is created, the database stamps it with a random-looking number built from the booking's internal ID (`BK-` + 8 characters), not a running number. So the sequential number the receipt looks for would never appear.
- The admin Bookings screen has no way to mark a cash/pending booking as paid.

## What will change

1. **Running numbers for bookings.** Booking ledger entries will be stamped with the shared sequential numbering used by donations, subscriptions and certificates — `BK-2026-0001`, `BK-2026-0002`, and so on, honouring the prefix configured under Receipt Number Settings.

2. **"Mark as paid" action in the admin Bookings tab.** Each pending booking gets an action icon. Confirming it sets the booking to paid, records the payment as cash income, and issues the running receipt number. The row's payment badge flips to Paid.

3. **Receipt becomes printable.** Once paid, the receipt shows its real running number and Print/Download are enabled. Unpaid bookings keep showing "Pending sync" with the buttons disabled, as intended.

4. **Online payments unchanged in behaviour, fixed in numbering.** When a user pays online, the booking already flips to completed on success — that same path will now issue the sequential number, so the receipt is printable straight after a successful payment.

## Technical detail

- Migration: rewrite `add_booking_to_income()` and `add_booking_to_income_on_insert()` to use `get_next_receipt_number('booking', NULL)` instead of the UUID-derived string. Keep the existing duplicate guard, and add the same guard to the insert-time function so an online-paid booking created as paid cannot double-insert.
- Clean up duplicated triggers on `mahal_bookings`: three identical insert triggers and three identical update triggers currently exist; keep one of each so a single ledger row and a single sequence number are consumed per booking.
- `src/pages/admin/tabs/BookingsTab.tsx`: add a "Mark as paid" icon button (visible when `payment_status` is null/pending and status is approved) with a confirm dialog, updating `payment_status` to `paid`; refresh list afterwards. The existing update trigger creates the income row and number.
- `src/components/BookingReceipt.tsx` needs no logic change — it already resolves the sequential number from the ledger with retries and gates the buttons on it.
- No change to the receipt sequence reset screen; `booking` is already listed there.
