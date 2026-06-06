-- Fix anonymous banner reads.
-- Older banner admin policies referenced profiles from the public role, which can
-- make anonymous SELECT requests fail with "permission denied for table profiles".

ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.banners TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.banners TO authenticated;

CREATE OR REPLACE FUNCTION public.can_manage_banners()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT p.is_admin
      FROM public.profiles AS p
      WHERE p.id = auth.uid()
      LIMIT 1
    ),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.can_manage_banners() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_banners() TO authenticated;

DO $$
DECLARE
  banner_policy record;
BEGIN
  FOR banner_policy IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'banners'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.banners', banner_policy.policyname);
  END LOOP;
END $$;

CREATE POLICY "Public read active banners"
ON public.banners
FOR SELECT
TO anon, authenticated
USING (active = true);

CREATE POLICY "Admins manage banners"
ON public.banners
FOR ALL
TO authenticated
USING (public.can_manage_banners())
WITH CHECK (public.can_manage_banners());
