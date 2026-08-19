# Respect the online payment toggle in the user dashboard

## Problem

The Mahal Booking page hides the online payment option when the superadmin setting `mahal_booking_online_disabled` is on, but the user dashboard does not read that setting. The "Pay Now" button on pending bookings therefore still opens the online payment checkout even when online payment for Mahal Booking is switched off.

The dashboard's only online payment action is that booking "Pay Now" button; certificate and other rows in the dashboard do not offer online payment, so no other place needs changing.

## Change

In the user dashboard bookings list:

- Read the `mahal_booking_online_disabled` setting, matching how the Mahal Booking page does it.
- Keep the same exemption used on the booking page: admins and users with the bookings tab permission are not blocked.
- When online payment is disabled for the current user, hide the "Pay Now" button and instead show a short bilingual note that online payment is currently unavailable and payment should be made in cash at the office.
- Guard the payment handler itself so it exits with a message if it is somehow invoked while the setting is off.

## Technical notes

- File: `src/pages/UserDashboard.tsx`.
- Add `"mahal_booking_online_disabled"` to a `useAppSettings` call, and use `useUserRole` / `useUserTabPermissions` for the admin exemption, mirroring `src/pages/MahalBookingPage.tsx` lines 48-59.
- Gate the button at the existing `booking.status === "pending" && booking.payment_status === "pending"` block, and add the early return at the top of `initiatePayment`.
- No database, RLS, or edge function changes.
