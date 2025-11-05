-- Drop the public SELECT policy that exposes share_token
DROP POLICY IF EXISTS "Anyone can view public settings" ON public.project_settings;

-- Create a security definer function to validate share tokens
CREATE OR REPLACE FUNCTION public.get_shared_user_id(token text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id
  FROM public.project_settings
  WHERE share_token = token
    AND is_public = true
  LIMIT 1;
$$;

-- Grant execute permission to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION public.get_shared_user_id(text) TO authenticated, anon;