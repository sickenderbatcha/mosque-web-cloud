-- Create trigger for mahal booking income on INSERT
CREATE TRIGGER trigger_add_booking_to_income_on_insert
AFTER INSERT ON public.mahal_bookings
FOR EACH ROW
EXECUTE FUNCTION public.add_booking_to_income_on_insert();

-- Create trigger for mahal booking income on UPDATE
CREATE TRIGGER trigger_add_booking_to_income_on_update
AFTER UPDATE ON public.mahal_bookings
FOR EACH ROW
EXECUTE FUNCTION public.add_booking_to_income();