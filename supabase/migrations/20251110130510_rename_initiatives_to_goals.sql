-- Rename initiatives table to goals
ALTER TABLE initiatives RENAME TO goals;

-- Rename the initiative_id column in features table to goal_id
ALTER TABLE features RENAME COLUMN initiative_id TO goal_id;

-- Update the foreign key constraint name
ALTER TABLE features DROP CONSTRAINT IF EXISTS features_initiative_id_fkey;
ALTER TABLE features ADD CONSTRAINT features_goal_id_fkey 
  FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE SET NULL;

-- Update RLS policies - drop old policies
-- Note: Policies might still have "epics" in the name if they weren't renamed
DROP POLICY IF EXISTS "Users can view their own epics" ON public.goals;
DROP POLICY IF EXISTS "Users can insert their own epics" ON public.goals;
DROP POLICY IF EXISTS "Users can update their own epics" ON public.goals;
DROP POLICY IF EXISTS "Users can delete their own epics" ON public.goals;
DROP POLICY IF EXISTS "Users can view their own initiatives" ON public.goals;
DROP POLICY IF EXISTS "Users can insert their own initiatives" ON public.goals;
DROP POLICY IF EXISTS "Users can update their own initiatives" ON public.goals;
DROP POLICY IF EXISTS "Users can delete their own initiatives" ON public.goals;
DROP POLICY IF EXISTS "Public can view shared initiatives" ON public.goals;

-- Create new RLS policies for goals
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

CREATE POLICY "Public can view shared goals"
  ON public.goals
  FOR SELECT
  USING (public.is_project_public(user_id));

-- Update trigger name (drop old triggers that might exist, create new)
-- Note: The trigger might still be named update_epics_updated_at if it wasn't renamed
DROP TRIGGER IF EXISTS update_epics_updated_at ON public.goals;
DROP TRIGGER IF EXISTS update_initiatives_updated_at ON public.goals;
CREATE TRIGGER update_goals_updated_at
  BEFORE UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Update foreign key constraint name in goals table (if it references tracks)
ALTER TABLE goals DROP CONSTRAINT IF EXISTS epics_track_id_fkey;
ALTER TABLE goals ADD CONSTRAINT goals_track_id_fkey 
  FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE;

