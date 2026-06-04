ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS terms_of_use TEXT;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS privacy_policy TEXT;

-- Garantir que as colunas sejam acessíveis publicamente para leitura
GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT ALL ON public.site_settings TO service_role;
