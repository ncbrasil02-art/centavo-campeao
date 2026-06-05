ALTER TABLE public.site_settings ADD COLUMN sales_page_enabled BOOLEAN DEFAULT false;
GRANT ALL ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;
GRANT SELECT ON public.site_settings TO anon;
