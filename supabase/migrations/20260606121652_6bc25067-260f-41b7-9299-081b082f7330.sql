-- Conceder explicitamente permissão de leitura para anon e authenticated
GRANT SELECT ON public.banners TO anon;
GRANT SELECT ON public.banners TO authenticated;

-- Garantir que a política pública esteja correta e aplicada a todos
DROP POLICY IF EXISTS "Public read banners" ON public.banners;
CREATE POLICY "Public read banners" ON public.banners FOR SELECT TO anon, authenticated USING (active = true);
