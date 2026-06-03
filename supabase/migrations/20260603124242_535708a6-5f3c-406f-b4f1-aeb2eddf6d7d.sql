-- Switch is_admin to SECURITY INVOKER
CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(is_admin, false) FROM public.profiles WHERE id = auth.uid();
$function$;

-- Switch check_is_admin to SECURITY INVOKER
CREATE OR REPLACE FUNCTION public.check_is_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_admin = true
  );
END;
$function$;
