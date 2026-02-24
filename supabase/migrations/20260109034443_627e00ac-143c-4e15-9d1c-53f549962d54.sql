-- Add page number field for physical marriage register
ALTER TABLE public.marriage_registers 
ADD COLUMN register_page_number text;