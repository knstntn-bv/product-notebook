-- Add human_readable_id column to features table
ALTER TABLE public.features
  ADD COLUMN human_readable_id text;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_features_human_readable_id ON public.features(user_id, human_readable_id);

