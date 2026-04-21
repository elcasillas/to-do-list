-- ============================================================
-- Migration 008: Add color column to profiles
-- Run in: https://supabase.com/dashboard/project/qnclwqjjurfpkwofqbhf/sql
-- ============================================================

-- Add color column with a sensible default.
-- Existing users get #3b82f6 (blue); admins can change it per user.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS color text NOT NULL DEFAULT '#3b82f6';
