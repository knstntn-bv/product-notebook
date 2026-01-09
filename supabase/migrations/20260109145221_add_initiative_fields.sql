-- Add target_metric_id and priority fields to initiatives table
-- ESS-63: Указание целевой метрики для инициативы
-- NEW: Возможность указать порядок инициатив

-- Add target_metric_id field (nullable, FK to metrics.id)
ALTER TABLE public.initiatives 
  ADD COLUMN target_metric_id uuid REFERENCES public.metrics(id) ON DELETE SET NULL;

-- Add priority field (integer, NOT NULL, DEFAULT 3)
ALTER TABLE public.initiatives 
  ADD COLUMN priority integer NOT NULL DEFAULT 3;

-- Update existing records to set priority = 3 (for records that might have NULL)
UPDATE public.initiatives 
SET priority = 3 
WHERE priority IS NULL;

