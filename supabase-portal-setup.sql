-- Occu-Med Master Portal Supabase setup
-- Run this in Supabase SQL Editor for the project connected to Render.

create extension if not exists pgcrypto;

create table if not exists public.portal_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  role text not null default 'User' check (role in ('Admin', 'User')),
  permissions text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.portal_settings (
  id integer primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.portal_settings (id, data, updated_at)
values (1, '{}'::jsonb, now())
on conflict (id) do nothing;

create or replace function public.is_portal_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.portal_users
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and role = 'Admin'
  );
$$;

alter table public.portal_users enable row level security;
alter table public.portal_settings enable row level security;

drop policy if exists "Portal users can read own record" on public.portal_users;
create policy "Portal users can read own record"
on public.portal_users
for select
to authenticated
using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')) or public.is_portal_admin());

drop policy if exists "Portal admins can insert users" on public.portal_users;
create policy "Portal admins can insert users"
on public.portal_users
for insert
to authenticated
with check (public.is_portal_admin());

drop policy if exists "Portal admins can update users" on public.portal_users;
create policy "Portal admins can update users"
on public.portal_users
for update
to authenticated
using (public.is_portal_admin())
with check (public.is_portal_admin());

drop policy if exists "Portal admins can delete users" on public.portal_users;
create policy "Portal admins can delete users"
on public.portal_users
for delete
to authenticated
using (public.is_portal_admin());

drop policy if exists "Signed in portal users can read settings" on public.portal_settings;
create policy "Signed in portal users can read settings"
on public.portal_settings
for select
to authenticated
using (
  exists (
    select 1
    from public.portal_users
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
);

drop policy if exists "Portal admins can save settings" on public.portal_settings;
create policy "Portal admins can save settings"
on public.portal_settings
for all
to authenticated
using (public.is_portal_admin())
with check (public.is_portal_admin());

-- IMPORTANT FIRST ADMIN STEP:
-- After creating your own user through Supabase Auth, run this once, replacing the email.
-- insert into public.portal_users (email, role, permissions)
-- values ('your-admin-email@occu-med.com', 'Admin', array['leadership','exam_qa','scheduling','harvesting','sme','operations','new','network','shared','admin'])
-- on conflict (email) do update
-- set role = 'Admin',
--     permissions = excluded.permissions,
--     updated_at = now();
