ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT 'image' CHECK (media_type IN ('image', 'video'));
ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS transition_duration INTEGER DEFAULT 5;

-- Grant permissions (if needed, though usually inherited)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.banners TO authenticated;
GRANT SELECT ON public.banners TO anon;
GRANT ALL ON public.banners TO service_role;