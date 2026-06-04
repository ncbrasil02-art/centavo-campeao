ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS whatsapp_float_enabled BOOLEAN DEFAULT true;
