# Block already-booked dates when editing a Mahal booking

In the user dashboard's "Edit Booking" dialog, dates that already have an approved or pending booking are greyed out in the calendar, but clicking them does nothing — no explanation is shown, so it looks like the app simply ignores the click. In some cases (when the availability list has not finished loading) a booked date can still be picked.

## What changes

1. Booked dates stay visually marked (red/struck) in the edit calendar, but become clickable so that tapping one shows a clear message:
   "This date is already booked / தேதி ஏற்கனவே முன் பதிவு செய்யப்பட்டு விட்டது"
   Past dates remain disabled as today.
2. The same message is shown inline under the date field if the currently chosen date is booked, and the "Save Changes" button is disabled in that case.
3. The final server-side conflict check on save now uses this same message text (both languages) instead of the current Tamil-only wording, so the user sees consistent feedback if someone else books the date in the meantime.
4. While the availability list is still loading, date selection is held (button shows a loading state) so a booked date cannot slip through.

## Technical notes

- File: `src/pages/UserDashboard.tsx` (edit-booking dialog around the `Calendar` in the date popover, plus `openEditBookingDialog` and `saveBookingEdit`).
- Keep `bookedDatesForEdit` as the source of truth (built from the `get_mahal_availability` RPC, which returns approved + pending bookings), still excluding the booking's own current date.
- Replace the `disabled` predicate so it only blocks past dates; mark booked days with a `modifiers` / `modifiersClassNames` entry for the red styling, and show the toast from `onSelect`.
- Add a loading flag set while the availability RPC is in flight.
- No database or backend changes.
