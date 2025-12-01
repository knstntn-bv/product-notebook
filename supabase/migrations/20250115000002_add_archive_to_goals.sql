-- Add archived and archived_at fields to goals table
ALTER TABLE public.goals
  ADD COLUMN archived boolean NOT NULL DEFAULT false,
  ADD COLUMN archived_at timestamptz;

-- Create index for better query performance when filtering archived goals
CREATE INDEX idx_goals_archived ON public.goals(archived);

