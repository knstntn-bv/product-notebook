-- Add process foundation for automatic product creation
-- This ensures that every new user gets a default product automatically

-- ============================================================================
-- FUNCTION: Get or create default product for a user
-- ============================================================================

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

-- ============================================================================
-- TRIGGER FUNCTION: Auto-populate product_id before insert
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auto_populate_product_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If product_id is not set, get or create default product for the user
  IF NEW.product_id IS NULL AND NEW.user_id IS NOT NULL THEN
    NEW.product_id := public.get_or_create_default_product(NEW.user_id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- ============================================================================
-- TRIGGERS: Auto-populate product_id for all tables
-- ============================================================================

-- Trigger for product_formulas
CREATE TRIGGER auto_populate_product_id_product_formulas
  BEFORE INSERT ON public.product_formulas
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_populate_product_id();

-- Trigger for values
CREATE TRIGGER auto_populate_product_id_values
  BEFORE INSERT ON public.values
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_populate_product_id();

-- Trigger for metrics
CREATE TRIGGER auto_populate_product_id_metrics
  BEFORE INSERT ON public.metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_populate_product_id();

-- Trigger for initiatives
CREATE TRIGGER auto_populate_product_id_initiatives
  BEFORE INSERT ON public.initiatives
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_populate_product_id();

-- Trigger for goals
CREATE TRIGGER auto_populate_product_id_goals
  BEFORE INSERT ON public.goals
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_populate_product_id();

-- Trigger for hypotheses
CREATE TRIGGER auto_populate_product_id_hypotheses
  BEFORE INSERT ON public.hypotheses
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_populate_product_id();

-- Trigger for features
CREATE TRIGGER auto_populate_product_id_features
  BEFORE INSERT ON public.features
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_populate_product_id();

-- Trigger for project_settings
CREATE TRIGGER auto_populate_product_id_project_settings
  BEFORE INSERT ON public.project_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_populate_product_id();

