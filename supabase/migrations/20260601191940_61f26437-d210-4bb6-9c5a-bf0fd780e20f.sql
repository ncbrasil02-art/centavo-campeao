CREATE OR REPLACE FUNCTION public.place_bid(p_auction_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
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

   -- Modality Restrictions (only for real users, bots skip these except free/min_balance if applicable)
   IF NOT COALESCE(v_is_bot, false) THEN
     -- Novice check
     IF v_modality = 'novice' THEN
       SELECT EXISTS (SELECT 1 FROM public.winners WHERE user_id = v_user_id) INTO v_has_won;
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
 BEGIN
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
