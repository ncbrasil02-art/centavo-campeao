GRANT SELECT ON public.banners TO anon;
GRANT SELECT ON public.banners TO authenticated;

DROP POLICY IF EXISTS "Public read banners" ON public.banners;
CREATE POLICY "Public read banners" ON public.banners FOR SELECT USING (active = true);
