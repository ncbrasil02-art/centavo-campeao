-- Enable public access to banners
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'banners' AND policyname = 'Public can view active banners'
    ) THEN
        CREATE POLICY "Public can view active banners" ON public.banners
            FOR SELECT USING (active = true);
    END IF;
END $$;

-- Enable public access to site_settings (some configurations might be needed for the UI)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'site_settings' AND policyname = 'Public can view site settings'
    ) THEN
        CREATE POLICY "Public can view site settings" ON public.site_settings
            FOR SELECT USING (true);
    END IF;
END $$;

-- Grant necessary permissions just in case
GRANT SELECT ON public.banners TO anon;
GRANT SELECT ON public.site_settings TO anon;
