-- 1. Move unaccent to extensions schema
CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION unaccent SET SCHEMA extensions;

-- 2. Create profile_secrets table
CREATE TABLE IF NOT EXISTS public.profile_secrets (
    id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    cpf TEXT,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Copy existing data from profiles to profile_secrets
INSERT INTO public.profile_secrets (id, cpf, phone)
SELECT id, cpf, phone FROM public.profiles
ON CONFLICT (id) DO UPDATE SET 
    cpf = EXCLUDED.cpf, 
    phone = EXCLUDED.phone;

-- 3. Update handle_new_user trigger to handle both tables
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
      5, -- Initial free bids
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
$function$;

-- 4. Set up RLS for profile_secrets
ALTER TABLE public.profile_secrets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own secrets"
ON public.profile_secrets
FOR ALL
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Grant permissions to appropriate roles
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_secrets TO authenticated;
GRANT ALL ON public.profile_secrets TO service_role;

-- 5. Tighten place_robot_bid function
CREATE OR REPLACE FUNCTION public.place_robot_bid(p_auction_id uuid, p_robot_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_current_price DECIMAL(10, 2);
  v_auction_status TEXT;
  v_end_time TIMESTAMP WITH TIME ZONE;
  v_timer_duration INTEGER;
  v_is_bot BOOLEAN;
  v_is_admin BOOLEAN;
BEGIN
  -- Security check: only admins or service_role can call this
  SELECT is_admin INTO v_is_admin FROM public.profiles WHERE id = auth.uid();
  IF auth.uid() IS NOT NULL AND NOT COALESCE(v_is_admin, false) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Não autorizado. Apenas administradores podem acionar robôs.');
  END IF;

  -- Verify bot
  SELECT is_bot INTO v_is_bot FROM public.profiles WHERE id = p_robot_id;
  IF NOT COALESCE(v_is_bot, false) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Este usuário não é um robô.');
  END IF;

  -- Check status
  SELECT status, current_price, end_time, timer_duration
  INTO v_auction_status, v_current_price, v_end_time, v_timer_duration
  FROM public.auctions 
  WHERE id = p_auction_id
  FOR UPDATE;
  
  IF v_auction_status != 'live' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Leilão inativo.');
  END IF;

  IF v_end_time <= now() THEN
    UPDATE public.auctions SET status = 'finished' WHERE id = p_auction_id;
    RETURN jsonb_build_object('success', false, 'message', 'Leilão expirado.');
  END IF;

  -- Update auction
  UPDATE public.auctions 
  SET 
    current_price = current_price + 0.01,
    bid_count = bid_count + 1,
    last_bidder_id = p_robot_id,
    end_time = now() + (v_timer_duration || ' seconds')::interval
  WHERE id = p_auction_id;

  -- Record bid
  INSERT INTO public.bids (auction_id, user_id, price_at_bid) 
  VALUES (p_auction_id, p_robot_id, v_current_price + 0.01);

  RETURN jsonb_build_object('success', true, 'new_price', v_current_price + 0.01);
END;
$function$;

-- 6. Tighten place_bid(uuid, uuid) function
CREATE OR REPLACE FUNCTION public.place_bid(p_auction_id uuid, p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
 DECLARE
   v_current_price DECIMAL(10, 2);
   v_bid_balance INTEGER;
   v_auction_status TEXT;
   v_end_time TIMESTAMP WITH TIME ZONE;
   v_timer_duration INTEGER;
   v_bid_cost INTEGER := 1;
   v_modality TEXT;
   v_min_balance_required NUMERIC(10,2);
   v_user_gender TEXT;
   v_has_won BOOLEAN;
   v_is_bot BOOLEAN;
   v_is_admin BOOLEAN;
 BEGIN
   -- Security check: only admin or the user themselves or service_role
   SELECT is_admin INTO v_is_admin FROM public.profiles WHERE id = auth.uid();
   IF auth.uid() != p_user_id AND NOT COALESCE(v_is_admin, false) AND auth.uid() IS NOT NULL THEN
      RETURN jsonb_build_object('success', false, 'message', 'Não autorizado. Você só pode dar lances em seu próprio nome.');
   END IF;

   -- 1. Check auction details
   SELECT status, current_price, end_time, timer_duration, modality, min_balance_required
   INTO v_auction_status, v_current_price, v_end_time, v_timer_duration, v_modality, v_min_balance_required
   FROM public.auctions
   WHERE id = p_auction_id
   FOR UPDATE;

   IF v_auction_status != 'live' THEN
     RETURN jsonb_build_object('success', false, 'message', 'O leilão não está ativo.');
   END IF;

   IF v_end_time <= now() THEN
     UPDATE public.auctions SET status = 'finished' WHERE id = p_auction_id;
     RETURN jsonb_build_object('success', false, 'message', 'O leilão já encerrou.');
   END IF;

   -- 2. Check user profile
   SELECT bid_balance, gender, is_bot INTO v_bid_balance, v_user_gender, v_is_bot
   FROM public.profiles
   WHERE id = p_user_id
   FOR UPDATE;

   -- Modality Restrictions (only for real users, bots skip these)
   IF NOT COALESCE(v_is_bot, false) THEN
     -- Novice check
     IF v_modality = 'novice' THEN
       SELECT EXISTS (SELECT 1 FROM public.winners WHERE user_id = p_user_id) INTO v_has_won;
       IF v_has_won THEN
         RETURN jsonb_build_object('success', false, 'message', 'Este leilão é exclusivo para quem nunca ganhou.');
       END IF;
     END IF;

     -- Gender check
     IF v_modality = 'male' AND (v_user_gender IS NULL OR v_user_gender != 'male') THEN
       RETURN jsonb_build_object('success', false, 'message', 'Este leilão é exclusivo para homens.');
     END IF;
     IF v_modality = 'female' AND (v_user_gender IS NULL OR v_user_gender != 'female') THEN
       RETURN jsonb_build_object('success', false, 'message', 'Este leilão é exclusivo para mulheres.');
     END IF;

     -- Min Balance check
     IF v_modality = 'min_balance' AND v_bid_balance < v_min_balance_required THEN
       RETURN jsonb_build_object('success', false, 'message', 'Saldo mínimo necessário.');
     END IF;
   END IF;

   -- 3. Determine bid cost
   IF v_modality = 'free' THEN
     v_bid_cost := 0;
   END IF;

   -- 4. Check balance
   IF v_bid_balance < v_bid_cost THEN
     RETURN jsonb_build_object('success', false, 'message', 'Saldo de lances insuficiente.');
   END IF;

   -- 5. Deduct balance
   IF v_bid_cost > 0 THEN
     UPDATE public.profiles
     SET bid_balance = bid_balance - v_bid_cost
     WHERE id = p_user_id;
   END IF;

   -- 6. Update auction
   UPDATE public.auctions
   SET
     current_price = current_price + 0.01,
     bid_count = bid_count + 1,
     last_bidder_id = p_user_id,
     end_time = now() + (v_timer_duration || ' seconds')::interval
   WHERE id = p_auction_id;

   -- 7. Record bid
   INSERT INTO public.bids (auction_id, user_id, price_at_bid)
   VALUES (p_auction_id, p_user_id, v_current_price + 0.01);

   RETURN jsonb_build_object('success', true, 'new_price', v_current_price + 0.01);
 END;
$function$;

-- 7. Remove sensitive columns from profiles (after confirming code updates are ready)
-- We will do this after updating the frontend code.
-- For now, we keep them but discourage their use.
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS cpf;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS phone;
