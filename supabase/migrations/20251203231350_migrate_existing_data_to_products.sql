-- Migrate existing data to products
-- Step 1: Create default products for all existing users
-- Step 2: Fill product_id in all tables based on user_id

-- Step 1: Create default products for all users who have data in any table
-- Collect all unique user_ids from all tables and create products for them
INSERT INTO public.products (user_id, name)
SELECT DISTINCT user_id, 'My Product'
FROM (
  SELECT user_id FROM public.product_formulas
  UNION
  SELECT user_id FROM public.values
  UNION
  SELECT user_id FROM public.metrics
  UNION
  SELECT user_id FROM public.initiatives
  UNION
  SELECT user_id FROM public.goals
  UNION
  SELECT user_id FROM public.hypotheses
  UNION
  SELECT user_id FROM public.features
  UNION
  SELECT user_id FROM public.project_settings
) all_users
WHERE user_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Step 2: Fill product_id in all tables based on user_id
-- Update product_formulas
UPDATE public.product_formulas pf
SET product_id = p.id
FROM public.products p
WHERE pf.user_id = p.user_id
  AND pf.product_id IS NULL;

-- Update values
UPDATE public.values v
SET product_id = p.id
FROM public.products p
WHERE v.user_id = p.user_id
  AND v.product_id IS NULL;

-- Update metrics
UPDATE public.metrics m
SET product_id = p.id
FROM public.products p
WHERE m.user_id = p.user_id
  AND m.product_id IS NULL;

-- Update initiatives
UPDATE public.initiatives i
SET product_id = p.id
FROM public.products p
WHERE i.user_id = p.user_id
  AND i.product_id IS NULL;

-- Update goals
UPDATE public.goals g
SET product_id = p.id
FROM public.products p
WHERE g.user_id = p.user_id
  AND g.product_id IS NULL;

-- Update hypotheses
UPDATE public.hypotheses h
SET product_id = p.id
FROM public.products p
WHERE h.user_id = p.user_id
  AND h.product_id IS NULL;

-- Update features
UPDATE public.features f
SET product_id = p.id
FROM public.products p
WHERE f.user_id = p.user_id
  AND f.product_id IS NULL;

-- Update project_settings
UPDATE public.project_settings ps
SET product_id = p.id
FROM public.products p
WHERE ps.user_id = p.user_id
  AND ps.product_id IS NULL;

