-- Fix donations RLS: the existing policies are RESTRICTIVE (default for FORCE RLS)
-- Need to drop and recreate as standard policies

DROP POLICY IF EXISTS "Admins can manage donations" ON public.donations;
DROP POLICY IF EXISTS "Admins can view all donations" ON public.donations;
DROP POLICY IF EXISTS "Anyone can create donations" ON public.donations;

CREATE POLICY "Admins can manage donations"
ON public.donations FOR ALL TO public
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view all donations"
ON public.donations FOR SELECT TO public
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can create donations"
ON public.donations FOR INSERT TO public
WITH CHECK (true);