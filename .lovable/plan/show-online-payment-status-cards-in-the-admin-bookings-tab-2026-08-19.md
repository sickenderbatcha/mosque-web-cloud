Show online payment status cards in the admin Bookings tab

What to build
- Add two new status cards to the existing summary row in the admin Bookings tab:
  1. "Online Payment Completed / Pending Approval" — count of bookings whose `payment_status` is "completed" AND `status` is "pending".
  2. "Online Payment Completed / Approved" — count of bookings whose `payment_status` is "completed" AND `status` is "approved".
- Keep the existing cards (Total Bookings, Pending, Approved, Paid, Total Revenue) unchanged.
- Adjust the grid layout so the seven cards display cleanly on desktop and stack naturally on mobile.

Where to change
- `src/pages/admin/tabs/BookingsTab.tsx`: the status cards section near the top of the component (currently the `md:grid-cols-5` grid).

How it will work
- The first new card will display `bookings.filter((b) => b.payment_status === "completed" && b.status === "pending").length`.
- The second new card will display `bookings.filter((b) => b.payment_status === "completed" && b.status === "approved").length`.
- The grid wrapper will be updated from `md:grid-cols-5` to a responsive class that fits seven cards (e.g., `md:grid-cols-4 lg:grid-cols-7`) so the layout remains tidy on desktop.
- Card colors will follow the existing palette: yellow/orange for the pending-approval card and green for the approved card.
- No other functionality changes; this is a purely presentational addition to the bookings summary.
