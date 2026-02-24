-- Enable realtime for key admin tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mahal_bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pending_users;
ALTER PUBLICATION supabase_realtime ADD TABLE public.donations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.subscriptions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.gb_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.grievances;
ALTER PUBLICATION supabase_realtime ADD TABLE public.noc_certificates;
ALTER PUBLICATION supabase_realtime ADD TABLE public.refund_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.income;
ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.certificate_payments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.marriage_registers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.death_registers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.subscription_slots;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;