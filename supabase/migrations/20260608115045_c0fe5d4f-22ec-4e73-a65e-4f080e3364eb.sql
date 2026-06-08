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
    v_settings RECORD;
    v_should_bid BOOLEAN;
    v_random_factor FLOAT;
    v_minutes_since_start FLOAT;
    v_seconds_since_start FLOAT;
    v_is_within_stop_limit BOOLEAN;
    v_is_within_dispute_limit BOOLEAN;
    v_effective_start_time TIMESTAMP WITH TIME ZONE;
BEGIN
    FOR v_auction IN 
        SELECT a.id, a.last_bidder_id, a.end_time, a.target_winner, a.start_time, a.created_at, a.bid_count
        FROM public.auctions a
        WHERE a.status = 'live' AND a.robot_enabled = true 
    LOOP
        -- Buscar configurações do robô
        SELECT * INTO v_settings FROM public.robot_settings WHERE auction_id = v_auction.id AND active = true;
        IF NOT FOUND THEN CONTINUE; END IF;

        v_time_remaining_ms := EXTRACT(EPOCH FROM (v_auction.end_time - clock_timestamp())) * 1000;
        
        -- Se já passou do tempo, o tick_auctions vai cuidar de mudar o status
        IF v_time_remaining_ms <= 0 THEN
            CONTINUE;
        END IF;

        v_effective_start_time := COALESCE(v_auction.start_time, v_auction.created_at);
        v_seconds_since_start := EXTRACT(EPOCH FROM (clock_timestamp() - v_effective_start_time));
        v_minutes_since_start := v_seconds_since_start / 60;
        
        v_is_within_stop_limit := (v_settings.stop_after_minutes IS NULL OR v_minutes_since_start < v_settings.stop_after_minutes);
        v_is_within_dispute_limit := (v_settings.dispute_duration_minutes IS NULL OR v_minutes_since_start < v_settings.dispute_duration_minutes);

        v_last_bidder_is_bot := false;
        IF v_auction.last_bidder_id IS NOT NULL THEN
            SELECT is_bot INTO v_last_bidder_is_bot FROM public.profiles WHERE id = v_auction.last_bidder_id;
        END IF;
        v_last_bidder_is_bot := COALESCE(v_last_bidder_is_bot, false);

        v_should_bid := false;
        v_random_factor := random();

        -- LÓGICA DE LANCES
        
        -- 0. INÍCIO RÁPIDO (Primeiros 7 segundos)
        -- Se não tem lances ainda e passaram menos de 7 segundos, dá o primeiro lance
        IF v_auction.bid_count = 0 AND v_seconds_since_start < 7 THEN
            v_should_bid := true;
        
        -- 1. EMERGÊNCIA (Mantém o leilão vivo se estiver dentro do limite de tempo)
        ELSIF v_time_remaining_ms < 4000 THEN
            -- Se humano é o líder, robô cobre se estiver no stop_limit ou se for target_winner
            IF NOT v_last_bidder_is_bot THEN
                IF v_is_within_stop_limit OR v_auction.target_winner = 'robot' THEN
                    v_should_bid := true;
                END IF;
            -- Se robô é o líder, mas temos disputa interna ativa e estamos no prazo
            ELSIF COALESCE(v_settings.inner_dispute_enabled, false) AND v_is_within_dispute_limit THEN
                v_should_bid := (v_random_factor < 0.95); -- 95% de chance de cobrir outro robô para manter vivo
            END IF;
        
        -- 2. DISPUTA ATIVA (Tempo > 4s)
        ELSIF v_auction.target_winner = 'robot' OR (COALESCE(v_settings.inner_dispute_enabled, false) AND v_is_within_dispute_limit) THEN
            IF NOT v_last_bidder_is_bot THEN
                -- Cobre humano entre 4s e 10s para manter pressão
                IF v_time_remaining_ms < 10000 THEN
                    v_should_bid := (v_random_factor < 0.85);
                END IF;
            ELSE
                -- Robô contra robô: Manter atividade constante se estiver na fase de disputa
                -- Se estamos nos últimos 15 segundos e temos disputa interna
                IF v_time_remaining_ms < 15000 AND v_random_factor < 0.5 THEN
                    v_should_bid := true;
                END IF;
            END IF;

        -- 3. COMPORTAMENTO PADRÃO CONTRA HUMANOS
        ELSIF NOT v_last_bidder_is_bot AND v_is_within_stop_limit THEN
            IF v_time_remaining_ms < 6000 THEN
                v_should_bid := (v_random_factor < 0.8);
            ELSIF v_time_remaining_ms < 12000 THEN
                v_should_bid := (v_random_factor < 0.4);
            END IF;
        END IF;

        -- EXECUÇÃO DO LANCE
        IF v_should_bid THEN
            -- Seleciona um robô que não seja o último a dar lance
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
