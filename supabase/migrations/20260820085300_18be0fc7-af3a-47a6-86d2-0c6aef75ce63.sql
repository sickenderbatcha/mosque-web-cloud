create or replace function public.get_donation_receipt_number(_donation_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select i.receipt_number
  from public.income i
  where i.reference_id = _donation_id
    and i.reference_type = 'donation'
  order by i.created_at desc
  limit 1
$$;

grant execute on function public.get_donation_receipt_number(uuid) to anon, authenticated;