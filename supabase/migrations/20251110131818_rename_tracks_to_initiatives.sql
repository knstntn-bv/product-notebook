-- Rename tracks table to initiatives
ALTER TABLE tracks RENAME TO initiatives;

-- Rename the track_id column in features table to initiative_id
ALTER TABLE features RENAME COLUMN track_id TO initiative_id;

-- Rename the track_id column in goals table to initiative_id
ALTER TABLE goals RENAME COLUMN track_id TO initiative_id;

-- Update the foreign key constraint in features table
ALTER TABLE features DROP CONSTRAINT IF EXISTS features_track_id_fkey;
ALTER TABLE features ADD CONSTRAINT features_initiative_id_fkey 
  FOREIGN KEY (initiative_id) REFERENCES initiatives(id) ON DELETE SET NULL;

-- Update the foreign key constraint in goals table
ALTER TABLE goals DROP CONSTRAINT IF EXISTS goals_track_id_fkey;
ALTER TABLE goals DROP CONSTRAINT IF EXISTS epics_track_id_fkey;
ALTER TABLE goals ADD CONSTRAINT goals_initiative_id_fkey 
  FOREIGN KEY (initiative_id) REFERENCES initiatives(id) ON DELETE CASCADE;

-- Update RLS policies - drop old policies
DROP POLICY IF EXISTS "Users can view their own tracks" ON public.initiatives;
DROP POLICY IF EXISTS "Users can insert their own tracks" ON public.initiatives;
DROP POLICY IF EXISTS "Users can update their own tracks" ON public.initiatives;
DROP POLICY IF EXISTS "Users can delete their own tracks" ON public.initiatives;
DROP POLICY IF EXISTS "Public can view shared tracks" ON public.initiatives;

-- Create new RLS policies for initiatives
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

CREATE POLICY "Public can view shared initiatives"
  ON public.initiatives
  FOR SELECT
  USING (public.is_project_public(user_id));

-- Update trigger name (drop old trigger, create new)
DROP TRIGGER IF EXISTS update_tracks_updated_at ON public.initiatives;
CREATE TRIGGER update_initiatives_updated_at
  BEFORE UPDATE ON public.initiatives
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

