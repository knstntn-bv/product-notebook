-- Create a security definer function to check if a user's project is public
CREATE OR REPLACE FUNCTION public.is_project_public(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_settings
    WHERE user_id = check_user_id
      AND is_public = true
  );
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.is_project_public(uuid) TO authenticated, anon;

-- Update RLS policies for all tables to use the secure function

-- Features table
DROP POLICY IF EXISTS "Public can view shared features" ON public.features;
CREATE POLICY "Public can view shared features"
  ON public.features
  FOR SELECT
  USING (public.is_project_public(user_id));

-- Hypotheses table
DROP POLICY IF EXISTS "Public can view shared hypotheses" ON public.hypotheses;
CREATE POLICY "Public can view shared hypotheses"
  ON public.hypotheses
  FOR SELECT
  USING (public.is_project_public(user_id));

-- Initiatives table
DROP POLICY IF EXISTS "Public can view shared initiatives" ON public.initiatives;
CREATE POLICY "Public can view shared initiatives"
  ON public.initiatives
  FOR SELECT
  USING (public.is_project_public(user_id));

-- Metrics table
DROP POLICY IF EXISTS "Public can view shared metrics" ON public.metrics;
CREATE POLICY "Public can view shared metrics"
  ON public.metrics
  FOR SELECT
  USING (public.is_project_public(user_id));

-- Product formulas table
DROP POLICY IF EXISTS "Public can view shared product formulas" ON public.product_formulas;
CREATE POLICY "Public can view shared product formulas"
  ON public.product_formulas
  FOR SELECT
  USING (public.is_project_public(user_id));

-- Tracks table
DROP POLICY IF EXISTS "Public can view shared tracks" ON public.tracks;
CREATE POLICY "Public can view shared tracks"
  ON public.tracks
  FOR SELECT
  USING (public.is_project_public(user_id));

-- Values table
DROP POLICY IF EXISTS "Public can view shared values" ON public.values;
CREATE POLICY "Public can view shared values"
  ON public.values
  FOR SELECT
  USING (public.is_project_public(user_id));