
-- Fix RESTRICTIVE INSERT policies to PERMISSIVE for all public-facing tables

-- certificate_payments
DROP POLICY IF EXISTS "Anyone can create certificate payments" ON public.certificate_payments;
CREATE POLICY "Anyone can create certificate payments"
ON public.certificate_payments FOR INSERT TO public WITH CHECK (true);

-- cash_payment_requests
DROP POLICY IF EXISTS "Anyone can create cash payment requests" ON public.cash_payment_requests;
CREATE POLICY "Anyone can create cash payment requests"
ON public.cash_payment_requests FOR INSERT TO public
WITH CHECK (((auth.uid() IS NOT NULL AND auth.uid() = user_id) OR user_id IS NULL));

-- mahal_bookings
DROP POLICY IF EXISTS "Anyone can create bookings" ON public.mahal_bookings;
CREATE POLICY "Anyone can create bookings"
ON public.mahal_bookings FOR INSERT TO public WITH CHECK (true);

-- heir_certificates
DROP POLICY IF EXISTS "Anyone can create heir certificate requests" ON public.heir_certificates;
CREATE POLICY "Anyone can create heir certificate requests"
ON public.heir_certificates FOR INSERT TO public WITH CHECK (true);

-- noc_certificates
DROP POLICY IF EXISTS "Anyone can create NOC requests" ON public.noc_certificates;
CREATE POLICY "Anyone can create NOC requests"
ON public.noc_certificates FOR INSERT TO public WITH CHECK (true);

-- event_registrations
DROP POLICY IF EXISTS "Anyone can register for events" ON public.event_registrations;
CREATE POLICY "Anyone can register for events"
ON public.event_registrations FOR INSERT TO public WITH CHECK (true);
