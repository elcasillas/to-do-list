-- ============================================================
-- Migration 002: Profiles, Pending Invites & Auth Policies
-- Run AFTER schema.sql in the Supabase SQL editor:
-- https://supabase.com/dashboard/project/qnclwqjjurfpkwofqbhf/sql
-- ============================================================

-- ── Helper: admin check (security definer avoids RLS recursion) ──
create or replace function public.is_admin()
returns boolean
language sql security definer stable
as $$
  select coalesce(
    (select role = 'admin' from public.profiles where id = auth.uid()),
    false
  );
$$;

-- ── Profiles table ─────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  full_name   text not null default '',
  email       text not null default '',
  avatar_url  text,
  role        text not null default 'member'
                check (role in ('admin', 'manager', 'member')),
  status      text not null default 'active'
                check (status in ('active', 'invited', 'disabled')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- All authenticated users can read all profiles (needed for task ownership display)
create policy "profiles_select"
  on public.profiles for select
  to authenticated using (true);

-- Users can update their own name / avatar
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using  (auth.uid() = id)
  with check (auth.uid() = id);

-- Admins can update anyone (role, status, name)
create policy "profiles_update_admin"
  on public.profiles for update
  to authenticated
  using  (public.is_admin())
  with check (public.is_admin());

-- Only admins can delete a profile (cascades to auth.users via FK)
create policy "profiles_delete_admin"
  on public.profiles for delete
  to authenticated using (public.is_admin());

-- Profile auto-stamping trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- ── Pending invites table ──────────────────────────────────────
-- Tracks invites sent before the user has created an account.
-- When the invited email signs up, a trigger claims the role and deletes the invite.
create table if not exists public.pending_invites (
  id          uuid primary key default gen_random_uuid(),
  email       text not null unique,
  full_name   text not null default '',
  role        text not null default 'member'
                check (role in ('admin', 'manager', 'member')),
  invited_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

alter table public.pending_invites enable row level security;

-- All authenticated users can read invites (admin UI needs to list them)
create policy "invites_select"
  on public.pending_invites for select
  to authenticated using (true);

-- Only admins can create / cancel invites
create policy "invites_admin"
  on public.pending_invites for all
  to authenticated
  using  (public.is_admin())
  with check (public.is_admin());

-- ── Extend existing table policies for authenticated users ─────
-- Existing anon_all policies remain intact so the app keeps working.
-- We add parallel authenticated policies so logged-in users also pass RLS.
do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'groups' and policyname = 'auth_all'
  ) then
    create policy "auth_all" on public.groups
      for all to authenticated using (true) with check (true);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'tasks' and policyname = 'auth_all'
  ) then
    create policy "auth_all" on public.tasks
      for all to authenticated using (true) with check (true);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'task_updates' and policyname = 'auth_all'
  ) then
    create policy "auth_all" on public.task_updates
      for all to authenticated using (true) with check (true);
  end if;
end $$;

-- ── Auto-create profile on signup ─────────────────────────────
-- Security definer so it runs as the function owner (bypasses RLS).
-- Logic:
--   1. If the signing-up email matches a pending invite, claim that role.
--   2. If no admins exist yet, make this user admin (bootstrap).
--   3. Otherwise default to 'member'.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
as $$
declare
  v_invite   public.pending_invites%rowtype;
  v_role     text := 'member';
  v_admin_ct integer;
begin
  -- Check pending invite
  select * into v_invite
    from public.pending_invites
   where lower(email) = lower(new.email)
   limit 1;

  if found then
    v_role := v_invite.role;
    delete from public.pending_invites where id = v_invite.id;
  end if;

  -- Bootstrap: first user ever becomes admin
  select count(*) into v_admin_ct from public.profiles where role = 'admin';
  if v_admin_ct = 0 then
    v_role := 'admin';
  end if;

  insert into public.profiles (id, email, full_name, role, status)
  values (
    new.id,
    new.email,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
      split_part(new.email, '@', 1)
    ),
    v_role,
    'active'
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Indexes ────────────────────────────────────────────────────
create index if not exists profiles_email_idx  on public.profiles(lower(email));
create index if not exists profiles_role_idx   on public.profiles(role);
create index if not exists profiles_status_idx on public.profiles(status);
create index if not exists invites_email_idx   on public.pending_invites(lower(email));
