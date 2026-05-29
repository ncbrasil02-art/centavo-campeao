-- Grant permissions for profiles table
GRANT SELECT ON public.profiles TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON public.profiles TO authenticated, service_role;

-- Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Re-apply policies just in case
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update their own profile basic info" ON public.profiles;
CREATE POLICY "Users can update their own profile basic info" ON public.profiles
FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
CREATE POLICY "Admins can manage all profiles" ON public.profiles
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- Also check site_settings and testimonials
GRANT SELECT ON public.site_settings TO anon, authenticated, service_role;
GRANT ALL ON public.site_settings TO service_role;

GRANT SELECT ON public.testimonials TO anon, authenticated, service_role;
GRANT ALL ON public.testimonials TO authenticated, service_role;
