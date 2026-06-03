-- 1. Ajustar place_bid para aceitar lances de robôs sem auth.uid()
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
   v_caller_id UUID;
 BEGIN
   -- Permite que robôs deem lances mesmo se disparado via RPC de sistema
   v_caller_id := auth.uid();
   
   -- Habilita acesso privilegiado
   PERFORM set_config('app.allow_profile_update', 'true', true);
   PERFORM set_config('app.allow_auction_update', 'true', true);
   PERFORM set_config('app.allow_bid_insert', 'true', true);

   -- 1. Detalhes do leilão
   SELECT status, current_price, end_time, timer_duration, modality, min_balance_required
   INTO v_auction_status, v_current_price, v_end_time, v_timer_duration, v_modality, v_min_balance_required
   FROM public.auctions
   WHERE id = p_auction_id
   FOR UPDATE;

   IF v_auction_status != 'live' THEN
     RETURN jsonb_build_object('success', false, 'message', 'O leilão não está ativo.');
   END IF;

   -- 2. Detalhes do usuário alvo (o robô ou o humano)
   SELECT bid_balance, gender, is_bot INTO v_bid_balance, v_user_gender, v_is_bot
   FROM public.profiles
   WHERE id = p_user_id
   FOR UPDATE;

   -- Verificação de segurança simplificada para permitir robôs
   IF NOT v_is_bot AND v_caller_id IS NULL THEN
     RETURN jsonb_build_object('success', false, 'message', 'Não autorizado.');
   END IF;

   -- 3. Custo do lance (grátis para robôs)
   IF v_modality = 'free' OR v_is_bot THEN
     v_bid_cost := 0;
   END IF;

   -- 4. Verificar saldo (apenas humanos)
   IF NOT v_is_bot AND v_bid_balance < v_bid_cost THEN
     RETURN jsonb_build_object('success', false, 'message', 'Saldo insuficiente.');
   END IF;

   -- 5. Deduzir saldo
   IF v_bid_cost > 0 THEN
     UPDATE public.profiles SET bid_balance = bid_balance - v_bid_cost WHERE id = p_user_id;
   END IF;

   -- 6. Atualizar leilão
   UPDATE public.auctions
   SET
     current_price = current_price + 0.01,
     bid_count = bid_count + 1,
     last_bidder_id = p_user_id,
     end_time = now() + (v_timer_duration || ' seconds')::interval
   WHERE id = p_auction_id;

   -- 7. Gravar lance
   INSERT INTO public.bids (auction_id, user_id, price_at_bid)
   VALUES (p_auction_id, p_user_id, v_current_price + 0.01);

   RETURN jsonb_build_object('success', true, 'new_price', v_current_price + 0.01);
 END;
$function$;

-- 2. Limpeza total e Reinício Imediato
DELETE FROM public.auctions WHERE status IN ('live', 'scheduled', 'pending_audit');

DO $$
DECLARE
    v_auction_id UUID;
    v_product_id UUID;
BEGIN
    SELECT id INTO v_product_id FROM public.products WHERE name LIKE '%MacBook Air%' LIMIT 1;
    
    INSERT INTO public.auctions (
        product_id, 
        start_time, 
        end_time,
        timer_duration, 
        status, 
        current_price, 
        bid_count, 
        robot_enabled
    ) VALUES (
        v_product_id, 
        now(), 
        now() + interval '45 seconds',
        30, 
        'live', 
        0.01, 
        0, 
        true
    ) RETURNING id INTO v_auction_id;

    -- Configuração de robô agressivo
    UPDATE public.robot_settings 
    SET active = true,
        bid_chance = 0.99,
        stop_after_minutes = 30,
        start_after_minutes = 0
    WHERE auction_id = v_auction_id;
END $$;
