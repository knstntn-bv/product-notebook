-- Remove sharing functionality from the application
-- This migration removes all sharing-related features:
-- - is_public and share_token columns from project_settings
-- - get_shared_user_id and is_project_public functions
-- - All "Public can view shared *" RLS policies

-- ============================================================================
-- DROP RLS POLICIES FOR SHARED DATA
-- ============================================================================

DROP POLICY IF EXISTS "Public can view shared product formulas" ON public.product_formulas;
DROP POLICY IF EXISTS "Public can view shared values" ON public.values;
DROP POLICY IF EXISTS "Public can view shared metrics" ON public.metrics;
DROP POLICY IF EXISTS "Public can view shared initiatives" ON public.initiatives;
DROP POLICY IF EXISTS "Public can view shared goals" ON public.goals;
DROP POLICY IF EXISTS "Public can view shared hypotheses" ON public.hypotheses;
DROP POLICY IF EXISTS "Public can view shared features" ON public.features;

-- ============================================================================
-- DROP FUNCTIONS
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_shared_user_id(text);
DROP FUNCTION IF EXISTS public.is_project_public(uuid);

-- ============================================================================
-- DROP COLUMNS FROM project_settings
-- ============================================================================

ALTER TABLE public.project_settings 
  DROP COLUMN IF EXISTS is_public,
  DROP COLUMN IF EXISTS share_token;

