
-- Create has_tab_permission function
CREATE OR REPLACE FUNCTION public.has_tab_permission(_user_id uuid, _tab_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_tab_permissions
    WHERE user_id = _user_id
      AND tab_key = _tab_key
  )
$$;

-- DONATIONS (tab: donations)
DROP POLICY IF EXISTS "Admins can manage donations" ON public.donations;
CREATE POLICY "Admins can manage donations" ON public.donations FOR ALL USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_tab_permission(auth.uid(), 'donations')
) WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR has_tab_permission(auth.uid(), 'donations')
);

DROP POLICY IF EXISTS "Admins can view all donations" ON public.donations;
CREATE POLICY "Admins can view all donations" ON public.donations FOR SELECT USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_tab_permission(auth.uid(), 'donations')
);

-- INCOME (tab: income)
DROP POLICY IF EXISTS "Admins can select income" ON public.income;
CREATE POLICY "Admins can select income" ON public.income FOR SELECT TO authenticated USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_tab_permission(auth.uid(), 'income')
);
DROP POLICY IF EXISTS "Admins can insert income" ON public.income;
CREATE POLICY "Admins can insert income" ON public.income FOR INSERT TO authenticated WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR has_tab_permission(auth.uid(), 'income')
);
DROP POLICY IF EXISTS "Admins can update income" ON public.income;
CREATE POLICY "Admins can update income" ON public.income FOR UPDATE TO authenticated USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_tab_permission(auth.uid(), 'income')
) WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR has_tab_permission(auth.uid(), 'income')
);
DROP POLICY IF EXISTS "Admins can delete income" ON public.income;
CREATE POLICY "Admins can delete income" ON public.income FOR DELETE TO authenticated USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_tab_permission(auth.uid(), 'income')
);

-- EXPENSES (tab: expenses)
DROP POLICY IF EXISTS "Admins can manage expenses" ON public.expenses;
CREATE POLICY "Admins can manage expenses" ON public.expenses FOR ALL USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_tab_permission(auth.uid(), 'expenses')
);

-- MAHAL BOOKINGS (tab: bookings)
DROP POLICY IF EXISTS "Admins can manage all bookings" ON public.mahal_bookings;
CREATE POLICY "Admins can manage all bookings" ON public.mahal_bookings FOR ALL USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_tab_permission(auth.uid(), 'bookings')
);
DROP POLICY IF EXISTS "Admins can view all bookings" ON public.mahal_bookings;
CREATE POLICY "Admins can view all bookings" ON public.mahal_bookings FOR SELECT USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_tab_permission(auth.uid(), 'bookings')
);

-- GRIEVANCES (tab: grievances)
DROP POLICY IF EXISTS "Admins can manage grievances" ON public.grievances;
CREATE POLICY "Admins can manage grievances" ON public.grievances FOR ALL USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_tab_permission(auth.uid(), 'grievances')
);

-- EVENTS (tab: events)
DROP POLICY IF EXISTS "Admins can manage events" ON public.events;
CREATE POLICY "Admins can manage events" ON public.events FOR ALL USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_tab_permission(auth.uid(), 'events')
);

DROP POLICY IF EXISTS "Admins can manage registrations" ON public.event_registrations;
CREATE POLICY "Admins can manage registrations" ON public.event_registrations FOR ALL USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_tab_permission(auth.uid(), 'events')
);

-- GB MEMBERS (tab: members)
DROP POLICY IF EXISTS "Admins can manage members" ON public.gb_members;
CREATE POLICY "Admins can manage members" ON public.gb_members FOR ALL USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_tab_permission(auth.uid(), 'members')
);

DROP POLICY IF EXISTS "Admins can manage family members" ON public.gb_family_members;
CREATE POLICY "Admins can manage family members" ON public.gb_family_members FOR ALL USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_tab_permission(auth.uid(), 'members')
);

-- GALLERY (tab: gallery)
DROP POLICY IF EXISTS "Admins can manage gallery images" ON public.gallery_images;
CREATE POLICY "Admins can manage gallery images" ON public.gallery_images FOR ALL USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_tab_permission(auth.uid(), 'gallery') OR has_tab_permission(auth.uid(), 'about-gallery')
);

-- ANNOUNCEMENTS (tab: announcements)
DROP POLICY IF EXISTS "Admins can manage announcements" ON public.announcements;
CREATE POLICY "Admins can manage announcements" ON public.announcements FOR ALL USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_tab_permission(auth.uid(), 'announcements')
);

-- MARRIAGE REGISTERS (tab: marriage-register)
DROP POLICY IF EXISTS "Admins can select marriage registers" ON public.marriage_registers;
CREATE POLICY "Admins can select marriage registers" ON public.marriage_registers FOR SELECT USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_tab_permission(auth.uid(), 'marriage-register')
);
DROP POLICY IF EXISTS "Admins can insert marriage registers" ON public.marriage_registers;
CREATE POLICY "Admins can insert marriage registers" ON public.marriage_registers FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR has_tab_permission(auth.uid(), 'marriage-register')
);
DROP POLICY IF EXISTS "Admins can update marriage registers" ON public.marriage_registers;
CREATE POLICY "Admins can update marriage registers" ON public.marriage_registers FOR UPDATE USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_tab_permission(auth.uid(), 'marriage-register')
) WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR has_tab_permission(auth.uid(), 'marriage-register')
);
DROP POLICY IF EXISTS "Admins can delete marriage registers" ON public.marriage_registers;
CREATE POLICY "Admins can delete marriage registers" ON public.marriage_registers FOR DELETE USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_tab_permission(auth.uid(), 'marriage-register')
);

-- DEATH REGISTERS (tab: death-register)
DROP POLICY IF EXISTS "Admins can view death registers" ON public.death_registers;
CREATE POLICY "Admins can view death registers" ON public.death_registers FOR SELECT USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_tab_permission(auth.uid(), 'death-register')
);
DROP POLICY IF EXISTS "Admins can insert death registers" ON public.death_registers;
CREATE POLICY "Admins can insert death registers" ON public.death_registers FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR has_tab_permission(auth.uid(), 'death-register')
);
DROP POLICY IF EXISTS "Admins can update death registers" ON public.death_registers;
CREATE POLICY "Admins can update death registers" ON public.death_registers FOR UPDATE USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_tab_permission(auth.uid(), 'death-register')
);
DROP POLICY IF EXISTS "Admins can delete death registers" ON public.death_registers;
CREATE POLICY "Admins can delete death registers" ON public.death_registers FOR DELETE USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_tab_permission(auth.uid(), 'death-register')
);

-- CERTIFICATE PAYMENTS (tab: certificate-payments)
DROP POLICY IF EXISTS "Admins can manage all certificate payments" ON public.certificate_payments;
CREATE POLICY "Admins can manage all certificate payments" ON public.certificate_payments FOR ALL USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_tab_permission(auth.uid(), 'certificate-payments')
);

-- NOC CERTIFICATES (tab: noc-certificates)
DROP POLICY IF EXISTS "Admins can manage noc certificates" ON public.noc_certificates;
CREATE POLICY "Admins can manage noc certificates" ON public.noc_certificates FOR ALL USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_tab_permission(auth.uid(), 'noc-certificates')
);

-- HEIR CERTIFICATES (tab: heir-certificates)
DROP POLICY IF EXISTS "Admins can manage heir certificates" ON public.heir_certificates;
CREATE POLICY "Admins can manage heir certificates" ON public.heir_certificates FOR ALL TO authenticated USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_tab_permission(auth.uid(), 'heir-certificates')
);

-- CASH PAYMENT REQUESTS (tab: cash-requests)
DROP POLICY IF EXISTS "Admins can view all cash payment requests" ON public.cash_payment_requests;
CREATE POLICY "Admins can view all cash payment requests" ON public.cash_payment_requests FOR SELECT TO authenticated USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_tab_permission(auth.uid(), 'cash-requests')
);
DROP POLICY IF EXISTS "Admins can update cash payment requests" ON public.cash_payment_requests;
CREATE POLICY "Admins can update cash payment requests" ON public.cash_payment_requests FOR UPDATE TO authenticated USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_tab_permission(auth.uid(), 'cash-requests')
);

-- MANAGEMENT COMMITTEE (tab: committee)
DROP POLICY IF EXISTS "Admins can manage committee members" ON public.management_committee;
CREATE POLICY "Admins can manage committee members" ON public.management_committee FOR ALL USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_tab_permission(auth.uid(), 'committee')
);

-- ASSETS (tab: asset-management)
DROP POLICY IF EXISTS "Admins can manage assets" ON public.assets;
CREATE POLICY "Admins can manage assets" ON public.assets FOR ALL USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_tab_permission(auth.uid(), 'asset-management')
) WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR has_tab_permission(auth.uid(), 'asset-management')
);

DROP POLICY IF EXISTS "Admins can manage locations" ON public.asset_locations;
CREATE POLICY "Admins can manage locations" ON public.asset_locations FOR ALL USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_tab_permission(auth.uid(), 'asset-management')
) WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR has_tab_permission(auth.uid(), 'asset-management')
);

DROP POLICY IF EXISTS "Admins can manage maintenance logs" ON public.asset_maintenance_logs;
CREATE POLICY "Admins can manage maintenance logs" ON public.asset_maintenance_logs FOR ALL USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_tab_permission(auth.uid(), 'asset-management')
) WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR has_tab_permission(auth.uid(), 'asset-management')
);

-- ADMIN NOTIFICATIONS (tab: notifications)
DROP POLICY IF EXISTS "Admins can manage notifications" ON public.admin_notifications;
CREATE POLICY "Admins can manage notifications" ON public.admin_notifications FOR ALL USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_tab_permission(auth.uid(), 'notifications')
);

-- ISSUED DOCUMENTS (tab: issued-documents)
DROP POLICY IF EXISTS "Admins can manage issued documents" ON public.issued_documents;
CREATE POLICY "Admins can manage issued documents" ON public.issued_documents FOR ALL USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_tab_permission(auth.uid(), 'issued-documents')
) WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR has_tab_permission(auth.uid(), 'issued-documents')
);

-- PDF DOCUMENTS (tab: pdf-documents)
DROP POLICY IF EXISTS "Admins can view pdf documents" ON public.admin_pdf_documents;
CREATE POLICY "Admins can view pdf documents" ON public.admin_pdf_documents FOR SELECT USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_tab_permission(auth.uid(), 'pdf-documents')
);
DROP POLICY IF EXISTS "Admins can insert pdf documents" ON public.admin_pdf_documents;
CREATE POLICY "Admins can insert pdf documents" ON public.admin_pdf_documents FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR has_tab_permission(auth.uid(), 'pdf-documents')
);
DROP POLICY IF EXISTS "Admins can update pdf documents" ON public.admin_pdf_documents;
CREATE POLICY "Admins can update pdf documents" ON public.admin_pdf_documents FOR UPDATE USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_tab_permission(auth.uid(), 'pdf-documents')
);
DROP POLICY IF EXISTS "Admins can delete pdf documents" ON public.admin_pdf_documents;
CREATE POLICY "Admins can delete pdf documents" ON public.admin_pdf_documents FOR DELETE USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_tab_permission(auth.uid(), 'pdf-documents')
);

-- AUDIT LOGS - allow insert for tab-permission users too
DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can insert audit logs" ON public.admin_audit_logs FOR INSERT TO authenticated WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR EXISTS (
    SELECT 1 FROM public.user_tab_permissions WHERE user_id = auth.uid()
  )
);
