begin;

grant select (id, first_name, last_name) on public.seller_applications to anon, authenticated;
drop policy if exists "Public can view approved seller profile fields" on public.seller_applications;
create policy "Public can view approved seller profile fields" on public.seller_applications
  for select to anon, authenticated using (status = 'approved');

create table if not exists public.buyer_addresses (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references auth.users(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text not null,
  lga text not null,
  community text not null,
  street_address text not null,
  landmark text not null default '',
  latitude double precision,
  longitude double precision,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  check ((latitude is null) = (longitude is null)),
  check (latitude is null or latitude between -90 and 90),
  check (longitude is null or longitude between -180 and 180)
);

create table if not exists public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references auth.users(id) on delete cascade,
  seller_id uuid not null references public.seller_applications(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (buyer_id, product_id),
  check (buyer_id <> seller_id)
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text,
  audio_path text,
  created_at timestamptz not null default now(),
  check (
    (nullif(btrim(body), '') is not null and audio_path is null)
    or (body is null and audio_path is not null)
  ),
  check (body is null or length(body) <= 4000)
);

create table if not exists public.chat_read_receipts (
  message_id uuid not null references public.chat_messages(id) on delete cascade,
  reader_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (message_id, reader_id)
);

create table if not exists public.delivery_settings (
  singleton boolean primary key default true check (singleton),
  doorstep_fee numeric(12, 2) not null default 0 check (doorstep_fee >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.pickup_stations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  lga text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.delivery_settings (singleton, doorstep_fee)
values (true, 0)
on conflict (singleton) do nothing;

insert into public.pickup_stations (id, name, address, lga)
values
  ('a9c435b2-9eab-4e7b-8f48-51504dd28201', 'Test Pickup Station — Ilorin West', 'Sample address — replace with a verified station address before launch.', 'Ilorin West'),
  ('a9c435b2-9eab-4e7b-8f48-51504dd28202', 'Test Pickup Station — Ilorin South', 'Sample address — replace with a verified station address before launch.', 'Ilorin South')
on conflict (id) do nothing;

create index if not exists buyer_addresses_owner_idx on public.buyer_addresses (buyer_id, is_default desc, created_at desc);
create index if not exists chat_conversations_buyer_idx on public.chat_conversations (buyer_id, created_at desc);
create index if not exists chat_conversations_seller_idx on public.chat_conversations (seller_id, created_at desc);
create index if not exists chat_messages_conversation_idx on public.chat_messages (conversation_id, created_at);
create index if not exists chat_read_receipts_reader_idx on public.chat_read_receipts (reader_id, message_id);
create index if not exists pickup_stations_active_idx on public.pickup_stations (is_active, lga);

alter table public.buyer_addresses enable row level security;
alter table public.chat_conversations enable row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_read_receipts enable row level security;
alter table public.delivery_settings enable row level security;
alter table public.pickup_stations enable row level security;

drop policy if exists "Buyers manage own delivery addresses" on public.buyer_addresses;
create policy "Buyers manage own delivery addresses" on public.buyer_addresses
  for all to authenticated using ((select auth.uid()) = buyer_id)
  with check ((select auth.uid()) = buyer_id);

drop policy if exists "Participants read conversations" on public.chat_conversations;
create policy "Participants read conversations" on public.chat_conversations
  for select to authenticated using (
    (select auth.uid()) = buyer_id or (select auth.uid()) = seller_id
  );
drop policy if exists "Buyers create product conversations" on public.chat_conversations;
create policy "Buyers create product conversations" on public.chat_conversations
  for insert to authenticated with check (
    (select auth.uid()) = buyer_id
    and exists (
      select 1 from public.products p
      where p.id = product_id and p.seller_id = seller_id and p.published
    )
    and exists (
      select 1 from public.public_seller_profiles s where s.id = seller_id
    )
  );

drop policy if exists "Participants read conversation messages" on public.chat_messages;
create policy "Participants read conversation messages" on public.chat_messages
  for select to authenticated using (
    exists (
      select 1 from public.chat_conversations c
      where c.id = conversation_id
        and ((select auth.uid()) = c.buyer_id or (select auth.uid()) = c.seller_id)
    )
  );
drop policy if exists "Participants send conversation messages" on public.chat_messages;
create policy "Participants send conversation messages" on public.chat_messages
  for insert to authenticated with check (
    (select auth.uid()) = sender_id
    and exists (
      select 1 from public.chat_conversations c
      where c.id = conversation_id
        and ((select auth.uid()) = c.buyer_id or (select auth.uid()) = c.seller_id)
    )
  );

drop policy if exists "Participants read message receipts" on public.chat_read_receipts;
create policy "Participants read message receipts" on public.chat_read_receipts
  for select to authenticated using (
    exists (
      select 1 from public.chat_messages m
      join public.chat_conversations c on c.id = m.conversation_id
      where m.id = message_id
        and ((select auth.uid()) = c.buyer_id or (select auth.uid()) = c.seller_id)
    )
  );
drop policy if exists "Recipients mark incoming messages read" on public.chat_read_receipts;
create policy "Recipients mark incoming messages read" on public.chat_read_receipts
  for insert to authenticated with check (
    (select auth.uid()) = reader_id
    and exists (
      select 1 from public.chat_messages m
      join public.chat_conversations c on c.id = m.conversation_id
      where m.id = message_id and m.sender_id <> (select auth.uid())
        and ((select auth.uid()) = c.buyer_id or (select auth.uid()) = c.seller_id)
    )
  );

drop policy if exists "Anyone can read delivery settings" on public.delivery_settings;
create policy "Anyone can read delivery settings" on public.delivery_settings
  for select to anon, authenticated using (singleton);
drop policy if exists "Anyone can read active pickup stations" on public.pickup_stations;
create policy "Anyone can read active pickup stations" on public.pickup_stations
  for select to anon, authenticated using (is_active);

grant select, insert, update, delete on public.buyer_addresses to authenticated;
grant select, insert on public.chat_conversations to authenticated;
grant select, insert on public.chat_messages to authenticated;
grant select, insert on public.chat_read_receipts to authenticated;
grant select on public.delivery_settings, public.pickup_stations to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('voice-notes', 'voice-notes', false, 26214400, array['audio/*'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Participants upload chat voice notes" on storage.objects;
create policy "Participants upload chat voice notes" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'voice-notes'
    and exists (
      select 1 from public.chat_conversations c
      where c.id::text = (storage.foldername(name))[1]
        and ((select auth.uid()) = c.buyer_id or (select auth.uid()) = c.seller_id)
    )
  );
drop policy if exists "Participants read chat voice notes" on storage.objects;
create policy "Participants read chat voice notes" on storage.objects
  for select to authenticated using (
    bucket_id = 'voice-notes'
    and exists (
      select 1 from public.chat_conversations c
      where c.id::text = (storage.foldername(name))[1]
        and ((select auth.uid()) = c.buyer_id or (select auth.uid()) = c.seller_id)
    )
  );

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'chat_messages'
  ) then
    alter publication supabase_realtime add table public.chat_messages;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'chat_read_receipts'
  ) then
    alter publication supabase_realtime add table public.chat_read_receipts;
  end if;
end
$$;

commit;
