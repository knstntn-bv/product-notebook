-- Update RLS policies to check access through products table
-- This ensures that users can only access data belonging to their products

-- ============================================================================
-- DROP OLD POLICIES
-- ============================================================================

-- Drop old policies for product_formulas
DROP POLICY IF EXISTS "Users can view their own product formula" ON public.product_formulas;
DROP POLICY IF EXISTS "Users can insert their own product formula" ON public.product_formulas;
DROP POLICY IF EXISTS "Users can update their own product formula" ON public.product_formulas;
DROP POLICY IF EXISTS "Users can delete their own product formula" ON public.product_formulas;

-- Drop old policies for values
DROP POLICY IF EXISTS "Users can view their own values" ON public.values;
DROP POLICY IF EXISTS "Users can insert their own values" ON public.values;
DROP POLICY IF EXISTS "Users can update their own values" ON public.values;
DROP POLICY IF EXISTS "Users can delete their own values" ON public.values;

-- Drop old policies for metrics
DROP POLICY IF EXISTS "Users can view their own metrics" ON public.metrics;
DROP POLICY IF EXISTS "Users can insert their own metrics" ON public.metrics;
DROP POLICY IF EXISTS "Users can update their own metrics" ON public.metrics;
DROP POLICY IF EXISTS "Users can delete their own metrics" ON public.metrics;

-- Drop old policies for initiatives
DROP POLICY IF EXISTS "Users can view their own initiatives" ON public.initiatives;
DROP POLICY IF EXISTS "Users can insert their own initiatives" ON public.initiatives;
DROP POLICY IF EXISTS "Users can update their own initiatives" ON public.initiatives;
DROP POLICY IF EXISTS "Users can delete their own initiatives" ON public.initiatives;

-- Drop old policies for goals
DROP POLICY IF EXISTS "Users can view their own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can insert their own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can update their own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can delete their own goals" ON public.goals;

-- Drop old policies for hypotheses
DROP POLICY IF EXISTS "Users can view their own hypotheses" ON public.hypotheses;
DROP POLICY IF EXISTS "Users can insert their own hypotheses" ON public.hypotheses;
DROP POLICY IF EXISTS "Users can update their own hypotheses" ON public.hypotheses;
DROP POLICY IF EXISTS "Users can delete their own hypotheses" ON public.hypotheses;

-- Drop old policies for features
DROP POLICY IF EXISTS "Users can view their own features" ON public.features;
DROP POLICY IF EXISTS "Users can insert their own features" ON public.features;
DROP POLICY IF EXISTS "Users can update their own features" ON public.features;
DROP POLICY IF EXISTS "Users can delete their own features" ON public.features;

-- Drop old policies for project_settings
DROP POLICY IF EXISTS "Users can manage their own settings" ON public.project_settings;

-- ============================================================================
-- CREATE NEW POLICIES - PRODUCT_FORMULAS
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
    auth.uid() = user_id
    AND EXISTS (
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
-- CREATE NEW POLICIES - VALUES
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
    auth.uid() = user_id
    AND EXISTS (
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
-- CREATE NEW POLICIES - METRICS
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
    auth.uid() = user_id
    AND EXISTS (
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
-- CREATE NEW POLICIES - INITIATIVES
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
    auth.uid() = user_id
    AND EXISTS (
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
-- CREATE NEW POLICIES - GOALS
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
    auth.uid() = user_id
    AND EXISTS (
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
-- CREATE NEW POLICIES - HYPOTHESES
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
    auth.uid() = user_id
    AND EXISTS (
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
-- CREATE NEW POLICIES - FEATURES
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
    auth.uid() = user_id
    AND EXISTS (
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
-- CREATE NEW POLICIES - PROJECT_SETTINGS
-- ============================================================================

CREATE POLICY "Users can manage their own project settings"
  ON public.project_settings FOR ALL
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = project_settings.product_id
      AND products.user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = project_settings.product_id
      AND products.user_id = auth.uid()
    )
  );

