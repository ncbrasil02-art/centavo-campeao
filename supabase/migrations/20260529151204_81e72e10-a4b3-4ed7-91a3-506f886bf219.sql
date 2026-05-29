-- Install unaccent extension
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Ensure grants are correct
GRANT SELECT ON public.products TO authenticated, anon;
GRANT SELECT ON public.auctions TO authenticated, anon;
GRANT SELECT ON public.profiles TO authenticated, anon;

-- Drop and recreate slugify to use unaccent
DROP FUNCTION IF EXISTS public.slugify(text);
CREATE OR REPLACE FUNCTION public.slugify(v_text text) RETURNS text AS $$
  SELECT lower(regexp_replace(regexp_replace(public.unaccent(v_text), '[^a-zA-Z0-9\s]+', '', 'g'), '\s+', '-', 'g'))
$$ LANGUAGE sql IMMUTABLE;

-- Ensure admin has full access via RLS
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Admins can manage products" 
ON public.products 
FOR ALL 
TO authenticated 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "Admins can manage auctions" ON public.auctions;
CREATE POLICY "Admins can manage auctions" 
ON public.auctions 
FOR ALL 
TO authenticated 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));
