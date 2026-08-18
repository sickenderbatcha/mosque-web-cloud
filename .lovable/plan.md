# Fix: Cash Payment Requests records not deleting

## What's happening

The `cash_payment_requests` table has four access rules: users can view their own, admins can view all, anyone can create, admins can update. There is **no delete rule at all**, so every delete request is silently blocked — zero rows removed, no error returned. The Data Management screen then reports "Deletion Successful" because the database returned no error, which is why it looks like the delete worked but the count stays the same.

## The fix

1. Add a delete rule on `cash_payment_requests` allowing admins, superadmins, and users holding the `cash-requests` tab permission to delete records — matching who can already update them.
2. Make the Data Management delete honest: request the affected row count back and only report success when rows were actually removed; otherwise show a clear "blocked / 0 records removed" message so silent failures on any table surface immediately.

## Technical notes

- Migration: `CREATE POLICY "Admins can delete cash payment requests" ON public.cash_payment_requests FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'superadmin') OR has_tab_permission(auth.uid(),'cash-requests'))`, plus `GRANT DELETE ON public.cash_payment_requests TO authenticated`.
- `src/pages/admin/tabs/DataManagementTab.tsx`: in the bulk delete loop use `.delete({ count: "exact" })` and treat `count === 0` on a non-empty table as a failure for that table, listing the failed table names in the toast.

## Out of scope

Other tables in the Data Management list are untouched; if any of them also refuse deletes, the improved reporting will now name them and we can fix those separately.
