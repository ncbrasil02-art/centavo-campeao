-- Garantir permissões de leitura para todos os papéis relevantes
GRANT SELECT ON public.banners TO anon;
GRANT SELECT ON public.banners TO authenticated;
GRANT SELECT ON public.banners TO service_role;

-- Recriar política de RLS para ser explicitamente pública
DROP POLICY IF EXISTS "Public read banners" ON public.banners;
CREATE POLICY "Public read banners" ON public.banners 
FOR SELECT 
TO public 
USING (active = true);

-- Forçar a ativação de RLS (caso não esteja)
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
