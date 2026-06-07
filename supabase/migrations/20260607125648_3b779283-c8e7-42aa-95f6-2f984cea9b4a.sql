-- Restore base permissions for profiles table
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
GRANT SELECT ON public.profiles TO anon;

-- Fix is_admin function to avoid recursion and ensure security
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE id = auth.uid() 
    AND is_admin = true
  );
END;
$$;

-- Ensure it's executable by authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;

-- Refresh permissions on auctions as well just in case
GRANT ALL ON public.auctions TO authenticated;
GRANT ALL ON public.auctions TO service_role;
GRANT SELECT ON public.auctions TO anon;
