-- Add closed_at column to features table
-- This field tracks when a feature was closed (moved to Done or Cancelled column)
-- The field is updated each time a feature is moved to these columns

ALTER TABLE public.features
  ADD COLUMN closed_at timestamptz;

-- Add comment for documentation
COMMENT ON COLUMN public.features.closed_at IS 'Timestamp when the feature was closed (moved to Done or Cancelled column). Updated on each move to these columns.';
