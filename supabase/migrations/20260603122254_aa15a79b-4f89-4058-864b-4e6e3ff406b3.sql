-- 7. Remove sensitive columns from profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS cpf;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS phone;
