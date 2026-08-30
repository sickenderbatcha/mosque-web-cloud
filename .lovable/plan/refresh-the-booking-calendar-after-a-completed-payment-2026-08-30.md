# Refresh the booking calendar after a completed payment

## Problem

After a successful online payment the booking is created, but the availability calendar on the Mahal Booking page keeps showing the date as free. The page holds a `calendarRefreshKey` state value that the calendar watches, but nothing in the page ever increments it — verified: `setCalendarRefreshKey` is declared and never called. So the calendar only refetches when the user changes month or reloads the page.

(The cash-payment path already works because it does a full `window.location.reload()` on success.)

## Fix

In `src/pages/MahalBookingPage.tsx`, bump `calendarRefreshKey` after the booking is successfully created:

- In the Razorpay success handler, right after the booking is created and the receipt data is set, call `setCalendarRefreshKey((k) => k + 1)`.
- Do the same on any other in-page path that creates a booking without reloading (for example admin-override / direct submit), so the calendar always reflects the new booking.

This makes the `useEffect` in `AvailabilityCalendar` refetch `get_mahal_availability`, and the newly booked date renders in its booked/pending colour immediately.

## Notes

- No database, RLS, or business-logic changes; this is purely a UI refresh fix.
- Colour meaning stays as-is: approved = red/destructive tint, pending approval = yellow. A freshly paid booking is pending until an admin approves it, so it will show as pending (blocked) rather than approved.
