-- Allow authenticated users to view death registers for certificate search
CREATE POLICY "Authenticated users can view death registers"
ON public.death_registers
FOR SELECT
USING (auth.uid() IS NOT NULL);