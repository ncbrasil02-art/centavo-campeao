-- 1. Update tick_auctions to allow execution by all authenticated users for state advancement
CREATE OR REPLACE FUNCTION public.tick_auctions()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_pending_count INTEGER := 0;
    v_started_count INTEGER := 0;
    v_finished_count INTEGER := 0;
    v_is_admin BOOLEAN;
BEGIN
    -- Permitir avançar estados se o tempo passou, independente de ser admin
    -- (Opcional: registrar quem disparou se necessário, mas para manutenção de estado temporal é seguro)

    -- 1. Iniciar leilões agendados
    WITH started AS (
        UPDATE public.auctions
        SET 
            status = 'live',
            -- Garante que o end_time inicial use o timer_duration configurado
            end_time = now() + (COALESCE(timer_duration, 15) || ' seconds')::interval
        WHERE status = 'scheduled' AND start_time <= now()
        RETURNING id
    )
    SELECT count(*) INTO v_started_count FROM started;

    -- 2. Mover leilões expirados para auditoria pendente
    WITH pending AS (
        UPDATE public.auctions
        SET status = 'pending_audit'
        WHERE status = 'live' AND end_time <= (now() - interval '1 second')
        RETURNING id
    )
    SELECT count(*) INTO v_pending_count FROM pending;

    -- 3. Mover confirmados para finalizados após 5 minutos
    WITH finished AS (
        UPDATE public.auctions
        SET status = 'finished'
        WHERE status = 'confirmed' AND confirmed_at <= now() - interval '5 minutes'
        RETURNING id
    )
    SELECT count(*) INTO v_finished_count FROM finished;

    RETURN jsonb_build_object(
        'success', true,
        'started_count', v_started_count,
        'pending_count', v_pending_count,
        'finished_count', v_finished_count,
        'timestamp', now()
    );
END;
$function$;

-- 2. Update place_bid (two arguments) to allow robot bids even if triggered by regular users
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
   v_target_is_bot BOOLEAN;
 BEGIN
   -- Check if the target user is a bot
   SELECT is_bot INTO v_target_is_bot FROM public.profiles WHERE id = p_user_id;
   
   -- Security check: allow if it's the user themselves, or if caller is admin, OR if target is a bot (for system-triggered robot bids)
   SELECT is_admin INTO v_is_admin FROM public.profiles WHERE id = auth.uid();
   
   IF auth.uid() != p_user_id AND NOT COALESCE(v_is_admin, false) AND NOT COALESCE(v_target_is_bot, false) AND auth.uid() IS NOT NULL THEN
      RETURN jsonb_build_object('success', false, 'message', 'Não autorizado.');
   END IF;

   -- Enable privileged access
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

   -- 2. Check target user profile
   SELECT bid_balance, gender, is_bot INTO v_bid_balance, v_user_gender, v_is_bot
   FROM public.profiles
   WHERE id = p_user_id
   FOR UPDATE;

   -- 3. Determine bid cost (bots usually don't pay or have infinite balance, but we can check if needed)
   IF v_modality = 'free' OR COALESCE(v_is_bot, false) THEN
     v_bid_cost := 0;
   END IF;

   -- 4. Check balance (only for non-bots)
   IF NOT COALESCE(v_is_bot, false) AND v_bid_balance < v_bid_cost THEN
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
