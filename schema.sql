-- ============================================================
-- To Do List App — Supabase Schema
-- Run this in: https://supabase.com/dashboard/project/qnclwqjjurfpkwofqbhf/sql
-- ============================================================

-- Groups table
create table if not exists public.groups (
  id          text primary key,
  name        text not null,
  color       text not null default '#3b82f6',
  collapsed   boolean not null default false,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

-- Tasks table
create table if not exists public.tasks (
  id              text primary key,
  title           text not null,
  owner_name      text,
  owner_initials  text,
  owner_color     text,
  owner_avatar    text,
  status          text not null default 'not_started'
                    check (status in ('not_started','working','done','stuck')),
  due_date        text,
  priority        text not null default 'medium'
                    check (priority in ('low','medium','high','urgent')),
  notes           text default '',
  completed       boolean not null default false,
  group_id        text not null references public.groups(id) on delete cascade,
  sort_order      integer not null default 0,
  created_at      text not null,
  updated_at      text not null
);

-- Row Level Security
alter table public.groups enable row level security;
alter table public.tasks  enable row level security;

-- Allow full anonymous access (no login required)
create policy "anon_all" on public.groups
  for all to anon using (true) with check (true);

create policy "anon_all" on public.tasks
  for all to anon using (true) with check (true);

-- Indexes for common queries
create index if not exists tasks_group_id_idx on public.tasks(group_id);
create index if not exists tasks_sort_order_idx on public.tasks(sort_order);
create index if not exists groups_sort_order_idx on public.groups(sort_order);

-- ── Task Updates table ────────────────────────────────────────
create table if not exists public.task_updates (
  id              text primary key,
  task_id         text not null references public.tasks(id) on delete cascade,
  author_name     text not null default '',
  author_initials text not null default '',
  author_color    text not null default '#64748b',
  content         text not null,
  created_at      text not null,
  updated_at      text not null
);

alter table public.task_updates enable row level security;

create policy "anon_all" on public.task_updates
  for all to anon using (true) with check (true);

create index if not exists task_updates_task_id_idx  on public.task_updates(task_id);
create index if not exists task_updates_created_at_idx on public.task_updates(created_at);
