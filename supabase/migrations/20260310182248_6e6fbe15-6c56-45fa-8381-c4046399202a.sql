
-- Re-create ALL missing triggers for income generation and other automation

-- Certificate payments → income
CREATE TRIGGER trg_certificate_payment_income_insert
  AFTER INSERT ON public.certificate_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.record_certificate_payment_income();

CREATE TRIGGER trg_certificate_payment_income_update
  AFTER UPDATE ON public.certificate_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.record_certificate_payment_income();

-- Mahal bookings → income (insert + update)
CREATE TRIGGER trg_booking_income_insert
  AFTER INSERT ON public.mahal_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.add_booking_to_income_on_insert();

CREATE TRIGGER trg_booking_income_update
  AFTER UPDATE ON public.mahal_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.add_booking_to_income();

-- Donations → income
CREATE TRIGGER trg_donation_income
  AFTER INSERT OR UPDATE ON public.donations
  FOR EACH ROW
  EXECUTE FUNCTION public.add_donation_to_income();

-- Subscriptions → income (insert + update) and slots
CREATE TRIGGER trg_subscription_income_insert
  AFTER INSERT ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.add_subscription_to_income();

CREATE TRIGGER trg_subscription_income_update
  AFTER UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.add_subscription_to_income_on_update();

CREATE TRIGGER trg_subscription_slots
  AFTER UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.populate_subscription_slots();

-- Refund → expense
CREATE TRIGGER trg_refund_expense
  AFTER UPDATE ON public.refund_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_approved_refund_expense();

-- Auto-issue documents
CREATE TRIGGER trg_auto_issue_marriage_doc
  AFTER INSERT ON public.marriage_registers
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_issue_marriage_document();

CREATE TRIGGER trg_auto_issue_death_doc
  AFTER INSERT ON public.death_registers
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_issue_death_document();

CREATE TRIGGER trg_auto_issue_outside_marriage_doc
  AFTER INSERT ON public.outside_marriage_registers
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_issue_outside_marriage_document();

CREATE TRIGGER trg_auto_issue_noc_doc
  AFTER UPDATE ON public.noc_certificates
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_issue_noc_document();

CREATE TRIGGER trg_auto_issue_heir_doc
  AFTER UPDATE ON public.heir_certificates
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_issue_heir_document();

-- Document number generation
CREATE TRIGGER trg_generate_document_number
  BEFORE INSERT ON public.issued_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_document_number();

-- Admin notifications
CREATE TRIGGER trg_notify_new_noc
  AFTER INSERT ON public.noc_certificates
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_new_noc_request();

CREATE TRIGGER trg_notify_new_heir
  AFTER INSERT ON public.heir_certificates
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_new_heir_request();

CREATE TRIGGER trg_notify_new_cash_payment
  AFTER INSERT ON public.cash_payment_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_new_cash_payment_request();

CREATE TRIGGER trg_notify_new_refund
  AFTER INSERT ON public.refund_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_new_refund_request();

-- Updated_at triggers
CREATE TRIGGER trg_updated_at_announcements BEFORE UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_updated_at_app_settings BEFORE UPDATE ON public.app_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_updated_at_assets BEFORE UPDATE ON public.assets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_updated_at_events BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_updated_at_expenses BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_updated_at_gallery_images BEFORE UPDATE ON public.gallery_images FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_updated_at_gb_members BEFORE UPDATE ON public.gb_members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_updated_at_grievances BEFORE UPDATE ON public.grievances FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_updated_at_income BEFORE UPDATE ON public.income FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_updated_at_landing_page_content BEFORE UPDATE ON public.landing_page_content FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_updated_at_mahal_bookings BEFORE UPDATE ON public.mahal_bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_updated_at_management_committee BEFORE UPDATE ON public.management_committee FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_updated_at_marriage_registers BEFORE UPDATE ON public.marriage_registers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_updated_at_noc_certificates BEFORE UPDATE ON public.noc_certificates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_updated_at_heir_certificates BEFORE UPDATE ON public.heir_certificates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_updated_at_death_registers BEFORE UPDATE ON public.death_registers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_updated_at_certificate_payments BEFORE UPDATE ON public.certificate_payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_updated_at_cash_payment_requests BEFORE UPDATE ON public.cash_payment_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
