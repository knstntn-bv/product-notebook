-- Complete database schema migration
-- This migration creates the entire database structure in its final state
-- It includes all tables, functions, triggers, indexes, and RLS policies
-- Updated to remove sharing functionality (NNN-53)

-- ============================================================================
-- TABLES
-- ============================================================================

-- Product formula table (one per user)
CREATE TABLE public.product_formulas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  formula text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Values table
CREATE TABLE public.values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  value_text text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Metrics table
CREATE TABLE public.metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  parent_metric_id uuid REFERENCES public.metrics(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Initiatives table (previously tracks)
CREATE TABLE public.initiatives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  color text DEFAULT '#8B5CF6',
  archived boolean NOT NULL DEFAULT false,
  archived_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Goals table (previously epics, then initiatives)
CREATE TABLE public.goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'inProgress', 'accepted', 'rejected')),
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
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  goal_id uuid REFERENCES public.goals(id) ON DELETE SET NULL,
  initiative_id uuid REFERENCES public.initiatives(id) ON DELETE SET NULL,
  board_column text NOT NULL CHECK (board_column IN ('inbox', 'discovery', 'backlog', 'design', 'development', 'onHold', 'done', 'cancelled')),
  human_readable_id text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Project settings table
CREATE TABLE public.project_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  show_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index for faster lookups on features human_readable_id
CREATE INDEX idx_features_human_readable_id ON public.features(user_id, human_readable_id);

-- Index for better performance on position queries in features
CREATE INDEX idx_features_board_column_position ON public.features(board_column, position);

-- Index for better query performance when filtering archived initiatives
CREATE INDEX idx_initiatives_archived ON public.initiatives(archived);

-- Index for better query performance when filtering archived goals
CREATE INDEX idx_goals_archived ON public.goals(archived);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all tables
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

-- ============================================================================
-- RLS POLICIES - PRODUCT FORMULAS
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
-- RLS POLICIES - VALUES
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
-- RLS POLICIES - METRICS
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
-- RLS POLICIES - INITIATIVES
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
-- RLS POLICIES - GOALS
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
-- RLS POLICIES - HYPOTHESES
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
-- RLS POLICIES - FEATURES
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
-- RLS POLICIES - PROJECT SETTINGS
-- ============================================================================

CREATE POLICY "Users can manage their own settings" 
  ON public.project_settings 
  FOR ALL 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Triggers for automatic timestamp updates
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

