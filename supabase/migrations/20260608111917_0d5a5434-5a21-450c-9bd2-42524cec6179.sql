-- Update tick_auctions to handle pending_audit and auto-finalization
CREATE OR REPLACE FUNCTION public.tick_auctions()
 RETURNS jsonb
 LANGUAGE plpgsql
 AS $function$
DECLARE
    v_now TIMESTAMP WITH TIME ZONE := clock_timestamp();
    v_robot_bids jsonb;
    v_updated_count INTEGER := 0;
    v_finalized_count INTEGER := 0;
BEGIN
    -- 1. Processar lances de robôs PRIMEIRO
    v_robot_bids := public.process_robot_bids();

    -- 2. Ativar leilões agendados
    UPDATE public.auctions
    SET status = 'live',
        end_time = v_now + (timer_duration || ' seconds')::interval,
        start_time = v_now
    WHERE status = 'scheduled' AND start_time <= v_now;

    -- 3. Mover leilões expirados para PENDING_AUDIT (em vez de finished)
    -- Isso mantém o leilão na tela com status "Arrematado" aguardando confirmação
    UPDATE public.auctions
    SET status = 'pending_audit'
    WHERE status = 'live' 
      AND end_time < (v_now - interval '0.8 seconds');

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;

    -- 4. Auto-finalizar leilões em pending_audit após 30 minutos
    UPDATE public.auctions
    SET status = 'finished'
    WHERE status = 'pending_audit'
      AND (v_now - end_time) > interval '30 minutes';
    
    GET DIAGNOSTICS v_finalized_count = ROW_COUNT;

    RETURN jsonb_build_object(
        'success', true,
        'robot_bids', v_robot_bids,
        'auctions_moved_to_audit', v_updated_count,
        'auctions_auto_finalized', v_finalized_count,
        'server_time', v_now
    );
END;
$function$;

-- Refine process_robot_bids to be more aggressive and respect the 30min target
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

        -- LÓGICA DE LANCES MELHORADA
        
        -- Se o robô for o vencedor alvo, ele DEVE cobrir humanos sempre que o tempo estiver acabando, 
        -- mesmo que tenha passado do stop_after_minutes, para garantir que ele finalize como vencedor.
        IF v_auction.target_winner = 'robot' AND NOT v_last_bidder_is_bot AND v_time_remaining_ms < 5000 THEN
            v_should_bid := true;
        
        -- Se estiver dentro do limite de tempo normal
        ELSIF v_is_within_stop_limit OR v_is_within_dispute_limit THEN
            -- 1. EMERGÊNCIA (< 3s)
            IF v_time_remaining_ms < 3000 THEN
                IF NOT v_last_bidder_is_bot THEN
                    v_should_bid := true; 
                ELSIF COALESCE(v_settings.inner_dispute_enabled, false) AND v_is_within_dispute_limit THEN
                    v_should_bid := (v_random_factor < 0.99); -- Mais agressivo na disputa interna
                END IF;
            
            -- 2. DISPUTA ATIVA (Tempo > 3s)
            ELSIF v_auction.target_winner = 'robot' OR (COALESCE(v_settings.inner_dispute_enabled, false) AND v_is_within_dispute_limit) THEN
                IF NOT v_last_bidder_is_bot THEN
                    IF v_time_remaining_ms < 8000 THEN
                        v_should_bid := (v_random_factor < 0.85);
                    END IF;
                ELSE
                    IF v_time_remaining_ms < 10000 AND v_random_factor < 0.4 THEN
                        v_should_bid := true;
                    END IF;
                END IF;

            -- 3. COMPORTAMENTO PADRÃO CONTRA HUMANOS
            ELSIF NOT v_last_bidder_is_bot AND v_is_within_stop_limit THEN
                IF v_time_remaining_ms < 5000 THEN
                    v_should_bid := (v_random_factor < 0.95);
                ELSIF v_time_remaining_ms < 10000 THEN
                    v_should_bid := (v_random_factor < 0.6);
                END IF;
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
