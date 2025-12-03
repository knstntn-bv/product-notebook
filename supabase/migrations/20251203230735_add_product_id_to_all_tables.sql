-- Add product_id column to all existing tables
-- This column is nullable initially to allow gradual data migration
-- After data migration, it will be set to NOT NULL

-- Add product_id to product_formulas
ALTER TABLE public.product_formulas
ADD COLUMN product_id uuid REFERENCES public.products(id) ON DELETE CASCADE;

CREATE INDEX idx_product_formulas_product_id ON public.product_formulas(product_id);

-- Add product_id to values
ALTER TABLE public.values
ADD COLUMN product_id uuid REFERENCES public.products(id) ON DELETE CASCADE;

CREATE INDEX idx_values_product_id ON public.values(product_id);

-- Add product_id to metrics
ALTER TABLE public.metrics
ADD COLUMN product_id uuid REFERENCES public.products(id) ON DELETE CASCADE;

CREATE INDEX idx_metrics_product_id ON public.metrics(product_id);

-- Add product_id to initiatives
ALTER TABLE public.initiatives
ADD COLUMN product_id uuid REFERENCES public.products(id) ON DELETE CASCADE;

CREATE INDEX idx_initiatives_product_id ON public.initiatives(product_id);

-- Add product_id to goals
ALTER TABLE public.goals
ADD COLUMN product_id uuid REFERENCES public.products(id) ON DELETE CASCADE;

CREATE INDEX idx_goals_product_id ON public.goals(product_id);

-- Add product_id to hypotheses
ALTER TABLE public.hypotheses
ADD COLUMN product_id uuid REFERENCES public.products(id) ON DELETE CASCADE;

CREATE INDEX idx_hypotheses_product_id ON public.hypotheses(product_id);

-- Add product_id to features
ALTER TABLE public.features
ADD COLUMN product_id uuid REFERENCES public.products(id) ON DELETE CASCADE;

CREATE INDEX idx_features_product_id ON public.features(product_id);

-- Add product_id to project_settings
ALTER TABLE public.project_settings
ADD COLUMN product_id uuid REFERENCES public.products(id) ON DELETE CASCADE;

CREATE INDEX idx_project_settings_product_id ON public.project_settings(product_id);

