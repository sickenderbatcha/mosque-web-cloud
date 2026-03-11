
-- Fix: Remove overly permissive public SELECT on subscriptions
DROP POLICY IF EXISTS "Anyone can view subscriptions by member_id" ON public.subscriptions;

-- Allow authenticated users to view subscriptions (needed for receipt fetch after payment)
CREATE POLICY "Authenticated users can view subscriptions"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (true);
