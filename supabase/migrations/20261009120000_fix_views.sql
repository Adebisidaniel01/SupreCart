-- Follow-up migration: replace views to use SECURITY INVOKER (safer for RLS)
begin;

create or replace view public.public_seller_profiles with (security_invoker = true) as
  select id, first_name, last_name
  from public.seller_applications
  where status = 'approved';

create or replace view public.seller_product_ratings with (security_invoker = true) as
  select product_id, seller_id, count(*)::integer as review_count, avg(rating)::numeric(3,2) as average_rating
  from public.reviews group by product_id, seller_id;

-- Ensure grants remain in place for anonymous/authenticated reads as intended
grant select on public.seller_product_ratings, public.public_seller_profiles to anon, authenticated;

commit;
