ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS support_whatsapp TEXT;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;
GRANT SELECT ON public.site_settings TO anon;
