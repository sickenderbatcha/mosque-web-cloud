# Ensure Mahal booking calendar refreshes on desktop after payment

## Problem

The previous fix added `setCalendarRefreshKey((k) => k + 1)` after a Mahal booking is created so the availability calendar immediately shows the newly booked date as pending/approved. The user reports this works on mobile but the desktop view still shows the date as free after returning to the booking screen.

## Current state

`src/pages/MahalBookingPage.tsx` already has two `AvailabilityCalendar` instances:
- Mobile/tablet: `className="lg:hidden"` (line ~933)
- Desktop: `className="hidden lg:block"` in the sticky sidebar (line ~1359)

Both already receive `refreshKey={calendarRefreshKey}`. The key is already bumped after:
- Razorpay online payment success (line ~339)
- Admin/permitted-user cash booking creation (line ~611)

Cash-request submission still reloads the page, so it does not need the key bump.

## Plan

1. Verify the desktop `AvailabilityCalendar` instance is actually receiving the updated `refreshKey` and that its `useEffect` refetches on key change.
2. Add a desktop-specific safeguard so the sidebar calendar always refetches after a non-reloading booking is created. If React state batching or sticky-sidebar memoisation is preventing the update, force the desktop calendar to remount by also changing a `desktopCalendarKey` state (or equivalent) tied to the same booking-completion event.
3. Ensure the refresh trigger fires before the receipt modal opens and covers the calendar.
4. Test the complete online-payment and admin-cash booking flows on a desktop viewport and confirm the booked date appears in the calendar without a manual reload.

## Notes

- No database, RLS, or business-logic changes.
- The colour meaning stays the same: approved = red/destructive tint, pending approval = yellow.
