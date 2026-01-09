-- Add hypothesis_id column to features table
-- NNN-65: Привязка фичи к гипотезе - в обе стороны
--
-- This migration adds a many-to-one relationship between features and hypotheses.
-- A feature can optionally reference a hypothesis (many features can reference one hypothesis).

-- Add hypothesis_id column (nullable, FK to hypotheses.id)
ALTER TABLE public.features
  ADD COLUMN hypothesis_id uuid REFERENCES public.hypotheses(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX idx_features_hypothesis_id ON public.features(hypothesis_id);

-- Add comment for documentation
COMMENT ON COLUMN public.features.hypothesis_id IS 'Optional reference to the hypothesis this feature is linked to (many-to-one relationship)';
