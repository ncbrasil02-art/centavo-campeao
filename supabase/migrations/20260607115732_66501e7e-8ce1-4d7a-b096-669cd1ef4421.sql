CREATE OR REPLACE FUNCTION public.process_robot_bids()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
    v_should_bid BOOLEAN;
    v_is_inner_dispute BOOLEAN;
BEGIN
    FOR v_auction IN 
        SELECT a.id, a.timer_duration, a.last_bidder_id, a.end_time, a.start_time, a.target_winner
        FROM public.auctions a
        WHERE a.status = 'live' AND a.robot_enabled = true 
    LOOP
        -- 1. Carregar configurações
        SELECT * INTO v_settings FROM public.robot_settings WHERE auction_id = v_auction.id AND active = true;
        IF NOT FOUND THEN CONTINUE; END IF;

        v_time_remaining_ms := EXTRACT(EPOCH FROM (v_auction.end_time - now())) * 1000;
        v_random_factor := random();
        v_minutes_since_start := EXTRACT(EPOCH FROM (now() - v_auction.start_time)) / 60;
        
        -- Verifica se o último bidder é robô
        v_last_bidder_is_bot := false;
        IF v_auction.last_bidder_id IS NOT NULL THEN
            SELECT is_bot INTO v_last_bidder_is_bot FROM public.profiles WHERE id = v_auction.last_bidder_id;
        END IF;
        v_last_bidder_is_bot := COALESCE(v_last_bidder_is_bot, false);

        v_should_bid := false;
        v_is_inner_dispute := COALESCE(v_settings.inner_dispute_enabled, false);

        -- 2. LÓGICA DE DECISÃO

        -- PRIORIDADE 1: Se o tempo está acabando (menos de 6 segundos) e não sou eu o ganhador
        IF v_time_remaining_ms <= 6000 THEN
            -- Se for forçar robô (target_winner = 'robot'), ele PRECISA dar lance se não for robô o último, ou se for disputa interna
            IF v_auction.target_winner = 'robot' THEN
                IF NOT v_last_bidder_is_bot OR v_is_inner_dispute THEN
                    v_should_bid := true;
                END IF;
            -- Se for disputa interna ativa e tempo baixo, dá lance mesmo se o último for robô (para trocar lances)
            ELSIF v_is_inner_dispute THEN
                v_should_bid := true;
            -- Se for aleatório e o último for humano, dá lance
            ELSIF v_auction.target_winner != 'user' AND NOT v_last_bidder_is_bot THEN
                v_should_bid := true;
            END IF;
        END IF;

        -- PRIORIDADE 2: Se não tem nenhum lance ainda, inicia a disputa
        IF NOT v_should_bid AND v_auction.last_bidder_id IS NULL THEN
            v_should_bid := true;
        END IF;

        -- PRIORIDADE 3: Manutenção da disputa (lances aleatórios enquanto tempo > 6s)
        IF NOT v_should_bid AND v_time_remaining_ms > 6000 THEN
            -- Se for disputa interna e o último lance foi há algum tempo (ou chance aleatória)
            IF v_is_inner_dispute AND v_random_factor < 0.15 THEN
                v_should_bid := true;
            -- Se for contra humano e ele acabou de dar lance
            ELSIF v_auction.target_winner = 'robot' AND NOT v_last_bidder_is_bot AND v_random_factor < 0.4 THEN
                v_should_bid := true;
            END IF;
        END IF;

        -- BLOQUEIOS DE SEGURANÇA (Apenas se não for 'forçar robô' ou se o tempo estiver confortável)
        IF v_should_bid AND v_auction.target_winner != 'robot' AND v_time_remaining_ms > 3000 THEN
            -- Respeita o stop_after_minutes
            IF (v_settings.stop_after_minutes IS NOT NULL AND v_minutes_since_start > v_settings.stop_after_minutes) THEN
                v_should_bid := false;
            END IF;
            -- Respeita o start_after_minutes
            IF v_minutes_since_start < COALESCE(v_settings.start_after_minutes, 0) THEN
                v_should_bid := false;
            END IF;
        END IF;

        -- 3. EXECUÇÃO
        IF v_should_bid THEN
            -- Seleciona um robô diferente do último que deu lance
            SELECT id INTO v_robot_id 
            FROM public.profiles 
            WHERE is_bot = true 
              AND id != COALESCE(v_auction.last_bidder_id, '00000000-0000-0000-0000-000000000000'::uuid)
            ORDER BY random() 
            LIMIT 1;

            IF v_robot_id IS NOT NULL THEN
                v_bid_result := public.place_robot_bid(v_auction.id, v_robot_id);
                IF (v_bid_result->>'success')::boolean THEN
                    v_bids_placed := v_bids_placed + 1;
                    UPDATE public.robot_settings SET last_robot_bid_at = now() WHERE id = v_settings.id;
                END IF;
            END IF;
        END IF;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'bids_placed', v_bids_placed, 'timestamp', now());
END;
$function$;
