-- Rollback RLS policies to use user_id directly instead of products
-- This migration reverts the changes made in 20251203233110_update_rls_policies_for_products.sql

-- ============================================================================
-- DROP NEW POLICIES (that check through products)
-- ============================================================================

-- Drop new policies for product_formulas
DROP POLICY IF EXISTS "Users can view their own product formulas" ON public.product_formulas;
DROP POLICY IF EXISTS "Users can insert their own product formulas" ON public.product_formulas;
DROP POLICY IF EXISTS "Users can update their own product formulas" ON public.product_formulas;
DROP POLICY IF EXISTS "Users can delete their own product formulas" ON public.product_formulas;

-- Drop new policies for values
DROP POLICY IF EXISTS "Users can view their own values" ON public.values;
DROP POLICY IF EXISTS "Users can insert their own values" ON public.values;
DROP POLICY IF EXISTS "Users can update their own values" ON public.values;
DROP POLICY IF EXISTS "Users can delete their own values" ON public.values;

-- Drop new policies for metrics
DROP POLICY IF EXISTS "Users can view their own metrics" ON public.metrics;
DROP POLICY IF EXISTS "Users can insert their own metrics" ON public.metrics;
DROP POLICY IF EXISTS "Users can update their own metrics" ON public.metrics;
DROP POLICY IF EXISTS "Users can delete their own metrics" ON public.metrics;

-- Drop new policies for initiatives
DROP POLICY IF EXISTS "Users can view their own initiatives" ON public.initiatives;
DROP POLICY IF EXISTS "Users can insert their own initiatives" ON public.initiatives;
DROP POLICY IF EXISTS "Users can update their own initiatives" ON public.initiatives;
DROP POLICY IF EXISTS "Users can delete their own initiatives" ON public.initiatives;

-- Drop new policies for goals
DROP POLICY IF EXISTS "Users can view their own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can insert their own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can update their own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can delete their own goals" ON public.goals;

-- Drop new policies for hypotheses
DROP POLICY IF EXISTS "Users can view their own hypotheses" ON public.hypotheses;
DROP POLICY IF EXISTS "Users can insert their own hypotheses" ON public.hypotheses;
DROP POLICY IF EXISTS "Users can update their own hypotheses" ON public.hypotheses;
DROP POLICY IF EXISTS "Users can delete their own hypotheses" ON public.hypotheses;

-- Drop new policies for features
DROP POLICY IF EXISTS "Users can view their own features" ON public.features;
DROP POLICY IF EXISTS "Users can insert their own features" ON public.features;
DROP POLICY IF EXISTS "Users can update their own features" ON public.features;
DROP POLICY IF EXISTS "Users can delete their own features" ON public.features;

-- Drop new policies for project_settings
DROP POLICY IF EXISTS "Users can manage their own project settings" ON public.project_settings;

-- ============================================================================
-- RESTORE OLD POLICIES (that check user_id directly)
-- ============================================================================

-- ============================================================================
-- RESTORE POLICIES - PRODUCT_FORMULAS
-- ============================================================================

CREATE POLICY "Users can view their own product formula"
  ON public.product_formulas FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own product formula"
  ON public.product_formulas FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own product formula"
  ON public.product_formulas FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own product formula"
  ON public.product_formulas FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- RESTORE POLICIES - VALUES
-- ============================================================================

CREATE POLICY "Users can view their own values"
  ON public.values FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own values"
  ON public.values FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own values"
  ON public.values FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own values"
  ON public.values FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- RESTORE POLICIES - METRICS
-- ============================================================================

CREATE POLICY "Users can view their own metrics"
  ON public.metrics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own metrics"
  ON public.metrics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own metrics"
  ON public.metrics FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own metrics"
  ON public.metrics FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- RESTORE POLICIES - INITIATIVES
-- ============================================================================

CREATE POLICY "Users can view their own initiatives"
  ON public.initiatives FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own initiatives"
  ON public.initiatives FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own initiatives"
  ON public.initiatives FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own initiatives"
  ON public.initiatives FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- RESTORE POLICIES - GOALS
-- ============================================================================

CREATE POLICY "Users can view their own goals"
  ON public.goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own goals"
  ON public.goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals"
  ON public.goals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals"
  ON public.goals FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- RESTORE POLICIES - HYPOTHESES
-- ============================================================================

CREATE POLICY "Users can view their own hypotheses"
  ON public.hypotheses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own hypotheses"
  ON public.hypotheses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own hypotheses"
  ON public.hypotheses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own hypotheses"
  ON public.hypotheses FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- RESTORE POLICIES - FEATURES
-- ============================================================================

CREATE POLICY "Users can view their own features"
  ON public.features FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own features"
  ON public.features FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own features"
  ON public.features FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own features"
  ON public.features FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- RESTORE POLICIES - PROJECT_SETTINGS
-- ============================================================================

CREATE POLICY "Users can manage their own settings" 
  ON public.project_settings 
  FOR ALL 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

