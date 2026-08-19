Add a "Paid" status card to the admin Bookings tab

What to build
- Add a fifth status card in the admin dashboard's Bookings tab that shows the total number of bookings whose payment_status is "paid".
- Adjust the status cards grid layout so the new card fits cleanly alongside the existing Total Bookings, Pending, Approved, and Total Revenue cards.

Where to change
- `src/pages/admin/tabs/BookingsTab.tsx`: the status cards section near the top of the component.

How it will work
- The card will display `bookings.filter((b) => b.payment_status === "paid").length` with a distinct color (e.g., green) to match the existing "Approved" style, since both represent completed/confirmed states.
- The grid wrapper will be widened from `md:grid-cols-4` to `md:grid-cols-5` so the five cards remain evenly distributed on desktop.
- No other functionality changes; this is a purely presentational addition to the existing bookings summary.