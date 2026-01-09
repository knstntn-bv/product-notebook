-- Complete database schema migration - FINAL STATE
-- This migration creates the entire database structure in its final state
-- It includes products table, all tables with product_id (NO user_id in data tables),
-- functions, triggers, indexes, and RLS policies
-- Updated to reflect final state after BIG-52 migration (all stages completed)
-- 
-- Key differences from previous full_schema:
-- - All data tables have product_id (NOT NULL) but NO user_id
-- - products table has user_id (to link products to users)
-- - UNIQUE constraint on product_formulas.product_id (one formula per product)
-- - All RLS policies check access through products table
-- - Triggers use auth.uid() to get user_id for auto-populating product_id

-- ============================================================================
-- TABLES
-- ============================================================================

-- Products table
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'My Product',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Product formula table (one per product)
CREATE TABLE public.product_formulas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  formula text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(product_id)
);

-- Values table
CREATE TABLE public.values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  value_text text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Metrics table
CREATE TABLE public.metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name text NOT NULL,
  parent_metric_id uuid REFERENCES public.metrics(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Initiatives table (previously tracks)
CREATE TABLE public.initiatives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  color text DEFAULT '#8B5CF6',
  archived boolean NOT NULL DEFAULT false,
  archived_at timestamptz,
  target_metric_id uuid REFERENCES public.metrics(id) ON DELETE SET NULL,
  priority integer NOT NULL DEFAULT 3,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Goals table (previously epics, then initiatives)
CREATE TABLE public.goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  initiative_id uuid NOT NULL REFERENCES public.initiatives(id) ON DELETE CASCADE,
  goal text NOT NULL,
  expected_result text,
  achieved_result text,
  done boolean DEFAULT false,
  target_metrics text[],
  quarter text NOT NULL CHECK (quarter IN ('current', 'next', 'halfYear')),
  archived boolean NOT NULL DEFAULT false,
  archived_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Hypotheses table
CREATE TABLE public.hypotheses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'inProgress', 'accepted', 'done', 'rejected')),
  priority integer NOT NULL DEFAULT 3,
  insight text,
  problem_hypothesis text,
  problem_validation text,
  solution_hypothesis text,
  solution_validation text,
  impact_metrics text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Features table
CREATE TABLE public.features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  goal_id uuid REFERENCES public.goals(id) ON DELETE SET NULL,
  initiative_id uuid REFERENCES public.initiatives(id) ON DELETE SET NULL,
  hypothesis_id uuid REFERENCES public.hypotheses(id) ON DELETE SET NULL,
  board_column text NOT NULL CHECK (board_column IN ('inbox', 'discovery', 'backlog', 'design', 'development', 'onHold', 'done', 'cancelled')),
  human_readable_id text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  closed_at timestamptz
);

-- Project settings table
CREATE TABLE public.project_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  show_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index for faster lookups on products user_id
CREATE INDEX idx_products_user_id ON public.products(user_id);

-- Indexes for product_id in all tables
CREATE INDEX idx_product_formulas_product_id ON public.product_formulas(product_id);
CREATE INDEX idx_values_product_id ON public.values(product_id);
CREATE INDEX idx_metrics_product_id ON public.metrics(product_id);
CREATE INDEX idx_initiatives_product_id ON public.initiatives(product_id);
CREATE INDEX idx_goals_product_id ON public.goals(product_id);
CREATE INDEX idx_hypotheses_product_id ON public.hypotheses(product_id);
CREATE INDEX idx_features_product_id ON public.features(product_id);
CREATE INDEX idx_project_settings_product_id ON public.project_settings(product_id);

-- Index for faster lookups on features human_readable_id (using product_id)
CREATE INDEX idx_features_human_readable_id ON public.features(product_id, human_readable_id);

-- Index for better performance on position queries in features
CREATE INDEX idx_features_board_column_position ON public.features(board_column, position);

-- Index for better query performance when filtering features by hypothesis
CREATE INDEX idx_features_hypothesis_id ON public.features(hypothesis_id);

-- Index for better query performance when filtering archived initiatives
CREATE INDEX idx_initiatives_archived ON public.initiatives(archived);

-- Index for better query performance when filtering archived goals
CREATE INDEX idx_goals_archived ON public.goals(archived);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_formulas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.initiatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hypotheses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Function to get or create default product for a user
CREATE OR REPLACE FUNCTION public.get_or_create_default_product(p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product_id uuid;
BEGIN
  -- Try to find existing product for this user
  SELECT id INTO v_product_id
  FROM public.products
  WHERE user_id = p_user_id
  ORDER BY created_at ASC
  LIMIT 1;
  
  -- If no product exists, create a default one
  IF v_product_id IS NULL THEN
    INSERT INTO public.products (user_id, name)
    VALUES (p_user_id, 'My Product')
    RETURNING id INTO v_product_id;
  END IF;
  
  RETURN v_product_id;
END;
$$;

-- Trigger function to auto-populate product_id before insert
CREATE OR REPLACE FUNCTION public.auto_populate_product_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Since user_id is removed from data tables, we get it from auth.uid()
  -- Then get or create default product for that user
  IF NEW.product_id IS NULL THEN
    NEW.product_id := public.get_or_create_default_product(auth.uid());
  END IF;
  
  RETURN NEW;
END;
$$;

-- ============================================================================
-- RLS POLICIES - PRODUCTS
-- ============================================================================

CREATE POLICY "Users can view their own products"
  ON public.products FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own products"
  ON public.products FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own products"
  ON public.products FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own products"
  ON public.products FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- RLS POLICIES - PRODUCT_FORMULAS
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
-- RLS POLICIES - VALUES
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
-- RLS POLICIES - METRICS
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
-- RLS POLICIES - INITIATIVES
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
-- RLS POLICIES - GOALS
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
-- RLS POLICIES - HYPOTHESES
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
-- RLS POLICIES - FEATURES
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
-- RLS POLICIES - PROJECT_SETTINGS
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
-- TRIGGERS
-- ============================================================================

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_product_formulas_updated_at
  BEFORE UPDATE ON public.product_formulas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_values_updated_at
  BEFORE UPDATE ON public.values
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_metrics_updated_at
  BEFORE UPDATE ON public.metrics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_initiatives_updated_at
  BEFORE UPDATE ON public.initiatives
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_goals_updated_at
  BEFORE UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_hypotheses_updated_at
  BEFORE UPDATE ON public.hypotheses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_features_updated_at
  BEFORE UPDATE ON public.features
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_settings_updated_at
  BEFORE UPDATE ON public.project_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Triggers for automatic product_id population
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

