-- Create a security definer function to check if a user is an admin without causing recursion
CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop the old policy that causes recursion
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;

-- Re-create the admin policy using the non-recursive function
CREATE POLICY "Admins can manage all profiles" ON public.profiles
FOR ALL
USING (public.check_is_admin());

-- Ensure the trigger function also has a fixed search path (best practice)
ALTER FUNCTION public.handle_new_user() SET search_path = public;
