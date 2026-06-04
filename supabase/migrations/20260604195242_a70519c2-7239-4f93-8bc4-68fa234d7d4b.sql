ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- Sync existing data
UPDATE public.profiles p
SET phone = ps.phone
FROM public.profile_secrets ps
WHERE p.id = ps.id AND p.phone IS NULL;