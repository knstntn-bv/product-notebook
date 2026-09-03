-- Private Storage bucket for product attachment files
-- NEW: Библиотека вложений продукта
--
-- Object path: {product_id}/{attachment_id}
-- Access: same owner check as public.attachments (via products.user_id)
-- Per-file limit: 10 MB (bucket file_size_limit). Product quota 200 MB stays in Postgres.

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('attachments', 'attachments', false, 10485760);

-- ============================================================================
-- RLS on storage.objects
-- First path segment must be a product the current user owns.
-- Exactly one slash: {product_id}/{attachment_id}
-- ============================================================================

CREATE POLICY "Users can view their own attachment files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'attachments'
    AND name LIKE '%/%'
    AND name NOT LIKE '%/%/%'
    AND EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id::text = split_part(name, '/', 1)
      AND products.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can upload their own attachment files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'attachments'
    AND name LIKE '%/%'
    AND name NOT LIKE '%/%/%'
    AND EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id::text = split_part(name, '/', 1)
      AND products.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own attachment files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'attachments'
    AND name LIKE '%/%'
    AND name NOT LIKE '%/%/%'
    AND EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id::text = split_part(name, '/', 1)
      AND products.user_id = auth.uid()
    )
  );

-- ============================================================================
-- ROLLBACK (not applied; run manually if needed)
-- Deletes all objects in the attachments bucket, then the bucket.
-- This is irreversible for stored files.
--
-- DROP POLICY IF EXISTS "Users can delete their own attachment files" ON storage.objects;
-- DROP POLICY IF EXISTS "Users can upload their own attachment files" ON storage.objects;
-- DROP POLICY IF EXISTS "Users can view their own attachment files" ON storage.objects;
-- DELETE FROM storage.objects WHERE bucket_id = 'attachments';
-- DELETE FROM storage.buckets WHERE id = 'attachments';
-- ============================================================================
