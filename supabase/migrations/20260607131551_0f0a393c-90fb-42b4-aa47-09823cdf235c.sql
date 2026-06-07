-- 1. Melhorar a função de processamento de lances de robôs para ser mais robusta e honrar durações
CREATE OR REPLACE FUNCTION public.process_robot_bids()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
        
        -- Calcular tempo decorrido para limites de parada
        v_minutes_since_start := EXTRACT(EPOCH FROM (clock_timestamp() - COALESCE(v_auction.start_time, v_auction.created_at))) / 60;
        
        v_is_within_stop_limit := (v_settings.stop_after_minutes IS NULL OR v_minutes_since_start < v_settings.stop_after_minutes);
        v_is_within_dispute_limit := (v_settings.dispute_duration_minutes IS NULL OR v_minutes_since_start < v_settings.dispute_duration_minutes);

        -- Se já passou do tempo de parar, desativar robô para este leilão
        IF NOT v_is_within_stop_limit AND NOT v_is_within_dispute_limit THEN
            CONTINUE;
        END IF;

        v_last_bidder_is_bot := false;
        IF v_auction.last_bidder_id IS NOT NULL THEN
            SELECT is_bot INTO v_last_bidder_is_bot FROM public.profiles WHERE id = v_auction.last_bidder_id;
        END IF;
        v_last_bidder_is_bot := COALESCE(v_last_bidder_is_bot, false);

        v_should_bid := false;
        v_random_factor := random();

        -- LÓGICA DE LANCES REFORMULADA (MAIS CONFIÁVEL)
        
        -- 1. RESGATE DE EMERGÊNCIA ABSOLUTO: Se o tempo está acabando (< 1.5s)
        -- Se robô deve ganhar ou está em disputa, ele DEVE dar lance se não for o vencedor atual
        IF v_time_remaining_ms < 1500 THEN
            IF NOT v_last_bidder_is_bot THEN
                v_should_bid := true;
            ELSIF COALESCE(v_settings.inner_dispute_enabled, false) AND v_is_within_dispute_limit THEN
                -- Mesmo que robô seja o último, se houver disputa interna, troca lance para parecer ativo
                -- Aumentamos a chance nos últimos segundos para não deixar o tempo cair
                v_should_bid := (v_random_factor < 0.8); 
            END IF;
        
        -- 2. DISPUTA INTERNA OU FORÇAR ROBÔ (TEMPO > 1.5s)
        ELSIF v_auction.target_winner = 'robot' OR (COALESCE(v_settings.inner_dispute_enabled, false) AND v_is_within_dispute_limit) THEN
            IF NOT v_last_bidder_is_bot THEN
                -- Se humano deu lance, cobre de forma natural mas garantida
                IF v_time_remaining_ms < 4000 THEN
                    v_should_bid := true;
                ELSIF v_time_remaining_ms < 8000 AND v_random_factor < 0.5 THEN
                    v_should_bid := true;
                END IF;
            ELSE
                -- Robô contra robô
                IF v_time_remaining_ms < 3000 AND v_random_factor < 0.6 THEN
                    v_should_bid := true;
                END IF;
            END IF;

        -- 3. COMPORTAMENTO PADRÃO CONTRA HUMANOS (TARGET RANDOM OU USER)
        ELSIF NOT v_last_bidder_is_bot AND v_is_within_stop_limit THEN
            -- Garantia quase total nos últimos 3 segundos (95% chance)
            IF v_time_remaining_ms < 3000 THEN
                v_should_bid := (v_random_factor < 0.95);
            -- Chance moderada entre 3s e 6s
            ELSIF v_time_remaining_ms < 6000 THEN
                v_should_bid := (v_random_factor < 0.4);
            -- Lances esporádicos acima de 6s
            ELSIF v_time_remaining_ms < 10000 THEN
                v_should_bid := (v_random_factor < 0.15);
            END IF;
        END IF;

        -- EXECUÇÃO DO LANCE
        IF v_should_bid THEN
            -- Pega um robô aleatório diferente do último vencedor
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
                    -- Atualizar timestamp do último lance do robô para controle
                    UPDATE public.robot_settings SET last_robot_bid_at = clock_timestamp() WHERE id = v_settings.id;
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

-- 2. Garantir que tick_auctions execute process_robot_bids corretamente
CREATE OR REPLACE FUNCTION public.tick_auctions()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_now TIMESTAMP WITH TIME ZONE := clock_timestamp();
    v_robot_bids jsonb;
    v_updated_count INTEGER := 0;
BEGIN
    -- 1. Processar lances de robôs PRIMEIRO para garantir que eles cubram lances antes da finalização
    v_robot_bids := public.process_robot_bids();

    -- 2. Ativar leilões agendados que chegaram na hora
    UPDATE public.auctions
    SET status = 'live',
        end_time = v_now + (timer_duration || ' seconds')::interval,
        start_time = v_now
    WHERE status = 'scheduled' AND start_time <= v_now;

    -- 3. Finalizar leilões expirados
    -- Adicionamos um pequeno buffer de 0.5s para evitar race conditions com lances de última hora
    UPDATE public.auctions
    SET status = 'finished'
    WHERE status = 'live' 
      AND end_time < (v_now - interval '0.8 seconds');

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;

    RETURN jsonb_build_object(
        'success', true,
        'robot_bids', v_robot_bids,
        'auctions_processed', v_updated_count,
        'server_time', v_now
    );
END;
$function$;
