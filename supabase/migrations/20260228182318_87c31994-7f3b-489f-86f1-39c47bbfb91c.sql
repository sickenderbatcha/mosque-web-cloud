
-- Fix: Drop the restrictive INSERT policy and recreate as PERMISSIVE
DROP POLICY IF EXISTS "Anyone can create donations" ON public.donations;

CREATE POLICY "Anyone can create donations"
ON public.donations
FOR INSERT
TO public
WITH CHECK (true);
