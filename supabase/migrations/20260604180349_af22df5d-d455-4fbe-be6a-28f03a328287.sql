CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
  DECLARE
    base_username TEXT;
    final_username TEXT;
    counter INTEGER := 0;
    v_welcome_bids INTEGER;
  BEGIN
    -- Obter a quantidade de lances configurada
    SELECT welcome_bids INTO v_welcome_bids FROM public.site_settings LIMIT 1;
    
    -- Se não houver configuração, padrão é 5
    IF v_welcome_bids IS NULL THEN
      v_welcome_bids := 5;
    END IF;

    base_username := new.raw_user_meta_data->>'username';
    IF base_username IS NULL THEN
      base_username := split_part(new.email, '@', 1);
    END IF;
    
    final_username := base_username;
    
    -- Ensure username is unique
    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username AND id != new.id) LOOP
      counter := counter + 1;
      final_username := base_username || counter::text;
    END LOOP;

    -- Insert into public profiles (safe data)
    INSERT INTO public.profiles (id, full_name, username, gender, bid_balance, is_admin, avatar_url)
    VALUES (
      new.id,
      new.raw_user_meta_data->>'full_name',
      final_username,
      new.raw_user_meta_data->>'gender',
      v_welcome_bids, -- Initial bids from settings
      CASE WHEN new.email = 'leandrobrum2009@gmail.com' THEN true ELSE false END,
      new.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      username = EXCLUDED.username,
      gender = EXCLUDED.gender,
      avatar_url = EXCLUDED.avatar_url;

    -- Insert into profile_secrets (sensitive data)
    INSERT INTO public.profile_secrets (id, cpf, phone)
    VALUES (
      new.id,
      new.raw_user_meta_data->>'cpf',
      new.raw_user_meta_data->>'phone'
    )
    ON CONFLICT (id) DO UPDATE SET
      cpf = EXCLUDED.cpf,
      phone = EXCLUDED.phone;

    RETURN new;
  END;
$function$
;
