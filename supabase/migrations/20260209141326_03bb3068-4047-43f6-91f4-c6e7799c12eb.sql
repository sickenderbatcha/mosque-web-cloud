-- Allow anonymous users to view active gb_members (needed for subscription member lookup)
DROP POLICY IF EXISTS "Authenticated users can view active members" ON public.gb_members;

CREATE POLICY "Anyone can view active members"
ON public.gb_members
FOR SELECT
USING (is_active = true);