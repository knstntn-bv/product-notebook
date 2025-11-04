-- Create project_settings table for managing public access
CREATE TABLE public.project_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  is_public boolean NOT NULL DEFAULT false,
  share_token text UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_settings ENABLE ROW LEVEL SECURITY;

-- Owner can manage their own settings
CREATE POLICY "Users can manage their own settings" 
ON public.project_settings 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Anyone can view public project settings (to verify share tokens)
CREATE POLICY "Anyone can view public settings" 
ON public.project_settings 
FOR SELECT 
USING (is_public = true);

-- Update RLS policies for public read access on all tables
CREATE POLICY "Public can view shared features"
ON public.features
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.project_settings 
    WHERE project_settings.user_id = features.user_id 
    AND project_settings.is_public = true
  )
);

CREATE POLICY "Public can view shared hypotheses"
ON public.hypotheses
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.project_settings 
    WHERE project_settings.user_id = hypotheses.user_id 
    AND project_settings.is_public = true
  )
);

CREATE POLICY "Public can view shared initiatives"
ON public.initiatives
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.project_settings 
    WHERE project_settings.user_id = initiatives.user_id 
    AND project_settings.is_public = true
  )
);

CREATE POLICY "Public can view shared metrics"
ON public.metrics
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.project_settings 
    WHERE project_settings.user_id = metrics.user_id 
    AND project_settings.is_public = true
  )
);

CREATE POLICY "Public can view shared product formulas"
ON public.product_formulas
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.project_settings 
    WHERE project_settings.user_id = product_formulas.user_id 
    AND project_settings.is_public = true
  )
);

CREATE POLICY "Public can view shared tracks"
ON public.tracks
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.project_settings 
    WHERE project_settings.user_id = tracks.user_id 
    AND project_settings.is_public = true
  )
);

CREATE POLICY "Public can view shared values"
ON public.values
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.project_settings 
    WHERE project_settings.user_id = values.user_id 
    AND project_settings.is_public = true
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_project_settings_updated_at
BEFORE UPDATE ON public.project_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();