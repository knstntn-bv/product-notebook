-- Add UNIQUE constraint on product_id for product_formulas
-- This ensures one formula per product, replacing the old UNIQUE(user_id) constraint

ALTER TABLE public.product_formulas
  ADD CONSTRAINT product_formulas_product_id_key UNIQUE (product_id);

