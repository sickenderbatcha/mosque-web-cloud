-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Authenticated users can create bookings" ON public.mahal_bookings;

-- Create new policy allowing anyone to create bookings (guest bookings)
CREATE POLICY "Anyone can create bookings" 
ON public.mahal_bookings 
FOR INSERT 
WITH CHECK (true);

-- Update SELECT policy to allow viewing bookings by phone number for guests
DROP POLICY IF EXISTS "Users can view their own bookings" ON public.mahal_bookings;

CREATE POLICY "Users can view their own bookings" 
ON public.mahal_bookings 
FOR SELECT 
USING (
  (auth.uid() IS NOT NULL AND auth.uid() = user_id) 
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (user_id IS NULL AND applicant_phone IS NOT NULL)
);

-- Update the UPDATE policy to allow guests to update their pending bookings by phone
DROP POLICY IF EXISTS "Users can update their own pending bookings" ON public.mahal_bookings;

CREATE POLICY "Users can update their own pending bookings" 
ON public.mahal_bookings 
FOR UPDATE 
USING (
  ((auth.uid() IS NOT NULL AND auth.uid() = user_id) OR (user_id IS NULL))
  AND status = 'pending'::booking_status
);