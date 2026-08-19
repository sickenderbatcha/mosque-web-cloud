# Mahal Booking Receipt: Use Running Numbers

## Problem

Every other receipt (donation, subscription, certificates, cash payments, rental) prints a running sequential number issued by the database, e.g. `BK-2026-0001`, `DON-2026-0002`. The Mahal booking receipt is the exception: it builds its number in the browser from the booking's internal ID (`BK-` + first 8 characters of the UUID), which looks random and never increments.

The database already issues a proper sequential booking number: when a booking becomes paid/completed, the income entry it creates is stamped with `get_next_receipt_number('booking')`, and the booking sequence counter exists. That number is simply never shown on the receipt.

## Change

Make the booking receipt display the same database-issued running number the rest of the app uses:

- Replace the UUID-derived number in the booking receipt with a lookup of the sequential receipt number recorded against that booking (reference type `booking`), using the same shared helper and retry behaviour the donation and cash payment receipts already use.
- While the number is being fetched, show "Loading..." and keep Print/Download disabled, exactly as the donation receipt does — so no receipt can be printed without its real number.
- If no sequential number exists yet (for example an unpaid booking), show "Pending sync" instead of a fabricated number, matching the other receipts.
- The number also flows into the print window, downloaded file name, and on-screen receipt automatically.

This applies everywhere the booking receipt is opened: the public Mahal booking flow, the user dashboard, and the admin Bookings tab.

## Notes

- No database change is needed; the booking sequence and prefix (configurable under receipt number settings) already exist and are shared with the "Receipt Sequence Reset" admin screen.
- Existing bookings that already have an income entry will now show their stored running number instead of the old random-looking one.

## Technical detail

- `src/components/BookingReceipt.tsx`: drop `getBookingReceiptNumber`; add state + effect calling `getLatestSequentialReceiptNumber({ referenceId: booking.bookingId, referenceTypes: ["booking"], retries: 12, retryDelayMs: 800 })` from `src/lib/certificatePayments.ts`; gate the print/download buttons on the resolved value.
