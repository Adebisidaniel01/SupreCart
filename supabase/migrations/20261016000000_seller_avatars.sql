-- Seller profile pictures: stored in object storage, only the owning seller can
-- change them, anyone can report them, and admins can remove policy violations.

-- ---------------------------------------------------------------------------
-- Admin flag
-- ---------------------------------------------------------------------------
create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.user_roles enable row level security;

drop policy if exists "Users read own role" on public.user_roles;
create policy "Users read own role" on public.user_roles
  for select to authenticated using ((select auth.uid()) = user_id);

grant select on public.user_roles to authenticated;
-- Admins are promoted out-of-band (Supabase dashboard / service role); the
-- admin policies below read this table through its self-only select policy, so
-- a normal user can never satisfy an admin check.

-- ---------------------------------------------------------------------------
-- Seller avatar metadata (the image itself lives in storage)
-- ---------------------------------------------------------------------------
create table if not exists public.seller_avatars (
  seller_id uuid primary key references public.seller_applications(id) on delete cascade,
  storage_path text not null,
  updated_at timestamptz not null default now()
);

alter table public.seller_avatars enable row level security;

-- Only the owning seller can create, change, or clear their own avatar.
drop policy if exists "Sellers manage own avatar" on public.seller_avatars;
create policy "Sellers manage own avatar" on public.seller_avatars
  for all to authenticated
  using ((select auth.uid()) = seller_id)
  with check ((select auth.uid()) = seller_id);

-- Avatars are public, so the storefront can resolve them for everyone.
drop policy if exists "Anyone reads seller avatars" on public.seller_avatars;
create policy "Anyone reads seller avatars" on public.seller_avatars
  for select to anon, authenticated using (true);

-- Admins can remove any avatar record that breaks policy.
drop policy if exists "Admins remove any seller avatar" on public.seller_avatars;
create policy "Admins remove any seller avatar" on public.seller_avatars
  for delete to authenticated using (
    exists (
      select 1 from public.user_roles r
      where r.user_id = (select auth.uid()) and r.is_admin
    )
  );

grant select on public.seller_avatars to anon, authenticated;
grant select, insert, update, delete on public.seller_avatars to authenticated;

-- ---------------------------------------------------------------------------
-- Avatar reports
-- ---------------------------------------------------------------------------
create table if not exists public.seller_avatar_reports (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.seller_applications(id) on delete cascade,
  reporter_id uuid references auth.users(id) on delete set null,
  reason text not null,
  details text not null default '',
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz not null default now()
);

create index if not exists seller_avatar_reports_seller_idx
  on public.seller_avatar_reports (seller_id, status);

alter table public.seller_avatar_reports enable row level security;

-- Anyone (signed in or not) can file a report; the reporter cannot claim to be
-- someone else.
drop policy if exists "Anyone can report an avatar" on public.seller_avatar_reports;
create policy "Anyone can report an avatar" on public.seller_avatar_reports
  for insert to anon, authenticated
  with check (reporter_id is null or reporter_id = (select auth.uid()));

drop policy if exists "Admins read avatar reports" on public.seller_avatar_reports;
create policy "Admins read avatar reports" on public.seller_avatar_reports
  for select to authenticated using (
    exists (
      select 1 from public.user_roles r
      where r.user_id = (select auth.uid()) and r.is_admin
    )
  );

drop policy if exists "Admins update avatar reports" on public.seller_avatar_reports;
create policy "Admins update avatar reports" on public.seller_avatar_reports
  for update to authenticated
  using (
    exists (
      select 1 from public.user_roles r
      where r.user_id = (select auth.uid()) and r.is_admin
    )
  )
  with check (
    exists (
      select 1 from public.user_roles r
      where r.user_id = (select auth.uid()) and r.is_admin
    )
  );

grant insert on public.seller_avatar_reports to anon, authenticated;
grant select, update on public.seller_avatar_reports to authenticated;

-- ---------------------------------------------------------------------------
-- Storage bucket + object policies
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'seller-avatars',
  'seller-avatars',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Writes are scoped to the seller's own folder (folder[1] = auth.uid()::text).
drop policy if exists "Sellers upload own avatar" on storage.objects;
create policy "Sellers upload own avatar" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'seller-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Sellers update own avatar" on storage.objects;
create policy "Sellers update own avatar" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'seller-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'seller-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Sellers delete own avatar" on storage.objects;
create policy "Sellers delete own avatar" on storage.objects
  for delete to authenticated using (
    bucket_id = 'seller-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Public read seller avatars" on storage.objects;
create policy "Public read seller avatars" on storage.objects
  for select to anon, authenticated using (bucket_id = 'seller-avatars');

drop policy if exists "Admins remove any seller avatar object" on storage.objects;
create policy "Admins remove any seller avatar object" on storage.objects
  for delete to authenticated using (
    bucket_id = 'seller-avatars'
    and exists (
      select 1 from public.user_roles r
      where r.user_id = (select auth.uid()) and r.is_admin
    )
  );

-- ---------------------------------------------------------------------------
-- Expose the avatar path on the public seller profiles view
-- ---------------------------------------------------------------------------
drop view if exists public.public_seller_profiles;
create or replace view public.public_seller_profiles with (security_invoker = true) as
  select
    a.id,
    a.first_name,
    a.last_name,
    a.verified,
    v.storage_path as avatar_path
  from public.seller_applications a
  left join public.seller_avatars v on v.seller_id = a.id
  where a.status = 'approved';

grant select on public.public_seller_profiles to anon, authenticated;
