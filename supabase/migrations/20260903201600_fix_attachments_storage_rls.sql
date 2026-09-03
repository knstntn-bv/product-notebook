-- Fix Storage RLS for attachments uploads
-- Policies that SELECT public.products from storage.objects often fail WITH CHECK
-- (JWT/role context). Ownership is checked via SECURITY DEFINER instead.
-- Also drop the "exactly one slash" path rule so {product_id}/{attachment_id} is enough.

CREATE OR REPLACE FUNCTION public.user_owns_attachment_object(object_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_segment text;
  v_product_id uuid;
BEGIN
  v_segment := split_part(object_name, '/', 1);
  IF v_segment IS NULL OR v_segment = '' THEN
    RETURN false;
  END IF;

  BEGIN
    v_product_id := v_segment::uuid;
  EXCEPTION
    WHEN invalid_text_representation THEN
      RETURN false;
  END;

  RETURN EXISTS (
    SELECT 1
    FROM public.products
    WHERE id = v_product_id
      AND user_id = auth.uid()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.user_owns_attachment_object(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_owns_attachment_object(text) TO anon;
GRANT EXECUTE ON FUNCTION public.user_owns_attachment_object(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_owns_attachment_object(text) TO service_role;

DROP POLICY IF EXISTS "Users can view their own attachment files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own attachment files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own attachment files" ON storage.objects;

CREATE POLICY "Users can view their own attachment files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'attachments'
    AND public.user_owns_attachment_object(name)
  );

CREATE POLICY "Users can upload their own attachment files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'attachments'
    AND public.user_owns_attachment_object(name)
  );

CREATE POLICY "Users can delete their own attachment files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'attachments'
    AND public.user_owns_attachment_object(name)
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.attachments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.attachments TO authenticated;
GRANT ALL ON TABLE public.attachments TO service_role;

-- ============================================================================
-- ROLLBACK (not applied; run manually if needed)
-- Restores the previous storage policies from 20260903201100.
--
-- DROP POLICY IF EXISTS "Users can delete their own attachment files" ON storage.objects;
-- DROP POLICY IF EXISTS "Users can upload their own attachment files" ON storage.objects;
-- DROP POLICY IF EXISTS "Users can view their own attachment files" ON storage.objects;
-- DROP FUNCTION IF EXISTS public.user_owns_attachment_object(text);
-- ============================================================================
