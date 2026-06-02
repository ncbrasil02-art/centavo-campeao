CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
  DECLARE
    base_username TEXT;
    final_username TEXT;
    counter INTEGER := 0;
  BEGIN
    base_username := new.raw_user_meta_data->>'username';
    IF base_username IS NULL THEN
      base_username := split_part(new.email, '@', 1);
    END IF;
    
    final_username := base_username;
    
    -- Ensure username is unique by appending a counter if necessary
    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username AND id != new.id) LOOP
      counter := counter + 1;
      final_username := base_username || counter::text;
    END LOOP;

    INSERT INTO public.profiles (id, full_name, username, cpf, phone, gender, bid_balance, is_admin, avatar_url)
    VALUES (
      new.id,
      new.raw_user_meta_data->>'full_name',
      final_username,
      new.raw_user_meta_data->>'cpf',
      new.raw_user_meta_data->>'phone',
      new.raw_user_meta_data->>'gender',
      5, -- Initial free bids
      CASE WHEN new.email = 'leandrobrum2009@gmail.com' THEN true ELSE false END,
      new.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      username = EXCLUDED.username,
      cpf = EXCLUDED.cpf,
      phone = EXCLUDED.phone,
      gender = EXCLUDED.gender,
      avatar_url = EXCLUDED.avatar_url,
      is_admin = CASE WHEN new.email = 'leandrobrum2009@gmail.com' THEN true ELSE profiles.is_admin END;
    RETURN new;
  END;
$function$;
