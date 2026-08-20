# Fix heir cash receipt still showing “Pending sync”

## Confirmed cause

- The latest heir cash request now has a valid linked heir certificate record, so the earlier missing-reference issue is fixed.
- It remains approved with no certificate payment or income receipt record, which is why the receipt still displays “Pending sync.”
- The account handling cash requests has the `cash-requests` permission, but the current browser-side settlement attempts to write certificate-payment and heir-certificate records under permissions reserved for admins or other tabs. That write fails before a running receipt number can be created.

## What will change

1. Add one secure backend settlement function for cash requests. It will verify that the signed-in operator is an admin/superadmin or has the `cash-requests` permission.
2. For an approved heir cash request, the function will atomically:
   - validate the linked heir certificate;
   - create or complete the owned cash certificate-payment record;
   - update the heir certificate to paid/approved;
   - mark the cash request paid;
   - allow the existing receipt trigger to issue the next running receipt number.
3. Update the admin cash-payment screen to call this settlement function instead of performing restricted writes directly in the browser.
4. Change the action order so “Mark as paid” performs settlement first; Print/Download become available only after the running receipt number is confirmed. Printing will no longer be required to mark payment as received.
5. Repair the currently approved linked heir request through the same settlement path, while leaving the older unlinked request unchanged because it has no recoverable heir record.
6. Verify the linked request receives a sequential receipt number, changes to paid, and enables both Print and Download.

## Technical detail

- Database: introduce a narrowly scoped `SECURITY DEFINER` function with an explicit `search_path`, authorization checks, row locking, idempotent payment creation, and no anonymous execution.
- Frontend: replace the certificate settlement branch in `CashPaymentRequestsTab`/receipt flow with the function call and refresh the request plus receipt state after success.
- Preserve the existing receipt numbering trigger and receipt format; no new tables or numbering scheme changes.
