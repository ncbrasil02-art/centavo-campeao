-- Explicitly grant SELECT to public roles
GRANT SELECT ON public.products TO authenticated, anon;
GRANT SELECT ON public.auctions TO authenticated, anon;
GRANT SELECT ON public.profiles TO authenticated, anon;
GRANT SELECT ON public.bid_packages TO authenticated, anon;
GRANT SELECT ON public.app_phrases TO authenticated, anon;
GRANT SELECT ON public.banners TO authenticated, anon;
GRANT SELECT ON public.testimonials TO authenticated, anon;

-- Update RLS policies to use roles explicitly
DROP POLICY IF EXISTS "Products are viewable by everyone" ON public.products;
CREATE POLICY "Products are viewable by everyone" ON public.products FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "Auctions are viewable by everyone" ON public.auctions;
CREATE POLICY "Auctions are viewable by everyone" ON public.auctions FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT TO authenticated, anon USING (true);
