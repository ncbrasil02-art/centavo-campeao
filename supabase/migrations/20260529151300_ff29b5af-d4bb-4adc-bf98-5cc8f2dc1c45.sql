-- Re-enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auctions ENABLE ROW LEVEL SECURITY;

-- Ensure grants on views
GRANT SELECT ON public.v_home_live_auctions TO authenticated, anon;
GRANT SELECT ON public.v_home_recent_winners TO authenticated, anon;
GRANT SELECT ON public.v_user_ranking TO authenticated, anon;

-- Explicitly allow admins to do anything on products and auctions
-- This is already there but let's make it super clear
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Admins can manage products" 
ON public.products 
FOR ALL 
TO authenticated 
USING (
  (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
  OR 
  auth.uid() = 'cdf027bb-f239-4ba0-b8a9-7bf52341df4b'
);

DROP POLICY IF EXISTS "Admins can manage auctions" ON public.auctions;
CREATE POLICY "Admins can manage auctions" 
ON public.auctions 
FOR ALL 
TO authenticated 
USING (
  (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
  OR 
  auth.uid() = 'cdf027bb-f239-4ba0-b8a9-7bf52341df4b'
);
