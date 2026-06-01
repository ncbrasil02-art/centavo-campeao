ALTER TABLE public.site_settings 
ADD COLUMN IF NOT EXISTS logo_height INTEGER DEFAULT 40,
ADD COLUMN IF NOT EXISTS google_reviews_widget TEXT;