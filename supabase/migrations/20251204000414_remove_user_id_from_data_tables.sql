-- Remove user_id columns from all data tables (Stage 8)
-- This is the final step of migration to products entity
-- After this migration, all data tables will only use product_id

-- ============================================================================
-- STEP 1: Ensure product_id is NOT NULL in all tables
-- ============================================================================

-- First, verify that all records have product_id (should be done in stage 2)
-- Then set product_id to NOT NULL

ALTER TABLE public.product_formulas
  ALTER COLUMN product_id SET NOT NULL;

ALTER TABLE public.values
  ALTER COLUMN product_id SET NOT NULL;

ALTER TABLE public.metrics
  ALTER COLUMN product_id SET NOT NULL;

ALTER TABLE public.initiatives
  ALTER COLUMN product_id SET NOT NULL;

ALTER TABLE public.goals
  ALTER COLUMN product_id SET NOT NULL;

ALTER TABLE public.hypotheses
  ALTER COLUMN product_id SET NOT NULL;

ALTER TABLE public.features
  ALTER COLUMN product_id SET NOT NULL;

ALTER TABLE public.project_settings
  ALTER COLUMN product_id SET NOT NULL;

-- ============================================================================
-- STEP 2: Drop foreign key constraints on auth.users
-- ============================================================================

-- Drop foreign keys from all data tables
ALTER TABLE public.product_formulas
  DROP CONSTRAINT IF EXISTS product_formulas_user_id_fkey;

ALTER TABLE public.values
  DROP CONSTRAINT IF EXISTS values_user_id_fkey;

ALTER TABLE public.metrics
  DROP CONSTRAINT IF EXISTS metrics_user_id_fkey;

ALTER TABLE public.initiatives
  DROP CONSTRAINT IF EXISTS initiatives_user_id_fkey;

ALTER TABLE public.goals
  DROP CONSTRAINT IF EXISTS goals_user_id_fkey;

ALTER TABLE public.hypotheses
  DROP CONSTRAINT IF EXISTS hypotheses_user_id_fkey;

ALTER TABLE public.features
  DROP CONSTRAINT IF EXISTS features_user_id_fkey;

ALTER TABLE public.project_settings
  DROP CONSTRAINT IF EXISTS project_settings_user_id_fkey;

-- ============================================================================
-- STEP 3: Drop indexes that use user_id
-- ============================================================================

-- Drop index on features that uses user_id
DROP INDEX IF EXISTS public.idx_features_human_readable_id;

-- ============================================================================
-- STEP 4: Drop UNIQUE constraint on project_settings.user_id
-- ============================================================================

-- Remove UNIQUE constraint from project_settings.user_id
ALTER TABLE public.project_settings
  DROP CONSTRAINT IF EXISTS project_settings_user_id_key;

-- ============================================================================
-- STEP 5: Update ALL RLS policies to remove user_id checks
-- ============================================================================

-- Drop ALL existing policies that might reference user_id
-- We need to drop and recreate all policies to remove user_id dependency

-- Drop all policies for product_formulas
DROP POLICY IF EXISTS "Users can view their own product formulas" ON public.product_formulas;
DROP POLICY IF EXISTS "Users can insert their own product formulas" ON public.product_formulas;
DROP POLICY IF EXISTS "Users can update their own product formulas" ON public.product_formulas;
DROP POLICY IF EXISTS "Users can delete their own product formulas" ON public.product_formulas;

-- Drop all policies for values
DROP POLICY IF EXISTS "Users can view their own values" ON public.values;
DROP POLICY IF EXISTS "Users can insert their own values" ON public.values;
DROP POLICY IF EXISTS "Users can update their own values" ON public.values;
DROP POLICY IF EXISTS "Users can delete their own values" ON public.values;

-- Drop all policies for metrics
DROP POLICY IF EXISTS "Users can view their own metrics" ON public.metrics;
DROP POLICY IF EXISTS "Users can insert their own metrics" ON public.metrics;
DROP POLICY IF EXISTS "Users can update their own metrics" ON public.metrics;
DROP POLICY IF EXISTS "Users can delete their own metrics" ON public.metrics;

-- Drop all policies for initiatives
DROP POLICY IF EXISTS "Users can view their own initiatives" ON public.initiatives;
DROP POLICY IF EXISTS "Users can insert their own initiatives" ON public.initiatives;
DROP POLICY IF EXISTS "Users can update their own initiatives" ON public.initiatives;
DROP POLICY IF EXISTS "Users can delete their own initiatives" ON public.initiatives;

-- Drop all policies for goals
DROP POLICY IF EXISTS "Users can view their own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can insert their own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can update their own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can delete their own goals" ON public.goals;

-- Drop all policies for hypotheses
DROP POLICY IF EXISTS "Users can view their own hypotheses" ON public.hypotheses;
DROP POLICY IF EXISTS "Users can insert their own hypotheses" ON public.hypotheses;
DROP POLICY IF EXISTS "Users can update their own hypotheses" ON public.hypotheses;
DROP POLICY IF EXISTS "Users can delete their own hypotheses" ON public.hypotheses;

-- Drop all policies for features
DROP POLICY IF EXISTS "Users can view their own features" ON public.features;
DROP POLICY IF EXISTS "Users can insert their own features" ON public.features;
DROP POLICY IF EXISTS "Users can update their own features" ON public.features;
DROP POLICY IF EXISTS "Users can delete their own features" ON public.features;

-- Drop all policies for project_settings
DROP POLICY IF EXISTS "Users can manage their own project settings" ON public.project_settings;

-- Recreate all policies WITHOUT user_id checks
-- ============================================================================
-- PRODUCT_FORMULAS POLICIES
-- ============================================================================

CREATE POLICY "Users can view their own product formulas"
  ON public.product_formulas FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = product_formulas.product_id
      AND products.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own product formulas"
  ON public.product_formulas FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = product_formulas.product_id
      AND products.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own product formulas"
  ON public.product_formulas FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = product_formulas.product_id
      AND products.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own product formulas"
  ON public.product_formulas FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = product_formulas.product_id
      AND products.user_id = auth.uid()
    )
  );

-- ============================================================================
-- VALUES POLICIES
-- ============================================================================

CREATE POLICY "Users can view their own values"
  ON public.values FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = values.product_id
      AND products.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own values"
  ON public.values FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = values.product_id
      AND products.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own values"
  ON public.values FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = values.product_id
      AND products.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own values"
  ON public.values FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = values.product_id
      AND products.user_id = auth.uid()
    )
  );

-- ============================================================================
-- METRICS POLICIES
-- ============================================================================

CREATE POLICY "Users can view their own metrics"
  ON public.metrics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = metrics.product_id
      AND products.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own metrics"
  ON public.metrics FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = metrics.product_id
      AND products.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own metrics"
  ON public.metrics FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = metrics.product_id
      AND products.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own metrics"
  ON public.metrics FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = metrics.product_id
      AND products.user_id = auth.uid()
    )
  );

-- ============================================================================
-- INITIATIVES POLICIES
-- ============================================================================

CREATE POLICY "Users can view their own initiatives"
  ON public.initiatives FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = initiatives.product_id
      AND products.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own initiatives"
  ON public.initiatives FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = initiatives.product_id
      AND products.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own initiatives"
  ON public.initiatives FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = initiatives.product_id
      AND products.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own initiatives"
  ON public.initiatives FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = initiatives.product_id
      AND products.user_id = auth.uid()
    )
  );

-- ============================================================================
-- GOALS POLICIES
-- ============================================================================

CREATE POLICY "Users can view their own goals"
  ON public.goals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = goals.product_id
      AND products.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own goals"
  ON public.goals FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = goals.product_id
      AND products.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own goals"
  ON public.goals FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = goals.product_id
      AND products.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own goals"
  ON public.goals FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = goals.product_id
      AND products.user_id = auth.uid()
    )
  );

-- ============================================================================
-- HYPOTHESES POLICIES
-- ============================================================================

CREATE POLICY "Users can view their own hypotheses"
  ON public.hypotheses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = hypotheses.product_id
      AND products.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own hypotheses"
  ON public.hypotheses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = hypotheses.product_id
      AND products.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own hypotheses"
  ON public.hypotheses FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = hypotheses.product_id
      AND products.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own hypotheses"
  ON public.hypotheses FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = hypotheses.product_id
      AND products.user_id = auth.uid()
    )
  );

-- ============================================================================
-- FEATURES POLICIES
-- ============================================================================

CREATE POLICY "Users can view their own features"
  ON public.features FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = features.product_id
      AND products.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own features"
  ON public.features FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = features.product_id
      AND products.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own features"
  ON public.features FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = features.product_id
      AND products.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own features"
  ON public.features FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = features.product_id
      AND products.user_id = auth.uid()
    )
  );

-- ============================================================================
-- PROJECT_SETTINGS POLICIES
-- ============================================================================

CREATE POLICY "Users can manage their own project settings"
  ON public.project_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = project_settings.product_id
      AND products.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = project_settings.product_id
      AND products.user_id = auth.uid()
    )
  );

-- ============================================================================
-- STEP 6: Remove user_id columns from all data tables
-- ============================================================================

-- Note: We do NOT remove user_id from products table!
-- products.user_id is needed to link products to users

ALTER TABLE public.product_formulas
  DROP COLUMN IF EXISTS user_id;

ALTER TABLE public.values
  DROP COLUMN IF EXISTS user_id;

ALTER TABLE public.metrics
  DROP COLUMN IF EXISTS user_id;

ALTER TABLE public.initiatives
  DROP COLUMN IF EXISTS user_id;

ALTER TABLE public.goals
  DROP COLUMN IF EXISTS user_id;

ALTER TABLE public.hypotheses
  DROP COLUMN IF EXISTS user_id;

ALTER TABLE public.features
  DROP COLUMN IF EXISTS user_id;

ALTER TABLE public.project_settings
  DROP COLUMN IF EXISTS user_id;

-- ============================================================================
-- STEP 7: Recreate indexes that were using user_id
-- ============================================================================

-- Recreate index on features with product_id instead of user_id
CREATE INDEX idx_features_human_readable_id ON public.features(product_id, human_readable_id);

-- ============================================================================
-- STEP 8: Update function auto_populate_product_id
-- ============================================================================

-- Since user_id is removed, we need to update the trigger function
-- But wait - we still need user_id to get/create product!
-- Actually, the function get_or_create_default_product still needs user_id
-- But the trigger auto_populate_product_id won't work anymore since NEW.user_id won't exist
-- 
-- We need to change the approach: the trigger should get user_id from the product
-- Or we need to ensure product_id is always provided in INSERT statements
--
-- Actually, let's check: if product_id is provided, we don't need the trigger
-- If product_id is NULL, we can't get user_id anymore, so we should require product_id
--
-- For now, let's update the trigger to only work if product_id is provided
-- Or we can remove the trigger entirely and require product_id in all inserts

-- Update trigger function to handle the case when user_id is not available
-- Since we're removing user_id, we'll require product_id to be provided
-- The trigger will only work if product_id is NULL but we can get it from context
-- Actually, the safest approach is to remove the trigger and require product_id in all inserts

-- Drop the auto-populate triggers since user_id is no longer available
DROP TRIGGER IF EXISTS auto_populate_product_id_product_formulas ON public.product_formulas;
DROP TRIGGER IF EXISTS auto_populate_product_id_values ON public.values;
DROP TRIGGER IF EXISTS auto_populate_product_id_metrics ON public.metrics;
DROP TRIGGER IF EXISTS auto_populate_product_id_initiatives ON public.initiatives;
DROP TRIGGER IF EXISTS auto_populate_product_id_goals ON public.goals;
DROP TRIGGER IF EXISTS auto_populate_product_id_hypotheses ON public.hypotheses;
DROP TRIGGER IF EXISTS auto_populate_product_id_features ON public.features;
DROP TRIGGER IF EXISTS auto_populate_product_id_project_settings ON public.project_settings;

-- Update the trigger function to remove user_id dependency
-- Since user_id is removed, we can't auto-populate product_id anymore
-- The function will be kept for backward compatibility but won't be used
-- Or we can update it to get user_id from products table via product_id
-- Actually, if product_id is NULL, we can't determine which user it belongs to
-- So we'll require product_id to be provided in all inserts

-- Update auto_populate_product_id function to be a no-op or remove it
-- Actually, let's keep the function but update it to require product_id
-- Or we can create a new approach: get user_id from auth.uid() and then get product
CREATE OR REPLACE FUNCTION public.auto_populate_product_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Since user_id is removed, we need to get it from auth.uid()
  -- Then get or create default product for that user
  IF NEW.product_id IS NULL THEN
    NEW.product_id := public.get_or_create_default_product(auth.uid());
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate triggers with updated function
CREATE TRIGGER auto_populate_product_id_product_formulas
  BEFORE INSERT ON public.product_formulas
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_populate_product_id();

CREATE TRIGGER auto_populate_product_id_values
  BEFORE INSERT ON public.values
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_populate_product_id();

CREATE TRIGGER auto_populate_product_id_metrics
  BEFORE INSERT ON public.metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_populate_product_id();

CREATE TRIGGER auto_populate_product_id_initiatives
  BEFORE INSERT ON public.initiatives
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_populate_product_id();

CREATE TRIGGER auto_populate_product_id_goals
  BEFORE INSERT ON public.goals
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_populate_product_id();

CREATE TRIGGER auto_populate_product_id_hypotheses
  BEFORE INSERT ON public.hypotheses
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_populate_product_id();

CREATE TRIGGER auto_populate_product_id_features
  BEFORE INSERT ON public.features
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_populate_product_id();

CREATE TRIGGER auto_populate_product_id_project_settings
  BEFORE INSERT ON public.project_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_populate_product_id();

-- ============================================================================
-- STEP 9: Update UNIQUE constraint on product_formulas
-- ============================================================================

-- Remove UNIQUE(user_id) constraint since user_id is removed
ALTER TABLE public.product_formulas
  DROP CONSTRAINT IF EXISTS product_formulas_user_id_key;

-- Add UNIQUE(product_id) constraint - one formula per product
ALTER TABLE public.product_formulas
  ADD CONSTRAINT product_formulas_product_id_key UNIQUE (product_id);

