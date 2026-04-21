-- ============================================================
-- Migration 006: Index cleanup
-- Run in: https://supabase.com/dashboard/project/qnclwqjjurfpkwofqbhf/sql
-- ============================================================

-- Add missing index on pending_invites.invited_by FK
-- (unindexed_foreign_keys — FK lookups without an index cause full table scans)
CREATE INDEX IF NOT EXISTS invites_invited_by_idx
  ON public.pending_invites (invited_by);

-- Drop unused indexes on profiles
-- (unused_index — Postgres uses sequential scans on this small table; indexes add
--  write overhead without query benefit until the table grows significantly)
DROP INDEX IF EXISTS public.profiles_email_idx;
DROP INDEX IF EXISTS public.profiles_status_idx;
