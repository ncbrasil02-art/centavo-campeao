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
    v_random_factor FLOAT;
    v_minutes_since_start FLOAT;
    v_settings RECORD;
BEGIN
    FOR v_auction IN 
        SELECT a.id, a.timer_duration, a.last_bidder_id, a.end_time, a.start_time
        FROM public.auctions a
        WHERE a.status = 'live' AND a.robot_enabled = true 
    LOOP
        -- Pega as configurações específicas do robô para este leilão
        SELECT * INTO v_settings FROM public.robot_settings WHERE auction_id = v_auction.id AND active = true;
        IF NOT FOUND THEN CONTINUE; END IF;

        v_time_remaining_ms := EXTRACT(EPOCH FROM (v_auction.end_time - now())) * 1000;
        v_random_factor := random();
        v_minutes_since_start := EXTRACT(EPOCH FROM (now() - v_auction.start_time)) / 60;

        -- Verifica se o último lance foi de robô
        v_last_bidder_is_bot := false;
        IF v_auction.last_bidder_id IS NOT NULL THEN
            SELECT is_bot INTO v_last_bidder_is_bot FROM public.profiles WHERE id = v_auction.last_bidder_id;
        END IF;
        v_last_bidder_is_bot := COALESCE(v_last_bidder_is_bot, false);

        -- Lógica de disputa ESTRATÉGICA e NATURAL:
        -- 1. Se o último lance NÃO foi de robô, ele decide quando responder:
        IF NOT v_last_bidder_is_bot THEN
            -- Simula "reflexo" humano: 
            -- Às vezes responde rápido (se o tempo estiver muito baixo)
            -- Às vezes espera o cronômetro chegar no meio ou no fim
            IF (v_time_remaining_ms <= 3000 AND v_random_factor < 0.9) OR -- Urgência: responde quase sempre nos últimos 3s
               (v_time_remaining_ms <= 8000 AND v_random_factor < 0.4) OR -- Estratégia: responde às vezes entre 3s e 8s
               (v_time_remaining_ms <= (v_auction.timer_duration * 500) AND v_random_factor < 0.1) -- Aleatório: raramente responde no meio do caminho
            THEN
                -- Seleciona um robô aleatório
                SELECT id INTO v_robot_id FROM public.profiles WHERE is_bot = true ORDER BY random() LIMIT 1;
                
                IF v_robot_id IS NOT NULL THEN
                    v_bid_result := public.place_bid(v_auction.id, v_robot_id);
                    IF (v_bid_result->>'success')::boolean THEN
                        v_bids_placed := v_bids_placed + 1;
                        UPDATE public.robot_settings SET last_robot_bid_at = now() WHERE id = v_settings.id;
                    END IF;
                END IF;
            END IF;
        
        -- 2. Disputa INTERNA (Robô contra Robô):
        -- Apenas se ativado e raramente, para não "queimar" lances sem necessidade
        ELSIF COALESCE(v_settings.inner_dispute_enabled, false) AND v_time_remaining_ms <= 2000 AND v_random_factor < 0.2 THEN
            SELECT id INTO v_robot_id FROM public.profiles WHERE is_bot = true AND id != v_auction.last_bidder_id ORDER BY random() LIMIT 1;
            IF v_robot_id IS NOT NULL THEN
                v_bid_result := public.place_bid(v_auction.id, v_robot_id);
                IF (v_bid_result->>'success')::boolean THEN
                    v_bids_placed := v_bids_placed + 1;
                END IF;
            END IF;
        END IF;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'bids_placed', v_bids_placed);
END;
$$;
