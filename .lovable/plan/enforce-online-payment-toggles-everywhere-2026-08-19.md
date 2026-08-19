# Enforce online payment toggles everywhere

## What we found

- `mahal_booking_online_disabled` is `true` in settings, and the user dashboard already hides "Pay Now" when it is on — except for admins and users with the bookings tab permission.
- The report is from a normal member account, so the most likely cause is that the fix exists in the preview but was never published; the live site still runs the old build.
- Separately, the global `online_payment_enabled` setting is `false` but is not read by any page in the app, so it currently does nothing.

## Change

1. Make the dashboard block strictly:
   - Treat online payment as disabled while the setting is still loading (fail closed instead of briefly showing "Pay Now").
   - Keep the bilingual "pay in cash at the office" note in place of the button.
2. Enforce the global kill switch `online_payment_enabled = false` everywhere online payment can start:
   - User dashboard booking "Pay Now"
   - Mahal Booking page
   - Donation page
   - Subscriptions / certificate payment flows (NOC, heir, marriage, death, outside marriage, bonafide) that currently only read their per-service toggle
   In each place, online payment is unavailable when either the global switch is off or the service's own toggle is on; the existing cash-request fallback and messaging is used.
3. Publish afterwards so the live site picks the change up.

## Technical notes

- Add a small shared helper (e.g. `src/hooks/useOnlinePaymentAvailability.tsx`) that reads `online_payment_enabled` plus a service key, applies the existing admin / tab-permission exemption, and returns `{ disabled, isLoading }`. Pages then use one hook instead of repeating the logic.
- Update `src/pages/UserDashboard.tsx`, `src/pages/MahalBookingPage.tsx`, `src/pages/DonationPage.tsx`, `src/pages/ServicesPage.tsx` and the certificate pages to use it, keeping their current disabled-state UI and cash fallback.
- No database, RLS, or edge function changes.
