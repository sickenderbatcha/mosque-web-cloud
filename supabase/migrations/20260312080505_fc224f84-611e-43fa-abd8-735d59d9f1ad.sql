-- Fix: Allow users to view certificate_payments linked to their own NOC/Heir certificates
CREATE POLICY "Users can view payments for their own certificates"
ON public.certificate_payments FOR SELECT TO authenticated
USING (
  reference_id IN (SELECT id FROM public.noc_certificates WHERE user_id = auth.uid())
  OR reference_id IN (SELECT id FROM public.heir_certificates WHERE user_id = auth.uid())
);

-- Also backfill user_id on certificate_payments where it's NULL but we can infer from noc/heir
UPDATE public.certificate_payments cp
SET user_id = nc.user_id
FROM public.noc_certificates nc
WHERE cp.reference_id = nc.id
  AND cp.user_id IS NULL
  AND nc.user_id IS NOT NULL;

UPDATE public.certificate_payments cp
SET user_id = hc.user_id
FROM public.heir_certificates hc
WHERE cp.reference_id = hc.id
  AND cp.user_id IS NULL
  AND hc.user_id IS NOT NULL;