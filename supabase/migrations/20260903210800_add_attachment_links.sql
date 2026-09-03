-- Link product attachments to hypotheses and features (junction tables)
-- NEW: Привязка вложений к гипотезам и фичам
--
-- ON DELETE CASCADE:
--   hypothesis/feature deleted → links go, file stays
--   attachment deleted → all links go
-- Same-product trigger: cannot attach a file from another product

CREATE TABLE public.hypothesis_attachments (
  hypothesis_id uuid NOT NULL REFERENCES public.hypotheses(id) ON DELETE CASCADE,
  attachment_id uuid NOT NULL REFERENCES public.attachments(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (hypothesis_id, attachment_id)
);

CREATE TABLE public.feature_attachments (
  feature_id uuid NOT NULL REFERENCES public.features(id) ON DELETE CASCADE,
  attachment_id uuid NOT NULL REFERENCES public.attachments(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (feature_id, attachment_id)
);

CREATE INDEX idx_hypothesis_attachments_attachment_id
  ON public.hypothesis_attachments(attachment_id);

CREATE INDEX idx_feature_attachments_attachment_id
  ON public.feature_attachments(attachment_id);

COMMENT ON TABLE public.hypothesis_attachments IS 'Many-to-many: product attachments linked to hypotheses.';
COMMENT ON TABLE public.feature_attachments IS 'Many-to-many: product attachments linked to features.';

COMMENT ON TABLE public.attachments IS 'Product-level file library. Linked to hypotheses and features via junction tables.';

-- ============================================================================
-- SAME PRODUCT
-- ============================================================================

CREATE OR REPLACE FUNCTION public.enforce_attachment_link_same_product()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attachment_product uuid;
  v_entity_product uuid;
BEGIN
  SELECT product_id INTO v_attachment_product
  FROM public.attachments
  WHERE id = NEW.attachment_id;

  IF v_attachment_product IS NULL THEN
    RAISE EXCEPTION 'Attachment not found'
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  IF TG_TABLE_NAME = 'hypothesis_attachments' THEN
    SELECT product_id INTO v_entity_product
    FROM public.hypotheses
    WHERE id = NEW.hypothesis_id;
  ELSIF TG_TABLE_NAME = 'feature_attachments' THEN
    SELECT product_id INTO v_entity_product
    FROM public.features
    WHERE id = NEW.feature_id;
  ELSE
    RAISE EXCEPTION 'enforce_attachment_link_same_product fired on unexpected table %', TG_TABLE_NAME;
  END IF;

  IF v_entity_product IS NULL THEN
    RAISE EXCEPTION 'Linked entity not found'
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  IF v_attachment_product IS DISTINCT FROM v_entity_product THEN
    RAISE EXCEPTION 'Attachment and entity must belong to the same product'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_hypothesis_attachment_same_product
  BEFORE INSERT OR UPDATE ON public.hypothesis_attachments
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_attachment_link_same_product();

CREATE TRIGGER enforce_feature_attachment_same_product
  BEFORE INSERT OR UPDATE ON public.feature_attachments
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_attachment_link_same_product();

-- ============================================================================
-- RLS
-- ============================================================================

ALTER TABLE public.hypothesis_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own hypothesis attachments"
  ON public.hypothesis_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.hypotheses
      JOIN public.products ON products.id = hypotheses.product_id
      WHERE hypotheses.id = hypothesis_attachments.hypothesis_id
      AND products.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own hypothesis attachments"
  ON public.hypothesis_attachments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.hypotheses
      JOIN public.products ON products.id = hypotheses.product_id
      WHERE hypotheses.id = hypothesis_attachments.hypothesis_id
      AND products.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own hypothesis attachments"
  ON public.hypothesis_attachments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.hypotheses
      JOIN public.products ON products.id = hypotheses.product_id
      WHERE hypotheses.id = hypothesis_attachments.hypothesis_id
      AND products.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their own feature attachments"
  ON public.feature_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.features
      JOIN public.products ON products.id = features.product_id
      WHERE features.id = feature_attachments.feature_id
      AND products.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own feature attachments"
  ON public.feature_attachments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.features
      JOIN public.products ON products.id = features.product_id
      WHERE features.id = feature_attachments.feature_id
      AND products.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own feature attachments"
  ON public.feature_attachments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.features
      JOIN public.products ON products.id = features.product_id
      WHERE features.id = feature_attachments.feature_id
      AND products.user_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, DELETE ON TABLE public.hypothesis_attachments TO anon;
GRANT SELECT, INSERT, DELETE ON TABLE public.hypothesis_attachments TO authenticated;
GRANT ALL ON TABLE public.hypothesis_attachments TO service_role;

GRANT SELECT, INSERT, DELETE ON TABLE public.feature_attachments TO anon;
GRANT SELECT, INSERT, DELETE ON TABLE public.feature_attachments TO authenticated;
GRANT ALL ON TABLE public.feature_attachments TO service_role;

-- ============================================================================
-- ROLLBACK (not applied; run manually if needed)
--
-- DROP POLICY IF EXISTS "Users can delete their own feature attachments" ON public.feature_attachments;
-- DROP POLICY IF EXISTS "Users can insert their own feature attachments" ON public.feature_attachments;
-- DROP POLICY IF EXISTS "Users can view their own feature attachments" ON public.feature_attachments;
-- DROP POLICY IF EXISTS "Users can delete their own hypothesis attachments" ON public.hypothesis_attachments;
-- DROP POLICY IF EXISTS "Users can insert their own hypothesis attachments" ON public.hypothesis_attachments;
-- DROP POLICY IF EXISTS "Users can view their own hypothesis attachments" ON public.hypothesis_attachments;
-- DROP TRIGGER IF EXISTS enforce_feature_attachment_same_product ON public.feature_attachments;
-- DROP TRIGGER IF EXISTS enforce_hypothesis_attachment_same_product ON public.hypothesis_attachments;
-- DROP FUNCTION IF EXISTS public.enforce_attachment_link_same_product();
-- DROP TABLE IF EXISTS public.feature_attachments;
-- DROP TABLE IF EXISTS public.hypothesis_attachments;
-- COMMENT ON TABLE public.attachments IS 'Product-level file library. Links to hypotheses/features/goals are a later stage.';
-- ============================================================================
