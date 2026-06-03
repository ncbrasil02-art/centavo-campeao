-- 1. Update Profile Protection Trigger
CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_columns()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    -- Allow update if the special session variable is set
    IF (current_setting('app.allow_profile_update', true) = 'true') THEN
      RETURN NEW;
    END IF;

    IF (current_user = 'authenticated') THEN
      NEW.bid_balance := OLD.bid_balance;
      NEW.is_admin := OLD.is_admin;
      NEW.is_bot := OLD.is_bot;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 2. Add RLS Policies for privileged operations
-- Auctions
DROP POLICY IF EXISTS "Allow privileged auction update" ON public.auctions;
CREATE POLICY "Allow privileged auction update" ON public.auctions
FOR UPDATE TO authenticated
USING (current_setting('app.allow_auction_update', true) = 'true');

-- Bids
DROP POLICY IF EXISTS "Allow privileged bid insert" ON public.bids;
CREATE POLICY "Allow privileged bid insert" ON public.bids
FOR INSERT TO authenticated
WITH CHECK (current_setting('app.allow_bid_insert', true) = 'true');

-- Transactions
DROP POLICY IF EXISTS "Allow privileged transaction insert" ON public.transactions;
CREATE POLICY "Allow privileged transaction insert" ON public.transactions
FOR INSERT TO authenticated
WITH CHECK (current_setting('app.allow_transaction_insert', true) = 'true');

-- 3. Rewrite place_bid as SECURITY INVOKER
CREATE OR REPLACE FUNCTION public.place_bid(p_auction_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
  DECLARE
    v_user_id uuid;
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
  BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'message', 'Usuário não autenticado.');
    END IF;

    -- Enable privileged access for this transaction
    PERFORM set_config('app.allow_profile_update', 'true', true);
    PERFORM set_config('app.allow_auction_update', 'true', true);
    PERFORM set_config('app.allow_bid_insert', 'true', true);

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
    WHERE id = v_user_id
    FOR UPDATE;

    -- Modality Restrictions
    IF NOT COALESCE(v_is_bot, false) THEN
      IF v_modality = 'novice' THEN
        SELECT EXISTS (SELECT 1 FROM public.winners WHERE user_id = v_user_id) INTO v_has_won;
        IF v_has_won THEN
          RETURN jsonb_build_object('success', false, 'message', 'Este leilão é exclusivo para quem nunca ganhou.');
        END IF;
      END IF;

      IF v_modality = 'male' AND (v_user_gender IS NULL OR v_user_gender != 'male') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Este leilão é exclusivo para homens.');
      END IF;
      IF v_modality = 'female' AND (v_user_gender IS NULL OR v_user_gender != 'female') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Este leilão é exclusivo para mulheres.');
      END IF;

      IF v_modality = 'min_balance' AND v_bid_balance < v_min_balance_required THEN
        RETURN jsonb_build_object('success', false, 'message', 'Saldo mínimo de ' || v_min_balance_required || ' lances necessário.');
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
      WHERE id = v_user_id;
    END IF;

    -- 6. Update auction
    UPDATE public.auctions
    SET
      current_price = current_price + 0.01,
      bid_count = bid_count + 1,
      last_bidder_id = v_user_id,
      end_time = now() + (v_timer_duration || ' seconds')::interval
    WHERE id = p_auction_id;

    -- 7. Record bid
    INSERT INTO public.bids (auction_id, user_id, price_at_bid)
    VALUES (p_auction_id, v_user_id, v_current_price + 0.01);

    RETURN jsonb_build_object('success', true, 'new_price', v_current_price + 0.01);
  END;
$function$;

-- 4. Rewrite create_pending_payment as SECURITY INVOKER
CREATE OR REPLACE FUNCTION public.create_pending_payment(p_package_id uuid, p_method text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_bid_amount integer;
  v_price numeric;
  v_package_name text;
  v_transaction_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Usuário não autenticado.');
  END IF;

  -- Enable privileged access for this transaction
  PERFORM set_config('app.allow_transaction_insert', 'true', true);

  -- Get package details
  SELECT name, bid_amount, price INTO v_package_name, v_bid_amount, v_price
  FROM public.bid_packages
  WHERE id = p_package_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Pacote não encontrado.');
  END IF;

  -- Create pending transaction
  INSERT INTO public.transactions (
    user_id, 
    package_id, 
    amount, 
    type, 
    description, 
    status, 
    payment_method
  )
  VALUES (
    v_user_id, 
    p_package_id, 
    v_price, 
    'purchase', 
    'Compra de pacote: ' || v_package_name, 
    'pending', 
    p_method
  )
  RETURNING id INTO v_transaction_id;

  RETURN jsonb_build_object(
    'success', true, 
    'transaction_id', v_transaction_id,
    'amount', v_price
  );
END;
$function$;
