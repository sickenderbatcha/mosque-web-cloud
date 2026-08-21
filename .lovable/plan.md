# Add an expired-cash-payment status card to the admin cash payment requests tab

## What gets built

Add a new status card in the admin Cash Payment Requests tab that shows the count and total amount of requests whose status is `expired`.

## Where it changes

- `src/pages/admin/tabs/CashPaymentRequestsTab.tsx`: the stats summary section at the top of the component.

## How it works

- Compute `expiredCount` and `expiredAmount` from the cash_payment_requests data, filtered by `status === "expired"`, alongside the existing `pending`, `approved`, `paid`, and `total` stats.
- Add a new card in the summary grid with the Tamil label **காலாவதி பணம் செலுத்தல் (Expired)** and display the count and amount in the same style as the existing cards.
- Use a muted/gray colour to distinguish expired from active/paid states.
- Expand the grid so the five cards lay out cleanly (e.g. `lg:grid-cols-5` instead of `lg:grid-cols-4`).
- No other behaviour changes.
