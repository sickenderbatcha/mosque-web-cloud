-- Allow users to cancel their own bookings (including approved) while preventing other updates
-- Existing policy only allows UPDATE when status = 'pending' and blocks status transitions.

CREATE POLICY "Users can cancel their own bookings"
ON public.mahal_bookings
FOR UPDATE
USING (
  auth.uid() IS NOT NULL
  AND auth.uid() = user_id
  AND status IN ('pending', 'approved')
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND auth.uid() = user_id
  AND status = 'cancelled'
);
