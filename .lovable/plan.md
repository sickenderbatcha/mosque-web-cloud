# Fix “Error updating status” when marking heir cash payment paid

## Confirmed cause

- The successfully linked heir request is already paid and has receipt `CERT-2026-0007`.
- The remaining approved heir request has no linked heir-certificate record (`reference_id` is empty), no payment record, and no receipt number.
- The secure settlement function rejects that incomplete request, but the admin screen replaces the useful backend message with the generic “Error updating status” toast.

## What will change

1. Prevent “Mark paid / Print” from being offered for an heir cash request that has no linked certificate record.
2. Show a clear bilingual message explaining that this older request cannot issue a receipt because its heir application details were never saved, and that it must be cancelled and resubmitted.
3. Preserve normal Mark Paid → receipt generation → Print/Download behavior for properly linked heir requests.
4. Surface the actual safe backend settlement message in the error toast instead of always showing the generic status error.
5. Verify both paths:
   - linked approved heir requests settle and open the generated receipt;
   - unlinked legacy requests remain unchanged and display the corrective guidance without attempting settlement.

## Technical detail

- Frontend only: update `CashPaymentRequestsTab` action availability and error handling using the request’s existing `reference_id`.
- No database policy, receipt numbering, or already-paid record changes.
