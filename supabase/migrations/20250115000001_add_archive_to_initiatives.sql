-- Add archived and archived_at fields to initiatives table
ALTER TABLE public.initiatives
  ADD COLUMN archived boolean NOT NULL DEFAULT false,
  ADD COLUMN archived_at timestamptz;

-- Create index for better query performance when filtering archived initiatives
CREATE INDEX idx_initiatives_archived ON public.initiatives(archived);

