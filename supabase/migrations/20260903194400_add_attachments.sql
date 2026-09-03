-- Add product-level attachments library (no links to other entities yet)
-- NEW: Библиотека вложений продукта
--
-- Dedup: UNIQUE(product_id, content_hash) — same bytes cannot be stored twice
-- Quotas: 10 MB per file (CHECK), 200 MB per product (trigger)
-- Access: RLS via products.user_id, same pattern as other data tables

-- ============================================================================
-- TABLE
-- ============================================================================

CREATE TABLE public.attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  original_filename text NOT NULL,
  content_hash text NOT NULL,
  size_bytes bigint NOT NULL,
  mime_type text,
  storage_path text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT attachments_content_hash_sha256_check
    CHECK (content_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT attachments_size_bytes_check
    CHECK (size_bytes > 0 AND size_bytes <= 10485760),
  CONSTRAINT attachments_storage_path_key
    UNIQUE (storage_path),
  CONSTRAINT attachments_product_content_hash_key
    UNIQUE (product_id, content_hash),
  CONSTRAINT attachments_no_executables_check
    CHECK (
      lower(substring(original_filename from '\.([^.]+)$')) IS NULL
      OR lower(substring(original_filename from '\.([^.]+)$')) NOT IN (
        'exe', 'bat', 'cmd', 'com', 'msi', 'scr', 'pif', 'cpl',
        'dll', 'so', 'dylib', 'app', 'sh', 'bash', 'ps1', 'vbs',
        'vbe', 'jse', 'wsf', 'wsh', 'msc', 'hta'
      )
    )
);

COMMENT ON TABLE public.attachments IS 'Product-level file library. Links to hypotheses/features/goals are a later stage.';
COMMENT ON COLUMN public.attachments.display_name IS 'Name shown in the library UI. Renaming does not create a new attachment.';
COMMENT ON COLUMN public.attachments.original_filename IS 'Filename as uploaded by the user.';
COMMENT ON COLUMN public.attachments.content_hash IS 'SHA-256 hex of file bytes; unique together with product_id.';
COMMENT ON COLUMN public.attachments.size_bytes IS 'File size in bytes. Max 10 MB (10485760).';
COMMENT ON COLUMN public.attachments.storage_path IS 'Object path in the attachments bucket, typically {product_id}/{id}.';

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_attachments_product_id ON public.attachments(product_id);

-- ============================================================================
-- RLS
-- ============================================================================

ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own attachments"
  ON public.attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = attachments.product_id
      AND products.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own attachments"
  ON public.attachments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = attachments.product_id
      AND products.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own attachments"
  ON public.attachments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = attachments.product_id
      AND products.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own attachments"
  ON public.attachments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = attachments.product_id
      AND products.user_id = auth.uid()
    )
  );

-- ============================================================================
-- QUOTA (200 MB per product)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.enforce_attachments_product_quota()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total bigint;
  v_limit constant bigint := 209715200;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(NEW.product_id::text));

  SELECT COALESCE(SUM(size_bytes), 0)
  INTO v_total
  FROM public.attachments
  WHERE product_id = NEW.product_id
    AND (TG_OP = 'INSERT' OR id IS DISTINCT FROM NEW.id);

  IF v_total + NEW.size_bytes > v_limit THEN
    RAISE EXCEPTION 'Product attachment quota exceeded (200 MB)'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_attachments_product_quota
  BEFORE INSERT OR UPDATE OF size_bytes, product_id ON public.attachments
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_attachments_product_quota();

-- ============================================================================
-- TRIGGERS (same as other product-scoped tables)
-- ============================================================================

CREATE TRIGGER update_attachments_updated_at
  BEFORE UPDATE ON public.attachments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER auto_populate_product_id_attachments
  BEFORE INSERT ON public.attachments
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_populate_product_id();

-- ============================================================================
-- ROLLBACK (not applied; run manually if needed)
-- Drops the attachments library. Stored files in the Storage bucket are not
-- removed by this SQL and must be cleaned up separately.
--
-- DROP TRIGGER IF EXISTS auto_populate_product_id_attachments ON public.attachments;
-- DROP TRIGGER IF EXISTS update_attachments_updated_at ON public.attachments;
-- DROP TRIGGER IF EXISTS enforce_attachments_product_quota ON public.attachments;
-- DROP FUNCTION IF EXISTS public.enforce_attachments_product_quota();
-- DROP POLICY IF EXISTS "Users can delete their own attachments" ON public.attachments;
-- DROP POLICY IF EXISTS "Users can update their own attachments" ON public.attachments;
-- DROP POLICY IF EXISTS "Users can insert their own attachments" ON public.attachments;
-- DROP POLICY IF EXISTS "Users can view their own attachments" ON public.attachments;
-- DROP TABLE IF EXISTS public.attachments;
-- ============================================================================
