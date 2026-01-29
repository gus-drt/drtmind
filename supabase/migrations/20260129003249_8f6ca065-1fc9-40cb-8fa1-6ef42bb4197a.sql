-- Add pinned column to notes table
ALTER TABLE public.notes ADD COLUMN pinned BOOLEAN NOT NULL DEFAULT FALSE;

-- Add pinned_at column to track when note was pinned (for ordering)
ALTER TABLE public.notes ADD COLUMN pinned_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster queries on pinned notes
CREATE INDEX idx_notes_pinned ON public.notes(user_id, pinned, pinned_at DESC);