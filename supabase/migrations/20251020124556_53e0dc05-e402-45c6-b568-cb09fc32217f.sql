-- Create tables for the product management app

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

-- Tracks table
CREATE TABLE public.tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Epics table
CREATE TABLE public.epics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id uuid NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  goal text NOT NULL,
  expected_result text,
  achieved_result text,
  done boolean DEFAULT false,
  target_metrics text[],
  quarter text NOT NULL CHECK (quarter IN ('current', 'next', 'halfYear')),
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
  linked_epic text,
  linked_track text NOT NULL,
  board_column text NOT NULL CHECK (board_column IN ('inbox', 'discovery', 'backlog', 'design', 'development', 'onHold', 'done', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.product_formulas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.epics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hypotheses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.features ENABLE ROW LEVEL SECURITY;

-- RLS Policies for product_formulas
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

-- RLS Policies for values
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

-- RLS Policies for metrics
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

-- RLS Policies for tracks
CREATE POLICY "Users can view their own tracks"
  ON public.tracks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tracks"
  ON public.tracks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tracks"
  ON public.tracks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tracks"
  ON public.tracks FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for epics
CREATE POLICY "Users can view their own epics"
  ON public.epics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own epics"
  ON public.epics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own epics"
  ON public.epics FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own epics"
  ON public.epics FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for hypotheses
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

-- RLS Policies for features
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

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_product_formulas_updated_at
  BEFORE UPDATE ON public.product_formulas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_values_updated_at
  BEFORE UPDATE ON public.values
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_metrics_updated_at
  BEFORE UPDATE ON public.metrics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tracks_updated_at
  BEFORE UPDATE ON public.tracks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_epics_updated_at
  BEFORE UPDATE ON public.epics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_hypotheses_updated_at
  BEFORE UPDATE ON public.hypotheses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_features_updated_at
  BEFORE UPDATE ON public.features
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();