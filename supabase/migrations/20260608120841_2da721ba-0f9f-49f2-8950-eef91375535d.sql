CREATE OR REPLACE FUNCTION public.process_robot_bids()
 RETURNS jsonb
 LANGUAGE plpgsql
 AS $function$
DECLARE
    v_auction RECORD;
    v_robot_id UUID;
    v_bid_result jsonb;
    v_bids_placed INTEGER := 0;
    v_last_bidder_is_bot BOOLEAN;
    v_time_remaining_ms FLOAT;
    v_settings RECORD;
    v_should_bid BOOLEAN;
    v_random_factor FLOAT;
    v_minutes_since_start FLOAT;
    v_is_within_stop_limit BOOLEAN;
    v_is_within_dispute_limit BOOLEAN;
    v_effective_start_time TIMESTAMP WITH TIME ZONE;
BEGIN
    FOR v_auction IN 
        SELECT a.id, a.last_bidder_id, a.end_time, a.target_winner, a.start_time, a.created_at
        FROM public.auctions a
        WHERE a.status = 'live' AND a.robot_enabled = true 
    LOOP
        -- Buscar configurações do robô
        SELECT * INTO v_settings FROM public.robot_settings WHERE auction_id = v_auction.id AND active = true;
        IF NOT FOUND THEN CONTINUE; END IF;

        v_time_remaining_ms := EXTRACT(EPOCH FROM (v_auction.end_time - clock_timestamp())) * 1000;
        
        IF v_time_remaining_ms <= 0 THEN
            CONTINUE;
        END IF;

        v_effective_start_time := COALESCE(v_auction.start_time, v_auction.created_at);
        v_minutes_since_start := EXTRACT(EPOCH FROM (clock_timestamp() - v_effective_start_time)) / 60;
        
        v_is_within_stop_limit := (v_settings.stop_after_minutes IS NULL OR v_minutes_since_start < v_settings.stop_after_minutes);
        v_is_within_dispute_limit := (v_settings.dispute_duration_minutes IS NULL OR v_minutes_since_start < v_settings.dispute_duration_minutes);

        v_last_bidder_is_bot := false;
        IF v_auction.last_bidder_id IS NOT NULL THEN
            SELECT is_bot INTO v_last_bidder_is_bot FROM public.profiles WHERE id = v_auction.last_bidder_id;
        END IF;
        v_last_bidder_is_bot := COALESCE(v_last_bidder_is_bot, false);

        v_should_bid := false;
        v_random_factor := random();

        -- NOVA LÓGICA: 80% dos lances entre 1 e 3 segundos, 20% aleatórios no resto do tempo
        
        -- CASO 1: VENCEDOR ALVO É ROBÔ (Garantia de extensão)
        IF v_auction.target_winner = 'robot' AND NOT v_last_bidder_is_bot AND v_time_remaining_ms < 2500 THEN
            v_should_bid := true;
        
        -- CASO 2: COMPORTAMENTO GERAL (DENTRO DOS LIMITES DE TEMPO CONFIGURADOS)
        ELSIF v_is_within_stop_limit OR v_is_within_dispute_limit THEN
            
            -- Janela Crítica (1 a 4 segundos finais) - Onde 80% da atividade deve ocorrer
            IF v_time_remaining_ms >= 1000 AND v_time_remaining_ms <= 4000 THEN
                -- Se o último lance não for de robô, ou se for disputa interna
                IF NOT v_last_bidder_is_bot OR (COALESCE(v_settings.inner_dispute_enabled, false) AND v_is_within_dispute_limit) THEN
                    -- Chance alta de lance nesta janela (cerca de 40% por tick de 1s para concentrar aqui)
                    IF v_random_factor < 0.45 THEN
                        v_should_bid := true;
                    END IF;
                END IF;
            
            -- Janela Aleatória (Restante do tempo do cronômetro) - Onde 20% da atividade ocorre
            ELSIF v_time_remaining_ms > 4000 THEN
                -- Chance baixa de lance aleatório para não saturar o leilão
                -- 3% de chance por tick (considerando que o cronômetro pode ter 10-15s)
                IF v_random_factor < 0.03 THEN
                    -- Só dá lance se não for o último bidder ou se houver disputa interna
                    IF NOT v_last_bidder_is_bot OR (COALESCE(v_settings.inner_dispute_enabled, false) AND v_is_within_dispute_limit) THEN
                        v_should_bid := true;
                    END IF;
                END IF;
                
            -- Emergência extrema (< 1s) - Apenas se precisar garantir a vitória
            ELSIF v_time_remaining_ms < 1000 AND v_auction.target_winner = 'robot' AND NOT v_last_bidder_is_bot THEN
                v_should_bid := true;
            END IF;

        END IF;

        -- EXECUÇÃO DO LANCE
        IF v_should_bid THEN
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
                    UPDATE public.robot_settings SET last_robot_bid_at = clock_timestamp() WHERE auction_id = v_auction.id;
                END IF;
            END IF;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true, 
        'bids_placed', v_bids_placed, 
        'timestamp', clock_timestamp()
    );
END;
$function$;