-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Users can create cash payment requests" ON public.cash_payment_requests;

-- Create a new policy that allows both authenticated users and anonymous visitors to submit
CREATE POLICY "Anyone can create cash payment requests" 
ON public.cash_payment_requests 
FOR INSERT 
TO public
WITH CHECK (
  -- Either the user is authenticated and user_id matches, or user_id is null (guest)
  (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR (user_id IS NULL)
);