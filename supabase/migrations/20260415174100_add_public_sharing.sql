-- ============================================================
-- Migration: Add Public Note Sharing
-- Adds is_public field and RLS policy for anonymous access
-- ============================================================

-- 1. Add the is_public column (defaults to private)
ALTER TABLE public.notes
  ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT false;

-- 2. Partial index for efficient public note lookups
CREATE INDEX idx_notes_is_public
  ON public.notes(is_public)
  WHERE is_public = true;

-- 3. RLS Policy: anyone (anonymous or authenticated) can SELECT public notes
--    This coexists with the existing owner-only SELECT policy.
--    Supabase evaluates RLS policies as OR — if ANY policy matches, access is granted.
CREATE POLICY "Public notes are viewable by anyone"
  ON public.notes
  FOR SELECT
  TO anon, authenticated
  USING (is_public = true);
