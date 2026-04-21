-- ============================================================
-- Migration 007: Drop unused invites_invited_by_idx
-- Run in: https://supabase.com/dashboard/project/qnclwqjjurfpkwofqbhf/sql
-- ============================================================

-- pending_invites is a small table; Postgres prefers sequential scans
-- and the index adds write overhead without benefiting any query.
DROP INDEX IF EXISTS public.invites_invited_by_idx;
