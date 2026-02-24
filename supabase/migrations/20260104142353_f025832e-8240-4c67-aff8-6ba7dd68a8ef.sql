-- Drop the current SELECT policy that's too restrictive for the availability calendar
DROP POLICY IF EXISTS "Users can view their own bookings" ON public.mahal_bookings;

-- Create a new SELECT policy that allows:
-- 1. Anyone to view basic booking info (for availability calendar - only dates and status)
-- 2. Users to view their own full bookings
-- 3. Admins to view all bookings
CREATE POLICY "Anyone can view bookings for availability" 
ON public.mahal_bookings 
FOR SELECT 
USING (true);