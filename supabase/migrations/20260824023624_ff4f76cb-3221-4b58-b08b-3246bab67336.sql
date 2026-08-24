-- Restore document issuing triggers
DROP TRIGGER IF EXISTS trg_auto_issue_death_document ON public.death_registers;
CREATE TRIGGER trg_auto_issue_death_document
AFTER INSERT ON public.death_registers
FOR EACH ROW EXECUTE FUNCTION public.auto_issue_death_document();

DROP TRIGGER IF EXISTS trg_auto_issue_marriage_document ON public.marriage_registers;
CREATE TRIGGER trg_auto_issue_marriage_document
AFTER INSERT ON public.marriage_registers
FOR EACH ROW EXECUTE FUNCTION public.auto_issue_marriage_document();

DROP TRIGGER IF EXISTS trg_auto_issue_outside_marriage_document ON public.outside_marriage_registers;
CREATE TRIGGER trg_auto_issue_outside_marriage_document
AFTER INSERT ON public.outside_marriage_registers
FOR EACH ROW EXECUTE FUNCTION public.auto_issue_outside_marriage_document();

DROP TRIGGER IF EXISTS trg_auto_issue_noc_document ON public.noc_certificates;
CREATE TRIGGER trg_auto_issue_noc_document
AFTER INSERT OR UPDATE ON public.noc_certificates
FOR EACH ROW EXECUTE FUNCTION public.auto_issue_noc_document();

DROP TRIGGER IF EXISTS trg_auto_issue_heir_document ON public.heir_certificates;
CREATE TRIGGER trg_auto_issue_heir_document
AFTER INSERT OR UPDATE ON public.heir_certificates
FOR EACH ROW EXECUTE FUNCTION public.auto_issue_heir_document();

-- Document numbering
DROP TRIGGER IF EXISTS trg_generate_document_number ON public.issued_documents;
CREATE TRIGGER trg_generate_document_number
BEFORE INSERT ON public.issued_documents
FOR EACH ROW EXECUTE FUNCTION public.generate_document_number();

-- Income posting
DROP TRIGGER IF EXISTS trg_add_booking_to_income_insert ON public.mahal_bookings;
CREATE TRIGGER trg_add_booking_to_income_insert
AFTER INSERT ON public.mahal_bookings
FOR EACH ROW EXECUTE FUNCTION public.add_booking_to_income_on_insert();

DROP TRIGGER IF EXISTS trg_add_booking_to_income_update ON public.mahal_bookings;
CREATE TRIGGER trg_add_booking_to_income_update
AFTER UPDATE ON public.mahal_bookings
FOR EACH ROW EXECUTE FUNCTION public.add_booking_to_income();

DROP TRIGGER IF EXISTS trg_add_donation_to_income ON public.donations;
CREATE TRIGGER trg_add_donation_to_income
AFTER INSERT OR UPDATE ON public.donations
FOR EACH ROW EXECUTE FUNCTION public.add_donation_to_income();

DROP TRIGGER IF EXISTS trg_add_certificate_payment_to_income_insert ON public.certificate_payments;
CREATE TRIGGER trg_add_certificate_payment_to_income_insert
AFTER INSERT ON public.certificate_payments
FOR EACH ROW EXECUTE FUNCTION public.record_certificate_payment_income();

DROP TRIGGER IF EXISTS trg_add_certificate_payment_to_income_update ON public.certificate_payments;
CREATE TRIGGER trg_add_certificate_payment_to_income_update
AFTER UPDATE ON public.certificate_payments
FOR EACH ROW EXECUTE FUNCTION public.add_certificate_payment_to_income();

DROP TRIGGER IF EXISTS trg_add_subscription_to_income_insert ON public.subscriptions;
CREATE TRIGGER trg_add_subscription_to_income_insert
AFTER INSERT ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.add_subscription_to_income();

DROP TRIGGER IF EXISTS trg_add_subscription_to_income_update ON public.subscriptions;
CREATE TRIGGER trg_add_subscription_to_income_update
AFTER UPDATE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.add_subscription_to_income_on_update();

DROP TRIGGER IF EXISTS trg_populate_subscription_slots ON public.subscriptions;
CREATE TRIGGER trg_populate_subscription_slots
AFTER UPDATE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.populate_subscription_slots();

DROP TRIGGER IF EXISTS trg_handle_approved_refund_expense ON public.refund_requests;
CREATE TRIGGER trg_handle_approved_refund_expense
AFTER UPDATE ON public.refund_requests
FOR EACH ROW EXECUTE FUNCTION public.handle_approved_refund_expense();

-- Admin notifications
DROP TRIGGER IF EXISTS trg_notify_admin_new_noc_request ON public.noc_certificates;
CREATE TRIGGER trg_notify_admin_new_noc_request
AFTER INSERT ON public.noc_certificates
FOR EACH ROW EXECUTE FUNCTION public.notify_admin_new_noc_request();

DROP TRIGGER IF EXISTS trg_notify_admin_new_heir_request ON public.heir_certificates;
CREATE TRIGGER trg_notify_admin_new_heir_request
AFTER INSERT ON public.heir_certificates
FOR EACH ROW EXECUTE FUNCTION public.notify_admin_new_heir_request();

DROP TRIGGER IF EXISTS trg_notify_admin_new_cash_payment_request ON public.cash_payment_requests;
CREATE TRIGGER trg_notify_admin_new_cash_payment_request
AFTER INSERT ON public.cash_payment_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_admin_new_cash_payment_request();

DROP TRIGGER IF EXISTS trg_notify_admin_new_refund_request ON public.refund_requests;
CREATE TRIGGER trg_notify_admin_new_refund_request
AFTER INSERT ON public.refund_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_admin_new_refund_request();

DROP TRIGGER IF EXISTS trg_notify_admin_new_user ON public.pending_users;
CREATE TRIGGER trg_notify_admin_new_user
AFTER INSERT ON public.pending_users
FOR EACH ROW EXECUTE FUNCTION public.notify_admin_new_user();

-- updated_at maintenance on every public table that has the column
DO $$
DECLARE
  t RECORD;
BEGIN
  FOR t IN
    SELECT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables tb
      ON tb.table_schema = c.table_schema AND tb.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND c.column_name = 'updated_at'
      AND tb.table_type = 'BASE TABLE'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_set_updated_at ON public.%I', t.table_name);
    EXECUTE format(
      'CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()',
      t.table_name
    );
  END LOOP;
END $$;