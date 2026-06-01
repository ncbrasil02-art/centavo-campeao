CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
 BEGIN
   INSERT INTO public.profiles (id, full_name, username, cpf, phone, gender, bid_balance, is_admin)
   VALUES (
     new.id,
     new.raw_user_meta_data->>'full_name',
     new.raw_user_meta_data->>'username',
     new.raw_user_meta_data->>'cpf',
     new.raw_user_meta_data->>'phone',
     new.raw_user_meta_data->>'gender',
     5, -- Initial free bids
     false
   )
   ON CONFLICT (id) DO UPDATE SET
     full_name = EXCLUDED.full_name,
     username = EXCLUDED.username,
     cpf = EXCLUDED.cpf,
     phone = EXCLUDED.phone,
     gender = EXCLUDED.gender;
   RETURN new;
 END;
$function$;
