# Fix Mahal booking online payment failing straight to cash request

## What is happening

The Mahal Booking page deliberately does not create the booking until payment succeeds, so it asks the payment function to create an order **without any booking reference**, sending only the amount.

The payment function was hardened earlier so it never trusts a client-sent amount: it looks the amount up from the referenced record (booking, donation, certificate, subscription). With no booking id there is nothing to look up, so it returns "Unable to determine amount for this request" and the order is never created. The page treats that as a payment failure and opens the cash payment request dialog — which is exactly the behaviour reported.

Every other flow (donations, certificates, death/marriage/outside-marriage registers, dashboard payments) creates its record first and passes its id, so those are unaffected.

## Fix

Let the payment function derive a trustworthy amount for a booking that does not exist yet, instead of rejecting it:

- When the request is a booking with no booking id, read the three Mahal service rates from the saved settings (nikkah book, hall, dining hall).
- Accept the requested amount only if it equals the total of a valid combination of those services (any non-empty subset). Anything else is rejected as before, so the amount still cannot be tampered with.
- Keep the existing behaviour untouched for every request that does carry a record id, and keep the verify step as-is (the booking exists by then, so the paid-amount check still runs against the real booking).

## Technical notes

- File: `supabase/functions/create-razorpay-order/index.ts`, inside `resolveExpectedAmount` (booking branch).
- Rate source: `app_settings` keys `booking_rate_nikkah_book`, `booking_rate_hall`, `booking_rate_food_facility`, with the same defaults the page uses (3000 / 15000 / 7000) when a key is absent.
- No frontend changes, no database or RLS changes.
- After deploying, verify with a live test booking that the Razorpay checkout opens and the cash dialog no longer appears.
