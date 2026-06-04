ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS sound_enabled BOOLEAN DEFAULT true;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS narration_enabled BOOLEAN DEFAULT true;

-- Update existing row to ensure defaults are applied
UPDATE public.site_settings SET sound_enabled = true, narration_enabled = true WHERE sound_enabled IS NULL;