ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS pwa_enabled BOOLEAN DEFAULT true;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS android_app_url TEXT;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS ios_app_url TEXT;
