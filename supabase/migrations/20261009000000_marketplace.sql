create extension if not exists pgcrypto;

create table if not exists public.buyer_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null,
  middle_name text,
  last_name text not null,
  phone text,
  created_at timestamptz not null default now()
);

create table if not exists public.seller_applications (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null,
  middle_name text,
  last_name text not null,
  email text not null,
  product_description text not null,
  bank_name text not null,
  bank_account_number text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create or replace function public.create_buyer_profile_from_signup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.raw_user_meta_data ->> 'role' = 'buyer' then
    insert into public.buyer_profiles (id, first_name, middle_name, last_name, phone)
    values (
      new.id,
      coalesce(new.raw_user_meta_data ->> 'first_name', ''),
      nullif(new.raw_user_meta_data ->> 'middle_name', ''),
      coalesce(new.raw_user_meta_data ->> 'last_name', ''),
      nullif(new.raw_user_meta_data ->> 'phone', '')
    )
    on conflict (id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists create_buyer_profile_after_signup on auth.users;
create trigger create_buyer_profile_after_signup
  after insert on auth.users
  for each row execute function public.create_buyer_profile_from_signup();

create table if not exists public.seller_documents (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.seller_applications(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.seller_applications(id) on delete cascade,
  name text not null,
  category text not null,
  description text not null,
  price numeric(12, 2) not null check (price > 0),
  inventory integer not null default 1 check (inventory >= 0),
  image_path text not null,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  unique (id, seller_id)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references auth.users(id),
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded')),
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null,
  seller_id uuid not null references public.seller_applications(id),
  quantity integer not null check (quantity > 0),
  unit_price numeric(12, 2) not null check (unit_price > 0),
  platform_fee numeric(12, 2) not null default 0 check (platform_fee >= 0),
  tax_amount numeric(12, 2) not null default 0 check (tax_amount >= 0),
  delivery_fee numeric(12, 2) not null default 0 check (delivery_fee >= 0),
  seller_net numeric(12, 2) not null check (seller_net >= 0),
  created_at timestamptz not null default now(),
  foreign key (product_id, seller_id) references public.products (id, seller_id),
  check (seller_net + platform_fee + tax_amount + delivery_fee <= unit_price * quantity)
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null unique references public.order_items(id) on delete cascade,
  buyer_id uuid not null references auth.users(id),
  seller_id uuid not null references public.seller_applications(id),
  product_id uuid not null references public.products(id),
  rating integer not null check (rating between 1 and 5),
  comment text not null default '',
  created_at timestamptz not null default now(),
  foreign key (product_id, seller_id) references public.products (id, seller_id)
);

create table if not exists public.payout_requests (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.seller_applications(id),
  amount numeric(12, 2) not null check (amount > 0),
  status text not null default 'requested'
    check (status in ('requested', 'approved', 'processing', 'paid', 'rejected')),
  created_at timestamptz not null default now()
);

create index if not exists products_public_idx on public.products (created_at desc) where published;
create index if not exists order_items_seller_idx on public.order_items (seller_id);
create index if not exists reviews_seller_product_idx on public.reviews (seller_id, product_id);
create index if not exists payout_requests_seller_idx on public.payout_requests (seller_id, status);

create or replace view public.public_seller_profiles with (security_invoker = true) as
  select id, first_name, last_name
  from public.seller_applications
  where status = 'approved';

alter table public.buyer_profiles enable row level security;
alter table public.seller_applications enable row level security;
alter table public.seller_documents enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.reviews enable row level security;
alter table public.payout_requests enable row level security;

drop policy if exists "Buyers manage own profile" on public.buyer_profiles;
create policy "Buyers manage own profile" on public.buyer_profiles
  for all to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
drop policy if exists "Sellers read own application" on public.seller_applications;
create policy "Sellers read own application" on public.seller_applications
  for select to authenticated using ((select auth.uid()) = id);
drop policy if exists "Sellers submit own application" on public.seller_applications;
create policy "Sellers submit own application" on public.seller_applications
  for insert to authenticated with check ((select auth.uid()) = id and status = 'pending');
drop policy if exists "Sellers update own pending application" on public.seller_applications;
create policy "Sellers update own pending application" on public.seller_applications
  for update to authenticated using ((select auth.uid()) = id and status = 'pending')
  with check ((select auth.uid()) = id and status = 'pending');
drop policy if exists "Sellers manage own documents" on public.seller_documents;
create policy "Sellers manage own documents" on public.seller_documents
  for all to authenticated using ((select auth.uid()) = seller_id)
  with check ((select auth.uid()) = seller_id);
drop policy if exists "Anyone can view published products" on public.products;
create policy "Anyone can view published products" on public.products
  for select to anon, authenticated using (
    published and exists (
      select 1 from public.public_seller_profiles s where s.id = seller_id
    )
  );
drop policy if exists "Approved sellers manage own products" on public.products;
create policy "Approved sellers manage own products" on public.products
  for all to authenticated using (
    (select auth.uid()) = seller_id and exists (
      select 1 from public.seller_applications s where s.id = seller_id and s.status = 'approved'
    )
  ) with check (
    (select auth.uid()) = seller_id and exists (
      select 1 from public.seller_applications s where s.id = seller_id and s.status = 'approved'
    )
  );
drop policy if exists "Buyers read own orders" on public.orders;
create policy "Buyers read own orders" on public.orders
  for select to authenticated using ((select auth.uid()) = buyer_id);
drop policy if exists "Sellers read orders with their items" on public.orders;
create policy "Sellers read orders with their items" on public.orders
  for select to authenticated using (
  exists (select 1 from public.order_items i where i.order_id = orders.id and i.seller_id = (select auth.uid()))
  );
drop policy if exists "Sellers read own order items" on public.order_items;
create policy "Sellers read own order items" on public.order_items
  for select to authenticated using ((select auth.uid()) = seller_id);
drop policy if exists "Sellers read reviews for their products" on public.reviews;
create policy "Sellers read reviews for their products" on public.reviews
  for select to authenticated using ((select auth.uid()) = seller_id);
drop policy if exists "Buyers submit review for own delivered item" on public.reviews;
create policy "Buyers submit review for own delivered item" on public.reviews
  for insert to authenticated with check (
    (select auth.uid()) = buyer_id
    and exists (
      select 1 from public.orders o join public.order_items i on i.order_id = o.id
      where i.id = order_item_id and o.buyer_id = (select auth.uid())
        and i.seller_id = reviews.seller_id
        and i.product_id = reviews.product_id
        and o.status = 'delivered'
    )
  );
drop policy if exists "Sellers read own payout requests" on public.payout_requests;
create policy "Sellers read own payout requests" on public.payout_requests
  for select to authenticated using ((select auth.uid()) = seller_id);

create or replace view public.seller_product_ratings with (security_invoker = true) as
  select product_id, seller_id, count(*)::integer as review_count, avg(rating)::numeric(3,2) as average_rating
  from public.reviews group by product_id, seller_id;

create or replace function public.request_seller_payout(requested_amount numeric)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_seller uuid := auth.uid();
  available_balance numeric(12,2);
  payout_id uuid;
begin
  if current_seller is null or requested_amount <= 0 then
    raise exception 'Sign in and enter a valid payout amount.';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(current_seller::text, 0));
  select
    coalesce((select sum(i.seller_net)
      from public.order_items i join public.orders o on o.id = i.order_id
      where i.seller_id = current_seller and o.status = 'delivered'), 0)
    - coalesce((select sum(p.amount) from public.payout_requests p
      where p.seller_id = current_seller and p.status in ('requested', 'approved', 'processing', 'paid')), 0)
  into available_balance;
  if requested_amount > available_balance then
    raise exception 'The requested amount exceeds your available balance.';
  end if;
  insert into public.payout_requests (seller_id, amount)
    values (current_seller, requested_amount) returning id into payout_id;
  return payout_id;
end;
$$;

grant select on public.seller_product_ratings, public.public_seller_profiles to anon, authenticated;
grant select, insert, update on public.buyer_profiles to authenticated;
grant select, insert, update on public.seller_applications to authenticated;
grant select, insert on public.seller_documents to authenticated;
grant select, insert, update, delete on public.products to authenticated;
grant select on public.products to anon;
grant select on public.orders to authenticated;
grant select on public.order_items to authenticated;
grant select, insert on public.reviews to authenticated;
grant select on public.reviews to anon;
grant select on public.payout_requests to authenticated;
revoke all on function public.request_seller_payout(numeric) from public;
grant execute on function public.request_seller_payout(numeric) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('seller-documents', 'seller-documents', false, 10485760, array['image/jpeg','image/png','application/pdf']),
  ('product-images', 'product-images', true, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

drop policy if exists "Sellers upload their own application docs" on storage.objects;
create policy "Sellers upload their own application docs" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'seller-documents' and (storage.foldername(name))[1] = (select auth.uid())::text
  );
drop policy if exists "Sellers read their own application docs" on storage.objects;
create policy "Sellers read their own application docs" on storage.objects
  for select to authenticated using (
    bucket_id = 'seller-documents' and (storage.foldername(name))[1] = (select auth.uid())::text
  );
drop policy if exists "Approved sellers upload product images" on storage.objects;
create policy "Approved sellers upload product images" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'product-images' and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (select 1 from public.seller_applications s where s.id = (select auth.uid()) and s.status = 'approved')
  );
drop policy if exists "Public can read product images" on storage.objects;
create policy "Public can read product images" on storage.objects
  for select to anon, authenticated using (bucket_id = 'product-images');
