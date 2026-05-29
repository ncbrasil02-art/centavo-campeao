-- Add hero_display_mode to site_settings
ALTER TABLE public.site_settings 
ADD COLUMN IF NOT EXISTS hero_display_mode TEXT DEFAULT 'phrases' CHECK (hero_display_mode IN ('phrases', 'banners'));

-- Update existing record if it exists
UPDATE public.site_settings SET hero_display_mode = 'phrases' WHERE hero_display_mode IS NULL;
