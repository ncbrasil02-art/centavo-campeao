-- 1. Garantir permissões de execução
GRANT EXECUTE ON FUNCTION public.tick_auctions() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.process_robot_bids() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.place_bid(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.place_bid(uuid, uuid) TO anon, authenticated, service_role;

-- 2. Reforçar process_robot_bids para ser ultra-agressivo
CREATE OR REPLACE FUNCTION public.process_robot_bids()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_auction RECORD;
    v_robot_id UUID;
    v_bid_result jsonb;
    v_bids_placed INTEGER := 0;
    v_last_bidder_is_bot BOOLEAN;
    v_time_remaining_ms FLOAT;
BEGIN
    FOR v_auction IN 
        SELECT a.id, s.bid_chance, a.timer_duration, a.last_bidder_id, a.end_time
        FROM public.auctions a
        JOIN public.robot_settings s ON a.id = s.auction_id
        WHERE a.status = 'live' 
          AND a.robot_enabled = true 
          AND s.active = true
    LOOP
        v_time_remaining_ms := EXTRACT(EPOCH FROM (v_auction.end_time - now())) * 1000;
        
        -- Verifica se o último lance foi de robô
        v_last_bidder_is_bot := false;
        IF v_auction.last_bidder_id IS NOT NULL THEN
            SELECT is_bot INTO v_last_bidder_is_bot FROM public.profiles WHERE id = v_auction.last_bidder_id;
        END IF;
        v_last_bidder_is_bot := COALESCE(v_last_bidder_is_bot, false);

        -- Lógica de disputa ULTRA AGRESSIVA para o teste:
        -- Robô dá lance se o tempo baixar de 80% OU se o último lance não for dele
        IF (v_time_remaining_ms <= (v_auction.timer_duration * 1000 * 0.9)) AND (NOT v_last_bidder_is_bot OR v_time_remaining_ms <= 3000) THEN
            -- Seleciona robô
            SELECT id INTO v_robot_id FROM public.profiles WHERE is_bot = true ORDER BY random() LIMIT 1;
            
            IF v_robot_id IS NOT NULL THEN
                v_bid_result := public.place_bid(v_auction.id, v_robot_id);
                IF (v_bid_result->>'success')::boolean THEN
                    v_bids_placed := v_bids_placed + 1;
                    UPDATE public.robot_settings SET last_robot_bid_at = now() WHERE auction_id = v_auction.id;
                END IF;
            END IF;
        END IF;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'bids_placed', v_bids_placed);
END;
$$;

-- 3. Reiniciar leilão do MacBook M3
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
        now() + interval '30 seconds',
        30, 
        'live', 
        0.01, 
        0, 
        true
    ) RETURNING id INTO v_auction_id;

    UPDATE public.robot_settings 
    SET active = true,
        bid_chance = 1.0, -- 100% de chance para o teste
        stop_after_minutes = 60,
        start_after_minutes = 0,
        min_delay = 1,
        max_delay = 2
    WHERE auction_id = v_auction_id;
END $$;
