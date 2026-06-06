-- Conceder permissões de leitura para o papel anon (visitantes) e authenticated (usuários logados)
GRANT SELECT ON public.banners TO anon, authenticated;
GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT SELECT ON public.app_phrases TO anon, authenticated;
GRANT SELECT ON public.auctions TO anon, authenticated;
GRANT SELECT ON public.products TO anon, authenticated;

-- Garantir que as tabelas tenham RLS habilitado e políticas de leitura pública
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read banners" ON public.banners;
CREATE POLICY "Public read banners" ON public.banners FOR SELECT TO public USING (active = true);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read site_settings" ON public.site_settings;
CREATE POLICY "Public read site_settings" ON public.site_settings FOR SELECT TO public USING (true);

ALTER TABLE public.app_phrases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read app_phrases" ON public.app_phrases;
CREATE POLICY "Public read app_phrases" ON public.app_phrases FOR SELECT TO public USING (active = true);

-- Ajustar permissões de sequências se necessário (geralmente não para SELECT, mas por precaução)
-- GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
