-- Create helper function to check admin status safely
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT COALESCE(is_admin, false) FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Fix Profiles policies
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
CREATE POLICY "Admins can manage all profiles" 
ON public.profiles 
FOR ALL 
TO authenticated 
USING (id = auth.uid() OR public.is_admin());

-- Fix Products policies
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Admins can manage products" 
ON public.products 
FOR ALL 
TO authenticated 
USING (public.is_admin() OR auth.uid() = 'cdf027bb-f239-4ba0-b8a9-7bf52341df4b');

-- Fix Auctions policies
DROP POLICY IF EXISTS "Admins can manage auctions" ON public.auctions;
CREATE POLICY "Admins can manage auctions" 
ON public.auctions 
FOR ALL 
TO authenticated 
USING (public.is_admin() OR auth.uid() = 'cdf027bb-f239-4ba0-b8a9-7bf52341df4b');

-- Ensure SELECT is always possible for everyone
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "Products are viewable by everyone" ON public.products;
CREATE POLICY "Products are viewable by everyone" ON public.products FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "Auctions are viewable by everyone" ON public.auctions;
CREATE POLICY "Auctions are viewable by everyone" ON public.auctions FOR SELECT TO authenticated, anon USING (true);
