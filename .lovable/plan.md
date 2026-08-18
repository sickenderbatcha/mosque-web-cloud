# Fix: Cash payment requests cannot be deleted

## Cause (verified)

The `cash_payment_requests` table has four row-level security policies: view own, view all (admin), create, and update (admin). There is **no DELETE policy**. With RLS on, any delete silently matches zero rows, so the Super Admin data-management screen reports success but nothing is removed.

## Change

Add a DELETE policy allowing admins (and holders of the `cash-requests` tab permission) to delete rows, matching the existing admin update policy:

```sql
CREATE POLICY "Admins can delete cash payment requests"
ON public.cash_payment_requests
FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_tab_permission(auth.uid(), 'cash-requests'));
```

Also confirm the table grants include `DELETE` for `authenticated`, and add the grant if missing.

## Verification

Run a delete of a test record as an admin and confirm the row count drops, then confirm a non-admin cannot delete.
