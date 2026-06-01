ALTER TABLE public.site_settings ADD COLUMN theme_mode TEXT DEFAULT 'dark';

-- Update existing row to have 'dark' as default if not already set
UPDATE public.site_settings SET theme_mode = 'dark' WHERE theme_mode IS NULL;