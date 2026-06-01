-- Grant permissions for existing tables
GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT SELECT ON public.testimonials TO anon, authenticated;
GRANT SELECT ON public.auctions TO anon, authenticated;
GRANT SELECT ON public.products TO anon, authenticated;
GRANT SELECT ON public.winners TO anon, authenticated;
GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT SELECT ON public.chat_messages TO anon, authenticated;
GRANT SELECT ON public.bids TO anon, authenticated;
GRANT SELECT ON public.robot_settings TO anon, authenticated;

-- Ensure service_role has all permissions
GRANT ALL ON public.site_settings TO service_role;
GRANT ALL ON public.testimonials TO service_role;
GRANT ALL ON public.auctions TO service_role;
GRANT ALL ON public.products TO service_role;
GRANT ALL ON public.winners TO service_role;
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.chat_messages TO service_role;
GRANT ALL ON public.bids TO service_role;
GRANT ALL ON public.robot_settings TO service_role;

-- Ensure RLS is enabled
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.winners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;

-- Ensure public read policies exist if not already there
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read site_settings') THEN
        CREATE POLICY "Public read site_settings" ON public.site_settings FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read testimonials') THEN
        CREATE POLICY "Public read testimonials" ON public.testimonials FOR SELECT USING (active = true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read auctions') THEN
        CREATE POLICY "Public read auctions" ON public.auctions FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read products') THEN
        CREATE POLICY "Public read products" ON public.products FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read winners') THEN
        CREATE POLICY "Public read winners" ON public.winners FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read profiles') THEN
        CREATE POLICY "Public read profiles" ON public.profiles FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read chat_messages') THEN
        CREATE POLICY "Public read chat_messages" ON public.chat_messages FOR SELECT USING (true);
    END IF;
END $$;
