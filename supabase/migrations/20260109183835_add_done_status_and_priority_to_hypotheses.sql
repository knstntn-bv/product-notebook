-- Add new status "done" and priority field to hypotheses table
-- This migration implements:
-- 1. ESS-62: Add "done" status to the status enum
-- 2. NEW: Add priority field for hypothesis prioritization

-- Step 1: Add new status "done" to the CHECK constraint
-- First, drop the existing constraint
ALTER TABLE public.hypotheses 
  DROP CONSTRAINT IF EXISTS hypotheses_status_check;

-- Add the new constraint with "done" status included
ALTER TABLE public.hypotheses 
  ADD CONSTRAINT hypotheses_status_check 
  CHECK (status IN ('new', 'inProgress', 'accepted', 'done', 'rejected'));

-- Step 2: Add priority field to hypotheses table
ALTER TABLE public.hypotheses 
  ADD COLUMN priority integer NOT NULL DEFAULT 3;

-- Update existing records to ensure they all have priority = 3
-- (This is a safety measure, as DEFAULT should handle new records)
UPDATE public.hypotheses 
SET priority = 3 
WHERE priority IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.hypotheses.priority IS 'Priority of the hypothesis (numeric, default 3). Lower numbers indicate higher priority.';
COMMENT ON COLUMN public.hypotheses.status IS 'Status of the hypothesis: new, inProgress, accepted, done, rejected';
