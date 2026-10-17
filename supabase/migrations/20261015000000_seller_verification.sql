alter table public.seller_applications
  add column if not exists verified boolean not null default false;

drop view if exists public.public_seller_profiles;
create or replace view public.public_seller_profiles with (security_invoker = true) as
  select id, first_name, last_name, verified
  from public.seller_applications
  where status = 'approved';

grant select on public.public_seller_profiles to anon, authenticated;
