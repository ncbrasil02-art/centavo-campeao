-- Fix the trigger function to handle INSERT correctly
CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_columns()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only apply protection on UPDATE, as OLD is not available on INSERT
  IF (TG_OP = 'UPDATE') THEN
    IF (current_user = 'authenticated') THEN
      NEW.bid_balance := OLD.bid_balance;
      NEW.is_admin := OLD.is_admin;
      NEW.is_bot := OLD.is_bot;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Ensure the user leandrobrum2009@gmail.com is an admin in profiles
UPDATE public.profiles 
SET is_admin = true 
WHERE id IN (
  -- We use a subquery to avoid needing direct access to auth.users in the UPDATE if possible,
  -- but since we are in a migration, we can try to use the known ID or email if we had it.
  -- Since I already found the ID ad8443eb-d096-46ad-ba39-07abdba01fdb, I will use that.
  'ad8443eb-d096-46ad-ba39-07abdba01fdb'
);

-- Also ensure the username 'brum' (another admin) is set correctly if needed
UPDATE public.profiles SET is_admin = true WHERE username = 'brum';
